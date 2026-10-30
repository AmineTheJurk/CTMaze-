// Cast 2: seven more characters.
// The Flicker, Scarecrow x3, The Lagger, Gum Gertie, Chef Pepper, Camera Cathy, Hugo the Hugger.
const Cast2 = (() => {
  const { mk, circ, rect, line } = Art.h;
  const seen = {};
  let list = [], gums = [], shots = [], gumMat = null, pepperTex = null, rec = [], recT = 0;
  const tx = c => Art.spriteTex(c);

  // ---------- art ----------
  function flickerArt() {
    const [c, x] = mk(256, 384);
    x.fillStyle = '#050505';
    x.beginPath(); x.ellipse(128, 210, 44, 120, 0, 0, 7); x.fill();
    x.beginPath(); x.ellipse(128, 100, 34, 44, 0, 0, 7); x.fill();
    for (const s of [-1, 1]) { x.beginPath(); x.moveTo(128 + s * 30, 150); x.lineTo(128 + s * 100, 330); x.lineTo(128 + s * 86, 336); x.lineTo(128 + s * 18, 190); x.fill(); }
    for (let i = 0; i < 9; i++) { x.beginPath(); x.moveTo(90 + i * 9, 330); x.lineTo(94 + i * 9, 384); x.lineTo(98 + i * 9, 330); x.fill(); }
    const g = x.createRadialGradient(128, 96, 2, 128, 96, 40); g.addColorStop(0, 'rgba(255,255,255,.25)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(80, 50, 100, 100);
    circ(x, 114, 96, 7, '#fff'); circ(x, 142, 96, 7, '#fff'); circ(x, 114, 96, 2.5, '#000'); circ(x, 142, 96, 2.5, '#000');
    return c;
  }
  function scarecrowArt() {
    const [c, x] = mk(256, 384);
    line(x, 128, 60, 128, 384, 12, '#6b4a22'); line(x, 36, 170, 220, 170, 12, '#6b4a22');
    rect(x, 88, 140, 80, 120, '#b3261e'); for (let i = 0; i < 4; i++) rect(x, 88, 150 + i * 28, 80, 8, 'rgba(0,0,0,.35)'); for (let i = 0; i < 3; i++) rect(x, 100 + i * 24, 140, 8, 120, 'rgba(0,0,0,.3)');
    rect(x, 30, 156, 70, 28, '#b3261e'); rect(x, 156, 156, 70, 28, '#b3261e');
    for (const px of [30, 226]) for (let i = 0; i < 5; i++) line(x, px, 160 + i * 6, px + (px < 100 ? -16 : 16), 156 + i * 8, 3, '#e2c04a');
    rect(x, 96, 260, 28, 100, '#4a3a2a'); rect(x, 132, 260, 28, 100, '#4a3a2a');
    circ(x, 128, 106, 38, '#cdb27a'); rect(x, 70, 78, 116, 12, '#6b4a22'); rect(x, 92, 40, 72, 44, '#6b4a22');
    for (const ex of [112, 144]) { line(x, ex - 8, 98, ex + 8, 114, 4, '#222'); line(x, ex + 8, 98, ex - 8, 114, 4, '#222'); }
    line(x, 108, 134, 148, 134, 4, '#222'); for (let i = 0; i < 5; i++) line(x, 110 + i * 9, 128, 110 + i * 9, 140, 3, '#222');
    return c;
  }
  function laggerArt() {
    const [c, x] = mk(256, 384);
    x.fillStyle = '#7d828c'; x.beginPath(); x.ellipse(128, 120, 40, 50, 0, 0, 7); x.fill();
    x.beginPath(); x.moveTo(84, 150); x.lineTo(172, 150); x.lineTo(190, 310); x.lineTo(66, 310); x.fill();
    rect(x, 56, 156, 22, 150, '#6d727c'); rect(x, 178, 156, 22, 150, '#6d727c'); rect(x, 84, 306, 36, 74, '#5d626c'); rect(x, 136, 306, 36, 74, '#5d626c');
    x.fillStyle = 'rgba(30,30,40,.55)'; x.beginPath(); x.ellipse(128, 124, 28, 34, 0, 0, 7); x.fill();
    return c;
  }
  function gertieArt() {
    const [c, x] = mk(256, 384);
    rect(x, 88, 200, 80, 100, '#3b6ea5'); rect(x, 78, 170, 100, 44, '#f2d230'); rect(x, 60, 176, 22, 80, '#f2d230'); rect(x, 174, 176, 22, 80, '#f2d230');
    circ(x, 70, 262, 11, '#e8c4a4'); circ(x, 186, 262, 11, '#e8c4a4');
    rect(x, 94, 300, 30, 78, '#3b6ea5'); rect(x, 132, 300, 30, 78, '#3b6ea5'); rect(x, 88, 366, 40, 14, '#e8e8e8'); rect(x, 130, 366, 40, 14, '#e8e8e8');
    circ(x, 128, 138, 36, '#e8c4a4'); circ(x, 78, 130, 14, '#d94a8a'); circ(x, 178, 130, 14, '#d94a8a'); rect(x, 92, 96, 72, 22, '#d94a8a');
    circ(x, 116, 138, 4, '#222'); circ(x, 140, 138, 4, '#222'); circ(x, 128, 160, 20, 'rgba(255,120,190,.85)'); circ(x, 134, 154, 5, 'rgba(255,255,255,.6)');
    return c;
  }
  function chefArt() {
    const [c, x] = mk(256, 384);
    rect(x, 84, 150, 88, 150, '#f4f4f4'); for (let i = 0; i < 4; i++) circ(x, 150, 176 + i * 28, 5, '#b8b8b8');
    rect(x, 64, 160, 22, 100, '#f4f4f4'); rect(x, 170, 160, 22, 100, '#f4f4f4');
    circ(x, 74, 262, 12, '#d98a6a'); circ(x, 182, 262, 12, '#d98a6a');
    rect(x, 94, 298, 32, 80, '#2a2a30'); rect(x, 130, 298, 32, 80, '#2a2a30');
    circ(x, 128, 116, 38, '#d98a6a'); rect(x, 96, 40, 64, 46, '#fff'); circ(x, 106, 40, 18, '#fff'); circ(x, 128, 34, 20, '#fff'); circ(x, 150, 40, 18, '#fff'); rect(x, 94, 80, 68, 10, '#e8e8e8');
    circ(x, 114, 112, 5, '#222'); circ(x, 142, 112, 5, '#222'); line(x, 100, 100, 122, 108, 5, '#222'); line(x, 156, 100, 134, 108, 5, '#222');
    rect(x, 102, 134, 52, 10, '#3b2a1a');
    x.fillStyle = '#d6201f'; x.beginPath(); x.ellipse(206, 228, 10, 26, 0.5, 0, 7); x.fill(); line(x, 200, 204, 196, 194, 4, '#2a8a2a');
    return c;
  }
  function cathyArt(red) {
    const [c, x] = mk(256, 384);
    rect(x, 120, 190, 16, 194, '#555'); rect(x, 96, 372, 64, 12, '#444');
    rect(x, 56, 110, 140, 80, '#2c2f36'); rect(x, 56, 110, 140, 12, '#3a3e48');
    circ(x, 96, 150, 28, '#111'); circ(x, 96, 150, 18, '#1a2a4a'); circ(x, 90, 144, 6, 'rgba(255,255,255,.5)');
    circ(x, 170, 128, 9, red ? '#ff2a2a' : '#2aff5a');
    if (red) { const g = x.createRadialGradient(170, 128, 2, 170, 128, 30); g.addColorStop(0, 'rgba(255,40,40,.6)'); g.addColorStop(1, 'rgba(255,40,40,0)'); x.fillStyle = g; x.fillRect(130, 90, 80, 80); }
    x.fillStyle = '#fff'; x.font = 'bold 18px Arial'; x.fillText('CATHY', 118, 180);
    return c;
  }
  function hugoArt() {
    const [c, x] = mk(256, 384);
    x.fillStyle = '#2fa7a0'; x.beginPath(); x.ellipse(128, 250, 84, 112, 0, 0, 7); x.fill();
    for (const s of [-1, 1]) { x.save(); x.translate(128 + s * 70, 220); x.rotate(s * -0.9); x.beginPath(); x.ellipse(0, -44, 22, 70, 0, 0, 7); x.fill(); x.restore(); }
    circ(x, 128, 134, 56, '#38bfb6'); circ(x, 96, 84, 14, '#38bfb6'); circ(x, 160, 84, 14, '#38bfb6');
    circ(x, 108, 126, 7, '#111'); circ(x, 148, 126, 7, '#111'); circ(x, 110, 124, 2.5, '#fff'); circ(x, 150, 124, 2.5, '#fff');
    x.strokeStyle = '#111'; x.lineWidth = 5; x.beginPath(); x.arc(128, 142, 22, 0.15, Math.PI - 0.15); x.stroke();
    circ(x, 88, 148, 9, 'rgba(255,120,150,.5)'); circ(x, 168, 148, 9, 'rgba(255,120,150,.5)');
    x.fillStyle = '#ff6a8a'; x.beginPath(); x.moveTo(128, 280); x.bezierCurveTo(90, 240, 120, 220, 128, 244); x.bezierCurveTo(136, 220, 166, 240, 128, 280); x.fill();
    rect(x, 80, 350, 36, 30, '#2a8a84'); rect(x, 140, 350, 36, 30, '#2a8a84');
    return c;
  }

  // ---------- helpers ----------
  function make(kind, canvas, h, name, tip, extra) {
    const a = new Agent(canvas, h); a.kind = kind; a.nm = name; a.tip = tip; a.cool = 0; a.t = 0; Object.assign(a, extra || {});
    list.push(a); return a;
  }
  function meet(a) { if (!seen[a.nm] && a.sp.visible && a.sees(20)) { seen[a.nm] = 1; Game.toast(a.nm + ': ' + a.tip); } }
  function pushPlayer(dx, dz, dist) {
    const n = Math.max(1, Math.ceil(dist / 0.4)), sx = dx * dist / n, sz = dz * dist / n;
    for (let i = 0; i < n; i++) {
      if (!World.blocked(G.p.x + sx, G.p.z, 0.8)) G.p.x += sx;
      if (!World.blocked(G.p.x, G.p.z + sz, 0.8)) G.p.z += sz;
    }
  }
  const spot = d => World.randomOpen(G.p, d);

  function init(start) {
    list.forEach(a => G.scene.remove(a.sp)); list = [];
    gums.forEach(g => G.scene.remove(g.m)); gums = []; shots.forEach(s => G.scene.remove(s.sp)); shots = []; rec = []; recT = 0;
    for (const k in seen) delete seen[k];
    if (!gumMat) {
      const [c, x] = mk(128, 128); const g = x.createRadialGradient(64, 64, 6, 64, 64, 60); g.addColorStop(0, 'rgba(255,110,180,.85)'); g.addColorStop(1, 'rgba(255,110,180,0)');
      x.fillStyle = g; x.fillRect(0, 0, 128, 128); gumMat = new THREE.MeshBasicMaterial({ map: tx(c), transparent: true, depthWrite: false });
      const [pc, px] = mk(64, 64); px.fillStyle = '#d6201f'; px.beginPath(); px.ellipse(32, 36, 12, 24, 0.6, 0, 7); px.fill(); px.strokeStyle = '#2a8a2a'; px.lineWidth = 5; px.beginPath(); px.moveTo(24, 14); px.lineTo(18, 4); px.stroke(); pepperTex = tx(pc);
    }
    // Flicker: hidden until the lights flicker
    const fl = make('flicker', flickerArt(), 3.8, 'The Flicker', 'it only shows up when the lights flicker.'); fl.sp.visible = false; fl.place(spot(60));
    // three scarecrows guarding corn rooms
    const rooms = World.rooms.slice().sort(() => Math.random() - 0.5).slice(0, 3), stex = tx(scarecrowArt());
    rooms.forEach(r => {
      const a = make('scarecrow', scarecrowArt(), 3.5, 'Scarecrow', 'he guards the corn. Do not wake him.', { mode: 'still', home: { x: World.center(r.tx), z: World.center(r.tz - 1) } });
      a.place(a.home);
    });
    make('lagger', laggerArt(), 3.4, 'The Lagger', 'he follows your exact steps, six seconds behind.').sp.visible = false;
    make('gertie', gertieArt(), 2.8, 'Gum Gertie', 'she leaves sticky gum that slows you down.').place(spot(40));
    make('chef', chefArt(), 3.6, 'Chef Pepper', 'he throws spicy peppers that burn your stamina.').place(spot(50));
    const cat = make('cathy', cathyArt(true), 3.4, 'Camera Cathy', 'when her light is red she tells the Police where you are.', { red: tx(cathyArt(true)), green: tx(cathyArt(false)), on: true });
    cat.sp.material.map = cat.red; cat.place(spot(35));
    make('hugo', hugoArt(), 4.4, 'Hugo the Hugger', 'his hugs pin you in place for three seconds.').place(spot(60));
    list.forEach(a => { if (['gertie', 'chef', 'hugo'].includes(a.kind)) a.roam(); });
  }

  function update(dt) {
    const P = AI.police;
    // lagger trail
    recT -= dt; if (recT <= 0) { recT = 0.1; rec.push({ x: G.p.x, z: G.p.z }); if (rec.length > 80) rec.shift(); }
    for (const a of list) {
      a.cool -= dt; a.t += dt;
      meet(a);
      const dx = G.p.x - a.x, dz = G.p.z - a.z, d = G.hidden ? 999 : Math.hypot(dx, dz) || 1;
      switch (a.kind) {
        case 'flicker':
          if (S.flOff && S.flickerT > 0 && a.cool <= 0) {
            if (!a.sp.visible) {
              let p = null; for (let i = 0; i < 60 && !p; i++) { const q = World.randomOpen(G.p, 8); if (Math.hypot(q.x - G.p.x, q.z - G.p.z) < 26 && World.los(q.x, q.z, G.p.x, G.p.z)) p = q; }
              a.place(p || World.randomOpen(G.p, 12)); a.sp.visible = true;
            }
            a.chase(dt); a.move(dt, 9.5, true);
            if (d < 1.7 && !S.downed) { S.stamina = Math.max(0, S.stamina - 60); S.stunT = 0.5; Snd.play('chomp'); Game.toast('The Flicker grabbed you!'); a.sp.visible = false; a.cool = 6; }
          } else a.sp.visible = false;
          break;
        case 'scarecrow':
          if (a.mode === 'still') {
            if (a.cool <= 0 && d < 5 && !S.downed && !G.hidden) {
              a.mode = 'chase'; a.t = 0; Snd.play('nazer');
              Game.toast('The scarecrow woke up!');
            }
          } else if (a.mode === 'chase') {
            if (G.hidden || S.downed) {
              a.mode = 'return'; a.cool = 8; a.goTo(a.home.x, a.home.z);
            } else {
              a.chase(dt); a.move(dt, 7.4, true);
              if (d < 2.0 && !S.downed && a.cool <= 0) {
                S.stunT = 0.8;
                S.slowT = Math.max(S.slowT, 2.5);
                pushPlayer(dx / d, dz / d, 7);
                Snd.play('chomp');
                a.cool = 14;
                a.mode = 'return';
                a.goTo(a.home.x, a.home.z);
                Game.toast('The scarecrow struck you and went dormant for a while!');
              } else if (a.t > 7) {
                a.mode = 'return';
                a.cool = 8;
                a.goTo(a.home.x, a.home.z);
                Game.toast('The scarecrow gave up and returned.');
              }
            }
          } else if (a.mode === 'return') {
            a.move(dt, 5);
            if (!a.path.length || Math.hypot(a.x - a.home.x, a.z - a.home.z) < 1.0) {
              a.mode = 'still'; a.x = a.home.x; a.z = a.home.z; a.sync();
            }
          }
          break;
        case 'lagger': {
          const ready = rec.length >= 62 && a.cool <= 0;
          a.sp.visible = ready;
          if (ready) {
            const r = rec[rec.length - 60]; a.x = r.x; a.z = r.z; a.sync();
            if (d < 1.5 && !S.downed) { S.stunT = 0.8; S.slowT = Math.max(S.slowT, 5); Snd.play('chomp'); Game.toast('The Lagger caught up with you!'); a.cool = 12; }
          }
          break;
        }
        case 'gertie':
          if (!a.path.length) a.roam(); a.move(dt, 3.2);
          if (a.t > 2.2) {
            a.t = 0; const m = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), gumMat); m.rotation.x = -Math.PI / 2; m.position.set(a.x, 0.05, a.z); G.scene.add(m);
            gums.push({ m, x: a.x, z: a.z }); if (gums.length > 14) G.scene.remove(gums.shift().m);
          }
          break;
        case 'chef':
          if (!a.path.length) a.roam(); a.move(dt, 3);
          if (a.cool <= 0 && d < 26 && !S.downed && World.los(a.x, a.z, G.p.x, G.p.z)) {
            a.cool = 4.5; const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: pepperTex, transparent: true })); sp.scale.set(1.2, 1.2, 1); sp.position.set(a.x, 2.2, a.z); G.scene.add(sp);
            shots.push({ sp, x: a.x, z: a.z, dx: dx / d, dz: dz / d, t: 0 }); Snd.play('flap');
          }
          break;
        case 'cathy': {
          const on = (a.t % 7) < 4; if (on !== a.on) { a.on = on; a.sp.material.map = on ? a.red : a.green; }
          if (on && a.cool <= 0 && d < 26 && S.cuffT <= 0 && P.ignore <= 0 && World.los(a.x, a.z, G.p.x, G.p.z)) {
            a.cool = 25; const was = P.alertT > 0; P.alertT = 14; P.path = []; if (!was) Snd.play('police_detect'); Game.toast('Camera Cathy spotted you and told the Police!');
          }
          break;
        }
        case 'hugo':
          if (a.cool > 0 || S.downed) { if (!a.path.length) a.roam(60); a.move(dt, 3); }
          else if (d < 30 && World.los(a.x, a.z, G.p.x, G.p.z)) { a.chase(dt); a.move(dt, 5.6, true); }
          else { if (!a.path.length) a.roam(); a.move(dt, 3); }
          if (d < 2.3 && a.cool <= 0 && !S.downed) { S.stunT = 3; S.stamina = Math.max(0, S.stamina - 30); a.cool = 12; a.roam(70); Snd.play('ding'); Game.toast('Hugo hugged you! You are pinned for 3 seconds.'); }
          break;
      }
    }
    // gum
    for (const g of gums) {
      const hit = Math.hypot(g.x - G.p.x, g.z - G.p.z) < 1.3;
      if (hit && !g.hit && !S.downed) { g.hit = true; S.slowT = Math.max(S.slowT, 3); Snd.play('slip'); Game.toast('You are stuck in gum!'); }
      else if (!hit && g.hit && Math.hypot(g.x - G.p.x, g.z - G.p.z) > 2.4) g.hit = false;
    }
    // peppers
    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i]; s.t += dt; s.x += s.dx * 16 * dt; s.z += s.dz * 16 * dt; s.sp.position.set(s.x, 2.0, s.z);
      let gone = s.t > 3 || World.blocked(s.x, s.z, 0.2);
      if (!gone && Math.hypot(s.x - G.p.x, s.z - G.p.z) < 1.3 && !S.downed) { S.stamina = Math.max(0, S.stamina - 45); S.stunT = 0.4; Game.flash('#ff3010'); Game.toast('A spicy pepper burned your stamina!'); gone = true; }
      if (gone) { G.scene.remove(s.sp); shots.splice(i, 1); }
    }
  }
  return { init, update, list: () => list };
})();
