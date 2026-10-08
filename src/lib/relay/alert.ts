import { horizonAccount, nativeBalance } from "@/lib/stellar/horizon";
import type { NetworkConfig } from "@/lib/stellar/network";

/**
 * THE SPONSOR'S BALANCE, WATCHED. Under 20 XLM the relay says so in the log and, when a bot
 * token and a chat are configured, on Telegram — at most once an hour, so a busy day does not
 * become a busy phone. The operator hears first; a recipient must never be the one who finds
 * Sown's servers out of fees.
 */
export const LOW_XLM = Number(process.env.SOWN_SPONSOR_LOW_XLM ?? 20);
const KEY = Symbol.for("sown.relay.alertedAt");

export async function checkSponsorBalance(net: NetworkConfig, sponsor: string): Promise<number | null> {
  const acct = await horizonAccount(net, sponsor);
  if (!acct.ok || !acct.value) return null;
  const xlm = nativeBalance(acct.value);
  if (xlm >= LOW_XLM) return xlm;
  const g = globalThis as unknown as Record<symbol, number | undefined>;
  const last = g[KEY] ?? 0;
  if (Date.now() - last < 3_600_000) return xlm;
  g[KEY] = Date.now();
  const line = `Sown sponsor on ${net.name} holds ${xlm.toFixed(2)} XLM, under ${LOW_XLM}. Top it up: ${sponsor}`;
  console.warn(line);
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.SOWN_ALERT_CHAT_ID;
  if (token && chat) {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text: line }),
      signal: AbortSignal.timeout(8_000),
    }).catch(() => undefined);
  }
  return xlm;
}
