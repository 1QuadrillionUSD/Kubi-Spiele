import { registerServiceWorker } from "../shared/utils/pwa.js";

const installStatus = document.querySelector("#install-status");

registerServiceWorker({
  onReady() {
    if (installStatus) installStatus.textContent = "Offline bereit";
  },
  onInstalling() {
    if (installStatus) installStatus.textContent = "Wird eingerichtet";
  },
  onUpdateFound() {
    if (installStatus) installStatus.textContent = "Update wird geladen";
  },
  onUpdated() {
    if (installStatus) installStatus.textContent = "Offline bereit";
  },
  onError() {
    if (installStatus) installStatus.textContent = "Online bereit";
  },
});
