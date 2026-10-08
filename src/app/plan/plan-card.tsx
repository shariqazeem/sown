"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CalendarPlus } from "lucide-react";
import { SkeletonRows } from "@/components/skeleton/skeleton";
import { readJson, writeJson } from "@/lib/local";
import { type Plan, planIcs, planLink } from "@/lib/plan/ics";
import "./plan.css";

type LastSend = { usd: number; keepBps: number; asset: string; at: number };

/** The plan copies the last send; "Remind me" writes a calendar file and keeps the plan here. */
export function PlanCard({ names }: { names: Record<string, string> }) {
  const [last, setLast] = useState<LastSend | null | undefined>(undefined);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [day, setDay] = useState(1);
  useEffect(() => {
    setLast(readJson<LastSend>("last-send"));
    const p = readJson<Plan>("plan");
    if (p) {
      setPlan(p);
      setDay(p.day);
    }
  }, []);

  if (last === undefined) return <SkeletonRows rows={2} />;
  const base = plan ?? (last ? { usd: last.usd, keepBps: last.keepBps, asset: last.asset, day } : null);
  if (!base) {
    return (
      <div className="sw-plan">
        <p className="sw-note">
          Make a send first; the plan copies it.{" "}
          <Link href="/#send" className="sw-link">
            Send something
          </Link>
        </p>
      </div>
    );
  }

  const remind = () => {
    const p: Plan = { ...base, day };
    writeJson("plan", p);
    setPlan(p);
    const blob = new Blob([planIcs(window.location.origin, p)], { type: "text/calendar" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "sown-every-month.ics";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
  };

  return (
    <div className="sw-plan">
      <div className="sw-plan-card">
        <p className="what">
          ${base.usd} home, keeping {base.keepBps / 100}% as {names[base.asset] ?? base.asset}
        </p>
        <label className="sw-plan-day">
          <span>On the</span>
          <select value={day} onChange={(e) => setDay(Number(e.target.value))}>
            {[1, 5, 10, 15, 20, 25, 28].map((d) => (
              <option key={d} value={d}>
                {d === 1 ? "1st" : d === 28 ? "28th" : `${d}th`}
              </option>
            ))}
          </select>
          <span>of every month</span>
        </label>
        <button type="button" className="sw-btn is-primary is-block" onClick={remind}>
          <CalendarPlus size={18} strokeWidth={2} aria-hidden />
          Remind me on the {day === 1 ? "1st" : day === 28 ? "28th" : `${day}th`}
        </button>
        <p className="fine">
          A calendar reminder with a link that opens the send, ready: one approval in your wallet sends it. The plan is kept in this browser only.{" "}
          {plan ? (
            <a className="sw-link" href={planLink("", plan)}>
              Send this month&apos;s now
            </a>
          ) : null}
        </p>
      </div>
    </div>
  );
}
