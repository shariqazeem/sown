#![no_std]
//! # Sown — the envelope contract
//!
//! A sender sends USDC and chooses a keep. In the same transaction the keep slice is swapped on
//! an Aquarius pool into a keep asset (US Treasuries on mainnet; XLM, labelled stand-in, on
//! testnet), and both parts wait in an envelope until whoever holds the link claims them.
//!
//! The contract has no function that lets anyone but the sender (before the return date) or
//! the link holder move an envelope's money. The admin can only add or disable a keep asset
//! for future sends. There is no upgrade function.
//!
//! ## The Aquarius call, read off testnet on 2026-10-08 (docs/RESEARCH.md §Day 0)
//!
//! Simulating `pool.swap(user, 0, 1, 1 USDC, min)` on the testnet USDC/XLM pool
//! `CD3LFMMLBQ6RBJUD3Z2LFDFE6544WDRMWHEZYPI5YDVESYRSO2TT32BX` records this tree for `user`:
//!
//! ```text
//! CD3LFMML….swap(user, 0, 1, 10000000, 888033382)
//!   CAZRY5GS….transfer(user, CD3LFMML…, 10000000)      <- the pool pulls with transfer, not transfer_from
//! ```
//!
//! When `user` is this contract, `swap`'s own `user.require_auth()` is satisfied because this
//! contract is its direct invoker. The nested `transfer` is invoked by the pool, not by us, so
//! before calling the pool the contract authorises exactly that one call:
//!
//! ```text
//! env.authorize_as_current_contract([Contract(SubContractInvocation {
//!     context: ContractContext { contract: usdc, fn_name: "transfer",
//!                                args: (this_contract, pool, keep_in) },
//!     sub_invocations: [] })])
//! ```
//!
//! ## The claim
//!
//! The link carries a 32-byte ed25519 seed in its fragment; the envelope stores the matching
//! public key (`claim_key`). A claim carries a signature by that key over
//! `("claim", this_contract, id, to)` as ScVal XDR. The seed never reaches the chain or a
//! server, and nobody who sees a claim can redirect it: the signature commits to `to`.

use soroban_sdk::{
    auth::{ContractContext, InvokerContractAuthEntry, SubContractInvocation},
    contract, contractclient, contracterror, contractevent, contractimpl, contracttype,
    symbol_short, token, vec, xdr::ToXdr, Address, Bytes, BytesN, Env, IntoVal, Symbol, Vec,
};

