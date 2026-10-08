import { describe, expect, it } from "vitest";
import { planIcs, planLink } from "./ics";

const plan = { usd: 50, keepBps: 1000, asset: "usdy", day: 1 };

describe("the monthly reminder", () => {
  it("links back to the send card with the same send", () => {
    expect(planLink("https://sown.example", plan)).toBe("https://sown.example/?usd=50&keep=1000&asset=usdy#send");
  });
  it("is a monthly event on the chosen day, starting on the next one", () => {
    const ics = planIcs("https://sown.example", plan, new Date(2026, 9, 8, 12), "t");
    expect(ics).toContain("RRULE:FREQ=MONTHLY;BYMONTHDAY=1");
    expect(ics).toContain("DTSTART:20261101T090000");
    expect(ics).toContain("SUMMARY:Send $50 home with Sown\\, keeping 10%");
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.split("\r\n").every((l) => l.length <= 75)).toBe(true);
  });
  it("starts this month when the day is still ahead", () => {
    expect(planIcs("https://x", { ...plan, day: 20 }, new Date(2026, 9, 8, 12), "t")).toContain("DTSTART:20261020T090000");
  });
});
