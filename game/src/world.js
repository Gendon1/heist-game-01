import {
  FIELD, PLAYER, GUARD, CAMERA, ALARM, TOOLS,
  IDOL_VALUE, COIN_VALUE,
} from './config.js';
import { buildLevel } from './level.js';

export const EVENT_COIN = 1;
export const EVENT_IDOL = 2;
export const EVENT_SPOTTED = 4;
export const EVENT_CAUGHT = 8;
export const EVENT_WIN = 16;
export const EVENT_TOOL = 32;
export const EVENT_LOCKPICK = 64;

function dist(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.hypot(dx, dy);
}

function angleDiff(a, b) {
  let d = a - b;
  while (d <= -Math.PI) d += 2 * Math.PI;
  while (d > Math.PI) d -= 2 * Math.PI;
  return d;
}

function segmentHitsRect(x1, y1, x2, y2, rect) {
  const dx = x2 - x1;
  const dy = y2 - y1;

  let t0 = 0;
  let t1 = 1;

  for (const [p, q] of [
    [-dx, x1 - rect.x],
    [dx, rect.x + rect.w - x1],
    [-dy, y1 - rect.y],
    [dy, rect.y + rect.h - y1],
  ]) {
    if (p === 0) {
      if (q < 0) return false;
      continue;
    }
    const t = q / p;
    if (p < 0) {
      if (t > t1) return false;
      if (t > t0) t0 = t;
    } else {
      if (t < t0) return false;
      if (t < t1) t1 = t;
    }
  }
  return t0 <= t1;
}

function lineBlocked(x1, y1, x2, y2, solids) {
  for (const r of solids) {
    if (segmentHitsRect(x1, y1, x2, y2, r)) return true;
  }
  return false;
}

function resolveCircleRect(cx, cy, r, rect) {
  const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - closestX;
  const dy = cy - closestY;
  const d2 = dx * dx + dy * dy;
  if (d2 >= r * r) return { x: cx, y: cy, hit: false };
  const d = Math.sqrt(d2) || 0.001;
  const push = r - d;
  return {
    x: cx + (dx / d) * push,
    y: cy + (dy / d) * push,
    hit: true,
  };
}

function pointInCone(px, py, gx, gy, ga, range, half) {
  const d = dist(gx, gy, px, py);
  if (d > range) return false;
  const toAngle = Math.atan2(py - gy, px - gx);
  return Math.abs(angleDiff(toAngle, ga)) <= half;
}

function createInitialState(random) {
  const lvl = buildLevel();
  const solids = [...lvl.walls, ...lvl.obstacles];

  const guards = lvl.guards.map((g, i) => {
    const [wx, wy] = g.waypoints[0];
    const [nx, ny] = g.waypoints[1] || g.waypoints[0];
    return {
      x: wx, y: wy,
      angle: Math.atan2(ny - wy, nx - wx),
      wp: 0, wait: GUARD.pause, alerted: false,
    };
  });

  const cameras = lvl.cameras.map((c, i) => ({
    x: c.x, y: c.y,
    angle: c.baseAngle,
    sweep: c.sweep,
    disabled: false,
    phase: i === 0 ? 0 : 2.1,
  }));

  return {
    thief: { x: lvl.spawn.x, y: lvl.spawn.y, angle: 0, moving: false },
    guards,
    cameras,
    coins: lvl.coins.map(c => ({ x: c.x, y: c.y, taken: false })),
    idolTaken: false,
    lockpick: 0,
    alarm: 0,
    coinsCollected: 0,
    loot: 0,
    smoke: 0,
    jammer: 0,
    phase: 'play',
    elapsed: 0,
    spotted: false,
    best: 0,
    seedNote: '',
    _solids: solids,
    _level: lvl,
  };
}

/**
 * Pure vision helpers, exported so the autopilot (and a headless sim) can ask
 * the same question the world asks each step: is point (x, y) inside any
 * guard or camera cone with a clear line of sight? Returns 'guard', 'camera' or null.
 */
export function pointSeenBy(state, x, y) {
  for (const g of state.guards) {
    if (pointInCone(x, y, g.x, g.y, g.angle, GUARD.coneRange, GUARD.coneHalf)) {
      if (!lineBlocked(g.x, g.y, x, y, state._solids)) return 'guard';
    }
  }
  for (const c of state.cameras) {
    if (c.disabled) continue;
    if (pointInCone(x, y, c.x, c.y, c.angle, CAMERA.range, CAMERA.half)) {
      if (!lineBlocked(c.x, c.y, x, y, state._solids)) return 'camera';
    }
  }
  return null;
}

export function thiefSeen(state) {
  return pointSeenBy(state, state.thief.x, state.thief.y) !== null;
}

