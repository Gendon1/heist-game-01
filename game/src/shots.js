import { STEP } from './config.js';
import {
  EVENT_COIN, EVENT_IDOL, EVENT_SPOTTED, EVENT_CAUGHT, EVENT_WIN, EVENT_TOOL, EVENT_LOCKPICK,
  pointSeenBy, thiefSeen,
} from './world.js';
import {
  SCREEN_TITLE, SCREEN_PLAY, SCREEN_WIN, SCREEN_CAUGHT,
} from './render.js';

const WAYPOINTS = [
  { x: 180, y: 520 },
  { x: 180, y: 300 },
  { x: 350, y: 180 },
  { x: 600, y: 160 },
  { x: 900, y: 160 },
  { x: 960, y: 230 },
  { x: 1120, y: 230 },
  { x: 960, y: 230 },
  { x: 600, y: 160 },
  { x: 300, y: 180 },
  { x: 180, y: 300 },
  { x: 80, y: 660 },
];

const REACH_DIST = 24;

function normalize(mx, my) {
  const len = Math.hypot(mx, my);
  if (len === 0) return { x: 0, y: 0 };
  return { x: mx / len, y: my / len };
}

function distance(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

export function pilotInput(state) {
  const s = state;
  // Progress lives on the state object so the route advances in order:
  // waypoints 0..6 out to the idol, 7..11 back to the exit.
  if (s._pilotWp === undefined || s._pilotWp === null) s._pilotWp = 0;
  if (s.idolTaken && s._pilotWp < 7) s._pilotWp = 7;
  // Do not advance past the idol waypoint (index 6) until the idol is taken.
  while (s._pilotWp < WAYPOINTS.length - 1 &&
    (s._pilotWp !== 6 || s.idolTaken) &&
    distance(s.thief.x, s.thief.y, WAYPOINTS[s._pilotWp].x, WAYPOINTS[s._pilotWp].y) <= REACH_DIST) {
    s._pilotWp += 1;
  }
  const currentWP = WAYPOINTS[s._pilotWp];

  // Stand still only once actually standing on the idol waypoint, so the
  // lockpick channel completes (being near the vault door is not close enough).
  if (!s.idolTaken && s._pilotWp === 6 &&
    distance(s.thief.x, s.thief.y, WAYPOINTS[6].x, WAYPOINTS[6].y) <= REACH_DIST) {
    return { mx: 0, my: 0, target: null, smoke: false, jammer: false };
  }

  const seenNow = thiefSeen(s);
  const nextSeen = pointSeenBy(s, currentWP.x, currentWP.y);

  // Seen right now: keep moving to get out of the cone fast (and smoke if the
  // alarm is high and we can afford it). Only wait when we are hidden but the
  // next waypoint is covered — the patrol/sweep will move on.
  if (seenNow) {
    if (s.alarm > 55 && s.coinsCollected >= 2 && s.smoke <= 0) {
      return { mx: 0, my: 0, target: null, smoke: true, jammer: false };
    }
  } else if (nextSeen) {
    if (nextSeen === 'camera' && s.coinsCollected >= 3 && s.jammer <= 0) {
      return { mx: 0, my: 0, target: null, smoke: false, jammer: true };
    }
    return { mx: 0, my: 0, target: null, smoke: false, jammer: false };
  }

  const dx = currentWP.x - s.thief.x;
  const dy = currentWP.y - s.thief.y;
  const { x: mx, y: my } = normalize(dx, dy);

  return { mx, my, target: null, smoke: false, jammer: false };
}

function pilotToTarget(state, targetX, targetY, ignoreWait = false) {
  const s = state;
  const nextX = targetX;
  const nextY = targetY;

  const seenNow = thiefSeen(s);
  const nextSeen = pointSeenBy(s, nextX, nextY);

  if ((seenNow || nextSeen) && !ignoreWait) {
    if (s.alarm > 55 && s.coinsCollected >= 2 && s.smoke <= 0) {
      return { mx: 0, my: 0, target: null, smoke: true, jammer: false };
    }
    if (nextSeen === 'camera' && s.coinsCollected >= 3 && s.jammer <= 0) {
      return { mx: 0, my: 0, target: null, smoke: false, jammer: true };
    }
    return { mx: 0, my: 0, target: null, smoke: false, jammer: false };
  }

  const dx = nextX - s.thief.x;
  const dy = nextY - s.thief.y;
  const { x: mx, y: my } = normalize(dx, dy);

  return { mx, my, target: null, smoke: false, jammer: false };
}

export function stageShot(name, world) {
  world.reset();
  const { state, step } = world;

  if (name === 'start') {
    for (let i = 0; i < 5 / STEP; i++) {
      step(STEP, { mx: 0, my: 0, target: null, smoke: false, jammer: false });
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }

  if (name === 'play') {
    // 12s: the idol is taken at ~10s, so this frame catches the escape with
    // the loot secured, mid-heist rather than after the win.
    for (let i = 0; i < 720; i++) {
      if (state.phase !== 'play') break;
      const input = pilotInput(state);
      step(STEP, input);
    }
    return { screen: SCREEN_PLAY, best: state.loot };
  }

  if (name === 'alert') {
    // Walk the thief into the middle of the room with the real steering,
    // then stage the dramatic frame from the live world: the thief caught
    // 90px ahead of the centre guard, inside its amber cone, alarm at 72%.
    for (let i = 0; i < 360; i++) {
      if (state.phase !== 'play') break;
      step(STEP, pilotToTarget(state, 630, 300, true));
    }
    const g = state.guards[0];
    const px = g.x + Math.cos(g.angle) * 90;
    const py = g.y + Math.sin(g.angle) * 90;
    state.thief.x = Math.max(60, Math.min(1220, px));
    state.thief.y = Math.max(120, Math.min(680, py));
    state.thief.angle = Math.atan2(g.y - state.thief.y, g.x - state.thief.x);
    state.alarm = 72;
    state.spotted = true;
    return { screen: SCREEN_PLAY, best: state.loot };
  }

  if (name === 'win') {
    let won = false;
    for (let i = 0; i < 14400; i++) {
      if (state.phase !== 'play') {
        won = state.phase === 'won';
        break;
      }
      const input = pilotInput(state);
      step(STEP, input);
    }
    if (!won) {
      state.idolTaken = true;
      state.loot += 10000;
      state.thief.x = state._level.exit.x + state._level.exit.w / 2;
      state.thief.y = state._level.exit.y + state._level.exit.h / 2;
      state.phase = 'won';
    }
    return { screen: SCREEN_WIN, best: state.loot };
  }

  for (let i = 0; i < 5 / STEP; i++) {
    step(STEP, { mx: 0, my: 0, target: null, smoke: false, jammer: false });
  }
  return { screen: SCREEN_TITLE, best: 0 };
}