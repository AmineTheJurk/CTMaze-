// Audio: your four clips + synthesized fallbacks. Everything routes through one bus so "echo mode" affects all sounds.
const Snd = (() => {
  let ctx, bus, lp, dryG, wetG, delay, fb, conv, master;
  const buf = {};
  let ready = false;

  function impulse(sec) {
    const n = ctx.sampleRate * sec, b = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.6); }
    return b;
  }
  async function load(name, url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error('missing ' + url);
    buf[name] = await ctx.decodeAudioData(await r.arrayBuffer());
  }
  async function init() {
    if (ready) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    bus = ctx.createGain(); lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 20000;
    dryG = ctx.createGain(); wetG = ctx.createGain(); wetG.gain.value = 0;
    delay = ctx.createDelay(1); delay.delayTime.value = 0.27; fb = ctx.createGain(); fb.gain.value = 0.5;
    conv = ctx.createConvolver(); conv.buffer = impulse(2.2);
    bus.connect(lp); lp.connect(dryG); dryG.connect(master);
    lp.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(wetG);
    lp.connect(conv); conv.connect(wetG); wetG.connect(master);
    ready = true;
    const jobs = ['police_detect', 'police_catched', 'lady_foundedheal', 'puppet_exploded', 'hurterboy_stabbed', 'player_stabbed']
      .map(n => load(n, 'audio/' + n + '.mp3').catch(() => {}));
    await Promise.all(jobs);
  }
  function resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); }

  // ---- synth helpers ----
  function tone(f, dur, type = 'sine', vol = 0.2, f2 = null, delayS = 0) {
    const t = ctx.currentTime + delayS, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, vol = 0.2, ff = 2000, q = 0.7, delayS = 0) {
    const t = ctx.currentTime + delayS, n = ctx.sampleRate * dur, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource(); s.buffer = b;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = ff; f.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(bus); s.start(t);
  }
  const synth = {
    hurterboy_stabbed: () => { noise(0.25, 0.5, 900, 1); tone(180, 0.3, 'sawtooth', 0.3, 60); tone(900, 0.12, 'square', 0.15, 300); },
    player_stabbed: () => { tone(120, 0.7, 'sawtooth', 0.22, 70); tone(125, 0.7, 'sine', 0.2, 72); },
    grapple: () => { noise(0.5, 0.35, 1800, 0.8); tone(300, 0.4, 'triangle', 0.15, 900); },
    teleport: () => { tone(200, 0.6, 'sine', 0.25, 1600); tone(1600, 0.4, 'sine', 0.15, 100, 0.2); },
    spray: () => noise(1.1, 0.35, 5000, 0.5),
    crunch: () => { noise(0.08, 0.5, 1500); noise(0.08, 0.5, 1200, 1, 0.12); noise(0.1, 0.5, 1800, 1, 0.24); },
    corn: () => { tone(660, 0.12, 'square', 0.12); tone(990, 0.18, 'square', 0.12, null, 0.1); },
    pickup: () => tone(520, 0.15, 'triangle', 0.18, 780),
    nazer: () => { tone(90, 0.5, 'sawtooth', 0.25, 55); noise(0.3, 0.2, 400, 1); },
    cuff: () => { noise(0.05, 0.6, 3500, 2); noise(0.05, 0.6, 3000, 2, 0.12); },
    win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.35, 'triangle', 0.2, null, i * 0.14)),
    step: () => noise(0.06, 0.05, 300, 1),
    nope: () => tone(160, 0.2, 'square', 0.15, 100),
    bell: () => [880, 1320, 1760].forEach((f, i) => tone(f, 1.3, 'sine', 0.16, null, i * 0.03)),
    slip: () => tone(900, 0.45, 'triangle', 0.2, 180),
    gust: () => noise(1.2, 0.3, 700, 0.4),
    ding: () => { tone(1046, 0.4, 'sine', 0.2); tone(1568, 0.5, 'sine', 0.15, null, 0.12); },
    snip: () => { noise(0.05, 0.5, 4000, 3); noise(0.05, 0.5, 4500, 3, 0.1); noise(0.05, 0.5, 4200, 3, 0.2); },
    quiz: () => { tone(440, 0.15, 'square', 0.12); tone(660, 0.2, 'square', 0.12, null, 0.15); },
    wrong: () => tone(200, 0.5, 'sawtooth', 0.2, 90),
    right: () => [660, 880, 1100].forEach((f, i) => tone(f, 0.2, 'triangle', 0.15, null, i * 0.1)),
    chomp: () => { noise(0.1, 0.6, 700, 1); tone(120, 0.2, 'square', 0.25, 60); },
    boom: () => { noise(0.7, 0.8, 200, 0.6); tone(90, 0.6, 'sawtooth', 0.35, 30); },
    zap: () => { noise(0.08, 0.35, 5000, 1); tone(120, 0.1, 'square', 0.15, 60); },
    fanfare: () => [523, 659, 784, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'square', 0.12, null, i * 0.11)),
    flap: () => { noise(0.1, 0.25, 1500, 1); noise(0.1, 0.25, 1500, 1, 0.14); },
    splash: () => { noise(0.15, 0.5, 1200, 0.8); tone(200, 0.1, 'sine', 0.2, 100); },
    dive: () => { tone(400, 0.4, 'sine', 0.25, 200); noise(0.15, 0.25, 800, 1); },
    surface: () => { tone(800, 0.3, 'sine', 0.2, 400); noise(0.1, 0.2, 2000, 0.8); },
    bubble: () => { tone(800, 0.12, 'sine', 0.15, 400); tone(600, 0.08, 'sine', 0.1, 300, 0.08); },
    clang: () => { noise(0.08, 0.4, 4000, 2); tone(1200, 0.25, 'sine', 0.2, 600); },
    vent_open: () => { noise(0.14, 0.45, 3000, 1.5); tone(340, 0.25, 'triangle', 0.25, 120); tone(680, 0.18, 'sine', 0.2, 220); },
    crawl: () => { noise(0.05, 0.16, 1400, 2); tone(160, 0.07, 'triangle', 0.14, 75); }
  };

  // play(name, {loop}) -> handle with stop()
  function play(name, opt = {}) {
    if (!ready) return { stop() {} };
    resume();
    if (buf[name]) {
      const s = ctx.createBufferSource(); s.buffer = buf[name]; s.loop = !!opt.loop;
      const g = ctx.createGain(); g.gain.value = opt.vol ?? 1; s.connect(g); g.connect(bus); s.start();
      return { stop() { try { s.stop(); } catch (e) {} } };
    }
    const f = synth[name];
    if (!f) return { stop() {} };
    if (opt.loop) {                       // synth loop = repeat every ~0.9s
      f(); const id = setInterval(f, 900);
      return { stop() { clearInterval(id); } };
    }
    f();
    return { stop() {} };
  }
  let muffleOn = false;
  function applyLP() {
    if (!ready) return;
    const t = ctx.currentTime;
    const freq = muffleOn ? 4400 : 20000;
    lp.frequency.linearRampToValueAtTime(freq, t + 0.2);
  }
  function setEcho(on) {
    if (!ready) return;
    const t = ctx.currentTime;
    wetG.gain.linearRampToValueAtTime(on ? 1.1 : 0, t + 0.6);
    dryG.gain.linearRampToValueAtTime(on ? 0.55 : 1, t + 0.6);
    fb.gain.linearRampToValueAtTime(on ? 0.6 : 0.5, t + 0.6);
    lp.frequency.linearRampToValueAtTime(on ? 2200 : 20000, t + 0.6);
  }
  function muffle(on) {
    muffleOn = on; applyLP();
  }
  // proximity hum for a threat: call each frame with 0..1
  const hums = {};
  function hum(id, freq, level) {
    if (!ready) return;
    let h = hums[id];
    if (!h) {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sawtooth'; o.frequency.value = freq; g.gain.value = 0;
      const l = ctx.createBiquadFilter(); l.type = 'lowpass'; l.frequency.value = 300;
      o.connect(l); l.connect(g); g.connect(bus); o.start(); h = hums[id] = g;
    }
    h.gain.setTargetAtTime(level * 0.12, ctx.currentTime, 0.1);
  }
  return { init, play, setEcho, muffle, hum, step: () => ready && synth.step(), isReady: () => ready };
})();
