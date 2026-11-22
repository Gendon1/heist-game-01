export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_SMOKE = 4;
export const ACTION_JAMMER = 8;

export function createInput(canvas, toField) {
  const held = new Set();
  const pressed = new Set();
  const queued = { value: 0 };
  let clickTarget = null;

  function onKeyDown(e) {
    const code = e.code;
    if (
      code === 'KeyW' || code === 'ArrowUp' ||
      code === 'KeyA' || code === 'ArrowLeft' ||
      code === 'KeyS' || code === 'ArrowDown' ||
      code === 'KeyD' || code === 'ArrowRight'
    ) {
      held.add(code);
      e.preventDefault();
      return;
    }
    if (!pressed.has(code)) {
      pressed.add(code);
      switch (code) {
        case 'Space':
        case 'Enter':
          queued.value |= ACTION_CONFIRM;
          break;
        case 'KeyP':
        case 'Escape':
          queued.value |= ACTION_PAUSE;
          break;
        case 'Digit1':
        case 'Numpad1':
          queued.value |= ACTION_SMOKE;
          break;
        case 'Digit2':
        case 'Numpad2':
          queued.value |= ACTION_JAMMER;
          break;
      }
      e.preventDefault();
    }
  }

  function onKeyUp(e) {
    held.delete(e.code);
    pressed.delete(e.code);
  }

  function onBlur() {
    held.clear();
    pressed.clear();
  }

  function onPointerDown(e) {
    if (e.target !== canvas) return;
    clickTarget = toField(e.clientX, e.clientY);
    queued.value |= ACTION_CONFIRM;
  }

  canvas.addEventListener('keydown', onKeyDown);
  canvas.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('pointerdown', onPointerDown);

  function move() {
    let mx = 0, my = 0;
    if (held.has('KeyW') || held.has('ArrowUp')) my -= 1;
    if (held.has('KeyS') || held.has('ArrowDown')) my += 1;
    if (held.has('KeyA') || held.has('ArrowLeft')) mx -= 1;
    if (held.has('KeyD') || held.has('ArrowRight')) mx += 1;
    if (mx !== 0 || my !== 0) {
      const len = Math.hypot(mx, my);
      mx /= len;
      my /= len;
    }
    return { x: mx, y: my };
  }

  function target() {
    return clickTarget;
  }

  function clearTarget() {
    clickTarget = null;
  }

  function takeActions() {
    const v = queued.value;
    queued.value = 0;
    return v;
  }

  return { move, target, clearTarget, takeActions };
}