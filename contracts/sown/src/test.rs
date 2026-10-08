//! The invariants CLAUDE.md §5 names, against a MockPool that swaps at a fixed rate and pulls
//! its input with `transfer(user, pool, in)` — the call the testnet pool's auth tree showed.
extern crate std;

use super::*;
use ed25519_dalek::{Signer, SigningKey};
use soroban_sdk::{
    contract, contractimpl, contracttype,
    testutils::{storage::Instance as _, storage::Persistent as _, Address as _, Events as _, Ledger as _, MockAuth, MockAuthInvoke},
    token::{StellarAssetClient, TokenClient},
    Address, BytesN, Env, Event as _, IntoVal, Vec,
};
use std::vec::Vec as StdVec;

// ── the mock pool ────────────────────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone)]
enum PoolKey {
    Tokens,
    Num,
    Den,
    Lie,
}

#[contract]
pub struct MockPool;

#[contractimpl]
impl MockPool {
    pub fn __constructor(env: Env, tokens: Vec<Address>, num: i128, den: i128) {
        env.storage().instance().set(&PoolKey::Tokens, &tokens);
        env.storage().instance().set(&PoolKey::Num, &num);
        env.storage().instance().set(&PoolKey::Den, &den);
        env.storage().instance().set(&PoolKey::Lie, &false);
    }
    /// A pool that reports more than it pays, to prove Sown counts what arrived.
    pub fn set_lie(env: Env, lie: bool) {
        env.storage().instance().set(&PoolKey::Lie, &lie);
    }
    pub fn get_tokens(env: Env) -> Vec<Address> {
        env.storage().instance().get(&PoolKey::Tokens).unwrap()
    }
    pub fn swap(env: Env, user: Address, in_idx: u32, out_idx: u32, in_amount: u128, out_min: u128) -> u128 {
        user.require_auth();
        let tokens: Vec<Address> = env.storage().instance().get(&PoolKey::Tokens).unwrap();
        let num: i128 = env.storage().instance().get(&PoolKey::Num).unwrap();
        let den: i128 = env.storage().instance().get(&PoolKey::Den).unwrap();
        let lie: bool = env.storage().instance().get(&PoolKey::Lie).unwrap();
        let me = env.current_contract_address();
        let input = in_amount as i128;
        TokenClient::new(&env, &tokens.get(in_idx).unwrap()).transfer(&user, &me, &input);
        let out = input * num / den;
        if (out as u128) < out_min {
            panic!("short fill");
        }
        let paid = if lie { out / 2 } else { out };
        TokenClient::new(&env, &tokens.get(out_idx).unwrap()).transfer(&me, &user, &paid);
        out as u128
    }
}

// ── the world a test runs in ─────────────────────────────────────────────────────────────────

struct World {
    env: Env,
    sown: Address,
    admin: Address,
    usdc: Address,
    keep: Address,
    pool: Address,
}

const USDC_1: i128 = 10_000_000;
/// The mock price: 1 USDC buys 0.877 keep units (USDY-like), so a 10 USDC slice is 8.77.
const NUM: i128 = 877;
const DEN: i128 = 1_000;

