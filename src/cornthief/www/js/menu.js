// Main menu: animated chase (the thief runs with a corn, MazerNazer chases) with motion blur, plus menu navigation.
const Menu = (() => {
  const $ = id => document.getElementById(id);
  let c, x, w = 0, h = 0, running = false, t0 = 0;
  let nazerImg, cornImg, posterImg;
  const lines = Array.from({ length: 34 }, () => ({ y: Math.random(), len: 0.08 + Math.random() * 0.22, sp: 0.8 + Math.random() * 1.6, ph: Math.random(), a: 0.05 + Math.random() * 0.14 }));
  const puffs = Array.from({ length: 14 }, (_, i) => ({ ph: i / 14 }));
  const bg = document.createElement('canvas'), bx = bg.getContext('2d');

  function resize() {
    if (!c) return;
    w = c.width = bg.width = innerWidth; h = c.height = bg.height = innerHeight;
  }

  // ---- scrolling corridor, drawn to an offscreen canvas then smeared horizontally for motion blur ----
  function drawCorridor(t, speed) {
    const narrow = w < 700, wallTop = h * 0.04, wallBot = h * (narrow ? 0.70 : 0.64), floorY = wallBot;
    bx.fillStyle = '#0b0a07'; bx.fillRect(0, 0, w, h);
    bx.fillStyle = '#b8a258'; bx.fillRect(0, wallTop, w, wallBot - wallTop);
    const off = (t * speed) % 120;
    bx.fillStyle = 'rgba(110,80,25,.4)';
    for (let i = -1; i < w / 120 + 2; i++) bx.fillRect(i * 120 - off, wallTop, 44, wallBot - wallTop);
    bx.fillStyle = '#4d3a28'; bx.fillRect(0, wallBot - h * 0.1, w, h * 0.1);
    bx.fillStyle = '#2f2418'; bx.fillRect(0, wallBot - h * 0.1, w, 8);
    // rules posters sliding past
    const pw = Math.min(150, h * 0.22), ph = pw * 1.5, gap = 760, po = (t * speed) % gap;
    if (posterImg) for (let i = -1; i < w / gap + 2; i++) bx.drawImage(posterImg, i * gap + 300 - po, wallTop + (wallBot - wallTop) * 0.12, pw, ph);
    bx.fillStyle = '#2b2a15'; bx.fillRect(0, floorY, w, h - floorY);
    bx.fillStyle = '#34331a';
    const fo = (t * speed * 1.4) % 220;
    for (let i = -1; i < w / 110 + 2; i++) bx.fillRect(i * 220 - fo, floorY, 110, h - floorY);
    // lamp-light dimming
    bx.fillStyle = 'rgba(6,5,3,.5)'; bx.fillRect(0, 0, w, h);
  }

  // ---- the thief (original character), side view running right, feet at origin ----
  function leg(ctx, hx, hy, p) {
    const a = Math.sin(p) * 0.9, kx = hx + 38 * Math.sin(a), ky = hy + 38 * Math.cos(a);
    const b = a - 0.6 - 0.6 * Math.cos(p + 1), fx = kx + 40 * Math.sin(b), fy = ky + 40 * Math.cos(b);
    ctx.lineCap = 'round'; ctx.strokeStyle = '#22252f'; ctx.lineWidth = 15;
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
    ctx.fillStyle = '#d6d0c0'; ctx.beginPath(); ctx.ellipse(fx + 7, fy + 2, 13, 7, 0, 0, 7); ctx.fill();
  }
  function thief(ctx, t) {
    const p = t * 11, bob = Math.abs(Math.sin(p)) * 7;
    ctx.save(); ctx.translate(0, -bob);
    leg(ctx, -2, -72, p + Math.PI);
    // sack on the back with corn tips
    ctx.fillStyle = '#b79a62'; ctx.beginPath(); ctx.ellipse(-26, -112, 26, 30, -0.4, 0, 7); ctx.fill();
    ctx.fillStyle = '#f2c230'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(-34 + i * 10, -138 - i % 2 * 4, 5, 12, -0.3 + i * 0.3, 0, 7); ctx.fill(); }
    // torso (leaning forward)
    ctx.strokeStyle = '#4a5060'; ctx.lineWidth = 30; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-2, -76); ctx.lineTo(10, -120); ctx.stroke();
    // back arm swings, front arm carries the corn
    const sa = Math.sin(p) * 0.9;
    ctx.strokeStyle = '#3a3f4c'; ctx.lineWidth = 12;
    ctx.beginPath(); ctx.moveTo(6, -118); ctx.lineTo(6 - 30 * Math.sin(sa + 0.6), -118 + 30 * Math.cos(sa + 0.6)); ctx.lineTo(-10 - 28 * Math.sin(sa + 0.2), -80 + 10 * Math.cos(sa)); ctx.stroke();
    // head
    ctx.fillStyle = '#e0b48c'; ctx.beginPath(); ctx.arc(20, -144, 18, 0, 7); ctx.fill();
    ctx.fillStyle = '#16161a'; ctx.beginPath(); ctx.arc(20, -148, 19, Math.PI, 0); ctx.fill();   // beanie
    ctx.fillRect(2, -150, 38, 7);
    ctx.fillStyle = '#111'; ctx.fillRect(10, -146, 30, 10);                                      // mask band
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(32, -141, 3.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(33, -141, 1.6, 0, 7); ctx.fill();
    // front leg + front arm with corn
    leg(ctx, -2, -72, p);
    const hy = -104 + Math.sin(p * 2) * 4;
    ctx.strokeStyle = '#4a5060'; ctx.lineWidth = 13;
    ctx.beginPath(); ctx.moveTo(10, -118); ctx.lineTo(34, hy + 6); ctx.lineTo(54, hy - 6); ctx.stroke();
    ctx.save(); ctx.translate(58, hy - 10); ctx.rotate(-0.5 + Math.sin(p * 2) * 0.05); ctx.drawImage(cornImg, -34, -50, 68, 68); ctx.restore();
    ctx.restore();
  }

  function frame(ts) {
    if (!running) return;
    requestAnimationFrame(frame);
    if (document.hidden) return;
    const t = (ts - t0) / 1000, speed = 520, narrow = w < 700;
    drawCorridor(t, speed);
    // horizontal smear: the corridor drawn several times, trailing to the right (we run to the right, so the world streaks left)
    x.globalAlpha = 1; x.drawImage(bg, 0, 0);
    for (let i = 1; i <= 5; i++) { x.globalAlpha = 0.2; x.drawImage(bg, i * 9, 0); }
    x.globalAlpha = 1;
    // speed streaks
    x.lineCap = 'round';
    for (const l of lines) {
      const px = ((1 - ((t * l.sp * 0.5 + l.ph) % 1)) * 1.4 - 0.2) * w, py = l.y * h;
      x.strokeStyle = `rgba(255,240,200,${l.a})`; x.lineWidth = 2; x.beginPath(); x.moveTo(px, py); x.lineTo(px + l.len * w, py); x.stroke();
    }
    const u = Math.min(h / 700, w / 1000) * (narrow ? 1.25 : 1.5);
    const groundY = h * (narrow ? 0.86 : 0.84);
    const tx = narrow ? w * 0.78 : w * 0.80, nx = narrow ? w * 0.38 : w * 0.56;
    // dust puffs from Nazer's feet
    for (const p of puffs) {
      const k = (t * 1.6 + p.ph) % 1;
      x.fillStyle = `rgba(190,170,120,${0.28 * (1 - k)})`; x.beginPath(); x.arc(nx - 50 * u - k * 160 * u, groundY - 6 - k * 40 * u, (8 + k * 26) * u, 0, 7); x.fill();
    }
    // MazerNazer (drawn from his game sprite), bobbing and leaning forward, with blur ghosts behind him
    const nh = 520 * u * 0.62, nw = nh * 2 / 3, nb = Math.abs(Math.sin(t * 9)) * 12 * u, lunge = Math.sin(t * 0.9) * 20 * u;
    for (let k = 4; k >= 0; k--) {
      x.save(); x.globalAlpha = k ? 0.12 : 1; x.translate(nx + lunge - k * 22 * u, groundY - nb); x.rotate(0.07);
      x.drawImage(nazerImg, -nw / 2, -nh, nw, nh); x.restore();
    }
    // the thief, with ghost copies for motion blur
    for (let k = 4; k >= 0; k--) {
      x.save(); x.globalAlpha = k ? 0.13 : 1; x.translate(tx - k * 18 * u, groundY); x.scale(u * 1.25, u * 1.25); thief(x, t); x.restore();
    }
    x.globalAlpha = 1;
    // vignette and a left-side shade so the menu text stays readable
    const v = x.createRadialGradient(w / 2, h / 2, h * 0.25, w / 2, h / 2, Math.max(w, h) * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.75)'); x.fillStyle = v; x.fillRect(0, 0, w, h);
    const s = narrow ? x.createLinearGradient(0, 0, 0, h * 0.6) : x.createLinearGradient(0, 0, w * 0.55, 0);
    s.addColorStop(0, 'rgba(8,7,5,.88)'); s.addColorStop(1, 'rgba(8,7,5,0)'); x.fillStyle = s; x.fillRect(0, 0, w, h);
  }

  function run() { if (running) return; running = true; t0 = performance.now(); requestAnimationFrame(frame); }
  function stop() { running = false; }

  function show(which) {
    ['intro', 'modeSelect', 'mpMenu', 'hostMenu', 'joinMenu', 'lobby', 'about', 'pause', 'win', 'over'].forEach(id => {
      const el = $(id);
      if (el) el.hidden = id !== which;
    });
    $('hud').hidden = true;
    if (which === 'intro') { run(); } else if (which !== 'about' && which !== 'modeSelect') stop();
  }
  function toMenu() {
    S.state = 'menu'; if (document.exitPointerLock) document.exitPointerLock();
    if (S.loop) { S.loop.stop(); S.loop = null; } if (S.loopDark) { S.loopDark.stop(); S.loopDark = null; } Snd.setEcho(false);
    const b = $('start'); b.disabled = false; b.textContent = 'Start';
    show('intro');
  }

  function init() {
    c = $('menuBg'); x = c.getContext('2d');
    nazerImg = Art.nazer(); cornImg = Art.icon('corn'); posterImg = Art.rulesPoster().image;
    resize(); addEventListener('resize', resize);
    $('aboutBtn').addEventListener('click', () => show('about'));
    $('aboutBack').addEventListener('click', () => show('intro'));
    ['toMenu1', 'toMenu2'].forEach(id => $(id).addEventListener('click', toMenu));
    run();
  }
  return { init, show, toMenu, stop, run };
})();
