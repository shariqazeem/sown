/**
 * THE MONTHLY REMINDER, AS A CALENDAR FILE. Stellar has no standing orders, so "every month" is a
 * reminder on the sender's own calendar whose link reopens the send card with the same amount,
 * keep and asset. Pure, so a test holds the format.
 */
export type Plan = { readonly usd: number; readonly keepBps: number; readonly asset: string; readonly day: number };

const fold = (line: string): string => {
  const out: string[] = [];
  for (let i = 0; i < line.length; i += 73) out.push((i ? " " : "") + line.slice(i, i + 73));
  return out.join("\r\n");
};
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
const two = (n: number) => String(n).padStart(2, "0");

export function planLink(origin: string, p: Plan): string {
  return `${origin}/?usd=${p.usd}&keep=${p.keepBps}&asset=${encodeURIComponent(p.asset)}#send`;
}

/** A monthly event at 09:00 local time on day `p.day`, starting on the next such day after `from`. */
export function planIcs(origin: string, p: Plan, from: Date = new Date(), uid = `sown-plan-${from.getTime()}`): string {
  const start = new Date(from.getFullYear(), from.getMonth(), p.day, 9, 0, 0);
  if (start.getTime() <= from.getTime()) start.setMonth(start.getMonth() + 1);
  const local = `${start.getFullYear()}${two(start.getMonth() + 1)}${two(start.getDate())}T090000`;
  const stamp = from.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const link = planLink(origin, p);
  const what = `Send $${p.usd} home with Sown, keeping ${p.keepBps / 100}%`;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Sown//Every month//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}@sown`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${local}`,
    "DURATION:PT15M",
    `RRULE:FREQ=MONTHLY;BYMONTHDAY=${p.day}`,
    fold(`SUMMARY:${esc(what)}`),
    fold(`DESCRIPTION:${esc(`One tap to send again: ${link}`)}`),
    fold(`URL:${link}`),
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "TRIGGER:PT0M",
    fold(`DESCRIPTION:${esc(what)}`),
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