impl World {
    fn new() -> World {
        let env = Env::default();
        env.ledger().with_mut(|l| {
            l.timestamp = 1_791_400_000;
            l.sequence_number = 5_000_000;
            l.min_persistent_entry_ttl = 4_096;
            l.max_entry_ttl = 3_110_400;
        });
        let issuer = Address::generate(&env);
        let usdc = env.register_stellar_asset_contract_v2(issuer.clone()).address();
        let keep = env.register_stellar_asset_contract_v2(issuer.clone()).address();
        let tokens: Vec<Address> = soroban_sdk::vec![&env, usdc.clone(), keep.clone()];
        let pool = env.register(MockPool, (tokens, NUM, DEN));
        let admin = Address::generate(&env);
        let sown = env.register(Sown, (admin.clone(), usdc.clone()));
        env.mock_all_auths();
        StellarAssetClient::new(&env, &keep).mint(&pool, &(1_000_000_000 * USDC_1));
        SownClient::new(&env, &sown).set_asset(&keep, &pool, &0, &1, &true);
        env.set_auths(&[]);
        World { env, sown, admin, usdc, keep, pool }
    }
    fn client(&self) -> SownClient<'_> {
        SownClient::new(&self.env, &self.sown)
    }
    fn usdc(&self) -> TokenClient<'_> {
        TokenClient::new(&self.env, &self.usdc)
    }
    fn keep(&self) -> TokenClient<'_> {
        TokenClient::new(&self.env, &self.keep)
    }
    fn funded_sender(&self, usdc: i128) -> Address {
        let s = Address::generate(&self.env);
        self.env.mock_all_auths();
        StellarAssetClient::new(&self.env, &self.usdc).mint(&s, &usdc);
        self.env.set_auths(&[]);
        s
    }
    fn now(&self) -> u64 {
        self.env.ledger().timestamp()
    }
    fn later(&self, secs: u64) {
        self.env.ledger().with_mut(|l| {
            l.timestamp += secs;
            l.sequence_number += (secs / 5) as u32;
        });
    }
    /// A send with every auth mocked: the shape most tests need.
    fn send(&self, sender: &Address, amount: i128, keep_bps: u32, key: &SigningKey) -> u64 {
        self.env.mock_all_auths();
        let id = self.client().send(
            sender,
            &amount,
            &keep_bps,
            &self.keep,
            &0,
            &pubkey(&self.env, key),
            &BytesN::from_array(&self.env, &[0; 32]),
            &(self.now() + 30 * 86_400),
        );
        self.env.set_auths(&[]);
        id
    }
    fn sig(&self, key: &SigningKey, id: u64, to: &Address) -> BytesN<64> {
        let msg = self.env.as_contract(&self.sown, || claim_message(&self.env, id, to));
        let bytes: StdVec<u8> = msg.iter().collect();
        BytesN::from_array(&self.env, &key.sign(&bytes).to_bytes())
    }
}

fn signing_key(seed: u8) -> SigningKey {
    SigningKey::from_bytes(&[seed; 32])
}

fn pubkey(env: &Env, key: &SigningKey) -> BytesN<32> {
    BytesN::from_array(env, &key.verifying_key().to_bytes())
}

fn err<T: core::fmt::Debug, C: core::fmt::Debug>(r: Result<Result<T, C>, Result<Error, soroban_sdk::InvokeError>>) -> Error {
    match r {
        Err(Ok(e)) => e,
        other => panic!("expected a contract error, got {other:?}"),
    }
}

// ── send: the slice arithmetic and the min-out ───────────────────────────────────────────────

#[test]
fn cash_plus_keep_in_is_the_amount_and_keep_out_is_counted() {
    let w = World::new();
    let sender = w.funded_sender(1_000 * USDC_1);
    let key = signing_key(1);
    for (amount, bps) in [(100 * USDC_1, 1_000u32), (USDC_1, 1), (37 * USDC_1 + 3, 3_333), (50 * USDC_1, 10_000), (12 * USDC_1, 0)] {
        let id = w.send(&sender, amount, bps, &key);
        let e = w.client().get(&id);
        assert_eq!(e.cash + e.keep_in, amount, "cash + keep_in == amount");
        assert_eq!(e.keep_in, amount * bps as i128 / 10_000);
        assert_eq!(e.keep_out, e.keep_in * NUM / DEN);
        assert_eq!(e.state, State::Open);
        assert_eq!(e.keep_bps, bps);
    }
}

#[test]
fn ten_percent_of_a_hundred_is_ten_dollars_kept() {
    let w = World::new();
    let sender = w.funded_sender(100 * USDC_1);
    let id = w.send(&sender, 100 * USDC_1, 1_000, &signing_key(2));
    let e = w.client().get(&id);
    assert_eq!(e.cash, 90 * USDC_1);
    assert_eq!(e.keep_in, 10 * USDC_1);
    assert_eq!(e.keep_out, 87_700_000); // 8.77 units at 7 decimals
    assert_eq!(w.usdc().balance(&sender), 0);
    assert_eq!(w.usdc().balance(&w.sown), 90 * USDC_1);
    assert_eq!(w.keep().balance(&w.sown), 87_700_000);
}

