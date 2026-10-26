// Flood event: rising water, Tunamies (angry tuna that ram you down), Grabbers (drag you under by the foot, mash P),
// and diving (K): hide underwater for up to 30s so everything bad loses you.
const Flood = (() => {
  const { mk, circ, rect, line } = Art.h;
  const LEVEL = 1.5, TOTAL = 55;
  let mesh = null, tunas = [], grabbers = [], marks = [], wasHid = false, tex = null, texLurk = null, texHand = null, qTex = null;
  const $ = id => document.getElementById(id);
  const tx = c => Art.spriteTex(c);
  let lvl = 0;

  // ---------- art ----------
  function tunaArt() {
    const [c, x] = mk(256, 128);
    x.fillStyle = '#3a5f86'; x.beginPath(); x.ellipse(116, 66, 92, 40, 0, 0, 7); x.fill();
    x.fillStyle = '#c9d6e2'; x.beginPath(); x.ellipse(116, 84, 80, 22, 0, 0, 7); x.fill();
    x.fillStyle = '#2a4668'; x.beginPath(); x.moveTo(206, 66); x.lineTo(252, 22); x.lineTo(240, 66); x.lineTo(252, 110); x.fill();
    x.fillStyle = '#e8c040'; x.beginPath(); x.moveTo(110, 26); x.lineTo(130, 4); x.lineTo(150, 28); x.fill(); x.beginPath(); x.moveTo(120, 104); x.lineTo(140, 124); x.lineTo(150, 100); x.fill();
    circ(x, 44, 56, 13, '#fff'); circ(x, 40, 57, 6, '#000'); line(x, 22, 40, 56, 50, 6, '#0a1a2a');
    x.strokeStyle = '#0a1a2a'; x.lineWidth = 4; x.beginPath(); x.moveTo(20, 82); x.lineTo(52, 90); x.stroke();
    for (let i = 0; i < 4; i++) line(x, 28 + i * 7, 82 + i * 2, 31 + i * 7, 90 + i * 2, 3, '#fff');
    return c;
  }
  function lurkArt() {
    const [c, x] = mk(128, 128);
    x.fillStyle = 'rgba(10,40,30,.85)'; x.beginPath(); x.ellipse(64, 96, 48, 18, 0, 0, 7); x.fill();
    circ(x, 44, 84, 9, '#d4ff5a'); circ(x, 84, 84, 9, '#d4ff5a'); circ(x, 44, 84, 3, '#000'); circ(x, 84, 84, 3, '#000');
    for (const [a, b, r] of [[20, 62, 6], [102, 52, 8], [70, 40, 5], [34, 30, 4]]) { x.strokeStyle = 'rgba(220,240,255,.8)'; x.lineWidth = 2; x.beginPath(); x.arc(a, b, r, 0, 7); x.stroke(); }
    return c;
  }
  function handArt() {
    const [c, x] = mk(256, 384);
    x.fillStyle = '#2f6b3a'; x.fillRect(96, 200, 64, 184);
    x.fillStyle = '#3f8a4a'; x.beginPath(); x.ellipse(128, 180, 62, 56, 0, 0, 7); x.fill();
    for (let i = 0; i < 5; i++) { const a = -2.5 + i * 0.5; x.save(); x.translate(128, 150); x.rotate(a + Math.PI / 2 * 0); x.fillStyle = '#3f8a4a'; x.fillRect(-9, -108, 18, 86); x.fillStyle = '#d8e8c0'; x.beginPath(); x.moveTo(-9, -108); x.lineTo(0, -128); x.lineTo(9, -108); x.fill(); x.restore(); }
    for (let i = 0; i < 4; i++) { x.strokeStyle = 'rgba(120,200,120,.6)'; x.lineWidth = 3; x.beginPath(); x.arc(70 + i * 40, 220 + (i % 2) * 20, 8, 0, 7); x.stroke(); }
    line(x, 100, 260, 156, 270, 8, '#6a5a3a');
    return c;
  }
  function qArt() { const [c, x] = mk(64, 64); x.fillStyle = '#ffd23a'; x.font = 'bold 60px Arial Black, Arial'; x.textAlign = 'center'; x.strokeStyle = '#000'; x.lineWidth = 6; x.strokeText('?', 32, 54); x.fillText('?', 32, 54); return c; }

  function init(scene) {
    if (mesh) scene.remove(mesh);
    const [c, x] = mk(256, 256); rect(x, 0, 0, 256, 256, '#2f78a8');
    x.strokeStyle = 'rgba(255,255,255,.25)'; x.lineWidth = 3;
    for (let i = 0; i < 18; i++) { const y = Math.random() * 256, a = Math.random() * 256; x.beginPath(); x.moveTo(a, y); x.bezierCurveTo(a + 20, y - 8, a + 40, y + 8, a + 60, y); x.stroke(); }
    tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(World.N * World.T / 10, World.N * World.T / 10);
    mesh = new THREE.Mesh(new THREE.PlaneGeometry(World.N * World.T, World.N * World.T), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.62, depthWrite: false }));
    mesh.rotation.x = -Math.PI / 2; mesh.position.set(World.N * World.T / 2, 0, World.N * World.T / 2); mesh.visible = false; scene.add(mesh);
    if (!texLurk) { texLurk = tx(lurkArt()); texHand = tx(handArt()); qTex = tx(qArt()); }
  }
  function reset(scene) {
    clear(); S.floodT = 0; S.diving = false; S.diveT = 30; S.grab = null; S.fallT = 0; lvl = 0; G.hidden = false; wasHid = false;
    Snd.muffle(false); init(scene);
  }
  function clear() {
    tunas.concat(grabbers).forEach(a => G.scene.remove(a.sp)); tunas = []; grabbers = [];
    marks.forEach(m => G.scene.remove(m.sp)); marks = [];
    if (mesh) mesh.visible = false;
  }

  // ---------- flood ----------
  function start() {
    if (S.floodT > 0) return;
    S.floodT = TOTAL; mesh.visible = true; clear(); mesh.visible = true; Snd.play('splash');
    for (let i = 0; i < 5; i++) {
      const a = new Agent(tunaArt(), 1.6); a.kind = 'tuna'; a.sp.scale.set(3.4, 1.7, 1); a.sp.position.y = 0.9; a.cool = 2; a.place(World.randomOpen(G.p, 30)); a.roam(); tunas.push(a);
    }
    for (let i = 0; i < 5; i++) {
      const a = new Agent(lurkArt(), 1.2); a.kind = 'grabber'; a.sp.material.map = texLurk; a.sp.scale.set(1.9, 1.9, 1); a.sp.position.y = 0.8; a.cool = 2; a.place(World.randomOpen(G.p, 25)); a.roam(); grabbers.push(a);
    }
  }
  function end() {
    S.floodT = 0; lvl = 0; clear(); if (S.diving) surface(); if (S.grab) { S.grab = null; $('grab').hidden = true; }
    Game.toast('The water drained away.');
  }

  // ---------- diving ----------
  function surface(forced) {
    S.diving = false; Snd.muffle(false); Snd.play('surface'); if (forced) Game.toast('Out of air! You came up.');
  }
  function toggleDive() {
    if (S.state !== 'play' || S.quiz || S.vent || S.downed || S.grab) return;
    if (S.diving) { surface(); return; }
    if (lvl < 1.2) { Game.toast('There is no deep water to dive in. Wait for a flood.'); return; }
    if (S.diveT < 3) { Game.toast('You are out of breath.'); return; }
    S.diving = true; Snd.muffle(true); Snd.play('dive'); Game.flash('#2a6a9a');
    Game.toast('Underwater! Nobody can see you. Press K to come up.');
  }

  // everyone who was hunting you gets confused when you vanish
  function confuse() {
    for (const e of [AI.police, AI.nazer, AI.hurter]) {
      if (!e) continue;
      const hunting = e === AI.police ? e.alertT > 0 : e.state === 'chase';
      if (!hunting) continue;
      if (e === AI.police) { e.alertT = 0; e.ignore = Math.max(e.ignore, 4); } else { e.state = 'roam'; e.ignore = Math.max(e.ignore, 3); }
      e.path = []; e.stun = Math.max(e.stun || 0, 2.5);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: qTex, transparent: true, depthTest: false })); sp.scale.set(1.5, 1.5, 1); sp.renderOrder = 5; G.scene.add(sp);
      marks.push({ sp, e, t: 2.6 });
    }
  }

  // ---------- grabbers ----------
  function startGrab(a) {
    S.grab = { g: a, prog: 0, need: 14, t: 7 }; a.sp.material.map = texHand; a.sp.scale.set(2.4, 3.6, 1); a.sp.position.y = 1.0; a.x = G.p.x; a.z = G.p.z; a.sync(); a.path = [];
    Snd.play('splash'); Game.flash('#2a6a9a'); Game.toast('A Grabber has your foot! MASH P!');
  }
  function dropGrab(a) { a.sp.material.map = texLurk; a.sp.scale.set(1.9, 1.9, 1); a.sp.position.y = 0.8; }
  function mash() {
    if (!S.grab) return; S.grab.prog += 1; Snd.play('bubble');
  }
  function push(dx, dz, dist) {
    const n = Math.max(1, Math.ceil(dist / 0.4)), sx = dx * dist / n, sz = dz * dist / n;
    for (let i = 0; i < n; i++) { if (!World.blocked(G.p.x + sx, G.p.z, 0.8)) G.p.x += sx; if (!World.blocked(G.p.x, G.p.z + sz, 0.8)) G.p.z += sz; }
  }

  function update(dt) {
    // hidden = nobody can see you (underwater or in a vent)
    const hid = !!(S.diving || S.vent); G.hidden = hid;
    if (hid && !wasHid) confuse(); wasHid = hid;
    for (let i = marks.length - 1; i >= 0; i--) { const m = marks[i]; m.t -= dt; m.sp.position.set(m.e.x, m.e.h + 0.8 + Math.sin(m.t * 8) * 0.12, m.e.z); if (m.t <= 0) { G.scene.remove(m.sp); marks.splice(i, 1); } }
    if (S.fallT > 0) S.fallT -= dt;

    if (S.floodT > 0) {
      S.floodT -= dt; const t = TOTAL - S.floodT;
      lvl = S.floodT < 7 ? LEVEL * Math.max(0, S.floodT) / 7 : Math.min(1, t / 5) * LEVEL;
      mesh.position.y = lvl; tex.offset.x += dt * 0.03; tex.offset.y += dt * 0.012;
      if (S.floodT <= 0) end();
    }
    if (S.diving) { S.diveT -= dt; if (S.diveT <= 0) { S.diveT = 0; surface(true); } if (lvl < 0.8) surface(); }
    else if (S.diveT < 30) S.diveT = Math.min(30, S.diveT + dt * 3);
    $('water').style.opacity = (S.diving || S.grab || S.fallT > 0) ? 0.6 : 0;

    if (S.floodT > 0) {
      const wet = lvl > 0.5;
      const isMonster = typeof Game !== 'undefined' && Game.isMonster && Game.isMonster();
      for (const a of tunas) {
        a.sp.visible = wet; a.cool -= dt;
        const raw = Math.hypot(a.x - G.p.x, a.z - G.p.z);
        if (!isMonster && a.sees(45)) { a.chase(dt); a.move(dt, 8.5, true); } else { if (!a.path.length) a.roam(); a.move(dt, 4); }
        a.sp.position.y = 0.9 + Math.sin(S.time * 4 + a.x) * 0.12;
        if (!isMonster && wet && !G.hidden && raw < 2.1 && a.cool <= 0 && !S.downed && !S.grab && !S.vent) {
          a.cool = 4; S.stunT = Math.max(S.stunT, 2.4); S.fallT = 2.4; S.stamina = Math.max(0, S.stamina - 25);
          const d = raw || 1; push((G.p.x - a.x) / d, (G.p.z - a.z) / d, 5);
          Snd.play('splash'); Game.flash('#2a6a9a'); Game.toast('A Tunamy rammed you and knocked you down!');
        }
      }
      for (const a of grabbers) {
        if (S.grab && S.grab.g === a) continue;
        a.sp.visible = wet; a.cool -= dt;
        const raw = Math.hypot(a.x - G.p.x, a.z - G.p.z);
        if (!isMonster && raw < 11 && !S.vent && !S.downed) { a.chase(dt); a.move(dt, 4.6, false); } else { if (!a.path.length) a.roam(); a.move(dt, 3.2); }
        if (!isMonster && wet && lvl > 0.8 && raw < 1.9 && a.cool <= 0 && !S.grab && !S.downed && !S.vent) startGrab(a);
      }
    }
    // being dragged under
    const g = S.grab;
    if (g) {
      S.stunT = Math.max(S.stunT, 0.3); g.t -= dt; g.prog = Math.max(0, g.prog - dt * 1.3);
      $('grab').hidden = false; $('gBar').style.width = Math.min(100, g.prog / g.need * 100) + '%';
      if (g.prog >= g.need) {
        S.grab = null; $('grab').hidden = true; dropGrab(g.g); g.g.cool = 20; g.g.stun = 3; g.g.place(World.randomOpen(G.p, 20));
        Snd.play('ding'); Game.toast('You kicked free!');
      } else if (g.t <= 0) {
        S.grab = null; $('grab').hidden = true; dropGrab(g.g); g.g.cool = 20; g.g.place(World.randomOpen(G.p, 30));
        S.inv = [null, null, null, null, null]; S.stamina = 0; S.stunT = 2; S.fallT = 2;
        const t = World.randomOpen(G.p, 70); G.p.x = t.x; G.p.z = t.z; Snd.play('splash');
        Game.toast('Dragged under! You lost your items and washed up somewhere else.');
      }
    } else $('grab').hidden = true;
  }
  return { init, reset, start, update, toggleDive, surface, mash, confuse, get level() { return lvl; } };
})();