/// 1 USDC at 7 decimals.
pub const MIN_SEND: i128 = 10_000_000;
/// A send waits at least a day before anyone but its sender may return it.
pub const MIN_HOLD: u64 = 86_400;
/// And at most a year.
pub const MAX_HOLD: u64 = 31_536_000;
/// Still held is measured once, thirty days after the claim.
pub const MEASURE_AFTER: u64 = 30 * 86_400;
pub const BPS: u32 = 10_000;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    /// No envelope (or keep asset) at that key.
    NotFound = 1,
    /// The envelope was already claimed or returned.
    NotOpen = 2,
    /// Reserved. A claim's signature is checked by the host, which aborts on a bad one before
    /// the contract can return a code; the claim page checks the key first and says so.
    BadSecret = 3,
    /// keep_bps above 10,000.
    BadRate = 4,
    /// Below the minimum send, or a keep slice that would buy nothing.
    TooSmall = 5,
    /// return_at outside [now + 1 day, now + 1 year].
    BadReturnDate = 6,
    /// The keep asset is not on the table, or is disabled.
    AssetOff = 7,
    /// Too early: a stranger before the return date, or a measurement before 30 days.
    NotYet = 8,
    /// Reserved. A refund names its caller; a stranger before the date gets NotYet.
    NotSender = 9,
    /// Still held was already measured for this envelope.
    AlreadyMeasured = 10,
    /// Arithmetic out of range.
    Overflow = 11,
    /// The pool does not trade USDC at in_idx for the asset at out_idx.
    BadPool = 12,
    /// Only Claimed envelopes can be measured.
    NotClaimed = 13,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Config {
    pub admin: Address,
    pub usdc: Address,
    pub min_send: i128,
    pub min_hold: u64,
    pub max_hold: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct KeepAsset {
    pub pool: Address,
    pub in_idx: u32,
    pub out_idx: u32,
    pub enabled: bool,
}

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum State {
    Open,
    Claimed,
    Returned,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Envelope {
    pub id: u64,
    pub sender: Address,
    /// USDC left to spend.
    pub cash: i128,
    pub keep_asset: Address,
    /// USDC that went into the pool.
    pub keep_in: i128,
    /// Units of the keep asset that came out, measured on this contract's own balance.
    pub keep_out: i128,
    pub keep_bps: u32,
    /// The ed25519 public key of the link's secret.
    pub claim_key: BytesN<32>,
    /// sha256 of the sender's reason, or zero.
    pub memo: BytesN<32>,
    pub created_at: u64,
    pub created_ledger: u32,
    pub return_at: u64,
    pub state: State,
    pub claimed_by: Option<Address>,
    /// When it was claimed or returned (0 while open).
    pub claimed_at: u64,
    pub claimed_ledger: u32,
    /// 0 = not measured.
    pub measured_at: u64,
    pub measured_balance: i128,
}

#[contracttype]
#[derive(Clone)]
enum Key {
    Config,
    Asset(Address),
    Count,
    Env(u64),
}

#[contractevent(topics = ["sent"], data_format = "vec")]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Sent {
    #[topic]
    pub id: u64,
    pub sender: Address,
    pub cash: i128,
    pub keep_asset: Address,
    pub keep_in: i128,
    pub keep_out: i128,
}

#[contractevent(topics = ["claimed"], data_format = "single-value")]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Claimed {
    #[topic]
    pub id: u64,
    pub to: Address,
}

#[contractevent(topics = ["refunded"], data_format = "single-value")]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Refunded {
    #[topic]
    pub id: u64,
    pub sender: Address,
}

#[contractevent(topics = ["measured"], data_format = "single-value")]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Measured {
    #[topic]
    pub id: u64,
    pub balance: i128,
}

/// The part of an Aquarius pool Sown calls. Pools are called directly, not through the router
/// ("pool contracts can be called directly for contract sub-invocations" — Aquarius docs).
#[contractclient(name = "PoolClient")]
pub trait Pool {
    fn swap(env: Env, user: Address, in_idx: u32, out_idx: u32, in_amount: u128, out_min: u128) -> u128;
    fn get_tokens(env: Env) -> Vec<Address>;
}

#[contract]
pub struct Sown;

fn config(env: &Env) -> Config {
    env.storage().instance().get(&Key::Config).unwrap()
}

// No function extends the contract's own instance or code. Extending an instance also extends
// its code, and code rent is charged on its in-memory size (measured on testnet: 154.9 XLM to
// carry 15 KB of code to the maximum TTL). A sender or a recipient must never pay that, so
// whoever runs Sown keeps the instance and code alive from outside, with an ExtendFootprintTTL
// operation (scripts/keep-alive.ts). Each envelope still extends its own entry (`save`).

fn load(env: &Env, id: u64) -> Result<Envelope, Error> {
    env.storage().persistent().get(&Key::Env(id)).ok_or(Error::NotFound)
}

/// Every write extends the envelope to the network maximum: the receipt lives in the ledger.
fn save(env: &Env, e: &Envelope) {
    let key = Key::Env(e.id);
    env.storage().persistent().set(&key, e);
    let max = env.storage().max_ttl();
    env.storage().persistent().extend_ttl(&key, max, max);
}

/// The bytes a claim signs: `("claim", this_contract, id, to)` as ScVal XDR.
pub fn claim_message(env: &Env, id: u64, to: &Address) -> Bytes {
    (symbol_short!("claim"), env.current_contract_address(), id, to.clone()).to_xdr(env)
}

#[contractimpl]
impl Sown {
    pub fn __constructor(env: Env, admin: Address, usdc: Address) {
        env.storage().instance().set(
            &Key::Config,
            &Config { admin, usdc, min_send: MIN_SEND, min_hold: MIN_HOLD, max_hold: MAX_HOLD },
        );
        env.storage().instance().set(&Key::Count, &0u64);
    }