#[test]
fn a_short_fill_reverts_the_whole_send() {
    let w = World::new();
    let sender = w.funded_sender(100 * USDC_1);
    let key = signing_key(3);
    w.env.mock_all_auths();
    let r = w.client().try_send(
        &sender,
        &(100 * USDC_1),
        &1_000,
        &w.keep,
        &(87_700_000 + 1), // one unit more than the pool will give
        &pubkey(&w.env, &key),
        &BytesN::from_array(&w.env, &[0; 32]),
        &(w.now() + 86_400 * 30),
    );
    assert!(r.is_err(), "a fill below the minimum must fail");
    assert_eq!(w.usdc().balance(&sender), 100 * USDC_1, "nothing moved");
    assert_eq!(w.client().count(), 0, "no envelope written");
}

#[test]
fn sown_counts_what_arrived_not_what_the_pool_says() {
    let w = World::new();
    let sender = w.funded_sender(100 * USDC_1);
    w.env.mock_all_auths();
    MockPoolClient::new(&w.env, &w.pool).set_lie(&true);
    // The pool reports 8.77 but pays 4.385: with a minimum of 8 the send must fail…
    let r = w.client().try_send(
        &sender,
        &(100 * USDC_1),
        &1_000,
        &w.keep,
        &80_000_000,
        &pubkey(&w.env, &signing_key(4)),
        &BytesN::from_array(&w.env, &[0; 32]),
        &(w.now() + 86_400 * 30),
    );
    assert_eq!(err(r), Error::TooSmall);
    // …and with no minimum the envelope records what actually arrived.
    let id = w.send(&sender, 100 * USDC_1, 1_000, &signing_key(4));
    assert_eq!(w.client().get(&id).keep_out, 87_700_000 / 2);
}

#[test]
fn send_checks_its_inputs() {
    let w = World::new();
    let sender = w.funded_sender(100 * USDC_1);
    let key = pubkey(&w.env, &signing_key(5));
    let zero = BytesN::from_array(&w.env, &[0; 32]);
    let ok_date = w.now() + 86_400 * 30;
    w.env.mock_all_auths();
    let c = w.client();
    assert_eq!(err(c.try_send(&sender, &(USDC_1 - 1), &1_000, &w.keep, &0, &key, &zero, &ok_date)), Error::TooSmall);
    assert_eq!(err(c.try_send(&sender, &USDC_1, &10_001, &w.keep, &0, &key, &zero, &ok_date)), Error::BadRate);
    assert_eq!(err(c.try_send(&sender, &USDC_1, &1_000, &w.usdc, &0, &key, &zero, &ok_date)), Error::AssetOff);
    assert_eq!(err(c.try_send(&sender, &USDC_1, &1_000, &w.keep, &0, &key, &zero, &(w.now() + 86_399))), Error::BadReturnDate);
    assert_eq!(err(c.try_send(&sender, &USDC_1, &1_000, &w.keep, &0, &key, &zero, &(w.now() + 31_536_001))), Error::BadReturnDate);
    assert_eq!(err(c.try_send(&sender, &USDC_1, &1_000, &w.keep, &-1, &key, &zero, &ok_date)), Error::TooSmall);
    // The edges are inside.
    c.send(&sender, &USDC_1, &1_000, &w.keep, &0, &key, &zero, &(w.now() + 86_400));
    c.send(&sender, &USDC_1, &1_000, &w.keep, &0, &key, &zero, &(w.now() + 31_536_000));
}