export function createWorld(random) {
  let state = createInitialState(random);

  function reset() {
    state = createInitialState(random);
  }

  function step(dt, input) {
    if (state.phase !== 'play') return 0;

    let events = 0;
    state.elapsed += dt;

    if (state.smoke > 0) state.smoke -= dt;
    if (state.jammer > 0) state.jammer -= dt;

    for (const c of state.cameras) {
      c.disabled = state.jammer > 0;
      c.angle = c.baseAngle + Math.sin(state.elapsed * CAMERA.sweep + c.phase) * c.sweep;
    }

    const speed = PLAYER.speed;
    let tx = state.thief.x;
    let ty = state.thief.y;
    let moving = false;

    if (input.target) {
      const dx = input.target.x - tx;
      const dy = input.target.y - ty;
      const d = Math.hypot(dx, dy);
      if (d <= 6) {
        input.target = null;
      } else if (d > 0) {
        tx += (dx / d) * speed * dt;
        ty += (dy / d) * speed * dt;
        moving = true;
        state.thief.angle = Math.atan2(dy, dx);
      }
    } else if (input.mx !== 0 || input.my !== 0) {
      const len = Math.hypot(input.mx, input.my);
      const nx = input.mx / len;
      const ny = input.my / len;
      tx += nx * speed * dt;
      ty += ny * speed * dt;
      moving = true;
      state.thief.angle = Math.atan2(ny, nx);
    }
    state.thief.moving = moving;

    for (const r of state._solids) {
      const resolved = resolveCircleRect(tx, ty, PLAYER.radius, r);
      tx = resolved.x;
      ty = resolved.y;
    }

    tx = Math.max(PLAYER.radius, Math.min(FIELD.width - PLAYER.radius, tx));
    ty = Math.max(FIELD.top + PLAYER.radius, Math.min(FIELD.height - PLAYER.radius, ty));
    state.thief.x = tx;
    state.thief.y = ty;

    const guardSpeed = state.alarm >= ALARM.alertAt ? GUARD.alertSpeed : GUARD.speed;

    for (const g of state.guards) {
      const wps = state._level.guards[state.guards.indexOf(g)].waypoints;
      const [wpx, wpy] = wps[g.wp];
      const dx = wpx - g.x;
      const dy = wpy - g.y;
      const d = Math.hypot(dx, dy);

      if (d <= 4) {
        g.wait -= dt;
        if (g.wait <= 0) {
          g.wp = (g.wp + 1) % wps.length;
          const [nx, ny] = wps[g.wp];
          g.angle = Math.atan2(ny - g.y, nx - g.x);
          g.wait = GUARD.pause;
        }
      } else {
        g.wait = 0;
        const nx = dx / d;
        const ny = dy / d;
        g.x += nx * guardSpeed * dt;
        g.y += ny * guardSpeed * dt;
        const targetAngle = Math.atan2(ny, nx);
        let da = angleDiff(targetAngle, g.angle);
        const maxTurn = 4 * dt;
        if (da > maxTurn) da = maxTurn;
        else if (da < -maxTurn) da = -maxTurn;
        g.angle += da;
      }
    }

    if (input.smoke && state.coinsCollected >= TOOLS.smokeCost && state.smoke <= 0) {
      state.coinsCollected -= TOOLS.smokeCost;
      state.smoke = TOOLS.smokeTime;
      events |= EVENT_TOOL;
    }
    if (input.jammer && state.coinsCollected >= TOOLS.jammerCost && state.jammer <= 0) {
      state.coinsCollected -= TOOLS.jammerCost;
      state.jammer = TOOLS.jammerTime;
      events |= EVENT_TOOL;
    }

    if (!state.idolTaken) {
      const d = dist(state.thief.x, state.thief.y, state._level.idol.x, state._level.idol.y);
      if (d <= TOOLS.lockpickRadius) {
        state.lockpick += dt / TOOLS.lockpickTime;
        state.channeling = state.lockpick > 0 && state.lockpick < 1;
        if (state.lockpick >= 1) {
          state.idolTaken = true;
          state.lockpick = 0;
          state.channeling = false;
          state.loot += IDOL_VALUE;
          events |= EVENT_IDOL | EVENT_LOCKPICK;
        }
      } else {
        if (state.lockpick > 0) {
          state.lockpick = Math.max(0, state.lockpick - dt * 2 / TOOLS.lockpickTime);
          state.channeling = state.lockpick > 0;
        } else {
          state.channeling = false;
        }
      }
    }

    for (const coin of state.coins) {
      if (!coin.taken) {
        const d = dist(state.thief.x, state.thief.y, coin.x, coin.y);
        if (d <= 26) {
          coin.taken = true;
          state.coinsCollected++;
          state.loot += COIN_VALUE;
          events |= EVENT_COIN;
        }
      }
    }

    let seen = false;
    let seenByGuard = false;

    if (state.smoke <= 0) {
      for (const g of state.guards) {
        if (pointInCone(state.thief.x, state.thief.y, g.x, g.y, g.angle, GUARD.coneRange, GUARD.coneHalf)) {
          if (!lineBlocked(g.x, g.y, state.thief.x, state.thief.y, state._solids)) {
            seen = true;
            seenByGuard = true;
            break;
          }
        }
      }
      if (!seen) {
        for (const c of state.cameras) {
          if (c.disabled) continue;
          if (pointInCone(state.thief.x, state.thief.y, c.x, c.y, c.angle, CAMERA.range, CAMERA.half)) {
            if (!lineBlocked(c.x, c.y, state.thief.x, state.thief.y, state._solids)) {
              seen = true;
              break;
            }
          }
        }
      }
    }

    if (seen) {
      const rise = seenByGuard ? ALARM.guardRise : ALARM.cameraRise;
      const prevAlarm = state.alarm;
      state.alarm = Math.min(ALARM.max, state.alarm + rise * dt);
      state.spotted = true;
      if (prevAlarm < 50 && state.alarm >= 50) events |= EVENT_SPOTTED;
    } else {
      state.alarm = Math.max(0, state.alarm - ALARM.decay * dt);
      state.spotted = false;
    }

    if (state.alarm >= ALARM.max) {
      state.phase = 'caught';
      return events | EVENT_CAUGHT;
    }

    if (state.idolTaken) {
      const ex = state._level.exit;
      if (state.thief.x >= ex.x && state.thief.x <= ex.x + ex.w &&
          state.thief.y >= ex.y && state.thief.y <= ex.y + ex.h) {
        state.phase = 'won';
        const timeBonus = Math.max(0, Math.round((180 - state.elapsed) * 10));
        state.loot += timeBonus;
        return events | EVENT_WIN;
      }
    }

    return events;
  }

  return {
    get state() { return state; },
    reset, step,
  };
}