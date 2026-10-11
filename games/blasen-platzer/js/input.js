// Steuerung: Tippen und Wischen, jeder Finger zählt einzeln (pointerId).
export function createInput(canvas, { onDown, onSwipe, onFirstTouch } = {}) {
  const pointers = new Map();

  function local(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  canvas.addEventListener("pointerdown", (event) => {
    onFirstTouch?.();
    event.preventDefault();
    if (pointers.size >= 12) return;
    const p = local(event);
    pointers.set(event.pointerId, p);
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      /* ohne Capture funktioniert die Steuerung trotzdem */
    }
    onDown?.(p.x, p.y);
  });

  canvas.addEventListener("pointermove", (event) => {
    const prev = pointers.get(event.pointerId);
    if (!prev) return;
    event.preventDefault();
    // alle Zwischenpunkte auswerten, damit schnelles Wischen nichts auslässt
    const events = event.getCoalescedEvents?.();
    const list = events && events.length ? events : [event];
    let last = prev;
    for (const e of list) {
      const p = local(e);
      if (p.x === last.x && p.y === last.y) continue;
      onSwipe?.(last.x, last.y, p.x, p.y);
      last = p;
    }
    pointers.set(event.pointerId, last);
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