#[test]
fn the_contract_authorises_exactly_the_pools_pull_and_the_sender_signs_only_their_tree() {
    // No mock_all_auths: the sender authorises send → usdc.transfer(sender, sown, amount), and
    // the pool's pull of the slice must be authorised by Sown's own authorize_as_current_contract.
    let w = World::new();
    let sender = w.funded_sender(100 * USDC_1);
    let key = pubkey(&w.env, &signing_key(6));
    let memo = BytesN::from_array(&w.env, &[7; 32]);
    let ret = w.now() + 86_400 * 30;
    let amount = 100 * USDC_1;
    w.env.mock_auths(&[MockAuth {
        address: &sender,
        invoke: &MockAuthInvoke {
            contract: &w.sown,
            fn_name: "send",
            args: (sender.clone(), amount, 1_000u32, w.keep.clone(), 0i128, key.clone(), memo.clone(), ret).into_val(&w.env),
            sub_invokes: &[MockAuthInvoke {
                contract: &w.usdc,
                fn_name: "transfer",
                args: (sender.clone(), w.sown.clone(), amount).into_val(&w.env),
                sub_invokes: &[],
            }],
        },
    }]);
    let id = w.client().send(&sender, &amount, &1_000, &w.keep, &0, &key, &memo, &ret);
    assert_eq!(w.client().get(&id).keep_out, 87_700_000);
    assert_eq!(w.usdc().balance(&w.pool), 10 * USDC_1, "the pool received exactly the slice");
}

// ── the state machine ────────────────────────────────────────────────────────────────────────

#[test]
fn only_open_to_claimed_and_open_to_returned() {
    let w = World::new();
    let sender = w.funded_sender(300 * USDC_1);
    let key = signing_key(8);
    let to = Address::generate(&w.env);

    // claim, then a second claim and a refund both fail with NotOpen
    let a = w.send(&sender, 100 * USDC_1, 1_000, &key);
    w.client().claim(&a, &to, &w.sig(&key, a, &to));
    assert_eq!(w.client().get(&a).state, State::Claimed);
    assert_eq!(err(w.client().try_claim(&a, &to, &w.sig(&key, a, &to))), Error::NotOpen);
    w.env.mock_all_auths();
    assert_eq!(err(w.client().try_refund(&a, &sender)), Error::NotOpen);
    w.env.set_auths(&[]);

    // refund, then a claim fails with NotOpen
    let b = w.send(&sender, 100 * USDC_1, 1_000, &key);
    w.env.mock_all_auths();
    w.client().refund(&b, &sender);
    w.env.set_auths(&[]);
    assert_eq!(w.client().get(&b).state, State::Returned);
    assert_eq!(err(w.client().try_claim(&b, &to, &w.sig(&key, b, &to))), Error::NotOpen);
    w.env.mock_all_auths();
    assert_eq!(err(w.client().try_refund(&b, &sender)), Error::NotOpen);
}

#[test]
fn a_claim_pays_both_parts_to_whoever_the_link_names() {
    let w = World::new();
    let sender = w.funded_sender(100 * USDC_1);
    let key = signing_key(9);
    let id = w.send(&sender, 100 * USDC_1, 1_000, &key);
    let to = Address::generate(&w.env);
    // No auth from anyone: the link's signature is the authorisation.
    w.client().claim(&id, &to, &w.sig(&key, id, &to));
    assert_eq!(w.usdc().balance(&to), 90 * USDC_1);
    assert_eq!(w.keep().balance(&to), 87_700_000);
    assert_eq!(w.usdc().balance(&w.sown), 0);
    assert_eq!(w.keep().balance(&w.sown), 0);
    let e = w.client().get(&id);
    assert_eq!(e.claimed_by, Some(to));
    assert_eq!(e.claimed_at, w.now());
    assert_eq!(e.claimed_ledger, w.env.ledger().sequence());
}

