import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import {
  createWorld,
  EVENT_COIN, EVENT_IDOL, EVENT_SPOTTED, EVENT_CAUGHT, EVENT_WIN, EVENT_TOOL, EVENT_LOCKPICK,
} from './world.js';
import {
  ACTION_CONFIRM, ACTION_PAUSE, ACTION_SMOKE, ACTION_JAMMER,
  createInput,
} from './input.js';
import {
  createRenderer,
  SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_WIN, SCREEN_CAUGHT,
} from './render.js';
import { stageShot, pilotInput } from './shots.js';
import { createAudio } from './audio.js';

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');

const params = new URLSearchParams(window.location.search);
const shotParam = params.get('shot');
const simParam = params.get('sim');
const seedParam = params.get('seed');
const seed = seedParam ? parseInt(seedParam, 10) : (Math.random() * 0x100000000) >>> 0;

const random = createRandom(seed);
const world = createWorld(random);
const renderer = createRenderer(canvas);
const audio = createAudio();
const input = createInput(canvas, renderer.toField);

function readBest() {
  try {
    return parseInt(localStorage.getItem(BEST_KEY), 10) || 0;
  } catch {
    return 0;
  }
}
function saveBest(v) {
  try { localStorage.setItem(BEST_KEY, String(v)); } catch {}
}

let screen = SCREEN_TITLE;
let best = readBest();
let accumulator = 0;
let lastTime = performance.now();
let paused = false;

let pendingSmoke = false;
let pendingJammer = false;

function announce(msg) {
  statusEl.textContent = msg;
}

function runShot(name) {
  const scene = stageShot(name, world);
  function paintFrame(i) {
    if (i > 0) {
      window.__shotReady = true;
      return;
    }
    renderer.draw(world.state, scene.screen, scene.best);
    requestAnimationFrame(() => paintFrame(i + 1));
  }
  requestAnimationFrame(() => paintFrame(0));
}

function runSim() {
  const maxSteps = Math.floor(240 / STEP);
  let steps = 0;
  for (let i = 0; i < maxSteps; i++) {
    if (world.state.phase !== 'play') break;
    const pilot = pilotInput(world.state);
    world.step(STEP, pilot);
    steps += 1;
  }
  const s = world.state;
  const result = {
    won: s.phase === 'won',
    caught: s.phase === 'caught',
    loot: s.loot,
    alarm: Math.round(s.alarm),
    coinsCollected: s.coinsCollected,
    idolTaken: s.idolTaken,
    elapsed: +s.elapsed.toFixed(1),
    steps,
  };
  window.__simResult = result;
  document.title = JSON.stringify(result);
  renderer.draw(s, s.phase === 'won' ? SCREEN_WIN : (s.phase === 'caught' ? SCREEN_CAUGHT : SCREEN_PLAY), best);
  window.__shotReady = true;
}

function endGame(won) {
  screen = won ? SCREEN_WIN : SCREEN_CAUGHT;
  const s = world.state;
  if (s.loot > best) {
    best = s.loot;
    saveBest(best);
  }
  announce(won ? `Escaped with $${s.loot.toLocaleString()}!` : `Caught! Loot: $${s.loot.toLocaleString()}`);
}

function startNewGame() {
  world.reset();
  screen = SCREEN_PLAY;
  paused = false;
  pendingSmoke = false;
  pendingJammer = false;
  input.clearTarget();
  announce('Heist started. Steal the Golden Idol!');
}

function handleActions(input) {
  const actions = input.takeActions();
  if (actions & ACTION_CONFIRM) {
    audio.unlock();
    audio.click();
    if (screen === SCREEN_TITLE || screen === SCREEN_WIN || screen === SCREEN_CAUGHT) {
      startNewGame();
    }
  }
  if (actions & ACTION_PAUSE) {
    audio.unlock();
    audio.click();
    if (screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      paused = true;
    } else if (screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      paused = false;
    }
  }
  if (actions & ACTION_SMOKE) {
    pendingSmoke = true;
  }
  if (actions & ACTION_JAMMER) {
    pendingJammer = true;
  }
}

function step(input) {
  const s = world.state;
  if (screen === SCREEN_TITLE) {
    world.step(STEP, { mx: 0, my: 0, target: null, smoke: false, jammer: false });
    return;
  }
  if (screen !== SCREEN_PLAY) return;

  const mv = input.move();
  const inputObj = {
    mx: mv.x,
    my: mv.y,
    target: input.target(),
    smoke: pendingSmoke,
    jammer: pendingJammer,
  };
  pendingSmoke = false;
  pendingJammer = false;

  const events = world.step(STEP, inputObj);

  if (inputObj.target) {
    const dx = s.thief.x - inputObj.target.x;
    const dy = s.thief.y - inputObj.target.y;
    if (Math.hypot(dx, dy) <= 8) {
      input.clearTarget();
    }
  }

  if (events & EVENT_COIN) {
    audio.coin();
    announce(`Coin! Loot $${s.loot.toLocaleString()}`);
  }
  if (events & EVENT_IDOL) {
    audio.idol();
    announce('Idol secured! Get to the exit!');
  }
  if (events & EVENT_SPOTTED) {
    audio.spotted();
    audio.setAlarm(true);
  }
  if (events & EVENT_TOOL) {
    audio.tool();
  }
  if (events & EVENT_CAUGHT) {
    audio.caught();
    audio.setAlarm(false);
    endGame(false);
  }
  if (events & EVENT_WIN) {
    audio.win();
    audio.setAlarm(false);
    endGame(true);
  }

  if (s.alarm < 25) {
    audio.setAlarm(false);
  }
}

function frame(now) {
  handleActions(input);

  const dt = Math.min((now - lastTime) / 1000, 0.25);
  lastTime = now;

  if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
    accumulator += dt;
    while (accumulator >= STEP) {
      step(input);
      accumulator -= STEP;
    }
  }

  renderer.draw(world.state, screen, best);
  requestAnimationFrame(frame);
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden && screen === SCREEN_PLAY) {
    screen = SCREEN_PAUSED;
    paused = true;
  }
});

if (shotParam) {
  runShot(shotParam);
} else if (simParam) {
  runSim();
} else {
  requestAnimationFrame(frame);
}