// Game state, characters' behaviour, pickups.
const S = {
  corns: 0, inv: [null, null, null, null, null], sel: 0, stamina: 100, exhausted: false, boost: 0, running: false,
  cuffT: 0, downed: false, healT: 0, darkT: 0, gaze: 0, stunT: 0, time: 0, state: 'menu', loop: null, hurterOn: false,
  floodT: 0, diving: false, diveT: 30, grab: null, fallT: 0
};
const CORNS = 10;

const AI = {
  police: null, nazer: null, hurter: null, lady: null, puppet: null, pickups: [],

  init(start) {
    ['police', 'nazer', 'hurter', 'lady', 'puppet'].forEach(k => { if (AI[k]) { G.scene.remove(AI[k].sp); AI[k] = null; } });
    AI.pickups.forEach(p => G.scene.remove(p.sp)); AI.pickups = [];
    AI.police = new Agent(Art.police(), 3.5); AI.police.alertT = 0;
    AI.nazer = new Agent(Art.nazer(), 3.6); AI.nazer.grace = 15; AI.nazer.last = null;
    AI.lady = new Agent(Art.lady(), 3.4);
    AI.puppet = new Agent(Art.puppet(), 3.3); AI.puppet.cool = 0;
    AI.hurter = new Agent(Art.hurter(), 2.9); AI.hurter.sp.visible = true; AI.hurter.last = null; AI.hurter.ignore = 10;
    AI.police.place(World.randomOpen(start, 60));
    AI.nazer.place(World.randomOpen(start, 90));
    AI.lady.place(World.randomOpen(start, 70));
    AI.puppet.place(World.randomOpen(start, 45));
    AI.hurter.place(World.randomOpen(start, 120));
    AI.police.roam(); AI.lady.roam(); AI.nazer.roam();
    // pickups: 10 corns plus items
    const kinds = ['grapple', 'grapple', 'grapple', 'grapple', 'teleporter', 'teleporter', 'teleporter', 'teleporter',
      'coke', 'coke', 'coke', 'coke', 'coke', 'bar', 'bar', 'bar', 'bar', 'bar',
      'glow', 'glow', 'smoke', 'smoke', 'banana', 'banana', 'clock', 'clock', 'shoes', 'shoes', 'medkit', 'medkit', 'radar', 'radar'];
    for (let i = 0; i < CORNS; i++) {
      const r = World.rooms[i];
      AI.addPickup('corn', r ? { x: World.center(r.tx), z: World.center(r.tz) } : World.randomOpen(start, 20));
    }
    kinds.forEach(k => AI.addPickup(k, World.randomOpen(start, 8)));
    Cast.init(start); Cast2.init(start);
  },
  addPickup(type, pos) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: Art.spriteTex(Art.icon(type)), transparent: true, alphaTest: 0.05 }));
    const s = type === 'corn' ? 1.5 : 1.1; sp.scale.set(s, s, 1);
    sp.position.set(pos.x, 1.2, pos.z); G.scene.add(sp);
    AI.pickups.push({ type, sp, x: pos.x, z: pos.z, taken: false, ph: Math.random() * 6 });
  },
  giveItem(type) {
    const i = S.inv.indexOf(null);
    if (i < 0) return false;
    S.inv[i] = type; return true;
  },
  loseCorns(n) {
    let lost = 0;
    for (const p of AI.pickups) {
      if (lost >= n || S.corns <= 0) break;
      if (p.type === 'corn' && p.taken) {
        const t = World.randomOpen(G.p, 30); p.x = t.x; p.z = t.z; p.sp.position.set(t.x, 1.2, t.z);
        p.sp.visible = true; p.taken = false; S.corns--; lost++;
      }
    }
    return lost;
  },

  update(dt) {
    const { police: P, nazer: Nz, hurter: Hu, lady: L, puppet: Pu } = AI;
    const px = G.p.x, pz = G.p.z;

    // Check if player is a monster in multiplayer - skip thief-only mechanics
    const isMonsterInMultiplayer = typeof Multiplayer !== 'undefined' && Multiplayer.inMultiplayer && Multiplayer.myRole !== 'thief';

    // ---- pickups ---- (only for thieves)
    if (!isMonsterInMultiplayer) {
      for (const k of AI.pickups) {
        if (k.taken) continue;
        k.sp.position.y = 1.2 + Math.sin(S.time * 2 + k.ph) * 0.15;
        if (Math.hypot(k.x - px, k.z - pz) < 2) {
          if (k.type === 'corn' && S.corns >= CORNS) {
            const t = Game.randomItem();
            if (AI.giveItem(t)) { k.taken = true; k.sp.visible = false; Snd.play('pickup'); Game.toast('Bonus corn! You got a ' + Game.ITEMS[t].name); }
          } else if (k.type === 'box') {
            if (S.inv.includes(null)) { k.taken = true; k.sp.visible = false; Events.openBox(); }
            else if (!k.warned || S.time - k.warned > 2) { k.warned = S.time; Game.toast('Inventory full'); }
          } else if (k.type === 'corn') {
            k.taken = true; k.sp.visible = false;
            if (typeof Multiplayer !== 'undefined' && Multiplayer.inMultiplayer) {
              Multiplayer.tryPickupCorn(AI.pickups.indexOf(k));
            } else {
              S.corns++; Snd.play('corn');
              Game.toast(`Corn ${S.corns}/${CORNS}`);
              if (S.corns >= CORNS) Game.allCorns();
            }
          } else if (AI.giveItem(k.type)) {
            k.taken = true; k.sp.visible = false; Snd.play('pickup'); Game.toast('Picked up ' + Game.ITEMS[k.type].name);
          } else if (!k.warned || S.time - k.warned > 2) { k.warned = S.time; Game.toast('Inventory full'); }
        }
      }
    }

    // ---- Police ---- (only chases thieves)
    if (!isMonsterInMultiplayer) {
      if (P.alertT > 0) P.alertT -= dt;
      P.ignore -= dt;
      if (P.ignore > 0 || S.cuffT > 0 || S.downed) { if (!P.path.length) P.roam(50); P.move(dt, 3.4); }
      else if (P.alertT > 0) { P.chase(dt); P.move(dt, 6.8, true); }
      else { if (!P.path.length) P.roam(); P.move(dt, 3.4); }
      if (P.dist() < 2 && P.ignore <= 0 && S.cuffT <= 0 && !S.downed && !G.hidden) {
        S.cuffT = 30; P.alertT = 0; P.ignore = 36; P.roam(70);
        Snd.play('police_catched'); Game.toast('Caught by the Police! Handcuffed for 30s');
      }
    } else {
      P.alertT = 0; P.ignore = 9999; if (!P.path.length) P.roam(70); P.move(dt, 3.4);
    }

    // ---- MazerNazer ---- (only hunts thieves in multiplayer)
    if (!isMonsterInMultiplayer) {
      Nz.ignore -= dt;
      const nSpeed = 4.6 + 0.35 * S.corns;
      const nSees = !G.hidden && (Nz.sees(50) || (S.running && Nz.dist() < 28));
      if (nSees && Nz.ignore <= 0 && Nz.grace <= 0) { Nz.last = { x: px, z: pz }; Nz.state = 'chase'; }
      Nz.grace -= dt;
      if (Nz.state === 'chase' && Nz.ignore <= 0 && Nz.grace <= 0) {
        if (nSees) { Nz.chase(dt); Nz.move(dt, nSpeed, true); }
        else {
          Nz.chase(dt, Nz.last.x, Nz.last.z); Nz.move(dt, nSpeed);
          if (!Nz.path.length && Math.hypot(Nz.x - Nz.last.x, Nz.z - Nz.last.z) < 3) { Nz.state = 'roam'; Nz.roam(); Game.toast('MazerNazer lost you...'); }
        }
      } else { if (!Nz.path.length) Nz.roam(); Nz.move(dt, nSpeed * 0.7); }
      if (Nz.dist() < 2.2 && Nz.ignore <= 0 && Nz.grace <= 0 && S.state === 'play' && !G.hidden) {
        Snd.play('nazer'); Game.gameOver(); return;
      }
    } else {
      Nz.ignore = 9999; Nz.state = 'roam'; if (!Nz.path.length) Nz.roam(); Nz.move(dt, 2);
    }

    // ---- HurterBoy ---- (only hunts thieves in multiplayer)
    if (S.hurterOn) {
      if (!isMonsterInMultiplayer) {
        Hu.ignore -= dt;
        const hSees = !G.hidden && (Hu.sees(40) || (S.running && Hu.dist() < 24));
        if (hSees && !S.downed && Hu.ignore <= 0) { Hu.last = { x: px, z: pz }; Hu.state = 'chase'; }
        if (Hu.state === 'chase' && Hu.ignore <= 0 && !S.downed) {
          if (hSees) { Hu.chase(dt); Hu.move(dt, 7.4, true); }
          else {
            Hu.chase(dt, Hu.last.x, Hu.last.z); Hu.move(dt, 7.4);
            if (!Hu.path.length) { Hu.state = 'roam'; Hu.roam(); }
          }
        } else { if (!Hu.path.length) Hu.roam(); Hu.move(dt, 4.2); }
        if (Hu.dist() < 1.8 && !S.downed && Hu.ignore <= 0 && !G.hidden) Game.stab();
      } else {
        Hu.ignore = 9999; Hu.state = 'roam'; if (!Hu.path.length) Hu.roam(); Hu.move(dt, 2);
      }
    }

    // ---- Hospital Lady ---- (only heals/hunts thieves)
    if (!isMonsterInMultiplayer) {
      if (S.downed) {
        if (S.healT > 0) {
          S.healT -= dt;
          if (S.healT <= 0) Game.heal();
        } else {
          L.chase(dt); L.move(dt, 9.5, true);
          if (L.dist() < 2.4) { S.healT = 2.2; if (S.loop) { S.loop.stop(); S.loop = null; } Snd.play('lady_foundedheal'); Game.toast('The Hospital Lady found you'); }
        }
      } else { if (!L.path.length) L.roam(); L.move(dt, 4); }
    } else {
      if (!L.path.length) L.roam(); L.move(dt, 2);
    }

    // ---- Puppet: stare at it too long and it explodes ---- (only affects thieves)
    if (!isMonsterInMultiplayer) {
      Pu.cool -= dt;
      const dx = Pu.x - px, dz = Pu.z - pz, dd = Math.hypot(dx, dz);
      const fx = -Math.sin(G.p.yaw), fz = -Math.cos(G.p.yaw);
      const looking = dd < 30 && (dx * fx + dz * fz) / (dd || 1) > 0.975 && World.los(px, pz, Pu.x, Pu.z);
      if (looking && Pu.cool <= 0 && S.darkT <= 0 && !S.downed) S.gaze += dt; else S.gaze = Math.max(0, S.gaze - dt * 0.8);
      if (S.gaze >= 3.5) { S.gaze = 0; Pu.cool = 8; Pu.place(World.randomOpen(G.p, 70)); Game.darkness(); }
    } else {
      Pu.cool -= dt;
      if (!Pu.path.length) Pu.roam(); Pu.move(dt, 2);
    }

    // ---- proximity hums ----
    const near = (a, r) => Math.max(0, 1 - a.dist() / r);
    Snd.hum('nazer', 62, near(Nz, 26));
    Snd.hum('police', 110, P.alertT > 0 ? near(P, 40) : 0);
    Snd.hum('hurter', 48, S.hurterOn ? near(Hu, 30) : 0);
    Cast.update(dt); Cast2.update(dt); Events.update(dt); Flood.update(dt);
  }
};
