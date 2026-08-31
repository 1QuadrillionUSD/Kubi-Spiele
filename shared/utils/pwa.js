export function registerServiceWorker({
  scriptUrl = "./service-worker.js",
  scope,
  onReady,
  onInstalling,
  onUpdateFound,
  onUpdated,
  onError,
} = {}) {
  if (!("serviceWorker" in navigator)) {
    onError?.();
    return;
  }

  window.addEventListener("load", async () => {
    try {
      const options = scope ? { scope } : undefined;
      const hadController = Boolean(navigator.serviceWorker.controller);
      const registration = await navigator.serviceWorker.register(scriptUrl, options);

      if (registration.waiting || registration.active) {
        onReady?.(registration);
      }

      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        if (hadController) {
          onUpdateFound?.(registration);
        } else {
          onInstalling?.(registration);
        }

        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "activated") {
            onUpdated?.(registration);
          }
        });
      });
    } catch (error) {
      console.warn("Service Worker konnte nicht registriert werden.", error);
      onError?.(error);
    }
  });
}