#[test]
fn a_wrong_key_fails_and_a_watcher_cannot_redirect_a_claim() {
    let w = World::new();
    let sender = w.funded_sender(100 * USDC_1);
    let key = signing_key(10);
    let id = w.send(&sender, 100 * USDC_1, 1_000, &key);
    let to = Address::generate(&w.env);
    let thief = Address::generate(&w.env);
    // signed by another key
    assert!(w.client().try_claim(&id, &to, &w.sig(&signing_key(11), id, &to)).is_err());
    // the right signature, replayed to another address
    assert!(w.client().try_claim(&id, &thief, &w.sig(&key, id, &to)).is_err());
    // the right key's signature for another envelope id
    assert!(w.client().try_claim(&id, &to, &w.sig(&key, id + 1, &to)).is_err());
    assert_eq!(w.client().get(&id).state, State::Open, "still waiting");
    w.client().claim(&id, &to, &w.sig(&key, id, &to));
    assert_eq!(w.usdc().balance(&thief), 0);
}

#[test]
fn a_stranger_cannot_return_it_before_the_date_and_anyone_can_after() {
    let w = World::new();
    let sender = w.funded_sender(100 * USDC_1);
    let id = w.send(&sender, 100 * USDC_1, 1_000, &signing_key(12));
    let stranger = Address::generate(&w.env);
    w.env.mock_all_auths();
    assert_eq!(err(w.client().try_refund(&id, &stranger)), Error::NotYet);
    let ret = w.client().get(&id).return_at;
    w.later(ret - w.now() - 1);
    assert_eq!(err(w.client().try_refund(&id, &stranger)), Error::NotYet);
    w.later(1);
    w.client().refund(&id, &stranger);
    assert_eq!(w.usdc().balance(&sender), 90 * USDC_1, "the cash went back to the sender, not the caller");
    assert_eq!(w.keep().balance(&sender), 87_700_000, "and the keep");
    assert_eq!(w.usdc().balance(&stranger), 0);
}

#[test]
fn the_sender_can_take_it_back_any_time_while_open() {
    let w = World::new();
    let sender = w.funded_sender(100 * USDC_1);
    let id = w.send(&sender, 100 * USDC_1, 1_000, &signing_key(13));
    w.later(60);
    w.env.mock_all_auths();
    w.client().refund(&id, &sender);
    let e = w.client().get(&id);
    assert_eq!(e.state, State::Returned);
    assert_eq!(e.claimed_by, None);
    assert_eq!(w.usdc().balance(&sender), 90 * USDC_1);
}

#[test]
fn a_refund_needs_the_callers_authorisation() {
    let w = World::new();
    let sender = w.funded_sender(100 * USDC_1);
    let id = w.send(&sender, 100 * USDC_1, 1_000, &signing_key(14));
    // Nobody signed: naming the sender is not enough.
    assert!(w.client().try_refund(&id, &sender).is_err());
    assert_eq!(w.client().get(&id).state, State::Open);
}

// ── still held ───────────────────────────────────────────────────────────────────────────────

#[test]
fn measure_once_after_thirty_days_reads_the_holders_balance() {
    let w = World::new();
    let sender = w.funded_sender(100 * USDC_1);
    let key = signing_key(15);
    let id = w.send(&sender, 100 * USDC_1, 1_000, &key);
    let to = Address::generate(&w.env);
    assert_eq!(err(w.client().try_measure(&id)), Error::NotClaimed);
    w.client().claim(&id, &to, &w.sig(&key, id, &to));
    assert_eq!(err(w.client().try_measure(&id)), Error::NotYet);
    w.later(30 * 86_400 - 1);
    assert_eq!(err(w.client().try_measure(&id)), Error::NotYet);
    w.later(1);
    // The holder spent some of the keep.
    w.env.mock_all_auths();
    w.keep().transfer(&to, &Address::generate(&w.env), &7_700_000);
    w.env.set_auths(&[]);
    let measured = w.client().measure(&id);
    assert_eq!(measured, 80_000_000);
    assert_eq!(measured, w.keep().balance(&to), "the written balance equals the token's balance of claimed_by");
    let e = w.client().get(&id);
    assert_eq!(e.measured_balance, 80_000_000);
    assert_eq!(e.measured_at, w.now());
    assert_eq!(err(w.client().try_measure(&id)), Error::AlreadyMeasured);
}