    /// Add or disable a keep asset for future sends. Touches no envelope: an envelope carries
    /// its own asset and amounts, and claim and refund read only those.
    pub fn set_asset(env: Env, asset: Address, pool: Address, in_idx: u32, out_idx: u32, enabled: bool) -> Result<(), Error> {
        let cfg = config(&env);
        cfg.admin.require_auth();
        if enabled {
            let tokens = PoolClient::new(&env, &pool).get_tokens();
            let usdc_at = tokens.get(in_idx).ok_or(Error::BadPool)?;
            let asset_at = tokens.get(out_idx).ok_or(Error::BadPool)?;
            if usdc_at != cfg.usdc || asset_at != asset || asset == cfg.usdc {
                return Err(Error::BadPool);
            }
        }
        env.storage().instance().set(&Key::Asset(asset), &KeepAsset { pool, in_idx, out_idx, enabled });
        Ok(())
    }

    #[allow(clippy::too_many_arguments)]
    pub fn send(
        env: Env,
        sender: Address,
        amount: i128,
        keep_bps: u32,
        keep_asset: Address,
        min_keep_out: i128,
        claim_key: BytesN<32>,
        memo: BytesN<32>,
        return_at: u64,
    ) -> Result<u64, Error> {
        sender.require_auth();
        let cfg = config(&env);
        if amount < cfg.min_send {
            return Err(Error::TooSmall);
        }
        if keep_bps > BPS {
            return Err(Error::BadRate);
        }
        if min_keep_out < 0 {
            return Err(Error::TooSmall);
        }
        let asset: KeepAsset = env.storage().instance().get(&Key::Asset(keep_asset.clone())).ok_or(Error::AssetOff)?;
        if !asset.enabled {
            return Err(Error::AssetOff);
        }
        let now = env.ledger().timestamp();
        let earliest = now.checked_add(cfg.min_hold).ok_or(Error::Overflow)?;
        let latest = now.checked_add(cfg.max_hold).ok_or(Error::Overflow)?;
        if return_at < earliest || return_at > latest {
            return Err(Error::BadReturnDate);
        }
        let keep_in = amount.checked_mul(keep_bps as i128).ok_or(Error::Overflow)? / BPS as i128;
        let cash = amount.checked_sub(keep_in).ok_or(Error::Overflow)?;

        let me = env.current_contract_address();
        let usdc = token::Client::new(&env, &cfg.usdc);
        usdc.transfer(&sender, &me, &amount);

        let mut keep_out: i128 = 0;
        if keep_in > 0 {
            let keep = token::Client::new(&env, &keep_asset);
            let before = keep.balance(&me);
            env.authorize_as_current_contract(vec![
                &env,
                InvokerContractAuthEntry::Contract(SubContractInvocation {
                    context: ContractContext {
                        contract: cfg.usdc.clone(),
                        fn_name: Symbol::new(&env, "transfer"),
                        args: (me.clone(), asset.pool.clone(), keep_in).into_val(&env),
                    },
                    sub_invocations: vec![&env],
                }),
            ]);
            let out_min = u128::try_from(min_keep_out).map_err(|_| Error::Overflow)?;
            let in_amount = u128::try_from(keep_in).map_err(|_| Error::Overflow)?;
            PoolClient::new(&env, &asset.pool).swap(&me, &asset.in_idx, &asset.out_idx, &in_amount, &out_min);
            // Never trust a returned number for money: count what actually arrived.
            keep_out = keep.balance(&me).checked_sub(before).ok_or(Error::Overflow)?;
            if keep_out <= 0 || keep_out < min_keep_out {
                return Err(Error::TooSmall);
            }
        }

        let id: u64 = env.storage().instance().get(&Key::Count).unwrap_or(0);
        env.storage().instance().set(&Key::Count, &(id + 1));
        let e = Envelope {
            id,
            sender: sender.clone(),
            cash,
            keep_asset: keep_asset.clone(),
            keep_in,
            keep_out,
            keep_bps,
            claim_key,
            memo,
            created_at: now,
            created_ledger: env.ledger().sequence(),
            return_at,
            state: State::Open,
            claimed_by: None,
            claimed_at: 0,
            claimed_ledger: 0,
            measured_at: 0,
            measured_balance: 0,
        };
        save(&env, &e);
        Sent { id, sender, cash, keep_asset, keep_in, keep_out }.publish(&env);
        Ok(id)
    }

