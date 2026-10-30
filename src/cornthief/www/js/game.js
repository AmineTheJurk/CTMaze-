// Player, items, HUD, input and the main loop.
const Game = (() => {
  const $ = id => document.getElementById(id);
  const WALK = 6, RUN = 11, R = 0.8, EYE = 2.1;
  let renderer, scene, camera, light, canvas, info, lockWorked = false, paused = false, dragging = false, grap = null, rope = null, last = 0;
  const keys = {};
  const mm = { c: null, ctx: null, img: null, dirty: false };

  const M = () => (S.dbl > 0 ? 2 : 1);              // "items doubled" event multiplier
  const traps = [], fxs = [];
  const allAgents = () => [AI.police, AI.nazer, AI.lady, AI.hurter, ...Cast.list()].filter(a => a && a.sp.visible);
  const ITEMS = {
    grapple: { name: 'Grappling Hook', rule: 'NO GRAPPLING HOOK', use() {
      const fx = -Math.sin(G.p.yaw), fz = -Math.cos(G.p.yaw), d = World.rayDist(G.p.x, G.p.z, fx, fz, 40 * M());
      if (d < 3) { toast('Not enough room to grapple'); Snd.play('nope'); return false; }
      grap = { fx, fz, left: d };
      const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(G.p.x, 1.6, G.p.z), new THREE.Vector3(G.p.x + fx * d, 1.6, G.p.z + fz * d)]);
      rope = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0xd8b060 })); scene.add(rope); rope.ttl = 0.5;
      Snd.play('grapple'); return true;
    } },
    teleporter: { name: 'Slypess Teleporter', rule: 'NO TELEPORTING', use() {
      const t = World.randomOpen(G.p, 60); G.p.x = t.x; G.p.z = t.z; flash('#b480ff'); Snd.play('teleport'); return true;
    } },
    coke: { name: 'Coke', rule: 'NO DRINKING COKE', use() {
      const fx = -Math.sin(G.p.yaw), fz = -Math.cos(G.p.yaw); let hit = 0;
      for (const a of [AI.police, AI.nazer, AI.lady, AI.hurter, ...Cast.list()]) {
        if (!a || !a.sp.visible) continue;
        const dx = a.x - G.p.x, dz = a.z - G.p.z, d = Math.hypot(dx, dz);
        if (d < 14 * M() && (dx * fx + dz * fz) / (d || 1) > 0.45) { a.knock(dx / d, dz / d, 1.3 * M(), 3.2 * M()); hit++; }
      }
      flash('#9fe8ff'); Snd.play('spray'); if (hit) toast('Blasted ' + hit + ' away!'); return true;
    } },
    bar: { name: 'Protein Bar', rule: 'NO EATING PROTEIN BARS', use() {
      S.stamina = 100; S.exhausted = false; S.boost = 6 * M(); Snd.play('crunch'); toast('Stamina restored'); return true;
    } },
    glow: { name: 'Glow Stick', use() { S.glowT = 40 * M(); Snd.play('pickup'); toast('Glow stick on. You can see further, even in the dark.'); return true; } },
    smoke: { name: 'Smoke Bomb', rule: 'NO SMOKING', use() {
      const Rr = 16 * M(), Tt = 7 * M();
      for (let i = 0; i < 10; i++) puff(G.p.x + (Math.random() - 0.5) * 5, 0.8 + Math.random() * 2, G.p.z + (Math.random() - 0.5) * 5, 4 + Math.random() * 3, 7 * M());
      for (const a of allAgents()) if (Math.hypot(a.x - G.p.x, a.z - G.p.z) < Rr) {
        a.path = []; a.stun = Math.max(a.stun || 0, 1.5);
        if (a === AI.nazer || a === AI.hurter) { a.state = 'roam'; a.ignore = Math.max(a.ignore, Tt); }
        if (a === AI.police) { a.alertT = 0; a.ignore = Math.max(a.ignore, Tt); }
      }
      Snd.play('spray'); toast('Smoke! They lost you.'); return true;
    } },
    banana: { name: 'Banana Peel', use() { dropTrap('banana'); Snd.play('pickup'); toast('Banana dropped behind you'); return true; } },
    clock: { name: 'Alarm Clock', use() { dropTrap('clock'); toast('Alarm clock set. It will lure MazerNazer and HurterBoy.'); return true; } },
    shoes: { name: 'Spring Shoes', use() { S.springT = 12 * M(); Snd.play('teleport'); toast('Spring Shoes! You are faster.'); return true; } },
    medkit: { name: 'Medkit', use() {
      if (!S.downed) { toast('You are not hurt. Keep it for when HurterBoy gets you.'); Snd.play('nope'); return false; }
      if (S.loop) { S.loop.stop(); S.loop = null; } S.healT = 0; Snd.play('ding'); heal(); return true;
    } },
    radar: { name: 'Corn Radar', use() {
      let best = null, bd = 1e9;
      for (const k of AI.pickups) if (k.type === 'corn' && !k.taken) { const d = Math.hypot(k.x - G.p.x, k.z - G.p.z); if (d < bd) { bd = d; best = k; } }
      if (!best) { toast('No corns left to find'); return false; }
      Cast.hint = { x: best.x, z: best.z, t: 30 * M() }; Snd.play('pickup'); toast('Radar on. The nearest corn is marked on your map.'); return true;
    } }
  };
  const randomItem = () => { const k = Object.keys(ITEMS); return k[Math.floor(Math.random() * k.length)]; };

  // ---------- smoke / traps ----------
  let puffTex = null;
  function puff(x, y, z, size, life) {
    if (!puffTex) { const [c, cx] = Art.h.mk(64, 64); const g = cx.createRadialGradient(32, 32, 2, 32, 32, 30); g.addColorStop(0, 'rgba(235,235,235,.9)'); g.addColorStop(1, 'rgba(200,200,200,0)'); cx.fillStyle = g; cx.fillRect(0, 0, 64, 64); puffTex = Art.spriteTex(c); }
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false }));
    sp.scale.set(size, size, 1); sp.position.set(x, y, z); scene.add(sp); fxs.push({ sp, t: 0, life, size });
  }
  function fxTick(dt) {
    for (let i = fxs.length - 1; i >= 0; i--) {
      const f = fxs[i]; f.t += dt; f.sp.position.y += dt * 0.3; f.sp.scale.set(f.size * (1 + f.t * 0.15), f.size * (1 + f.t * 0.15), 1);
      f.sp.material.opacity = Math.max(0, 1 - f.t / f.life);
      if (f.t >= f.life) { scene.remove(f.sp); fxs.splice(i, 1); }
    }
  }
  function dropTrap(type) {
    const dx = -Math.sin(G.p.yaw), dz = -Math.cos(G.p.yaw); let x = G.p.x - dx * 1.2, z = G.p.z - dz * 1.2;
    if (World.blocked(x, z, 0.5)) { x = G.p.x; z = G.p.z; }
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: Art.spriteTex(Art.icon(type)), transparent: true, alphaTest: 0.05 }));
    sp.scale.set(1.3, 1.3, 1); sp.position.set(x, 0.7, z); scene.add(sp);
    traps.push({ type, x, z, sp, age: 0, ring: 9 * M(), lastBeat: -1 });
  }
  function trapTick(dt) {
    for (let i = traps.length - 1; i >= 0; i--) {
      const t = traps[i]; t.age += dt; let done = false;
      if (t.type === 'banana') {
        for (const a of allAgents()) if (Math.hypot(a.x - t.x, a.z - t.z) < 1.5) { a.stun = 3 * M(); a.path = []; Snd.play('slip'); done = true; break; }
        if (t.age > 120) done = true;
      } else if (t.age > 0.8 && t.age < 0.8 + t.ring) {
        t.sp.position.x = t.x + Math.sin(t.age * 60) * 0.06;
        const beat = (t.age * 2.2) | 0; if (beat !== t.lastBeat) { t.lastBeat = beat; Snd.play('bell'); }
        for (const e of [AI.nazer, AI.hurter]) if (e && e.ignore <= 0 && !(e === AI.nazer && AI.nazer.grace > 0)) { e.last = { x: t.x, z: t.z }; e.state = 'chase'; }
      } else if (t.age >= 0.8 + t.ring) done = true;
      if (done) { scene.remove(t.sp); traps.splice(i, 1); }
    }
  }
  function clearFx() { traps.forEach(t => scene.remove(t.sp)); traps.length = 0; fxs.forEach(f => scene.remove(f.sp)); fxs.length = 0; }
  function tickTimers(dt) { if (S.dbl > 0) S.dbl -= dt; if (S.glowT > 0) S.glowT -= dt; }

  // ---------- small helpers ----------
  function toast(msg) {
    const t = $('toast'); t.textContent = msg; t.classList.add('on');
    clearTimeout(toast.id); toast.id = setTimeout(() => t.classList.remove('on'), 2600);
  }
  function flash(col) { const f = $('flash'); f.style.background = col; f.style.transition = 'none'; f.style.opacity = 0.7; requestAnimationFrame(() => { f.style.transition = 'opacity .6s'; f.style.opacity = 0; }); }
  function breakRule(name) {
    const P = AI.police;
    if (S.cuffT > 0 || P.ignore > 0) return;
    if (P.sees(48)) {
      const was = P.alertT > 0; P.alertT = 14;
      if (!was) { Snd.play('police_detect'); toast('The Police saw you break a rule: ' + name + '!'); P.path = []; }
    }
  }
  function useItem() {
    if (S.state !== 'play' || paused || S.cuffT > 0 || S.stunT > 0 || S.quiz) return;
    if (typeof Multiplayer !== 'undefined' && Multiplayer.inMultiplayer && Multiplayer.myRole !== 'thief') {
      if (Multiplayer.onCatchBtnClick) Multiplayer.onCatchBtnClick();
      return;
    }
    const t = S.inv[S.sel]; if (!t) return;
    if (S.downed && t !== 'medkit') return;
    const it = ITEMS[t];
    if (it.use() !== false) { S.inv[S.sel] = null; if (it.rule) breakRule(it.rule); }
  }
  function allCorns() {
    World.unlockExit();
    toast('All corns found! The exit is open. Find it on the east edge of the maze!');
  }
  function stab() {
    const H = AI.hurter; S.downed = true; H.ignore = 14; H.state = 'roam'; H.roam(60);
    Snd.play('hurterboy_stabbed'); if (S.loop) S.loop.stop(); S.loop = Snd.play('player_stabbed', { loop: true });
    toast('HurterBoy stabbed you! Wait for the Hospital Lady.');
  }
  function heal() { S.downed = false; AI.lady.roam(80); toast('You are healed. Get moving!'); }
  function darkness(secs, quiet) {
    S.darkT = S.darkMax = secs || 30; if (S.loopDark) S.loopDark.stop();
    S.loopDark = quiet ? null : Snd.play('puppet_exploded', { loop: true }); Snd.setEcho(true); flash('#ffffff');
    if (!quiet) toast('The puppet exploded! Darkness for 30 seconds.');
  }

  function toggleVent() {
    if (S.state !== 'play' || paused || S.downed || S.grab || S.quiz) return;
    if (typeof Multiplayer !== 'undefined' && Multiplayer.inMultiplayer && Multiplayer.myRole !== 'thief') {
      toast('Only thieves can crawl through subterranean vents!');
      Snd.play('nope');
      return;
    }
    const near = World.getNearVent(G.p.x, G.p.z, 2.8);
    if (!S.vent) {
      if (!near) { toast('No vent nearby. Find a metallic floor grate.'); Snd.play('nope'); return; }
      S.vent = true;
      G.p.x = near.x; G.p.z = near.z;
      Snd.play('vent_open');
      Snd.muffle(true);
      Flood.confuse();
      flash('#2a4a5a');
      toast('Hopped into ' + near.name + '! Crawl along the duct tunnels. Press V under any grate to climb out.');
    } else {
      if (!near) { toast('You are in a duct tunnel! Crawl under any vent grate to climb out.'); Snd.play('nope'); return; }
      S.vent = false;
      G.p.x = near.x; G.p.z = near.z;
      Snd.play('vent_open');
      Snd.muffle(false);
      flash('#d8c060');
      toast('Climbed out of ' + near.name + ' into the maze!');
    }
  }

  // ---------- minimap ----------
  function shouldHaveFullMap() {
    return typeof Multiplayer !== 'undefined' &&
           Multiplayer.inMultiplayer &&
           Multiplayer.room?.mode === '1v1' &&
           Multiplayer.myRole !== 'thief';
  }

  function mmRevealAll() {
    if (!mm.c || !mm.img) return;
    const N = World.N;
    const d = mm.img.data;
    for (let z = 0; z < N; z++) {
      for (let x = 0; x < N; x++) {
        const v = World.grid[z * N + x];
        const i = (z * N + x) * 4;
        const c = v === 2 ? [220, 50, 50] : (v === 0 ? [214, 192, 120] : [78, 64, 36]);
        d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
      }
    }
    // Highlight all 10 corn chambers in bright golden amber
    if (World.rooms) {
      for (const r of World.rooms) {
        for (let rz = r.z0; rz <= r.z1; rz++) {
          for (let rx = r.x0; rx <= r.x1; rx++) {
            if (World.grid[rz * N + rx] === 0) {
              const i = (rz * N + rx) * 4;
              d[i] = 245; d[i + 1] = 195; d[i + 2] = 30;
            }
          }
        }
      }
    }
    mm.dirty = true;
    mm.ctx.putImageData(mm.img, 0, 0);
  }

  function mmInit() {
    mm.c = $('mmap'); mm.c.width = mm.c.height = World.N; mm.ctx = mm.c.getContext('2d');
    mm.img = mm.ctx.createImageData(World.N, World.N);
    for (let i = 0; i < mm.img.data.length; i += 4) { mm.img.data[i] = 12; mm.img.data[i + 1] = 12; mm.img.data[i + 2] = 10; mm.img.data[i + 3] = 255; }
    mm.ctx.putImageData(mm.img, 0, 0);

    if (shouldHaveFullMap()) {
      mmRevealAll();
    }
  }

  function mmReveal(tx, tz) {
    const N = World.N;
    for (let a = -3; a <= 3; a++) for (let b = -3; b <= 3; b++) {
      const x = tx + a, z = tz + b; if (x < 0 || z < 0 || x >= N || z >= N) continue;
      const v = World.grid[z * N + x], i = (z * N + x) * 4, d = mm.img.data;
      const c = v === 0 ? [214, 192, 120] : v === 2 ? [200, 40, 40] : [78, 64, 36];
      if (d[i] !== c[0] || d[i + 1] !== c[1] || d[i + 2] !== c[2]) { d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; mm.dirty = true; }
    }
  }

  // ---------- inventory / HUD ----------
  const slots = [];
  function buildHUD() {
    const inv = $('inv'); inv.innerHTML = '';
    for (let i = 0; i < 5; i++) {
      const d = document.createElement('div'); d.className = 'slot';
      d.innerHTML = '<span class="n">' + (i + 1) + '</span><img alt=""><span class="nm"></span>';
      d.addEventListener('click', e => { e.stopPropagation(); S.sel = i; });
      inv.appendChild(d); slots.push(d);
    }
  }
  const iconCache = {};
  const iconURL = t => iconCache[t] || (iconCache[t] = Art.icon(t).toDataURL());
  let hudKey = '';
  function hud() {
    const key = S.inv.join() + S.sel + (S.cuffT > 0);
    if (key !== hudKey) {
      hudKey = key;
      slots.forEach((d, i) => {
        const t = S.inv[i], im = d.querySelector('img');
        d.classList.toggle('sel', i === S.sel); d.classList.toggle('locked', S.cuffT > 0);
        im.style.visibility = t ? 'visible' : 'hidden'; if (t) im.src = iconURL(t);
        d.querySelector('.nm').textContent = t ? ITEMS[t].name : '';
      });
    }
    $('corns').textContent = S.corns + ' / ' + CORNS;
    const sb = $('stam'); sb.style.width = S.stamina + '%'; sb.classList.toggle('low', S.exhausted); sb.classList.toggle('boost', S.boost > 0);
    const st = [];
    if (S.cuffT > 0) st.push('HANDCUFFED ' + Math.ceil(S.cuffT) + 's');
    if (S.darkT > 0) st.push('DARKNESS ' + Math.ceil(S.darkT) + 's');
    if (S.downed) st.push(S.healT > 0 ? 'BEING HEALED' : 'STABBED: WAIT FOR THE HOSPITAL LADY');
    if (AI.police.alertT > 0) st.push('POLICE ALERT');
    if (S.dbl > 0) st.push('ITEMS DOUBLED ' + Math.ceil(S.dbl) + 's');
    if (S.glowT > 0) st.push('GLOW ' + Math.ceil(S.glowT) + 's');
    if (S.springT > 0) st.push('SPRING SHOES ' + Math.ceil(S.springT) + 's');
    if (S.zoomT > 0) st.push('ZOOMIES ' + Math.ceil(S.zoomT) + 's');
    if (S.revT > 0) st.push('DIZZY ' + Math.ceil(S.revT) + 's');
    if (S.slowT > 0) st.push('SLOWED ' + Math.ceil(S.slowT) + 's');
    if (S.flickerT > 0) st.push('LIGHTS FLICKERING');
    const nearVent = World.getNearVent(G.p.x, G.p.z, 2.6);
    if (S.vent) st.push(nearVent ? 'AT ' + nearVent.name.toUpperCase() + ' (PRESS V TO EXIT)' : 'CRAWLING IN DUCTS (HIDDEN)');
    else if (nearVent) st.push('NEAR ' + nearVent.name.toUpperCase() + ' (PRESS V TO ENTER)');
    $('status').innerHTML = st.map(s => '<b>' + s + '</b>').join('');

    const vb = $('ventBtn');
    if (vb) {
      if (S.vent) {
        vb.hidden = false;
        vb.textContent = nearVent ? 'EXIT VENT (V)' : 'IN DUCTS (V)';
        vb.classList.toggle('ready', !!nearVent);
      } else if (nearVent) {
        vb.hidden = false;
        vb.textContent = 'ENTER VENT (V)';
        vb.classList.add('ready');
      } else {
        vb.hidden = true;
      }
    }

    $('gaze').style.opacity = Math.min(0.85, S.gaze / 3.5);
    $('hurt').style.opacity = S.downed ? 1 : 0;
    $('cuffs').style.opacity = S.cuffT > 0 ? 1 : 0;
    const dk = S.darkT > 0 ? Math.min(1, S.darkT, 30 - S.darkT + 0.0001 + 1) : 0;
    const dOp = S.darkT > 0 ? Math.min(1, S.darkT / 1.5, (S.darkMax - S.darkT) / 1.0 + 0.0) : 0;
    const isMonster = typeof Multiplayer !== 'undefined' && Multiplayer.inMultiplayer && Multiplayer.myRole !== 'thief';
    const invEl = $('inv');
    if (invEl) invEl.style.display = isMonster ? 'none' : 'flex';

    const W = $('mmap').clientWidth, k = W / (World.N * World.T);
    const dot = $('mdot');
    dot.style.transform = `translate(${G.p.x * k - 4}px,${G.p.z * k - 4}px)`;

    const exitDot = $('mExitDot');
    if (exitDot && World.exit) {
      const ex = (World.exit.x * World.T + World.T * 0.5) * k;
      const ez = (World.exit.z * World.T + World.T * 0.5) * k;
      exitDot.style.left = `${ex}px`;
      exitDot.style.top = `${ez}px`;
      exitDot.style.display = 'block';
      exitDot.classList.toggle('open', S.corns >= CORNS);
    }

    if (shouldHaveFullMap()) {
      const role = (typeof Multiplayer !== 'undefined' && Multiplayer.inMultiplayer) ? Multiplayer.myRole : 'nazer';
      const roleCol = role === 'nazer' ? '#e0432f' : (role === 'puppet' ? '#d9467a' : '#8e44ad');
      dot.style.background = roleCol;
      const ml = $('mapLabel');
      if (ml) {
        ml.textContent = 'FULL MAP (M: hide)';
        ml.style.color = 'var(--corn)';
      }
      $('mapwrap').style.borderColor = roleCol;
    } else {
      dot.style.background = 'var(--cool)';
      const ml = $('mapLabel');
      if (ml) {
        ml.textContent = 'M: hide map';
        ml.style.color = 'var(--muted)';
      }
      $('mapwrap').style.borderColor = 'var(--line)';
    }
    if (typeof Multiplayer !== 'undefined' && Multiplayer.updateMinimap) {
      Multiplayer.updateMinimap(k);
    }
    $('mnazer').style.display = 'none';
    if (mm.dirty) { mm.ctx.putImageData(mm.img, 0, 0); mm.dirty = false; }
  }

  // ---------- player ----------
  let stepAcc = 0;
  function movePlayer(dt) {
    const p = G.p;
    if (!S.downed) {
      let tr = (keys.ArrowLeft ? 1 : 0) - (keys.ArrowRight ? 1 : 0); p.yaw += tr * 1.9 * dt;
    }
    let mv = 0, fwd = 0, str = 0;
    if (!S.downed && S.stunT <= 0) {
      fwd = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
      str = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
    }
    if (S.revT > 0) { fwd = -fwd; str = -str; S.revT -= dt; }
    const moving = fwd || str;
    const want = moving && (keys.ShiftLeft || keys.ShiftRight) && !S.exhausted && S.stamina > 0 && S.cuffT <= 0;
    S.running = !!want;
    if (S.running) {
      if (S.boost <= 0 && !S.vent) S.stamina -= 22 * dt;
      if (S.stamina <= 0) { S.stamina = 0; S.exhausted = true; }
      if (!S.vent) breakRule('NO RUNNING');
    }
    else { S.stamina = Math.min(100, S.stamina + 14 * dt); if (S.exhausted && S.stamina >= 30) S.exhausted = false; }
    if (S.boost > 0) S.boost -= dt;
    const isMonsterRole = typeof Multiplayer !== 'undefined' && Multiplayer.inMultiplayer && Multiplayer.myRole !== 'thief';
    if (isMonsterRole) {
      S.stamina = 100;
      S.exhausted = false;
    }
    let speed = S.running ? (isMonsterRole ? 13.5 : RUN) : (isMonsterRole ? 9.5 : WALK);
    if (S.vent) speed = S.running ? 6.2 : 4.4; // Crawl speed
    if (S.cuffT > 0) speed *= 0.4;
    if (S.slowT > 0) speed *= 0.5;
    if (S.springT > 0) { speed *= 1.5; S.springT -= dt; }
    if (Flood.level > 0.8) speed *= 0.75;
    if (S.diving) speed *= 0.65;
    let dx = 0, dz = 0;
    if (grap) {
      const s = 46 * dt; dx = grap.fx * s; dz = grap.fz * s; grap.left -= s;
      const bx = S.vent ? World.ventBlocked(p.x + dx, p.z, R) : World.blocked(p.x + dx, p.z, R);
      const bz = S.vent ? World.ventBlocked(p.x, p.z + dz, R) : World.blocked(p.x, p.z + dz, R);
      if (bx && bz || grap.left <= 0) grap = null;
    } else if (moving) {
      const n = Math.hypot(fwd, str), s = speed * dt / n, sy = Math.sin(p.yaw), cy = Math.cos(p.yaw);
      dx = (-sy * fwd + cy * str) * s; dz = (-cy * fwd - sy * str) * s;
    }
    if (dx || dz) {
      if (S.vent) {
        if (!World.ventBlocked(p.x + dx, p.z, R)) p.x += dx;
        if (!World.ventBlocked(p.x, p.z + dz, R)) p.z += dz;
        if (!grap) { stepAcc += Math.hypot(dx, dz); if (stepAcc > 2.0) { stepAcc = 0; Snd.play('crawl'); } }
      } else {
        if (!World.blocked(p.x + dx, p.z, R)) p.x += dx;
        if (!World.blocked(p.x, p.z + dz, R)) p.z += dz;
        if (!grap) { stepAcc += Math.hypot(dx, dz); if (stepAcc > (S.running ? 3.4 : 2.6)) { stepAcc = 0; Snd.step(); } }
      }
    }
    if (rope) { rope.ttl -= dt; if (rope.ttl <= 0) { scene.remove(rope); rope = null; } }
  }

  function darknessTick(dt) {
    if (S.darkT > 0) {
      S.darkT -= dt;
      if (S.darkT <= 0) { S.darkT = 0; if (S.loopDark) { S.loopDark.stop(); S.loopDark = null; } Snd.setEcho(false); toast('The darkness lifts.'); }
    }
    const d = S.darkT > 0 || S.flOff, g = S.glowT > 0;
    let far = d ? (g ? 24 : 8) : (g ? 62 : 46), li = d ? (g ? 1.1 : 0.3) : (g ? 1.9 : 1.5);
    if (S.diving) far = Math.min(far, 18);
    const k = S.flOff ? 1 : Math.min(1, dt * 3);        // flicker snaps instantly
    scene.fog.far += (far - scene.fog.far) * k;
    light.intensity += (li - light.intensity) * k;
  }

  function win() {
    S.state = 'won'; if (document.exitPointerLock) document.exitPointerLock();
    if (S.loop) S.loop.stop(); if (S.loopDark) S.loopDark.stop(); Snd.setEcho(false); Snd.play('win');
    const m = Math.floor(S.time / 60), s = Math.floor(S.time % 60);
    $('winTime').textContent = m + 'm ' + String(s).padStart(2, '0') + 's';
    $('win').hidden = false;
  }

  function gameOver() {
    S.state = 'over'; if (document.exitPointerLock) document.exitPointerLock();
    if (S.loop) { S.loop.stop(); S.loop = null; } if (S.loopDark) { S.loopDark.stop(); S.loopDark = null; } Snd.setEcho(false);
    $('overInfo').textContent = 'MazerNazer caught you with ' + S.corns + ' of ' + CORNS + ' corns after ' + Math.floor(S.time / 60) + 'm ' + String(Math.floor(S.time % 60)).padStart(2, '0') + 's.';
    for (const k in keys) keys[k] = false;
    $('over').hidden = false;
  }

  function frame(ts) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (ts - last) / 1000 || 0.016); last = ts;
    if (S.state === 'play' && !paused) {
      if (S.quiz) Cast.quizTick(dt);
      else {
        S.time += dt;
        if (S.stunT > 0) S.stunT -= dt;
        if (S.cuffT > 0) S.cuffT = Math.max(0, S.cuffT - dt);
        movePlayer(dt); AI.update(dt); darknessTick(dt); trapTick(dt); fxTick(dt); tickTimers(dt);
        if (typeof Multiplayer !== 'undefined') Multiplayer.update(dt);
        if (!shouldHaveFullMap()) {
          mmReveal(World.tileOf(G.p.x), World.tileOf(G.p.z));
        }
        if (G.p.x > (World.N - 1) * World.T + 2) {
          if (typeof Multiplayer !== 'undefined' && Multiplayer.inMultiplayer) Multiplayer.reportEscape();
          win();
        }
      }
    }
    const moving = (keys.KeyW || keys.ArrowUp || keys.KeyS || keys.ArrowDown || keys.KeyA || keys.KeyD);
    const p = G.p, bob = S.state === 'play' && moving ? Math.sin(S.time * (S.vent ? 7 : (S.running ? 14 : 9))) * (S.vent ? 0.04 : 0.08) : 0;
    const role = typeof Multiplayer !== 'undefined' && Multiplayer.inMultiplayer ? Multiplayer.myRole : 'thief';
    let charEye = EYE;
    if (role === 'nazer') charEye = 2.8;
    else if (role === 'puppet') charEye = 2.6;
    else if (role === 'hurter') charEye = 2.1;
    let eyeH = S.downed ? 0.5 : (S.diving ? 0.7 : (S.vent ? -0.9 : charEye)); if (S.fallT > 0) eyeH = 0.5;
    camera.position.set(p.x, eyeH + bob, p.z);
    const tiltH = (S.downed || S.fallT > 0 || S.grab) ? -0.5 : p.pitch;
    camera.rotation.set(tiltH, p.yaw, S.downed ? 0.5 : 0, 'YXZ');
    let lightY = S.vent ? -0.8 : (S.diving ? 1.2 : 3);
    light.position.set(p.x, lightY, p.z);
    if (S.state === 'play') hud();
    renderer.render(scene, camera);
  }

  function newGame(seed) {
    Object.assign(S, { corns: 0, inv: [null, 'coke', 'bar', null, null], sel: 0, stamina: 100, exhausted: false, boost: 0, running: false, cuffT: 0, downed: false, healT: 0, darkT: 0, gaze: 0, stunT: 0, time: 0, hurterOn: true, quiz: null, slowT: 0, static: 0, dbl: 0, glowT: 0, springT: 0, revT: 0, zoomT: 0, flickerT: 0, flOff: false, darkMax: 30, floodT: 0, diving: false, diveT: 30, grab: null, fallT: 0, vent: false });
    $('quiz').hidden = true; clearFx(); Events.reset();
    S.inv = ['bar', null, null, null, null];
    if (S.loop) S.loop.stop(); S.loop = null; if (S.loopDark) S.loopDark.stop(); S.loopDark = null; Snd.setEcho(false);
    grap = null; hudKey = '';
    info = World.build(scene, seed); Flood.reset(scene);

    // Set spawn position - monsters spawn at different locations than thief
    const isMonster = typeof Multiplayer !== 'undefined' && Multiplayer.inMultiplayer && Multiplayer.myRole !== 'thief';
    let spawnPos = info.start;
    if (isMonster) {
      // Monsters spawn at opposite corner of the map
      spawnPos = World.randomOpen(info.start, 60);
    }

    G.p.x = spawnPos.x; G.p.z = spawnPos.z; G.p.yaw = -Math.PI / 2 * 0 + Math.PI; G.p.pitch = 0;
    // face the first open direction
    for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) if (World.rayDist(G.p.x, G.p.z, -Math.sin(a), -Math.cos(a), 12) > 6) { G.p.yaw = a; break; }
    AI.init(info.start); mmInit();
    if (typeof Multiplayer !== 'undefined' && Multiplayer.inMultiplayer) {
      if (Multiplayer.room?.players?.some(p => p.role === 'nazer') && AI.nazer) {
        AI.nazer.sp.visible = false;
        AI.nazer.ignore = 9999999;
      }
      if (Multiplayer.room?.players?.some(p => p.role === 'puppet') && AI.puppet) {
        AI.puppet.sp.visible = false;
        AI.puppet.ignore = 9999999;
      }
      if (Multiplayer.room?.players?.some(p => p.role === 'hurter') && AI.hurter) {
        AI.hurter.sp.visible = false;
        AI.hurter.ignore = 9999999;
      }
    }
    if (shouldHaveFullMap()) {
      mmRevealAll();
    }
  }

  function lock() { try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) {} }
  function setPaused(v) { paused = v; $('pause').hidden = !v; }

  function setup() {
    canvas = $('view');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    scene = new THREE.Scene(); scene.background = new THREE.Color(0x070706); scene.fog = new THREE.Fog(0x070706, 3, 46);
    G.scene = scene;
    camera = new THREE.PerspectiveCamera(75, 1, 0.1, 90);
    scene.add(new THREE.AmbientLight(0x6a6450, 0.9));
    light = new THREE.PointLight(0xfff0c8, 1.5, 40, 1.4); scene.add(light);
    const resize = () => { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
    addEventListener('resize', resize); resize();
    buildHUD();
    const vb = $('ventBtn'); if (vb) vb.addEventListener('click', e => { e.stopPropagation(); toggleVent(); });
    addEventListener('keydown', e => {
      if (S.quiz) { if (/^Digit[1-3]$/.test(e.code)) Cast.answer(+e.code.slice(5) - 1); e.preventDefault(); return; }
      keys[e.code] = true;
      if (/^Digit[1-5]$/.test(e.code)) S.sel = +e.code.slice(5) - 1;
      if (e.code === 'KeyE' || e.code === 'Space') { useItem(); e.preventDefault(); }
      if (e.code === 'KeyQ') {
        if (typeof Multiplayer !== 'undefined' && Multiplayer.inMultiplayer && Multiplayer.myRole !== 'thief') {
          if (Multiplayer.onSkillBtnClick) Multiplayer.onSkillBtnClick();
          e.preventDefault();
        }
      }
      if (e.code === 'KeyV') { toggleVent(); e.preventDefault(); }
      if (e.code === 'KeyM') $('mapwrap').classList.toggle('off');
      if (e.code === 'KeyK') { Flood.toggleDive(); e.preventDefault(); }
      if (e.code === 'KeyP') { Flood.mash(); e.preventDefault(); }
      if (e.code.startsWith('Arrow')) e.preventDefault();
    });
    addEventListener('keyup', e => { keys[e.code] = false; });
    canvas.addEventListener('mousedown', () => { if (document.pointerLockElement === canvas) useItem(); else dragging = true; });
    addEventListener('mouseup', () => { dragging = false; });
    addEventListener('mousemove', e => {
      if (S.state !== 'play' || paused || S.downed) return;
      if (document.pointerLockElement === canvas || dragging) {
        G.p.yaw -= e.movementX * 0.0023; G.p.pitch = Math.max(-1.2, Math.min(1.2, G.p.pitch - e.movementY * 0.0023));
      }
    });
    addEventListener('wheel', e => { S.sel = (S.sel + (e.deltaY > 0 ? 1 : 4)) % 5; });
    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement === canvas) { lockWorked = true; setPaused(false); }
      else if (lockWorked && S.state === 'play') { setPaused(true); for (const k in keys) keys[k] = false; }
    });
    $('pause').addEventListener('click', () => {
      lock();
      // Always force unpause after delay to handle pointer lock failures
      setTimeout(() => {
        paused = false;
        for (const k in keys) keys[k] = false;  // Clear stuck keys
        $('pause').hidden = true;
      }, 75);
    });
    $('start').addEventListener('click', async () => {
      const b = $('start'); b.textContent = 'Loading sounds...';
      try { await Snd.init(); } catch (e) {}
      newGame();
      $('intro').hidden = true;
      Menu.stop();
      $('hud').hidden = false;
      S.state = 'play';
      lock();
      toast('Each colored room holds a corn. Read the posters for the rules.');
    });
    $('again').addEventListener('click', () => { $('win').hidden = true; newGame(); S.state = 'play'; lock(); });
    $('retry').addEventListener('click', () => { $('over').hidden = true; newGame(); S.state = 'play'; lock(); });
    requestAnimationFrame(frame);
  }
  return { ITEMS, toast, flash, allCorns, stab, heal, darkness, gameOver, setup, newGame, randomItem, toggleVent, win, lock, state: S, mmRevealAll };
})();
