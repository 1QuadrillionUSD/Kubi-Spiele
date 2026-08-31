import { registerServiceWorker } from "../shared/utils/pwa.js";

const installStatus = document.querySelector("#install-status");

registerServiceWorker({
  onReady() {
    if (installStatus) installStatus.textContent = "Offline bereit";
  },
  onUpdateFound() {
    if (installStatus) installStatus.textContent = "Update laedt";
  },
  onError() {
    if (installStatus) installStatus.textContent = "Online bereit";
  },
});
