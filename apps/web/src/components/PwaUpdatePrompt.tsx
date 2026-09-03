import { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

// Surfaces vite-plugin-pwa's registration state as a small toast instead of
// silently swapping the service worker underneath the user. registerType is
// "autoUpdate" (see vite.config.ts), so the new SW activates itself either
// way — this is purely about telling the user a refresh will pick it up, and
// giving them a one-tap way to do that immediately.
export function PwaUpdatePrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      // The browser only checks a SW for updates on navigation/refresh by
      // default; polling catches an update for someone who leaves the app
      // open in a background tab for a long session.
      const interval = setInterval(() => void registration.update(), 60 * 60 * 1000);
      return () => clearInterval(interval);
    },
  });

  useEffect(() => {
    if (!offlineReady) return;
    const timeout = setTimeout(() => setOfflineReady(false), 4000);
    return () => clearTimeout(timeout);
  }, [offlineReady, setOfflineReady]);

  if (!offlineReady && !needRefresh) return null;

  return (
    <div className="fixed inset-x-4 bottom-24 z-50 mx-auto flex max-w-sm items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-brand-ink shadow-lg md:bottom-6 md:left-6 md:right-auto">
      <p>
        {needRefresh
          ? "A new version of UniBuzzz is available."
          : "UniBuzzz is ready to work offline."}
      </p>
      <div className="flex shrink-0 items-center gap-3">
        {needRefresh && (
          <button
            type="button"
            onClick={() => void updateServiceWorker(true)}
            className="rounded-lg bg-brand-yellow px-3 py-1.5 text-xs font-semibold text-black hover:bg-brand-orange"
          >
            Reload
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setOfflineReady(false);
            setNeedRefresh(false);
          }}
          className="text-xs text-stone-400 hover:text-stone-600"
          aria-label="Dismiss"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
