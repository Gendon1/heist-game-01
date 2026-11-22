export const FIELD = { width: 1280, height: 720, top: 88 };
export const STEP = 1 / 60;

export const PLAYER = { radius: 14, speed: 215 };

export const GUARD = {
  radius: 14,
  speed: 72,
  alertSpeed: 108,
  coneRange: 210,
  coneHalf: 0.42,
  pause: 1.2,
};

export const CAMERA = {
  range: 260,
  half: 0.32,
  sweep: 0.55,
};

export const ALARM = {
  guardRise: 42,
  cameraRise: 30,
  decay: 14,
  max: 100,
  alertAt: 60,
};

export const TOOLS = {
  smokeCost: 2,
  smokeTime: 3,
  jammerCost: 3,
  jammerTime: 6,
  lockpickTime: 2,
  lockpickRadius: 46,
};

export const IDOL_VALUE = 10000;
export const COIN_VALUE = 250;

export const PALETTE = {
  backdrop: '#12081f',
  floorA: '#1d7a74',
  floorB: '#5b2a86',
  carpet: '#a4123f',
  carpetEdge: '#ffd166',
  wall: '#3d1e5e',
  wallTrim: '#ff2fb3',
  neonCyan: '#22e6ff',
  gold: '#ffc93c',
  goldDeep: '#e08a00',
  guard: '#22e6ff',
  guardDark: '#0e7d99',
  camera: '#ff5fa2',
  cone: '#ffb020',
  thief: '#ff2fb3',
  thiefDark: '#8f0f63',
  text: '#f5f0ff',
  muted: '#b9a8d9',
  panel: '#241040',
  alarm: '#ff3b30',
  ok: '#37e08b',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
export const BEST_KEY = 'velvet-vault.best';