#[test]
fn a_measurement_of_zero_is_still_a_measurement() {
    let w = World::new();
    let sender = w.funded_sender(100 * USDC_1);
    let key = signing_key(16);
    let id = w.send(&sender, 100 * USDC_1, 1_000, &key);
    let to = Address::generate(&w.env);
    w.client().claim(&id, &to, &w.sig(&key, id, &to));
    w.env.mock_all_auths();
    w.keep().transfer(&to, &Address::generate(&w.env), &87_700_000);
    w.later(30 * 86_400);
    assert_eq!(w.client().measure(&id), 0);
    assert_eq!(err(w.client().try_measure(&id)), Error::AlreadyMeasured, "measured_at, not the balance, marks it done");
}

// ── the admin ────────────────────────────────────────────────────────────────────────────────

#[test]
fn only_the_admin_sets_assets_and_a_pool_must_trade_the_pair() {
    let w = World::new();
    let other = Address::generate(&w.env);
    assert!(w.client().try_set_asset(&w.keep, &w.pool, &0, &1, &false).is_err(), "no auth, no change");
    w.env.mock_auths(&[MockAuth {
        address: &other,
        invoke: &MockAuthInvoke {
            contract: &w.sown,
            fn_name: "set_asset",
            args: (w.keep.clone(), w.pool.clone(), 0u32, 1u32, false).into_val(&w.env),
            sub_invokes: &[],
        },
    }]);
    assert!(w.client().try_set_asset(&w.keep, &w.pool, &0, &1, &false).is_err(), "a stranger's auth is not the admin's");
    w.env.mock_all_auths();
    assert_eq!(err(w.client().try_set_asset(&w.keep, &w.pool, &1, &0, &true)), Error::BadPool, "indices reversed");
    assert_eq!(err(w.client().try_set_asset(&w.keep, &w.pool, &0, &2, &true)), Error::BadPool, "index out of range");
    assert_eq!(err(w.client().try_set_asset(&w.usdc, &w.pool, &0, &0, &true)), Error::BadPool, "USDC cannot be a keep");
    let stranger_asset = Address::generate(&w.env);
    assert_eq!(err(w.client().try_set_asset(&stranger_asset, &w.pool, &0, &1, &true)), Error::BadPool);
    let a = w.client().asset(&w.keep);
    assert_eq!((a.pool, a.in_idx, a.out_idx, a.enabled), (w.pool.clone(), 0, 1, true));
    let _ = w.admin;
}

#[test]
fn nothing_the_admin_can_call_changes_an_envelopes_money() {
    let w = World::new();
    let sender = w.funded_sender(200 * USDC_1);
    let key = signing_key(17);
    let a = w.send(&sender, 100 * USDC_1, 1_000, &key);
    let b = w.send(&sender, 100 * USDC_1, 2_000, &key);
    let before = (w.client().get(&a), w.client().get(&b), w.usdc().balance(&w.sown), w.keep().balance(&w.sown));

    // Every admin path: disable the asset, point it at another pool, re-enable it.
    let tokens: Vec<Address> = soroban_sdk::vec![&w.env, w.usdc.clone(), w.keep.clone()];
    let other_pool = w.env.register(MockPool, (tokens, 1i128, 1i128));
    w.env.mock_all_auths();
    w.client().set_asset(&w.keep, &w.pool, &0, &1, &false);
    w.client().set_asset(&w.keep, &other_pool, &0, &1, &true);
    w.client().set_asset(&w.keep, &other_pool, &0, &1, &false);
    w.env.set_auths(&[]);

    let after = (w.client().get(&a), w.client().get(&b), w.usdc().balance(&w.sown), w.keep().balance(&w.sown));
    assert_eq!(before, after, "no envelope and no balance moved");

    // A disabled asset stops new sends only; open envelopes still claim their recorded amounts.
    let to = Address::generate(&w.env);
    w.client().claim(&a, &to, &w.sig(&key, a, &to));
    assert_eq!(w.keep().balance(&to), before.0.keep_out);
    w.env.mock_all_auths();
    assert_eq!(
        err(w.client().try_send(&sender, &USDC_1, &1_000, &w.keep, &0, &pubkey(&w.env, &key), &BytesN::from_array(&w.env, &[0; 32]), &(w.now() + 86_400 * 2))),
        Error::AssetOff
    );
}