    /// Hand both parts to `to`. Anyone may submit it; the signature by the link's key over
    /// `("claim", this_contract, id, to)` is the authorisation, and it fixes the destination.
    pub fn claim(env: Env, id: u64, to: Address, sig: BytesN<64>) -> Result<(), Error> {
        let mut e = load(&env, id)?;
        if e.state != State::Open {
            return Err(Error::NotOpen);
        }
        env.crypto().ed25519_verify(&e.claim_key, &claim_message(&env, id, &to), &sig);
        let cfg = config(&env);
        let me = env.current_contract_address();
        if e.cash > 0 {
            token::Client::new(&env, &cfg.usdc).transfer(&me, &to, &e.cash);
        }
        if e.keep_out > 0 {
            token::Client::new(&env, &e.keep_asset).transfer(&me, &to, &e.keep_out);
        }
        e.state = State::Claimed;
        e.claimed_by = Some(to.clone());
        e.claimed_at = env.ledger().timestamp();
        e.claimed_ledger = env.ledger().sequence();
        save(&env, &e);
        Claimed { id, to }.publish(&env);
        Ok(())
    }

    /// Both parts back to the sender. The sender may do it any time while open; anyone may
    /// once the return date has passed. `by` is whoever is asking, and must authorise.
    pub fn refund(env: Env, id: u64, by: Address) -> Result<(), Error> {
        by.require_auth();
        let mut e = load(&env, id)?;
        if e.state != State::Open {
            return Err(Error::NotOpen);
        }
        let now = env.ledger().timestamp();
        if by != e.sender && now < e.return_at {
            return Err(Error::NotYet);
        }
        let cfg = config(&env);
        let me = env.current_contract_address();
        if e.cash > 0 {
            token::Client::new(&env, &cfg.usdc).transfer(&me, &e.sender, &e.cash);
        }
        if e.keep_out > 0 {
            token::Client::new(&env, &e.keep_asset).transfer(&me, &e.sender, &e.keep_out);
        }
        e.state = State::Returned;
        e.claimed_at = now;
        e.claimed_ledger = env.ledger().sequence();
        save(&env, &e);
        Refunded { id, sender: e.sender.clone() }.publish(&env);
        Ok(())
    }

    /// Still held: read the keep asset's balance of whoever claimed, once, 30 days on.
    pub fn measure(env: Env, id: u64) -> Result<i128, Error> {
        let mut e = load(&env, id)?;
        if e.state != State::Claimed {
            return Err(Error::NotClaimed);
        }
        if e.measured_at != 0 {
            return Err(Error::AlreadyMeasured);
        }
        let now = env.ledger().timestamp();
        let due = e.claimed_at.checked_add(MEASURE_AFTER).ok_or(Error::Overflow)?;
        if now < due {
            return Err(Error::NotYet);
        }
        let holder = e.claimed_by.clone().ok_or(Error::NotClaimed)?;
        let balance = token::Client::new(&env, &e.keep_asset).balance(&holder);
        e.measured_at = now;
        e.measured_balance = balance;
        save(&env, &e);
        Measured { id, balance }.publish(&env);
        Ok(balance)
    }

    pub fn get(env: Env, id: u64) -> Result<Envelope, Error> {
        load(&env, id)
    }

    pub fn count(env: Env) -> u64 {
        env.storage().instance().get(&Key::Count).unwrap_or(0)
    }

    pub fn config(env: Env) -> Config {
        config(&env)
    }

    pub fn asset(env: Env, asset: Address) -> Result<KeepAsset, Error> {
        env.storage().instance().get(&Key::Asset(asset)).ok_or(Error::NotFound)
    }
}

#[cfg(test)]
mod test;
