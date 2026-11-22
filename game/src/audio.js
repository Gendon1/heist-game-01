let ctx = null;
let masterGain = null;
let alarmTimer = null;

function ensureContext() {
  if (ctx) return true;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.15;
    masterGain.connect(ctx.destination);
    return true;
  } catch (e) {
    ctx = null;
    masterGain = null;
    return false;
  }
}

function tone(freq, dur, type, vol, when = 0, slideTo = null) {
  if (!ctx || !masterGain) return;
  if (ctx.state === 'suspended') return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    if (slideTo) {
      osc.frequency.setValueAtTime(freq, ctx.currentTime + when);
      osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + when + dur);
    }
    gain.gain.setValueAtTime(0, ctx.currentTime + when);
    gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + when + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + when + dur);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(ctx.currentTime + when);
    osc.stop(ctx.currentTime + when + dur + 0.02);
  } catch (e) {}
}

function noisePuff(freq, dur, vol, when = 0) {
  if (!ctx || !masterGain) return;
  if (ctx.state === 'suspended') return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, ctx.currentTime + when);
    gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + when + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + when + dur);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(ctx.currentTime + when);
    osc.stop(ctx.currentTime + when + dur + 0.02);
  } catch (e) {}
}

export function createAudio() {
  function unlock() {
    ensureContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  }

  function coin() {
    if (!ensureContext()) return;
    tone(880, 0.08, 'sine', 0.35, 0);
    tone(1320, 0.1, 'sine', 0.25, 0.06);
  }

  function idol() {
    if (!ensureContext()) return;
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => tone(f, 0.15, 'sine', 0.25, i * 0.08));
  }

  function spotted() {
    if (!ensureContext()) return;
    tone(220, 0.25, 'sawtooth', 0.3, 0, 110);
  }

  function caught() {
    if (!ensureContext()) return;
    for (let i = 0; i < 3; i++) {
      tone(440 - i * 55, 0.18, 'square', 0.3, i * 0.12);
    }
  }

  function win() {
    if (!ensureContext()) return;
    const notes = [523, 659, 784, 1047, 1319];
    notes.forEach((f, i) => tone(f, 0.18, 'sine', 0.25, i * 0.07));
  }

  function click() {
    if (!ensureContext()) return;
    tone(600, 0.05, 'sine', 0.2, 0);
  }

  function tool() {
    if (!ensureContext()) return;
    noisePuff(300, 0.25, 0.15, 0);
  }

  function setAlarm(on) {
    if (on) {
      if (alarmTimer) return;
      if (!ensureContext()) return;
      function beep() {
        if (!ctx || ctx.state === 'suspended') return;
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.value = 880;
          gain.gain.setValueAtTime(0, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.16);
          setTimeout(() => {
            if (!ctx || ctx.state === 'suspended') return;
            try {
              const osc2 = ctx.createOscillator();
              const gain2 = ctx.createGain();
              osc2.type = 'square';
              osc2.frequency.value = 660;
              gain2.gain.setValueAtTime(0, ctx.currentTime);
              gain2.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.01);
              gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
              osc2.connect(gain2);
              gain2.connect(masterGain);
              osc2.start(ctx.currentTime);
              osc2.stop(ctx.currentTime + 0.16);
            } catch (e) {}
          }, 300);
        } catch (e) {}
      }
      beep();
      alarmTimer = setInterval(beep, 1200);
    } else {
      if (alarmTimer) {
        clearInterval(alarmTimer);
        alarmTimer = null;
      }
    }
  }

  return { unlock, coin, idol, spotted, caught, win, click, tool, setAlarm };
}