#[test]
fn the_public_functions_are_exactly_the_spec() {
    // CLAUDE.md §5: "anything not listed does not exist". The client is generated from the
    // contract's own spec, so a function added without updating the spec fails to compile
    // here only if it is called; this lists the ones that must exist and be callable.
    let w = World::new();
    let c = w.client();
    let _ = c.count();
    let _ = c.config();
    let _ = c.try_get(&0);
    let _ = c.try_asset(&w.keep);
    let _ = c.try_measure(&0);
    let _ = c.try_claim(&0, &w.admin, &BytesN::from_array(&w.env, &[0; 64]));
    w.env.mock_all_auths();
    let _ = c.try_refund(&0, &w.admin);
    let _ = c.try_set_asset(&w.keep, &w.pool, &0, &1, &true);
}

// ── storage and events ───────────────────────────────────────────────────────────────────────

#[test]
fn an_envelope_lives_at_the_network_maximum_ttl() {
    let w = World::new();
    let sender = w.funded_sender(100 * USDC_1);
    let id = w.send(&sender, 100 * USDC_1, 1_000, &signing_key(18));
    let ttl = w.env.as_contract(&w.sown, || w.env.storage().persistent().get_ttl(&Key::Env(id)));
    let max = w.env.as_contract(&w.sown, || w.env.storage().max_ttl());
    assert_eq!(ttl, max);
}

#[test]
fn no_send_claim_or_refund_extends_the_contracts_own_life() {
    // The instance and its code are kept alive from outside; a user's call must never pay
    // the code's rent by extending them.
    let w = World::new();
    let sender = w.funded_sender(300 * USDC_1);
    let key = signing_key(22);
    let before = w.env.as_contract(&w.sown, || w.env.storage().instance().get_ttl());
    w.later(86_400 * 3);
    let a = w.send(&sender, 100 * USDC_1, 1_000, &key);
    let to = Address::generate(&w.env);
    w.client().claim(&a, &to, &w.sig(&key, a, &to));
    let b = w.send(&sender, 100 * USDC_1, 1_000, &key);
    w.env.mock_all_auths();
    w.client().refund(&b, &sender);
    let after = w.env.as_contract(&w.sown, || w.env.storage().instance().get_ttl());
    let max = w.env.as_contract(&w.sown, || w.env.storage().max_ttl());
    assert!(after <= before && after < max / 2, "a user's call extended the instance: {before} -> {after} (max {max})");
}

#[test]
fn a_send_emits_sent_with_its_figures() {
    let w = World::new();
    let sender = w.funded_sender(100 * USDC_1);
    let id = w.send(&sender, 100 * USDC_1, 1_000, &signing_key(19));
    let expected = Sent { id, sender: sender.clone(), cash: 90 * USDC_1, keep_asset: w.keep.clone(), keep_in: 10 * USDC_1, keep_out: 87_700_000 };
    assert_eq!(w.env.events().all().filter_by_contract(&w.sown), [expected.to_xdr(&w.env, &w.sown)]);
}

#[test]
fn claim_refund_and_measure_emit_their_events() {
    let w = World::new();
    let sender = w.funded_sender(200 * USDC_1);
    let key = signing_key(21);
    let a = w.send(&sender, 100 * USDC_1, 1_000, &key);
    let to = Address::generate(&w.env);
    w.client().claim(&a, &to, &w.sig(&key, a, &to));
    assert_eq!(w.env.events().all().filter_by_contract(&w.sown), [Claimed { id: a, to: to.clone() }.to_xdr(&w.env, &w.sown)]);
    let b = w.send(&sender, 100 * USDC_1, 1_000, &key);
    w.env.mock_all_auths();
    w.client().refund(&b, &sender);
    assert_eq!(w.env.events().all().filter_by_contract(&w.sown), [Refunded { id: b, sender: sender.clone() }.to_xdr(&w.env, &w.sown)]);
    w.later(30 * 86_400);
    w.client().measure(&a);
    assert_eq!(w.env.events().all().filter_by_contract(&w.sown), [Measured { id: a, balance: 87_700_000 }.to_xdr(&w.env, &w.sown)]);
}

