export function createHorizontalPointerControl(target, onMove, onEnd = () => {}) {
  let activePointerId = null;

  target.addEventListener("pointerdown", (event) => {
    activePointerId = event.pointerId;
    target.setPointerCapture(activePointerId);
    onMove(positionFromEvent(target, event));
  });

  target.addEventListener("pointermove", (event) => {
    if (event.pointerId !== activePointerId) return;
    onMove(positionFromEvent(target, event));
  });

  target.addEventListener("pointerup", finish);
  target.addEventListener("pointercancel", finish);

  function finish(event) {
    if (event.pointerId !== activePointerId) return;
    activePointerId = null;
    onEnd();
  }
}

export function createHorizontalDragControl(target, { onStart, onMove, onEnd } = {}) {
  let activePointerId = null;
  let startX = 0;
  let startY = 0;
  let hasMoved = false;

  target.addEventListener("pointerdown", (event) => {
    activePointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    hasMoved = false;
    target.setPointerCapture(activePointerId);
    onStart?.(positionFromEvent(target, event));
  });

  target.addEventListener("pointermove", (event) => {
    if (event.pointerId !== activePointerId) return;

    const dx = event.clientX - startX;
    const dy = event.clientY - startY;

    if (!hasMoved && Math.abs(dx) < 8 && Math.abs(dy) < 8) {
      return;
    }

    hasMoved = true;
    onMove?.({
      ...positionFromEvent(target, event),
      dx,
      dy,
    });
  });

  target.addEventListener("pointerup", finish);
  target.addEventListener("pointercancel", finish);

  function finish(event) {
    if (event.pointerId !== activePointerId) return;
    activePointerId = null;
    onEnd?.({ hasMoved });
  }
}

function positionFromEvent(target, event) {
  const rect = target.getBoundingClientRect();
  return {
    x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
    y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
  };
}
