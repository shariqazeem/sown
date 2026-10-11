"use client";

import { useEffect, useState } from "react";
import { Smartphone } from "lucide-react";
import "./install.css";

/**
 * SOWN ON THEIR PHONE. Android and desktop Chrome offer a real install through
 * `beforeinstallprompt`; iOS has no event, so the card says the two taps. Already installed:
 * nothing is shown. The wallet is the reason to keep it: it opens behind their face.
 */
type Prompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export function AddToPhone({ what = "your wallet" }: { what?: string }) {
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [ios, setIos] = useState(false);
  const [installed, setInstalled] = useState(true);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    const ua = navigator.userAgent;
    setIos(/iPhone|iPad|iPod/i.test(ua) && !/CriOS|FxiOS/i.test(ua));
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as Prompt);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;
  if (!prompt && !ios) return null;
  const What = what[0]!.toUpperCase() + what.slice(1);

  return (
    <aside className="sw-install" aria-label="Keep Sown on your phone">
      <span className="sw-install-icon" aria-hidden>
        <Smartphone size={22} strokeWidth={2} />
      </span>
      <div className="sw-install-words">
        <p className="t">Keep Sown on your phone</p>
        {prompt ? (
          <p className="d">One tap puts {what} on your home screen. It opens with your face, no app store, nothing to pay.</p>
        ) : (
          <p className="d">
            Tap <strong>Share</strong> in Safari, then <strong>Add to Home Screen</strong>. {What} then opens with your face, like any app.
          </p>
        )}
      </div>
      {prompt ? (
        <button
          type="button"
          className="sw-btn is-primary sw-install-btn"
          onClick={() => {
            void prompt.prompt().then(() => prompt.userChoice).then((c) => c.outcome === "accepted" && setInstalled(true));
          }}
        >
          Add to home screen
        </button>
      ) : null}
    </aside>
  );
}
