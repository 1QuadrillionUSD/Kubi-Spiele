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

function positionFromEvent(target, event) {
  const rect = target.getBoundingClientRect();
  return {
    x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
    y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
  };
}
