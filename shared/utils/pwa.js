export function registerServiceWorker({
  scriptUrl = "./service-worker.js",
  scope,
  onReady,
  onUpdateFound,
  onError,
} = {}) {
  if (!("serviceWorker" in navigator)) {
    onError?.();
    return;
  }

  window.addEventListener("load", async () => {
    try {
      const options = scope ? { scope } : undefined;
      const registration = await navigator.serviceWorker.register(scriptUrl, options);

      if (registration.waiting || registration.active) {
        onReady?.(registration);
      }

      registration.addEventListener("updatefound", () => {
        onUpdateFound?.(registration);
      });
    } catch (error) {
      console.warn("Service Worker konnte nicht registriert werden.", error);
      onError?.(error);
    }
  });
}
