interface Point { x: number; y: number }

interface ViewControls {
  root: HTMLElement;
  enabled: boolean;
  paused: boolean;
  me: { alive: boolean };
  state: { over: boolean; map: { bound: number } };
  host: {
    screenToGround(x: number, y: number): Point | null;
    setCameraPeek(point: Point | null): void;
  };
}

export function createBattleViewDrag(field: HTMLElement, hud: ViewControls) {
  let drag: { id: number; x: number; y: number; origin: Point; across: Point; down: Point } | null = null;
  let target: Point | null = null;
  let wasAlive = hud.me.alive;

  function reset() {
    const id = drag?.id;
    drag = null;
    if (id !== undefined && field.hasPointerCapture(id)) field.releasePointerCapture(id);
    if (target) hud.host.setCameraPeek(null);
    target = null;
    hud.root.classList.remove('is-spectating');
  }

  return {
    start(event: PointerEvent) {
      if (drag || !hud.enabled || hud.paused || hud.state.over || hud.root.querySelector('.sf-hud__mini.is-peek')) return;
      const rect = field.getBoundingClientRect();
      if (hud.me.alive && event.clientX < rect.left + rect.width / 2) return;
      const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
      const center = hud.host.screenToGround(cx, cy);
      const across = hud.host.screenToGround(cx + 16, cy);
      const down = hud.host.screenToGround(cx, cy + 16);
      if (!center || !across || !down) return;
      const gain = 2.6 / 16;
      drag = {
        id: event.pointerId, x: event.clientX, y: event.clientY, origin: target ?? center,
        across: { x: (across.x - center.x) * gain, y: (across.y - center.y) * gain },
        down: { x: (down.x - center.x) * gain, y: (down.y - center.y) * gain },
      };
      field.setPointerCapture(event.pointerId);
      event.preventDefault();
    },
    move(event: PointerEvent) {
      if (!drag || drag.id !== event.pointerId) return;
      const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
      if (!target && Math.hypot(dx, dy) < 6) return;
      const bound = hud.state.map.bound;
      const clamp = (v: number) => Math.max(-bound, Math.min(bound, v));
      target = {
        x: clamp(drag.origin.x + dx * drag.across.x + dy * drag.down.x),
        y: clamp(drag.origin.y + dx * drag.across.y + dy * drag.down.y),
      };
      hud.host.setCameraPeek(target);
      hud.root.classList.toggle('is-spectating', !hud.me.alive);
    },
    end(event: PointerEvent) {
      if (drag?.id !== event.pointerId) return;
      drag = null;
      if (hud.me.alive || event.type !== 'pointerup') reset();
    },
    update() {
      if (wasAlive !== hud.me.alive || hud.paused || hud.state.over || !hud.enabled) reset();
      wasAlive = hud.me.alive;
    },
    reset,
  };
}
