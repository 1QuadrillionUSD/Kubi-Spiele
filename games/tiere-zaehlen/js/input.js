// Steuerung: Tippen, jeder Finger zählt einzeln (pointerId).
import { TAP } from "./config.js";

export function createInput(canvas, { onDown, onFirstTouch } = {}) {
  const pointers = new Set();

  function local(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  canvas.addEventListener("pointerdown", (event) => {
    onFirstTouch?.();
    event.preventDefault();
    if (pointers.size >= TAP.maxPointers) return;
    pointers.add(event.pointerId);
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      /* ohne Capture funktioniert die Steuerung trotzdem */
    }
    const p = local(event);
    onDown?.(p.x, p.y, event.pointerId);
  });

  const release = (event) => {
    pointers.delete(event.pointerId);
  };
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);
  canvas.addEventListener("lostpointercapture", release);
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());
  canvas.addEventListener("touchmove", (event) => event.preventDefault(), { passive: false });
  document.addEventListener("gesturestart", (event) => event.preventDefault());
  window.addEventListener("blur", reset);

  function reset() {
    pointers.clear();
  }

  return { reset, count: () => pointers.size };
}
