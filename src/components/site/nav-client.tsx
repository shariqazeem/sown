"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { savedWallet } from "@/lib/local";

/**
 * "YOUR WALLET", once a passkey wallet lives in this browser. Read after mount, because the
 * nav heads pages that are rendered once for everyone; until then it holds its width and says
 * nothing, so it never flashes a wrong state.
 */
export function NavWallet() {
  const [has, setHas] = useState<boolean | null>(null);
  useEffect(() => {
    const read = () => setHas(!!savedWallet());
    read();
    window.addEventListener("sown:storage", read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener("sown:storage", read);
      window.removeEventListener("storage", read);
    };
  }, []);
  if (!has) return null;
  return (
    <Link href="/mine" className="sw-nav-wallet">
      <span className="dot" aria-hidden />
      Your wallet
    </Link>
  );
}

const MENU = [
  { href: "/#send", label: "Send" },
  { href: "/sent", label: "Your sends" },
  { href: "/mine", label: "Your wallet" },
  { href: "/assets", label: "Assets" },
  { href: "/proof", label: "Proof" },
  { href: "/docs", label: "Docs" },
] as const;

/** The phone menu: everything else, one tap behind the mark. Closes on a choice, Escape or a tap outside. */
export function NavMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open]);
  return (
    <div className="sw-nav-menu" ref={box}>
      <button type="button" className="sw-nav-menu-btn" aria-expanded={open} aria-controls="sw-menu" aria-label={open ? "Close the menu" : "Open the menu"} onClick={() => setOpen((o) => !o)}>
        {open ? <X size={20} strokeWidth={2} /> : <Menu size={20} strokeWidth={2} />}
      </button>
      {open ? (
        <div id="sw-menu" className="sw-nav-sheet">
          {MENU.map((m) => (
            <Link key={m.href} href={m.href} onClick={() => setOpen(false)}>
              {m.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