#[test]
fn the_claim_message_bytes_are_fixed() {
    // The browser builds the same bytes (src/lib/envelope/claim.ts); its test holds this hex.
    let env = Env::default();
    let contract = Address::from_str(&env, "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC");
    let to = Address::from_str(&env, "GCNSJWWL3CMKYKGBOBDO5P7UBOJH6YMQ3ZQENZFVJDKTWMMZEZTJIZLA");
    let msg = (symbol_short!("claim"), contract, 7u64, to).to_xdr(&env);
    let hex: std::string::String = msg.iter().map(|b| std::format!("{b:02x}")).collect();
    std::println!("claim message hex: {hex}");
    assert_eq!(hex, CLAIM_MESSAGE_HEX);
}

/// Written by the first run of the test above and copied into the TypeScript test.
const CLAIM_MESSAGE_HEX: &str = "0000001000000001000000040000000f00000005636c61696d0000000000001200000001d7928b72c2703ccfeaf7eb9ff4ef4d504a55a8b979fc9b450ea2c842b4d1ce610000000500000000000000070000001200000000000000009b24dacbd898ac28c17046eebff40b927f6190de6046e4b548d53b3199266694";

// ── the property: balances always equal the sums over open envelopes ────────────────────────

struct Rng(u64);
impl Rng {
    fn next(&mut self) -> u64 {
        self.0 ^= self.0 << 13;
        self.0 ^= self.0 >> 7;
        self.0 ^= self.0 << 17;
        self.0
    }
    fn below(&mut self, n: u64) -> u64 {
        self.next() % n
    }
}

#[test]
fn balances_always_equal_the_sums_over_open_envelopes() {
    for seed in [0x9e37_79b9_7f4a_7c15u64, 0xdead_beef_cafe_f00d, 42] {
        let w = World::new();
        w.env.cost_estimate().budget().reset_unlimited();
        let mut rng = Rng(seed);
        let senders: StdVec<Address> = (0..3).map(|_| w.funded_sender(1_000_000 * USDC_1)).collect();
        let key = signing_key(20);
        let mut ids: StdVec<u64> = StdVec::new();
        for _ in 0..120 {
            match rng.below(4) {
                0 | 1 => {
                    let s = &senders[rng.below(3) as usize];
                    let amount = USDC_1 + rng.below(500 * USDC_1 as u64) as i128;
                    let bps = rng.below(10_001) as u32;
                    ids.push(w.send(s, amount, bps, &key));
                }
                2 if !ids.is_empty() => {
                    let id = ids[rng.below(ids.len() as u64) as usize];
                    let to = Address::generate(&w.env);
                    let _ = w.client().try_claim(&id, &to, &w.sig(&key, id, &to));
                }
                _ if !ids.is_empty() => {
                    let id = ids[rng.below(ids.len() as u64) as usize];
                    let e = w.client().get(&id);
                    w.env.mock_all_auths();
                    let _ = w.client().try_refund(&id, &e.sender);
                    w.env.set_auths(&[]);
                }
                _ => {}
            }
            let (mut cash, mut keep) = (0i128, 0i128);
            for id in 0..w.client().count() {
                let e = w.client().get(&id);
                if e.state == State::Open {
                    cash += e.cash;
                    keep += e.keep_out;
                }
                assert_eq!(e.cash + e.keep_in, e.cash + e.keep_in);
            }
            assert_eq!(w.usdc().balance(&w.sown), cash, "USDC held == sum of open cash");
            assert_eq!(w.keep().balance(&w.sown), keep, "keep held == sum of open keep_out");
        }
    }
}
