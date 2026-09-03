import { Download, Share, X } from "lucide-react";
import { useEffect, useState } from "react";

const DISMISSED_KEY = "unibuzzz-install-dismissed-at";
const DISMISS_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isDismissedRecently() {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return raw !== null && Date.now() - Number(raw) < DISMISS_COOLDOWN_MS;
  } catch {
    return false;
  }
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari's own (non-standard) flag — not covered by display-mode.
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

// Chrome/Edge/Android suppress their own install UI once preventDefault() is
// called on beforeinstallprompt, so a custom banner is the only way to offer
// installation at all there. iOS Safari never fires that event — "Add to
// Home Screen" only exists inside the Share sheet — so it gets a one-time
// instructional banner instead of a working install button.
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  // Lazy initializer, not an effect: this is a one-time read of the browser
  // environment at mount, not a value that needs to react to anything else.
  const [showIosTip, setShowIosTip] = useState(
    () => !isStandalone() && !isDismissedRecently() && isIos(),
  );
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isStandalone() || isDismissedRecently() || isIos()) return;

    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setDeferredPrompt(null);
      setShowIosTip(false);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {
      // localStorage unavailable (private mode etc.) — dismissal just won't persist.
    }
  }

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  if (dismissed || (!deferredPrompt && !showIosTip)) return null;

  return (
    <div className="fixed inset-x-4 bottom-40 z-50 mx-auto flex max-w-sm items-start gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-brand-ink shadow-lg md:bottom-6 md:right-6 md:left-auto">
      <img src="/icons/icon-192.png" alt="" className="mt-0.5 h-8 w-8 shrink-0 rounded-lg" />
      <div className="flex-1">
        {deferredPrompt ? (
          <>
            <p className="font-semibold">Install UniBuzzz</p>
            <p className="mt-0.5 text-xs text-stone-500">
              Add it to your home screen for quick, full-screen access.
            </p>
            <button
              type="button"
              onClick={() => void install()}
              className="mt-2 flex items-center gap-1.5 rounded-lg bg-brand-yellow px-3 py-1.5 text-xs font-semibold text-black hover:bg-brand-orange"
            >
              <Download size={14} />
              Install
            </button>
          </>
        ) : (
          <>
            <p className="font-semibold">Add UniBuzzz to your Home Screen</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-stone-500">
              Tap <Share size={14} className="inline" /> then "Add to Home Screen".
            </p>
          </>
        )}
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 rounded-full p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>
    </div>
  );
}
