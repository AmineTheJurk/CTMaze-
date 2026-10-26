// The Cast: 10 extra characters, all original, each with its own behaviour.
// Mothball (janitor), Static Sam, Lantern Lil, Dr. Snip, Granny Gust, Pidge, Bellhop Bongo, Mimi (x3), Professor Quill, Dozy Duke.
const Cast = (() => {
  const { mk, circ, rect, line } = Art.h;
  const seen = {};
  let list = [], puddles = [], pudMat = null, staticCtx = null, staticImg = null, frameN = 0;
  const $ = id => document.getElementById(id);

  // ---------- art ----------
  function janitor() {
    const [c, x] = mk(256, 384);
    rect(x, 84, 150, 88, 150, '#3b6ea5'); rect(x, 66, 160, 22, 100, '#3b6ea5'); rect(x, 168, 160, 22, 100, '#3b6ea5');
    circ(x, 76, 268, 12, '#d9a77d'); circ(x, 180, 268, 12, '#d9a77d');
    rect(x, 92, 296, 34, 80, '#2a4f7a'); rect(x, 130, 296, 34, 80, '#2a4f7a');
    circ(x, 128, 112, 40, '#d9a77d'); rect(x, 84, 66, 88, 26, '#2a4f7a'); rect(x, 74, 88, 108, 8, '#1d3a5c');
    rect(x, 100, 134, 56, 12, '#bbb'); circ(x, 112, 112, 5, '#222'); circ(x, 144, 112, 5, '#222');
    line(x, 214, 40, 214, 345, 8, '#8a6a3a');
    rect(x, 188, 330, 52, 44, '#d4d4d4'); for (let i = 0; i < 6; i++) line(x, 192 + i * 9, 340, 192 + i * 9, 376, 3, '#9a9a9a');
    return c;
  }
  function tvhead() {
    const [c, x] = mk(256, 384);
    line(x, 100, 40, 80, 6, 4, '#999'); line(x, 156, 40, 176, 6, 4, '#999');
    rect(x, 78, 150, 100, 150, '#444a55'); rect(x, 60, 160, 22, 100, '#444a55'); rect(x, 174, 160, 22, 100, '#444a55');
    rect(x, 94, 296, 30, 80, '#2b2f38'); rect(x, 132, 296, 30, 80, '#2b2f38');
    rect(x, 56, 40, 144, 120, '#2a2a2a'); rect(x, 68, 52, 120, 96, '#10131a');
    for (let r = 0; r < 12; r++) for (let q = 0; q < 15; q++) { const v = Math.random() * 255 | 0; x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(68 + q * 8, 52 + r * 8, 8, 8); }
    rect(x, 120, 62, 12, 40, 'rgba(255,60,60,.8)');
    return c;
  }
  function lantern() {
    const [c, x] = mk(256, 384);
    const g = x.createRadialGradient(205, 270, 4, 205, 270, 80); g.addColorStop(0, 'rgba(255,230,120,.95)'); g.addColorStop(1, 'rgba(255,200,60,0)');
    x.fillStyle = g; x.fillRect(100, 160, 200, 220);
    x.fillStyle = '#6b4a8a'; x.beginPath(); x.moveTo(100, 150); x.lineTo(156, 150); x.lineTo(196, 345); x.lineTo(62, 345); x.fill();
    rect(x, 62, 160, 22, 100, '#6b4a8a'); rect(x, 172, 160, 22, 80, '#6b4a8a');
    circ(x, 72, 262, 12, '#e8c4a4'); circ(x, 190, 246, 12, '#e8c4a4');
    line(x, 190, 246, 205, 262, 4, '#333'); rect(x, 195, 262, 20, 28, '#f6d860'); rect(x, 192, 256, 26, 6, '#333'); rect(x, 192, 290, 26, 6, '#333');
    circ(x, 128, 112, 36, '#e8c4a4'); circ(x, 128, 74, 22, '#f2f2f2'); circ(x, 128, 90, 40, '#f2f2f2'); circ(x, 128, 112, 32, '#e8c4a4');
    circ(x, 116, 112, 4, '#222'); circ(x, 140, 112, 4, '#222');
    x.strokeStyle = '#a44'; x.lineWidth = 3; x.beginPath(); x.arc(128, 124, 9, 0.2, 2.9); x.stroke();
    return c;
  }
  function barber() {
    const [c, x] = mk(256, 384);
    rect(x, 92, 140, 72, 170, '#e8e8e8'); for (let i = 0; i < 8; i++) rect(x, 92, 150 + i * 20, 72, 9, '#b3261e');
    rect(x, 72, 150, 22, 130, '#222'); rect(x, 162, 150, 22, 130, '#222');
    circ(x, 82, 286, 11, '#e6dccd'); circ(x, 172, 286, 11, '#e6dccd');
    rect(x, 100, 306, 26, 74, '#1b1b1f'); rect(x, 130, 306, 26, 74, '#1b1b1f');
    circ(x, 128, 100, 38, '#e6dccd'); rect(x, 90, 62, 76, 16, '#111');
    circ(x, 114, 100, 6, '#000'); circ(x, 142, 100, 6, '#000'); circ(x, 114, 100, 2, '#f55'); circ(x, 142, 100, 2, '#f55');
    x.strokeStyle = '#000'; x.lineWidth = 3; x.beginPath(); x.arc(128, 112, 16, 0.1, 3.0); x.stroke();
    line(x, 188, 300, 226, 232, 6, '#c9ccd4'); line(x, 226, 300, 188, 232, 6, '#c9ccd4'); circ(x, 188, 304, 8, '#c9ccd4'); circ(x, 226, 304, 8, '#c9ccd4');
    return c;
  }
  function granny() {
    const [c, x] = mk(256, 384);
    x.fillStyle = '#d97aa0'; x.beginPath(); x.ellipse(128, 230, 62, 96, 0, 0, 7); x.fill();
    rect(x, 92, 310, 26, 66, '#8a6a58'); rect(x, 138, 310, 26, 66, '#8a6a58');
    circ(x, 128, 140, 38, '#f0cdb0'); for (let i = 0; i < 5; i++) circ(x, 96 + i * 16, 112, 16, '#d8d8d8');
    x.strokeStyle = '#222'; x.lineWidth = 3; x.strokeRect(100, 130, 22, 18); x.strokeRect(134, 130, 22, 18); line(x, 122, 138, 134, 138, 3, '#222');
    circ(x, 111, 139, 3, '#222'); circ(x, 145, 139, 3, '#222');
    x.fillStyle = '#f4e6a8'; x.beginPath(); x.moveTo(190, 250); x.arc(190, 250, 70, -2.2, -0.9); x.fill();
    line(x, 190, 250, 160, 190, 2, '#a88'); line(x, 190, 250, 190, 180, 2, '#a88'); line(x, 190, 250, 224, 196, 2, '#a88');
    circ(x, 184, 254, 12, '#f0cdb0');
    return c;
  }
  function pigeon() {
    const [c, x] = mk(256, 256);
    x.fillStyle = '#7d8696'; x.beginPath(); x.ellipse(120, 150, 62, 44, -0.2, 0, 7); x.fill();
    x.fillStyle = '#5d6676'; x.beginPath(); x.moveTo(90, 130); x.lineTo(40, 60); x.lineTo(130, 110); x.fill(); x.beginPath(); x.moveTo(110, 130); x.lineTo(80, 40); x.lineTo(160, 110); x.fill();
    circ(x, 176, 110, 26, '#8a93a3'); circ(x, 176, 130, 14, '#3e8a8a');
    x.fillStyle = '#f0a030'; x.beginPath(); x.moveTo(198, 108); x.lineTo(232, 118); x.lineTo(198, 126); x.fill();
    circ(x, 184, 104, 7, '#fff'); circ(x, 186, 104, 4, '#c00');
    x.fillStyle = '#5d6676'; x.beginPath(); x.moveTo(62, 160); x.lineTo(10, 190); x.lineTo(70, 190); x.fill();
    line(x, 110, 190, 106, 226, 4, '#f0a030'); line(x, 134, 190, 138, 226, 4, '#f0a030');
    return c;
  }
  function bellhop() {
    const [c, x] = mk(256, 384);
    rect(x, 84, 150, 88, 140, '#b3261e'); for (let i = 0; i < 4; i++) { circ(x, 128, 170 + i * 28, 5, '#e8c040'); }
    rect(x, 66, 160, 22, 100, '#b3261e'); rect(x, 168, 160, 22, 100, '#b3261e');
    circ(x, 76, 262, 12, '#d9a77d'); circ(x, 180, 262, 12, '#d9a77d');
    rect(x, 92, 290, 34, 86, '#2a2a2a'); rect(x, 130, 290, 34, 86, '#2a2a2a');
    circ(x, 128, 112, 38, '#d9a77d'); rect(x, 92, 58, 72, 34, '#b3261e'); rect(x, 92, 88, 72, 6, '#e8c040');
    circ(x, 114, 112, 5, '#222'); circ(x, 142, 112, 5, '#222'); circ(x, 128, 132, 10, '#5a1a1a');
    x.fillStyle = '#e0b030'; x.beginPath(); x.moveTo(190, 214); x.quadraticCurveTo(190, 262, 160, 282); x.lineTo(236, 282); x.quadraticCurveTo(206, 262, 206, 214); x.fill();
    circ(x, 198, 288, 7, '#8a6a10');
    return c;
  }
  function mimicMonster() {
    const [c, x] = mk(256, 256);
    rect(x, 30, 110, 196, 110, '#7a4a22'); rect(x, 30, 160, 196, 10, '#4a2a10');
    x.fillStyle = '#5a3216'; x.beginPath(); x.moveTo(30, 110); x.lineTo(50, 40); x.lineTo(206, 40); x.lineTo(226, 110); x.fill();
    rect(x, 40, 120, 176, 36, '#2a0a0a');
    x.fillStyle = '#f4f4f0'; for (let i = 0; i < 9; i++) { x.beginPath(); x.moveTo(44 + i * 20, 120); x.lineTo(54 + i * 20, 146); x.lineTo(64 + i * 20, 120); x.fill(); }
    x.beginPath(); for (let i = 0; i < 9; i++) { x.moveTo(44 + i * 20, 156); x.lineTo(54 + i * 20, 134); x.lineTo(64 + i * 20, 156); } x.fill();
    circ(x, 90, 150, 14, '#d9467a'); circ(x, 100, 82, 14, '#fff'); circ(x, 156, 82, 14, '#fff'); circ(x, 100, 82, 6, '#000'); circ(x, 156, 82, 6, '#000');
    rect(x, 118, 150, 20, 30, '#e8c040');
    return c;
  }
  function professor() {
    const [c, x] = mk(256, 384);
    rect(x, 80, 150, 96, 150, '#7a5a38'); rect(x, 118, 150, 20, 150, '#e8e0cc');
    rect(x, 62, 160, 22, 100, '#7a5a38'); rect(x, 172, 160, 22, 100, '#7a5a38');
    circ(x, 72, 262, 12, '#e8c4a4'); circ(x, 184, 262, 12, '#e8c4a4');
    rect(x, 92, 298, 34, 78, '#3a3a40'); rect(x, 130, 298, 34, 78, '#3a3a40');
    x.fillStyle = '#b3261e'; x.beginPath(); x.moveTo(128, 156); x.lineTo(106, 146); x.lineTo(106, 166); x.fill(); x.beginPath(); x.moveTo(128, 156); x.lineTo(150, 146); x.lineTo(150, 166); x.fill();
    circ(x, 128, 108, 38, '#e8c4a4'); for (let i = 0; i < 9; i++) circ(x, 84 + i * 11, 80 - Math.abs(4 - i) * 2, 15, '#f4f4f4');
    x.strokeStyle = '#222'; x.lineWidth = 4; x.beginPath(); x.arc(110, 110, 14, 0, 7); x.stroke(); x.beginPath(); x.arc(146, 110, 14, 0, 7); x.stroke(); line(x, 124, 110, 132, 110, 4, '#222');
    circ(x, 110, 110, 4, '#222'); circ(x, 146, 110, 4, '#222'); circ(x, 128, 134, 8, '#8a3a3a');
    rect(x, 176, 200, 48, 64, '#2a5a3a'); x.fillStyle = '#fff'; x.font = 'bold 20px Arial'; x.fillText('x\u00b2', 188, 240);
    return c;
  }
  function duke(awake) {
    const [c, x] = mk(256, 384);
    circ(x, 128, 250, 74, '#8a5a30'); rect(x, 60, 215, 136, 26, '#6a8acb');
    for (let i = 0; i < 4; i++) rect(x, 70 + i * 34, 215, 14, 120, 'rgba(106,138,203,.0)');
    x.fillStyle = '#6a8acb'; x.beginPath(); x.ellipse(128, 262, 66, 82, 0, 0, 7); x.fill();
    for (let i = 0; i < 5; i++) rect(x, 66, 214 + i * 24, 124, 10, '#e8eefc');
    circ(x, 70, 150, 18, '#8a5a30'); circ(x, 186, 150, 18, '#8a5a30'); circ(x, 128, 170, 56, '#8a5a30'); circ(x, 128, 188, 24, '#d9b48a');
    circ(x, 128, 180, 8, '#2a1608');
    x.fillStyle = '#c9ccf0'; x.beginPath(); x.moveTo(78, 130); x.lineTo(178, 130); x.lineTo(210, 40); x.lineTo(150, 100); x.fill(); circ(x, 210, 38, 12, '#fff');
    if (awake) { circ(x, 108, 160, 11, '#fff'); circ(x, 148, 160, 11, '#fff'); circ(x, 108, 160, 5, '#c00'); circ(x, 148, 160, 5, '#c00'); x.strokeStyle = '#2a1608'; x.lineWidth = 4; x.beginPath(); x.moveTo(94, 140); x.lineTo(118, 150); x.moveTo(162, 140); x.lineTo(138, 150); x.stroke(); }
    else { line(x, 98, 160, 118, 160, 4, '#2a1608'); line(x, 138, 160, 158, 160, 4, '#2a1608'); x.fillStyle = '#fff'; x.font = 'bold 30px Arial'; x.fillText('Z', 200, 110); x.font = 'bold 22px Arial'; x.fillText('z', 222, 84); }
    rect(x, 80, 316, 36, 60, '#6a8acb'); rect(x, 140, 316, 36, 60, '#6a8acb');
    return c;
  }
  const tx = c => Art.spriteTex(c);

  // ---------- helpers ----------
  function make(kind, canvas, h, name, tip, extra) {
    const a = new Agent(canvas, h); a.kind = kind; a.nm = name; a.tip = tip; a.cool = 0; a.t = 0; Object.assign(a, extra || {});
    list.push(a); return a;
  }
  function meet(a) {
    if (!seen[a.nm] && a.sp.visible && a.sees(20)) { seen[a.nm] = 1; Game.toast(a.nm + ': ' + a.tip); }
  }
  function pushPlayer(dx, dz, dist) {
    const n = Math.max(1, Math.ceil(dist / 0.4)), sx = dx * dist / n, sz = dz * dist / n;
    for (let i = 0; i < n; i++) {
      if (!World.blocked(G.p.x + sx, G.p.z, 0.8)) G.p.x += sx;
      if (!World.blocked(G.p.x, G.p.z + sz, 0.8)) G.p.z += sz;
    }
  }
  function drop(a, why) {
    if (!a.loot) return;
    AI.addPickup(a.loot, { x: a.x, z: a.z }); a.loot = null; a.mode = 'wander'; a.cool = 25;
    Game.toast(why || 'Pidge dropped your item!');
  }
  const dirTo = a => { const dx = G.p.x - a.x, dz = G.p.z - a.z, d = G.hidden ? 999 : Math.hypot(dx, dz) || 1; return [dx / d, dz / d, d]; };

  function init(start) {
    list.forEach(a => G.scene.remove(a.sp)); list = [];
    puddles.forEach(p => G.scene.remove(p.m)); puddles = [];
    for (const k in seen) delete seen[k];
    S.static = 0; S.slowT = 0; S.quiz = null; Cast.hint = null;
    if (!pudMat) {
      const [c, x] = mk(128, 128); const g = x.createRadialGradient(64, 64, 6, 64, 64, 62); g.addColorStop(0, 'rgba(120,190,255,.75)'); g.addColorStop(1, 'rgba(120,190,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, 128, 128); pudMat = new THREE.MeshBasicMaterial({ map: tx(c), transparent: true, depthWrite: false });
    }
    const spots = (n, d) => World.randomOpen(start, d);
    make('janitor', janitor(), 3.4, 'Mothball the Janitor', 'he leaves wet puddles. Do not slip.').place(spots(0, 40));
    make('sam', tvhead(), 3.5, 'Static Sam', 'his signal scrambles your screen and map.').place(spots(0, 60));
    make('lil', lantern(), 3.3, 'Lantern Lil', 'touch her and she gives you a free item.', { gift: true }).place(spots(0, 25));
    make('snip', barber(), 3.7, 'Dr. Snip', 'he only moves when you are not looking at him.', { cool: 20 }).place(spots(0, 80));
    make('granny', granny(), 3.1, 'Granny Gust', 'her fan blows you backwards.').place(spots(0, 50));
    const pg = make('pidge', pigeon(), 1.8, 'Pidge', 'he steals your items. Hit him with Coke to make him drop them.', { mode: 'wander', loot: null, cool: 15 });
    pg.sp.scale.set(1.8, 1.8, 1); pg.sp.position.y = 2.4; pg.place(spots(0, 60));
    make('bongo', bellhop(), 3.4, 'Bellhop Bongo', 'he rings the alarm if you run near him.').place(spots(0, 50));
    const mimicTex = tx(mimicMonster());
    ['coke', 'bar', 'teleporter'].forEach(k => {
      const m = make('mimi', Art.icon(k), 1.1, 'Mimi the Mimic', 'some items bite!', { mode: 'hidden', disguise: tx(Art.icon(k)), monster: mimicTex, rearm: 0 });
      m.sp.scale.set(1.1, 1.1, 1); m.sp.position.y = 1.2; m.place(spots(0, 20));
    });
    make('quill', professor(), 3.5, 'Professor Quill', 'pop quiz! Answer with 1, 2 or 3.', { cool: 20 }).place(spots(0, 60));
    const dk = make('duke', duke(false), 3.4, 'Dozy Duke', 'do not wake him.', { mode: 'sleep', texSleep: tx(duke(false)), texAwake: tx(duke(true)) });
    dk.sp.material.map = dk.texSleep; dk.place(spots(0, 35));
    list.forEach(a => { if (!['duke', 'bongo', 'mimi'].includes(a.kind)) a.roam(); });
    if (!staticCtx) { const sc = $('staticc'); if (sc) { sc.width = 160; sc.height = 90; staticCtx = sc.getContext('2d'); staticImg = staticCtx.createImageData(160, 90); } }
  }

  // ---------- quiz ----------
  function startQuiz(q) {
    const ops = ['+', '-', '\u00d7'], op = ops[Math.floor(Math.random() * 3)];
    let a = 3 + Math.floor(Math.random() * 12), b = 2 + Math.floor(Math.random() * 9), ans;
    if (op === '-') { if (b > a) [a, b] = [b, a]; ans = a - b; } else if (op === '+') ans = a + b; else { a = 2 + Math.floor(Math.random() * 9); ans = a * b; }
    const set = new Set([ans]); while (set.size < 3) set.add(Math.max(0, ans + (Math.floor(Math.random() * 9) - 4) || ans + 5));
    const opts = [...set].sort(() => Math.random() - 0.5);
    S.quiz = { text: `${a} ${op} ${b} = ?`, opts, ans, t: 9, from: q };
    $('qText').textContent = S.quiz.text;
    $('qOpts').innerHTML = opts.map((o, i) => `<button class="alt" data-i="${i}">${i + 1}: ${o}</button>`).join('');
    $('quiz').hidden = false; Snd.play('quiz');
  }
  function answer(i) {
    const z = S.quiz; if (!z) return;
    S.quiz = null; $('quiz').hidden = true;
    const ok = i >= 0 && z.opts[i] === z.ans;
    z.from.cool = ok ? 60 : 40; z.from.roam(60);
    if (ok) {
      Snd.play('right'); const c = AI.pickups.find(k => k.type === 'corn' && !k.taken);
      let best = null, bd = 1e9; for (const k of AI.pickups) if (k.type === 'corn' && !k.taken) { const d = Math.hypot(k.x - G.p.x, k.z - G.p.z); if (d < bd) { bd = d; best = k; } }
      Cast.hint = best ? { x: best.x, z: best.z, t: 30 } : null;
      Game.toast('Correct! The nearest corn is marked on your map.');
    } else { Snd.play('wrong'); S.slowT = 10; Game.toast(i < 0 ? 'Too slow! You are slowed for 10 seconds.' : 'Wrong! You are slowed for 10 seconds.'); }
  }
  function quizTick(dt) { if (!S.quiz) return; S.quiz.t -= dt; $('qBar').style.width = Math.max(0, S.quiz.t / 9 * 100) + '%'; if (S.quiz.t <= 0) answer(-1); }

  // ---------- per-frame behaviour ----------
  function update(dt) {
    const P = AI.police, Nz = AI.nazer;
    let stat = 0;
    for (const a of list) {
      a.cool -= dt; a.t += dt;
    const isMonster = typeof Game !== 'undefined' && Game.isMonster && Game.isMonster();
    for (const a of list) {
      a.cool -= dt; a.t += dt;
      if (a.kind !== 'mimi' && !isMonster) meet(a);
      const [ux, uz, d] = dirTo(a);
      switch (a.kind) {
        case 'janitor':
          if (!a.path.length) a.roam(); a.move(dt, 2.8);
          if (a.t > 1.1) { a.t = 0; const m = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), pudMat); m.rotation.x = -Math.PI / 2; m.position.set(a.x, 0.04, a.z); G.scene.add(m); puddles.push({ m, x: a.x, z: a.z }); if (puddles.length > 14) G.scene.remove(puddles.shift().m); }
          break;
        case 'sam':
          if (!a.path.length) a.roam(); a.move(dt, 3.6);
          if (!isMonster) stat = Math.max(stat, Math.max(0, 1 - d / 28));
          break;
        case 'lil':
          if (!a.sp.visible) { if (a.cool <= 0) { a.sp.visible = true; a.gift = true; a.place(World.randomOpen(G.p, 60)); a.roam(); } break; }
          if (!a.path.length) a.roam(); a.move(dt, 2.4);
          if (!isMonster && a.gift && d < 3) {
            a.gift = false; a.sp.visible = false; a.cool = 90; Snd.play('ding');
            const t = ['grapple', 'teleporter', 'coke', 'bar'][Math.floor(Math.random() * 4)];
            Game.toast(AI.giveItem(t) ? 'Lantern Lil gave you a ' + Game.ITEMS[t].name + '!' : 'Lantern Lil wanted to help, but your inventory is full.');
          }
          break;
        case 'snip': {
          const fx = -Math.sin(G.p.yaw), fz = -Math.cos(G.p.yaw), inView = d < 45 && (-ux * fx - uz * fz) > 0.72 && World.los(a.x, a.z, G.p.x, G.p.z);
          if (isMonster || a.cool > 0 || S.downed) { if (!a.path.length) a.roam(60); a.move(dt, 3); }
          else if (!inView) { a.chase(dt); a.move(dt, 6.2, true); }
          if (!isMonster && d < 1.9 && a.cool <= 0 && !S.downed) { S.stamina = 0; S.exhausted = true; S.stunT = 0.6; Snd.play('snip'); a.cool = 12; a.roam(80); a.place(World.randomOpen(G.p, 70)); Game.toast('Dr. Snip snipped your stamina!'); }
          break;
        }
        case 'granny':
          if (!a.path.length) a.roam(); a.move(dt, 2.6);
          if (!isMonster && d < 22 && World.los(a.x, a.z, G.p.x, G.p.z) && !S.downed) { pushPlayer(ux, uz, 7.5 * dt); if (a.t > 3) { a.t = 0; Snd.play('gust'); } }
          break;
        case 'pidge':
          if (a.loot) {
            if (a.push) { drop(a, 'Coke! Pidge dropped your item!'); break; }
            if (!a.path.length) a.roam(80); a.move(dt, 9.5);
            a.loot && a.t > 20 && drop(a, 'Pidge got bored and dropped your item.');
          } else {
            const has = S.inv.some(Boolean);
            if (!isMonster && has && a.cool <= 0 && d < 40 && !S.downed) { a.chase(dt); a.move(dt, 8.5, true); }
            else { if (!a.path.length) a.roam(); a.move(dt, 3.5); }
            if (!isMonster && has && d < 1.7 && a.cool <= 0) {
              const slots = S.inv.map((v, i) => v ? i : -1).filter(i => i >= 0), i = slots[Math.floor(Math.random() * slots.length)];
              a.loot = S.inv[i]; S.inv[i] = null; a.t = 0; a.roam(80); Snd.play('flap'); Game.toast('Pidge stole your ' + Game.ITEMS[a.loot].name + '!');
            }
          }
          break;
        case 'bongo':
          if (!isMonster && S.running && d < 35 && a.cool <= 0 && S.cuffT <= 0) {
            a.cool = 22; Snd.play('bell'); Game.toast('Bongo rang the alarm! Everyone is coming!');
            if (P.ignore <= 0) { P.alertT = 14; P.path = []; }
            for (const e of [Nz, AI.hurter]) if (e && e.ignore <= 0 && !(e === Nz && Nz.grace > 0)) { e.last = { x: G.p.x, z: G.p.z }; e.state = 'chase'; }
          }
          break;
        case 'mimi':
          a.rearm -= dt;
          if (a.mode === 'hidden') {
            if (!isMonster && d < 3 && a.rearm <= 0 && !S.downed) { a.mode = 'chase'; a.t = 0; a.sp.material.map = a.monster; a.sp.scale.set(2.6, 2.6, 1); a.sp.position.y = 1.3; Snd.play('chomp'); Game.toast('It was a Mimic!'); }
          } else {
            if (!isMonster) {
              a.chase(dt); a.move(dt, 7.2, true);
              const bit = d < 1.8;
              if (bit && !S.downed) { S.stamina = 0; S.exhausted = true; S.stunT = 1.2; Snd.play('chomp'); }
              if (bit || a.t > 7) { a.mode = 'hidden'; a.rearm = 6; a.sp.material.map = a.disguise; a.sp.scale.set(1.1, 1.1, 1); a.sp.position.y = 1.2; }
            } else {
              a.mode = 'hidden'; a.rearm = 6; a.sp.material.map = a.disguise; a.sp.scale.set(1.1, 1.1, 1); a.sp.position.y = 1.2;
            }
          }
          break;
        case 'quill':
          if (!a.path.length) a.roam(); a.move(dt, 3.1);
          if (!isMonster && !S.quiz && a.cool <= 0 && d < 14 && S.cuffT <= 0 && !S.downed && World.los(a.x, a.z, G.p.x, G.p.z)) startQuiz(a);
          break;
        case 'duke':
          if (a.mode === 'sleep') {
            if (!isMonster && a.cool <= 0 && !S.downed && !G.hidden && ((S.running && d < 16) || d < 5)) {
              a.mode = 'awake'; a.t = 0; a.sp.material.map = a.texAwake; Snd.play('nazer');
              Game.toast('You woke Dozy Duke!');
            }
          } else {
            if (isMonster || G.hidden || S.downed) {
              a.mode = 'sleep'; a.sp.material.map = a.texSleep; a.path = []; a.cool = 6;
            } else {
              a.chase(dt); a.move(dt, 9.2, true);
              if (d < 2.2 && !S.downed && a.cool <= 0) {
                S.stunT = 0.8;
                pushPlayer(ux, uz, 8);
                a.cool = 12;
                a.mode = 'sleep';
                a.sp.material.map = a.texSleep;
                a.path = [];
                Snd.play('snip');
                Game.toast('Dozy Duke knocked you back and fell fast asleep!');
              } else if (a.t > 6) {
                a.mode = 'sleep';
                a.sp.material.map = a.texSleep;
                a.path = [];
                a.cool = 8;
                Game.toast('Dozy Duke dozed back off!');
              }
            }
          }
          break;
      }
      if (a.kind !== 'duke' && a.kind !== 'mimi' && a.kind !== 'bongo') { /* wanderers keep walking */ }
    }
    // puddles
    for (const p of puddles) if (!isMonster && Math.hypot(p.x - G.p.x, p.z - G.p.z) < 1.3 && !p.hit && !S.downed && Cast.slipCool <= 0) {
      p.hit = true; Cast.slipCool = 2; S.stunT = 0.8; Snd.play('slip');
      pushPlayer(-Math.sin(G.p.yaw), -Math.cos(G.p.yaw), 5); Game.toast('You slipped on a puddle!');
    }
    Cast.slipCool -= dt; for (const p of puddles) if (p.hit && Math.hypot(p.x - G.p.x, p.z - G.p.z) > 2.2) p.hit = false;
    // static effect
    S.static += (stat - S.static) * Math.min(1, dt * 4);
    Snd.hum('sam', 210, S.static * 0.8);
    const sc = $('staticc');
    if (sc) {
      sc.style.opacity = Math.min(0.85, S.static * 0.9);
      if (S.static > 0.03 && staticCtx && (frameN++ & 1) === 0) {
        const dta = staticImg.data; for (let i = 0; i < dta.length; i += 4) { const v = Math.random() * 255; dta[i] = dta[i + 1] = dta[i + 2] = v; dta[i + 3] = 255; }
        staticCtx.putImageData(staticImg, 0, 0);
      }
    }
    $('mapwrap').style.visibility = S.static > 0.55 ? 'hidden' : 'visible';
    // slow effect + corn hint marker
    if (S.slowT > 0) S.slowT -= dt;
    const mh = $('mhint');
    if (Cast.hint && Cast.hint.t > 0) {
      Cast.hint.t -= dt; const k = $('mmap').clientWidth / (World.N * World.T);
      mh.style.display = 'block'; mh.style.transform = `translate(${Cast.hint.x * k - 5}px,${Cast.hint.z * k - 5}px)`;
    } else mh.style.display = 'none';
  }
  return { init, update, quizTick, answer, list: () => list.concat(typeof Cast2 !== 'undefined' ? Cast2.list() : []), get hint() { return Cast._hint; }, set hint(v) { Cast._hint = v; }, slipCool: 0, _hint: null };
})();
// make Cast.list iterable for item code
Object.defineProperty(Cast, 'agents', { get() { return Cast.list(); } });
