import Link from "next/link";
import type { ReactNode } from "react";
import { SownMark } from "@/components/brand/mark";
import "./envelope.css";

/**
 * THE ENVELOPE — Scrip's stub, carried over: a white sheet on paper with a perforated top
 * edge, ruled rows, and the keep's units as the largest figure on the page.
 *
 * No state. Every value it prints was read from the contract's own record or the transaction
 * that wrote it. Five sizes, one object: the row (`EnvelopeRow`), the waiting envelope (dashed,
 * before a claim), the receipt, the share card (opengraph-image), and the worked example
 * (labelled arithmetic, before any real envelope exists).
 */
export type EnvelopeRowItem = { readonly k: string; readonly v: ReactNode; readonly tone?: "ok" | "warn" | "muted" };
export type EnvelopeSection = { readonly title?: string; readonly rows: readonly EnvelopeRowItem[] };

export type EnvelopeTone = "ok" | "waiting" | "returned" | "example";

export function Envelope({
  kicker,
  tone = "ok",
  sent,
  became,
  units,
  symbol,
  assetLine,
  when,
  where,
  sections,
  foot,
  tag,
  compact = false,
  printing = false,
  href,
  id,
}: {
  kicker: string;
  tone?: EnvelopeTone;
  sent: ReactNode;
  became: string;
  units: string;
  symbol: string;
  assetLine?: ReactNode;
  when?: ReactNode;
  where?: ReactNode;
  sections?: readonly EnvelopeSection[];
  foot?: ReactNode;
  /** A word beside the mark: "team" on an envelope to or from Sown's own wallets, "testnet". */
  tag?: string;
  compact?: boolean;
  printing?: boolean;
  href?: string;
  id?: string;
}) {
  const body = (
    <>
      <div className="sw-env-head">
        <span className={`sw-env-kicker is-${tone}`}>
          {tone !== "example" ? <span className="dot" aria-hidden /> : null}
          {kicker}
        </span>
        <span className="sw-env-brand">
          {tag ? <span className="tag">{tag}</span> : null}
          <SownMark size={16} />
        </span>
      </div>
      <p className="sw-env-sent">{sent}</p>
      <p className="sw-env-became">{became}</p>
      <p className="sw-env-units">
        {units}
        <span className="sym">{symbol}</span>
      </p>
      {assetLine ? <p className="sw-env-asset">{assetLine}</p> : null}
      {when ? <p className="sw-env-when">{when}</p> : null}
      {where ? <p className="sw-env-where">{where}</p> : null}
      {sections?.map((s, i) => (
        <div key={i}>
          <hr className="sw-env-rule" />
          {s.title ? <p className="sw-env-section">{s.title}</p> : null}
          {s.rows.map((r, j) => (
            <p key={j} className="sw-env-row">
              <span className="k">{r.k}</span>
              <span className={`v${r.tone ? ` is-${r.tone}` : ""}`}>{r.v}</span>
            </p>
          ))}
        </div>
      ))}
      {foot ? <p className="sw-env-foot">{foot}</p> : null}
    </>
  );
  const cls = `sw-env is-${tone}${compact ? " is-compact" : ""}${printing ? " is-printing" : ""}`;
  if (href) {
    return (
      <Link href={href} className={cls} id={id}>
        {body}
      </Link>
    );
  }
  return (
    <article className={cls} id={id}>
      {body}
    </article>
  );
}

/** Size one: one line in a list. State chip, amount, keep, date, and where it leads. */
export function EnvelopeRow({
  href,
  state,
  amount,
  keep,
  date,
  note,
  tag,
}: {
  href: string;
  state: "waiting" | "claimed" | "returned";
  amount: string;
  keep: ReactNode;
  date: string;
  note?: ReactNode;
  tag?: string;
}) {
  const word = state === "waiting" ? "Waiting" : state === "claimed" ? "Claimed" : "Returned";
  return (
    <div className="sw-env-line">
      <Link href={href} className="sw-env-line-main">
        <span className={`sw-chip is-${state}`}>{word}</span>
        <span className="amount">{amount}</span>
        <span className="keep">{keep}</span>
        <span className="date">
          {date}
          {tag ? <span className="tag"> · {tag}</span> : null}
        </span>
      </Link>
      {note ? <div className="sw-env-line-note">{note}</div> : null}
    </div>
  );
}

/** The envelope before any real one exists, in words: never a sample number. */
export function EmptyEnvelope({ title, note }: { title: string; note: ReactNode }) {
  return (
    <article className="sw-env is-empty">
      <div className="sw-env-head">
        <span className="sw-env-kicker is-example">{title}</span>
        <span className="sw-env-brand">
          <SownMark size={16} />
        </span>
      </div>
      <p className="sw-env-sent">The next real envelope prints here.</p>
      <p className="sw-env-became">Read from the ledger, never a sample</p>
      <p className="sw-env-units">—</p>
      <p className="sw-env-foot">{note}</p>
    </article>
  );
}
