import { FIELD, PALETTE, FONT, TOOLS, GUARD, CAMERA, ALARM, PLAYER } from './config.js';
import { EVENT_COIN, EVENT_IDOL, EVENT_SPOTTED, EVENT_CAUGHT, EVENT_WIN, EVENT_TOOL, EVENT_LOCKPICK } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_WIN = 'win';
export const SCREEN_CAUGHT = 'caught';

function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let lastTime = performance.now();
  let animTime = 0;

  const fontCache = new Map();

  function getFont(size, weight = '600') {
    const key = `${weight} ${size}px`;
    if (!fontCache.has(key)) {
      fontCache.set(key, `${weight} ${size}px ${FONT}`);
    }
    return fontCache.get(key);
  }

  function text(value, x, y, size = 16, color = PALETTE.text, align = 'left', baseline = 'alphabetic') {
    ctx.font = getFont(size);
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    ctx.fillText(value, x, y);
  }

  function roundRect(x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    ctx.lineTo(x + rr, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
    ctx.lineTo(x, y + rr);
    ctx.quadraticCurveTo(x, y, x + rr, y);
    ctx.closePath();
  }

  function drawFloor() {
    const tile = 64;
    const cols = Math.ceil(FIELD.width / tile);
    const rows = Math.ceil(FIELD.height / tile);

    for (let gy = 0; gy < rows; gy++) {
      for (let gx = 0; gx < cols; gx++) {
        const wx = gx * tile;
        const wy = gy * tile;
        const inVault = wx >= 980 && wx < 1236 && wy >= 108 && wy < 300;
        const alt = (gx + gy) % 2 === 0;
        ctx.fillStyle = inVault ? (alt ? '#c8a030' : '#a08020') : (alt ? PALETTE.floorA : PALETTE.floorB);
        ctx.fillRect(wx, wy, tile, tile);

        ctx.strokeStyle = inVault ? '#d4b040' : '#0d5a55';
        ctx.lineWidth = 1;
        ctx.strokeRect(wx, wy, tile, tile);
      }
    }
  }

  function drawCarpets(level) {
    for (const rug of level.decor.rugs) {
      const { x, y, w, h } = rug;
      ctx.fillStyle = PALETTE.carpet;
      ctx.fillRect(x, y, w, h);

      ctx.strokeStyle = PALETTE.carpetEdge;
      ctx.lineWidth = 3;
      ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);

      ctx.strokeStyle = PALETTE.carpetEdge;
      ctx.lineWidth = 1.5;
      const diamond = 24;
      const cx = x + w / 2;
      const startY = y + diamond;
      const endY = y + h - diamond;
      for (let py = startY; py < endY; py += diamond * 1.5) {
        ctx.beginPath();
        ctx.moveTo(cx, py);
        ctx.lineTo(cx + diamond / 2, py + diamond / 2);
        ctx.lineTo(cx, py + diamond);
        ctx.lineTo(cx - diamond / 2, py + diamond / 2);
        ctx.closePath();
        ctx.stroke();
      }
    }
  }

  function drawWalls(level) {
    for (const wall of level.walls) {
      ctx.fillStyle = PALETTE.wall;
      ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
    }

    ctx.strokeStyle = PALETTE.wallTrim;
    ctx.lineWidth = 4;
    for (const wall of level.walls) {
      if (wall.y === 0) {
        ctx.beginPath();
        ctx.moveTo(wall.x, wall.y + wall.h);
        ctx.lineTo(wall.x + wall.w, wall.y + wall.h);
        ctx.stroke();
      } else if (wall.y === FIELD.height - 32) {
        ctx.beginPath();
        ctx.moveTo(wall.x, wall.y);
        ctx.lineTo(wall.x + wall.w, wall.y);
        ctx.stroke();
      } else if (wall.x === 0) {
        ctx.beginPath();
        ctx.moveTo(wall.x + wall.w, wall.y);
        ctx.lineTo(wall.x + wall.w, wall.y + wall.h);
        ctx.stroke();
      } else if (wall.x + wall.w === FIELD.width) {
        ctx.beginPath();
        ctx.moveTo(wall.x, wall.y);
        ctx.lineTo(wall.x, wall.y + wall.h);
        ctx.stroke();
      }
    }

    ctx.fillStyle = PALETTE.neonCyan;
    for (const wall of level.walls) {
      const cx = wall.x + wall.w / 2;
      const cy = wall.y + wall.h / 2;
      if (wall.x === 0 && wall.y === 0) {
        ctx.beginPath(); ctx.arc(wall.x + wall.w, wall.y + wall.h, 6, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(wall.x + wall.w, wall.y, 6, 0, Math.PI * 2); ctx.fill();
      }
      if (wall.x + wall.w === FIELD.width && wall.y === 0) {
        ctx.beginPath(); ctx.arc(wall.x, wall.y + wall.h, 6, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(wall.x, wall.y, 6, 0, Math.PI * 2); ctx.fill();
      }
      if (wall.x === 0 && wall.y + wall.h === FIELD.height) {
        ctx.beginPath(); ctx.arc(wall.x + wall.w, wall.y, 6, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(wall.x + wall.w, wall.y + wall.h, 6, 0, Math.PI * 2); ctx.fill();
      }
      if (wall.x + wall.w === FIELD.width && wall.y + wall.h === FIELD.height) {
        ctx.beginPath(); ctx.arc(wall.x, wall.y, 6, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(wall.x, wall.y + wall.h, 6, 0, Math.PI * 2); ctx.fill();
      }
    }

    for (const p of level.decor.paintings) {
      ctx.fillStyle = '#1a0a2e';
      ctx.fillRect(p.x - 48, p.y - 36, 96, 72);
      ctx.strokeStyle = PALETTE.gold;
      ctx.lineWidth = 3;
      ctx.strokeRect(p.x - 48, p.y - 36, 96, 72);
      const artColors = ['#22e6ff', '#ffc93c', '#ff2fb3'];
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = artColors[i];
        ctx.fillRect(p.x - 30 + i * 20, p.y - 20, 18, 40);
      }
    }

    ctx.font = getFont(28, '800');
    ctx.fillStyle = PALETTE.neonCyan;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = PALETTE.neonCyan;
    ctx.shadowBlur = 12;
    ctx.fillText('VAULT', FIELD.width / 2, 54);
    ctx.shadowBlur = 0;
  }

  function drawPlants(level) {
    for (const plant of level.decor.plants) {
      ctx.fillStyle = '#5d3a1a';
      ctx.beginPath();
      ctx.ellipse(plant.x, plant.y + 10, plant.r * 0.6, plant.r * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1f6b2a';
      for (let i = 0; i < 5; i++) {
        const ang = (i / 5) * Math.PI * 2 + animTime * 0.5;
        const lx = plant.x + Math.cos(ang) * (plant.r * 0.7);
        const ly = plant.y + Math.sin(ang) * (plant.r * 0.7) - 10;
        ctx.beginPath();
        ctx.ellipse(lx, ly, plant.r * 0.4, plant.r * 0.2, ang, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawGoldPiles(level) {
    for (const pile of level.decor.goldPiles) {
      const pulse = 1 + Math.sin(animTime * 3 + pile.x * 0.01) * 0.15;
      for (let i = 0; i < 6; i++) {
        const ox = (i % 3 - 1) * 8;
        const oy = (Math.floor(i / 3) - 0.5) * 8;
        ctx.fillStyle = PALETTE.gold;
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.ellipse(pile.x + ox, pile.y + oy, 7 * pulse, 4 * pulse, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff8';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pile.x + ox - 3, pile.y + oy);
        ctx.lineTo(pile.x + ox + 3, pile.y + oy);
        ctx.moveTo(pile.x + ox, pile.y + oy - 3);
        ctx.lineTo(pile.x + ox, pile.y + oy + 3);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }

  function drawLamps(level) {
    for (let i = 0; i < level.decor.lamps.length; i++) {
      const lamp = level.decor.lamps[i];
      const flicker = 1 + Math.sin(animTime * 7 + i) * 0.15;
      const grad = ctx.createRadialGradient(lamp.x, lamp.y, 0, lamp.x, lamp.y, 120 * flicker);
      grad.addColorStop(0, `rgba(255, 201, 60, ${0.35 * flicker})`);
      grad.addColorStop(0.5, `rgba(255, 150, 30, ${0.15 * flicker})`);
      grad.addColorStop(1, 'rgba(255, 100, 10, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(lamp.x - 150, lamp.y - 150, 300, 300);

      ctx.fillStyle = '#4a3010';
      ctx.fillRect(lamp.x - 6, lamp.y, 12, 30);
      ctx.fillStyle = PALETTE.gold;
      ctx.beginPath();
      ctx.arc(lamp.x, lamp.y, 10, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawSlotMachines(level) {
    for (const obs of level.obstacles) {
      if (obs.w >= 70 && obs.h >= 70) {
        ctx.fillStyle = '#1a1a3a';
        ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
        ctx.strokeStyle = PALETTE.neonCyan;
        ctx.lineWidth = 2;
        ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
        ctx.fillStyle = PALETTE.camera;
        ctx.fillRect(obs.x + 8, obs.y + 8, obs.w - 16, 30);
        ctx.fillStyle = PALETTE.gold;
        ctx.fillRect(obs.x + obs.w / 2 - 10, obs.y + obs.h - 18, 20, 10);
      }
    }
  }

  function drawCrates(level) {
    for (const obs of level.obstacles) {
      if (obs.w < 70) {
        ctx.fillStyle = '#8b6d3a';
        ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
        ctx.strokeStyle = '#5a4320';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(obs.x, obs.y + obs.h / 2);
        ctx.lineTo(obs.x + obs.w, obs.y + obs.h / 2);
        ctx.moveTo(obs.x + obs.w / 2, obs.y);
        ctx.lineTo(obs.x + obs.w / 2, obs.y + obs.h);
        ctx.stroke();
      }
    }
  }

  function drawPillars(level) {
    for (const obs of level.obstacles) {
      if (obs.w >= 70 && obs.h >= 70) continue;
      const isPillar = level.walls.some(w => Math.abs(w.x - obs.x) < 50 && Math.abs(w.y - obs.y) < 50);
      if (!isPillar && obs.w === 40 && obs.h === 40) {
        ctx.fillStyle = PALETTE.wall;
        ctx.beginPath();
        ctx.ellipse(obs.x + 20, obs.y + 20, 20, 20, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = PALETTE.gold;
        ctx.beginPath();
        ctx.ellipse(obs.x + 20, obs.y + 5, 20, 8, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawIdol(state, level) {
    const idol = level.idol;
    if (!state.idolTaken) {
      const pulse = 1 + Math.sin(animTime * 4) * 0.2;
      const glow = ctx.createRadialGradient(idol.x, idol.y, 0, idol.x, idol.y, 80 * pulse);
      glow.addColorStop(0, `rgba(255, 201, 60, ${0.5 * pulse})`);
      glow.addColorStop(0.5, `rgba(255, 150, 30, ${0.2 * pulse})`);
      glow.addColorStop(1, 'rgba(255, 100, 10, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(idol.x - 100, idol.y - 100, 200, 200);

      ctx.fillStyle = PALETTE.gold;
      ctx.beginPath();
      ctx.ellipse(idol.x, idol.y - 20, 18 * pulse, 18 * pulse, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(idol.x - 16, idol.y - 2);
      ctx.lineTo(idol.x - 24, idol.y + 28);
      ctx.lineTo(idol.x + 24, idol.y + 28);
      ctx.lineTo(idol.x + 16, idol.y - 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#0ff';
      ctx.beginPath();
      ctx.moveTo(idol.x, idol.y - 30);
      ctx.lineTo(idol.x - 6, idol.y - 18);
      ctx.lineTo(idol.x + 6, idol.y - 18);
      ctx.closePath();
      ctx.fill();

      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2 + animTime * 2;
        const sx = idol.x + Math.cos(ang) * 35 * pulse;
        const sy = idol.y + Math.sin(ang) * 35 * pulse;
        ctx.fillStyle = `rgba(255,255,255,${0.8 * pulse})`;
        ctx.beginPath();
        ctx.moveTo(sx, sy - 3);
        ctx.lineTo(sx + 3, sy + 3);
        ctx.lineTo(sx - 3, sy + 3);
        ctx.closePath();
        ctx.fill();
      }
    } else {
      ctx.fillStyle = '#3a2a5a';
      ctx.beginPath();
      ctx.ellipse(idol.x, idol.y + 10, 30, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      const shimmer = 0.5 + Math.sin(animTime * 5) * 0.5;
      ctx.fillStyle = `rgba(255,201,60,${shimmer * 0.6})`;
      ctx.font = getFont(12, '700');
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('TAKEN', idol.x, idol.y - 20);
    }
  }

  function drawCoins(state) {
    for (const coin of state.coins) {
      if (coin.taken) continue;
      const spin = (animTime * 2 + coin.x * 0.01) % (Math.PI * 2);
      const scaleX = Math.abs(Math.cos(spin));
      ctx.fillStyle = PALETTE.gold;
      ctx.beginPath();
      ctx.ellipse(coin.x, coin.y, 10 * scaleX, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff8';
      ctx.font = getFont(12, '800');
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', coin.x, coin.y + 1);

      const glow = ctx.createRadialGradient(coin.x, coin.y, 0, coin.x, coin.y, 20);
      glow.addColorStop(0, 'rgba(255,201,60,0.3)');
      glow.addColorStop(1, 'rgba(255,201,60,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(coin.x - 25, coin.y - 25, 50, 50);
    }
  }

  function drawExit(level) {
    const ex = level.exit;
    const pulse = 1 + Math.sin(animTime * 3) * 0.2;
    const glow = ctx.createRadialGradient(ex.x + ex.w / 2, ex.y + ex.h / 2, 0, ex.x + ex.w / 2, ex.y + ex.h / 2, 80 * pulse);
    glow.addColorStop(0, `rgba(55,224,139,${0.5 * pulse})`);
    glow.addColorStop(0.5, `rgba(34,230,255,${0.2 * pulse})`);
    glow.addColorStop(1, 'rgba(34,230,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(ex.x - 50, ex.y - 50, ex.w + 100, ex.h + 100);

    ctx.fillStyle = '#0a3a2a';
    ctx.fillRect(ex.x, ex.y, ex.w, ex.h);
    ctx.strokeStyle = PALETTE.ok;
    ctx.lineWidth = 3;
    ctx.strokeRect(ex.x, ex.y, ex.w, ex.h);

    ctx.fillStyle = PALETTE.ok;
    ctx.font = getFont(14, '800');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('EXIT', ex.x + ex.w / 2, ex.y + ex.h / 2);

    const chevronOffset = (animTime * 60) % 40;
    ctx.strokeStyle = PALETTE.ok;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const cx = ex.x + ex.w / 2;
      const cy = ex.y + ex.h + 10 + i * 15 - chevronOffset;
      ctx.beginPath();
      ctx.moveTo(cx - 10, cy + 5);
      ctx.lineTo(cx, cy - 5);
      ctx.lineTo(cx + 10, cy + 5);
      ctx.stroke();
    }
  }

  function drawGuardCone(g) {
    const range = GUARD.coneRange;
    const half = GUARD.coneHalf;
    ctx.fillStyle = 'rgba(255,176,32,0.28)';
    ctx.beginPath();
    ctx.moveTo(g.x, g.y);
    ctx.arc(g.x, g.y, range, g.angle - half, g.angle + half);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,176,32,0.7)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.arc(g.x, g.y, range, g.angle - half, g.angle + half);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawCameraCone(c) {
    if (c.disabled) return;
    const range = CAMERA.range;
    const half = CAMERA.half;
    ctx.fillStyle = 'rgba(255,95,162,0.30)';
    ctx.beginPath();
    ctx.moveTo(c.x, c.y);
    ctx.arc(c.x, c.y, range, c.angle - half, c.angle + half);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,95,162,0.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.arc(c.x, c.y, range, c.angle - half, c.angle + half);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawCones(state) {
    for (const g of state.guards) drawGuardCone(g);
    for (const c of state.cameras) drawCameraCone(c);
  }

  function drawGuards(state) {
    for (const g of state.guards) {
      const alerted = state.alarm >= ALARM.alertAt;
      ctx.fillStyle = PALETTE.guard;
      ctx.beginPath();
      ctx.arc(g.x, g.y, GUARD.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = PALETTE.guardDark;
      ctx.beginPath();
      ctx.ellipse(g.x, g.y - 8, 14, 8, g.angle, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fff';
      const eyeOffset = 6;
      const ex1 = g.x + Math.cos(g.angle - 0.3) * eyeOffset;
      const ey1 = g.y + Math.sin(g.angle - 0.3) * eyeOffset;
      const ex2 = g.x + Math.cos(g.angle + 0.3) * eyeOffset;
      const ey2 = g.y + Math.sin(g.angle + 0.3) * eyeOffset;
      ctx.beginPath(); ctx.arc(ex1, ey1, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(ex2, ey2, 2, 0, Math.PI * 2); ctx.fill();

      ctx.strokeStyle = '#222';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      const bx = g.x + Math.cos(g.angle + Math.PI / 2) * 14;
      const by = g.y + Math.sin(g.angle + Math.PI / 2) * 14;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + Math.cos(g.angle) * 20, by + Math.sin(g.angle) * 20);
      ctx.stroke();

      if (alerted) {
        ctx.strokeStyle = PALETTE.alarm;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(g.x, g.y, GUARD.radius + 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = PALETTE.alarm;
        ctx.font = getFont(18, '800');
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('!', g.x, g.y - GUARD.radius - 10);
      }
    }
  }

  function drawCameras(state) {
    for (const c of state.cameras) {
      if (c.disabled) {
        ctx.fillStyle = '#444';
        ctx.beginPath();
        ctx.arc(c.x, c.y, 12, Math.PI, 0);
        ctx.lineTo(c.x + 12, c.y + 10);
        ctx.lineTo(c.x - 12, c.y + 10);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#888';
        ctx.beginPath();
        ctx.arc(c.x, c.y - 4, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#aaa';
        ctx.font = getFont(10, '700');
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('JAMMED', c.x, c.y + 14);
      } else {
        ctx.fillStyle = PALETTE.camera;
        ctx.beginPath();
        ctx.arc(c.x, c.y, 12, Math.PI, 0);
        ctx.lineTo(c.x + 12, c.y + 10);
        ctx.lineTo(c.x - 12, c.y + 10);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(c.x, c.y - 4, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.arc(c.x + Math.cos(c.angle) * 3, c.y - 4 + Math.sin(c.angle) * 3, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawThief(state) {
    const t = state.thief;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(t.x + 3, t.y + 5, 16, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = PALETTE.thief;
    ctx.beginPath();
    ctx.arc(t.x, t.y, PLAYER.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = PALETTE.thiefDark;
    ctx.beginPath();
    ctx.arc(t.x, t.y - 6, 14, Math.PI, 0);
    ctx.lineTo(t.x + 14, t.y + 2);
    ctx.lineTo(t.x - 14, t.y + 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#330022';
    ctx.fillRect(t.x - 14, t.y - 8, 28, 6);

    ctx.fillStyle = '#fff';
    const eyeOffset = 5;
    const ex1 = t.x + Math.cos(t.angle - 0.35) * eyeOffset;
    const ey1 = t.y + Math.sin(t.angle - 0.35) * eyeOffset - 6;
    const ex2 = t.x + Math.cos(t.angle + 0.35) * eyeOffset;
    const ey2 = t.y + Math.sin(t.angle + 0.35) * eyeOffset - 6;
    ctx.beginPath(); ctx.arc(ex1, ey1, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(ex2, ey2, 2, 0, Math.PI * 2); ctx.fill();

    if (state.loot > 0 || state.coinsCollected > 0 || state.idolTaken) {
      ctx.fillStyle = PALETTE.gold;
      ctx.beginPath();
      ctx.arc(t.x + 18, t.y + 10, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff8';
      ctx.font = getFont(10, '800');
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', t.x + 18, t.y + 11);
    }

    if (state.smoke > 0) {
      const alpha = Math.min(1, state.smoke / TOOLS.smokeTime) * 0.4;
      const pulse = 1 + Math.sin(animTime * 5) * 0.2;
      ctx.fillStyle = `rgba(180, 100, 220, ${alpha * pulse})`;
      ctx.beginPath();
      ctx.arc(t.x, t.y, 40 * pulse, 0, Math.PI * 2);
      ctx.fill();
    }

    if (state.channeling) {
      const prog = state.lockpick;
      ctx.strokeStyle = PALETTE.gold;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(t.x, t.y, 28, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = PALETTE.gold;
      ctx.font = getFont(11, '700');
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(Math.ceil((1 - prog) * TOOLS.lockpickTime) + 's', t.x, t.y - 40);
    }
  }

  function drawAlarmVignette(state) {
    if (state.alarm <= 30) return;
    const alpha = Math.min(1, (state.alarm - 30) / 70) * 0.6;
    const grad = ctx.createRadialGradient(FIELD.width / 2, FIELD.height / 2, 0, FIELD.width / 2, FIELD.height / 2, Math.max(FIELD.width, FIELD.height));
    grad.addColorStop(0, 'rgba(255,59,48,0)');
    grad.addColorStop(0.7, `rgba(255,59,48,${alpha * 0.3})`);
    grad.addColorStop(1, `rgba(255,59,48,${alpha})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);

    if (state.spotted) {
      const flash = Math.sin(animTime * 15) > 0;
      if (flash) {
        ctx.fillStyle = PALETTE.alarm;
        ctx.font = getFont(20, '800');
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('SPOTTED!', state.thief.x, state.thief.y - 40);
      }
    }
  }

  function drawHUD(state, best) {
    const panelY = 0;
    const panelH = 84;
    ctx.fillStyle = PALETTE.backdrop + 'ee';
    ctx.fillRect(0, panelY, FIELD.width, panelH);
    ctx.strokeStyle = PALETTE.wallTrim;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, panelH);
    ctx.lineTo(FIELD.width, panelH);
    ctx.stroke();

    const pad = 16;
    const panelW = 280;
    const gap = 20;
    const cx = FIELD.width / 2;

    ctx.fillStyle = PALETTE.panel;
    roundRect(pad, pad, panelW, panelH - pad * 2, 8);
    ctx.fill();
    ctx.strokeStyle = PALETTE.neonCyan;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = PALETTE.gold;
    ctx.font = getFont(16);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('🔔 ALARM', pad + 12, pad + 16);
    const alarmPct = Math.round(state.alarm);
    const barW = panelW - 24;
    const barH = 14;
    const bx = pad + 12;
    const by = pad + 38;
    const grad = ctx.createLinearGradient(bx, by, bx + barW, by);
    grad.addColorStop(0, PALETTE.ok);
    grad.addColorStop(0.5, '#ffb020');
    grad.addColorStop(1, PALETTE.alarm);
    ctx.fillStyle = grad;
    ctx.fillRect(bx, by, barW * (alarmPct / 100), barH);
    ctx.strokeStyle = '#fff4';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, barW, barH);
    for (let i = 1; i < 10; i++) {
      const tx = bx + barW * i / 10;
      ctx.beginPath();
      ctx.moveTo(tx, by);
      ctx.lineTo(tx, by + barH);
      ctx.stroke();
    }
    ctx.fillStyle = PALETTE.text;
    ctx.font = getFont(14, '700');
    ctx.textAlign = 'right';
    ctx.fillText(alarmPct + '%', pad + panelW - 12, pad + 16);

    const centerX = cx - panelW / 2;
    ctx.fillStyle = PALETTE.panel;
    roundRect(centerX, pad, panelW, panelH - pad * 2, 8);
    ctx.fill();
    ctx.strokeStyle = PALETTE.neonCyan;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = PALETTE.neonCyan;
    ctx.font = getFont(16);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('👁 STEALTH', centerX + 12, pad + 16);
    const stealth = 100 - alarmPct;
    ctx.fillStyle = stealth > 50 ? PALETTE.ok : (stealth > 25 ? '#ffb020' : PALETTE.alarm);
    ctx.font = getFont(28, '800');
    ctx.textAlign = 'right';
    ctx.fillText(stealth + '%', centerX + panelW - 12, pad + 38);

    const rightX = FIELD.width - pad - panelW;
    ctx.fillStyle = PALETTE.panel;
    roundRect(rightX, pad, panelW, panelH - pad * 2, 8);
    ctx.fill();
    ctx.strokeStyle = PALETTE.neonCyan;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = PALETTE.gold;
    ctx.font = getFont(16);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('💰 LOOT', rightX + 12, pad + 14);
    ctx.fillStyle = PALETTE.text;
    ctx.font = getFont(22, '700');
    ctx.fillText('$' + state.loot.toLocaleString(), rightX + 12, pad + 42);

    const mins = Math.floor(state.elapsed / 60);
    const secs = Math.floor(state.elapsed % 60);
    ctx.font = getFont(12);
    ctx.fillStyle = PALETTE.muted;
    ctx.textAlign = 'left';
    ctx.fillText(`TIME ${mins}:${secs.toString().padStart(2,'0')}  •  COINS ${state.coinsCollected}`, rightX + 12, pad + 66);

    ctx.font = getFont(11);
    ctx.textAlign = 'center';
    const toolY = FIELD.height - 28;
    const canSmoke = state.coinsCollected >= TOOLS.smokeCost;
    const canJammer = state.coinsCollected >= TOOLS.jammerCost;
    ctx.fillStyle = canSmoke ? PALETTE.gold : PALETTE.muted;
    ctx.fillText(`[1] Smoke (${TOOLS.smokeCost}c)`, FIELD.width / 2 - 110, toolY);
    ctx.fillStyle = canJammer ? PALETTE.gold : PALETTE.muted;
    ctx.fillText(`[2] Jammer (${TOOLS.jammerCost}c)`, FIELD.width / 2 + 110, toolY);

    const objText = state.idolTaken ? 'IDOL SECURED — GET TO THE EXIT!' : 'OBJECTIVE: STEAL THE GOLDEN IDOL — THEN REACH THE EXIT';
    ctx.fillStyle = PALETTE.neonCyan;
    ctx.font = getFont(16, '700');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(objText, FIELD.width / 2, FIELD.height - 48);
    if (state.idolTaken) {
      ctx.fillStyle = PALETTE.gold;
      ctx.font = getFont(14);
      ctx.fillText('✓', FIELD.width / 2 + ctx.measureText(objText).width / 2 + 10, FIELD.height - 50);
    }
  }

  function drawPanel(screen, state, best) {
    const w = 600;
    const h = 400;
    const x = (FIELD.width - w) / 2;
    const y = (FIELD.height - h) / 2;

    ctx.fillStyle = PALETTE.panel + 'f0';
    roundRect(x, y, w, h, 16);
    ctx.fill();
    ctx.strokeStyle = PALETTE.wallTrim;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.shadowColor = PALETTE.wallTrim;
    ctx.shadowBlur = 20;

    if (screen === SCREEN_TITLE) {
      ctx.fillStyle = PALETTE.gold;
      ctx.font = getFont(48, '800');
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('THE VELVET VAULT', FIELD.width / 2, y + 80);

      ctx.fillStyle = PALETTE.muted;
      ctx.font = getFont(18);
      ctx.fillText('A one-room heist — steal the Golden Idol and slip out.', FIELD.width / 2, y + 130);

      ctx.fillStyle = PALETTE.text;
      ctx.font = getFont(16);
      const lines = [
        'Move: WASD / Arrows or click to walk',
        'Tools: [1] Smoke Bomb (2 coins)  [2] Jammer (3 coins)',
        'Hold still by the Idol to lockpick it (2s).',
        'Seen = alarm rises. Alarm 100% = caught.',
        'Guards patrol — read their amber cones. Cameras sweep pink beams.',
      ];
      lines.forEach((l, i) => ctx.fillText(l, FIELD.width / 2, y + 170 + i * 26));

      ctx.fillStyle = PALETTE.gold;
      ctx.font = getFont(16, '700');
      ctx.fillText(`Best loot: $${best.toLocaleString()}`, FIELD.width / 2, y + 310);

      ctx.fillStyle = PALETTE.neonCyan;
      ctx.font = getFont(18, '700');
      ctx.fillText('Press Space or Click to Begin', FIELD.width / 2, y + 360);
    } else if (screen === SCREEN_PAUSED) {
      ctx.fillStyle = PALETTE.neonCyan;
      ctx.font = getFont(48, '800');
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('PAUSED', FIELD.width / 2, y + 120);

      ctx.fillStyle = PALETTE.text;
      ctx.font = getFont(18);
      ctx.fillText('Press Space or Escape to resume', FIELD.width / 2, y + 200);
      ctx.fillText(`Loot so far: $${state.loot.toLocaleString()}`, FIELD.width / 2, y + 240);
    } else if (screen === SCREEN_WIN) {
      ctx.fillStyle = PALETTE.gold;
      ctx.font = getFont(48, '800');
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('VAULT CRACKED!', FIELD.width / 2, y + 100);

      ctx.fillStyle = PALETTE.text;
      ctx.font = getFont(22);
      const mins = Math.floor(state.elapsed / 60);
      const secs = Math.floor(state.elapsed % 60);
      ctx.fillText(`Total Loot: $${state.loot.toLocaleString()}`, FIELD.width / 2, y + 180);
      ctx.fillText(`Time: ${mins}:${secs.toString().padStart(2,'0')}`, FIELD.width / 2, y + 220);

      ctx.fillStyle = PALETTE.neonCyan;
      ctx.font = getFont(18, '700');
      ctx.fillText('Press Space to Play Again', FIELD.width / 2, y + 300);
    } else if (screen === SCREEN_CAUGHT) {
      ctx.fillStyle = PALETTE.alarm;
      ctx.font = getFont(48, '800');
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('CAUGHT!', FIELD.width / 2, y + 100);

      ctx.fillStyle = PALETTE.text;
      ctx.font = getFont(18);
      ctx.fillText('The alarm hit 100%.', FIELD.width / 2, y + 160);
      ctx.fillText(`Loot kept: $${state.loot.toLocaleString()}`, FIELD.width / 2, y + 200);

      ctx.fillStyle = PALETTE.muted;
      ctx.font = getFont(16);
      ctx.fillText('Press Space to Try Again', FIELD.width / 2, y + 280);
    }

    ctx.shadowBlur = 0;
  }

  function draw(state, screen, best) {
    const now = performance.now();
    const dt = (now - lastTime) / 1000;
    lastTime = now;
    animTime += dt;

    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    ctx.scale(dpr, dpr);

    const scale = Math.min(cssW / FIELD.width, cssH / FIELD.height);
    const offsetX = (cssW - FIELD.width * scale) / 2 / scale;
    const offsetY = (cssH - FIELD.height * scale) / 2 / scale;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, cssW, cssH);

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    const level = state._level;

    drawFloor();
    drawCarpets(level);
    drawWalls(level);
    drawPlants(level);
    drawGoldPiles(level);
    drawLamps(level);
    drawSlotMachines(level);
    drawCrates(level);
    drawPillars(level);
    drawIdol(state, level);
    drawCoins(state);
    drawExit(level);
    drawCones(state);
    drawGuards(state);
    drawCameras(state);
    drawThief(state);
    if (state.smoke > 0) {
    }
    if (state.channeling) {
    }

    ctx.restore();

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    drawHUD(state, best);

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);
    drawAlarmVignette(state);
    ctx.restore();

    if (screen !== SCREEN_PLAY) {
      drawPanel(screen, state, best);
    }
  }

  function toField(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    const scale = Math.min(cssW / FIELD.width, cssH / FIELD.height);
    const offsetX = (cssW - FIELD.width * scale) / 2 / scale;
    const offsetY = (cssH - FIELD.height * scale) / 2 / scale;

    const x = (clientX - rect.left - offsetX * scale) / scale;
    const y = (clientY - rect.top - offsetY * scale) / scale;
    return { x, y };
  }

  return { draw, toField };
}

export { createRenderer };