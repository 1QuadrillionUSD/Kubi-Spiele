export function createInputController({ joystickEl, baseEl, knobEl }) {
  const keys = { up: false, down: false, left: false, right: false };
  let joystickActive = false;
  let joystickX = 0;
  let joystickY = 0;
  let activePointerId = null;

  function setKnob(x, y) {
    knobEl.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
  }

  function updateFromPointer(event) {
    const rect = baseEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxRadius = rect.width / 2;

    let dx = event.clientX - cx;
    let dy = event.clientY - cy;
    const distance = Math.hypot(dx, dy);

    if (distance > maxRadius) {
      dx = (dx / distance) * maxRadius;
      dy = (dy / distance) * maxRadius;
    }

    joystickX = dx / maxRadius;
    joystickY = dy / maxRadius;
    setKnob(dx, dy);
  }

  function resetJoystick() {
    joystickActive = false;
    joystickX = 0;
    joystickY = 0;
    setKnob(0, 0);
  }

  baseEl.addEventListener("pointerdown", (event) => {
    activePointerId = event.pointerId;
    baseEl.setPointerCapture(activePointerId);
    joystickActive = true;
    joystickEl.classList.add("is-active");
    updateFromPointer(event);
  });

  baseEl.addEventListener("pointermove", (event) => {
    if (event.pointerId !== activePointerId || !joystickActive) return;
    updateFromPointer(event);
  });

  const endJoystick = (event) => {
    if (event.pointerId !== activePointerId) return;
    activePointerId = null;
    joystickEl.classList.remove("is-active");
    resetJoystick();
  };

  baseEl.addEventListener("pointerup", endJoystick);
  baseEl.addEventListener("pointercancel", endJoystick);
  baseEl.addEventListener("pointerleave", (event) => {
    if (event.pointerId === activePointerId) endJoystick(event);
  });

  const keyMap = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    w: "up",
    s: "down",
    a: "left",
    d: "right",
  };

  window.addEventListener("keydown", (event) => {
    const direction = keyMap[event.key];
    if (!direction) return;
    keys[direction] = true;
    event.preventDefault();
  });

  window.addEventListener("keyup", (event) => {
    const direction = keyMap[event.key];
    if (!direction) return;
    keys[direction] = false;
  });

  function getVector() {
    if (joystickActive) {
      return { x: joystickX, y: joystickY };
    }

    let x = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    let y = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
    const length = Math.hypot(x, y);
    if (length > 1) {
      x /= length;
      y /= length;
    }
    return { x, y };
  }

  function isActive() {
    return joystickActive || keys.up || keys.down || keys.left || keys.right;
  }

  return { getVector, isActive };
}
