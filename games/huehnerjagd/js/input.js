// Steuerung: schwebender Joystick (irgendwo auf dem Spielfeld ziehen) und Tasten.
const STICK_RADIUS = 62;
const DEADZONE = 9;

const KEY_DIRECTIONS = {
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
};

export function createInput(canvas, { onFirstTouch } = {}) {
  const keys = { up: false, down: false, left: false, right: false };
  const stick = { active: false, id: null, ox: 0, oy: 0, x: 0, y: 0 };

  function local(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  canvas.addEventListener("pointerdown", (event) => {
    if (stick.active) return;
    const p = local(event);
    stick.active = true;
    stick.id = event.pointerId;
    stick.ox = stick.x = p.x;
    stick.oy = stick.y = p.y;
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      /* ohne Capture funktioniert die Steuerung trotzdem */
    }
    onFirstTouch?.();
    event.preventDefault();
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!stick.active || event.pointerId !== stick.id) return;
    const p = local(event);
    stick.x = p.x;
    stick.y = p.y;
    const dx = stick.x - stick.ox;
    const dy = stick.y - stick.oy;
    const d = Math.hypot(dx, dy);
    if (d > STICK_RADIUS) {
      // Der Joystick wandert mit dem Finger mit, damit er immer sofort reagiert.
      stick.ox = stick.x - (dx / d) * STICK_RADIUS;
      stick.oy = stick.y - (dy / d) * STICK_RADIUS;
    }
    event.preventDefault();
  });

  const release = (event) => {
    if (event.pointerId !== stick.id) return;
    stick.active = false;
    stick.id = null;
  };
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());
  canvas.addEventListener("touchmove", (event) => event.preventDefault(), { passive: false });
  document.addEventListener("gesturestart", (event) => event.preventDefault());

  window.addEventListener("keydown", (event) => {
    const dir = KEY_DIRECTIONS[event.code];
    if (!dir) return;
    keys[dir] = true;
    event.preventDefault();
  });
  window.addEventListener("keyup", (event) => {
    const dir = KEY_DIRECTIONS[event.code];
    if (dir) keys[dir] = false;
  });
  window.addEventListener("blur", reset);

  function reset() {
    stick.active = false;
    stick.id = null;
    keys.up = keys.down = keys.left = keys.right = false;
  }

  // Liefert { angle } oder null, wenn die Schlange einfach weiterlaufen soll.
  function getSteer() {
    if (stick.active) {
      const dx = stick.x - stick.ox;
      const dy = stick.y - stick.oy;
      if (Math.hypot(dx, dy) > DEADZONE) return { angle: Math.atan2(dy, dx) };
      return null;
    }
    const x = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    const y = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
    if (x === 0 && y === 0) return null;
    return { angle: Math.atan2(y, x) };
  }

  function getStick() {
    return stick.active ? { ...stick, radius: STICK_RADIUS } : null;
  }

  return { getSteer, getStick, reset };
}
