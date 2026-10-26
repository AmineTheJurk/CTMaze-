// Multiplayer client module: WebSockets, lobby UI, synchronized 3D remote players, role selection & game modes.
const Multiplayer = (() => {
  const $ = id => document.getElementById(id);
  let ws = null;
  let room = null;
  let myId = null;
  let myRole = 'thief';
  let isHost = false;
  let inMultiplayer = false;
  let remotePlayers = new Map();
  let sendTimer = 0;

  const ROLES = {
    thief: { name: 'Corn Thief', color: '#f2c230', desc: 'Sneak into corn rooms, use vents, collect all 10 corns and escape!' },
    nazer: { name: 'MazerNazer', color: '#e0432f', desc: 'The fierce maze keeper! Full map vision. Hunt down thieves with your pitchfork!' },
    puppet: { name: 'The Puppet', color: '#d9467a', desc: 'Creepy stringed marionette! Full map vision. Stalk corridors and ambush thieves!' },
    hurter: { name: 'HurterBoy', color: '#8e44ad', desc: 'Lurker in the shadows! Full map vision. Strike thieves with surprise slashes!' }
  };

  const THIEF_COLORS = ['#2980b9', '#c0392b', '#27ae60', '#e67e22', '#8e44ad', '#16a085', '#d35400', '#f39c12'];

  const DEFAULT_RENDER_SERVER = 'wss://corn-thief-multiplayer.onrender.com';

  function getWsUrl() {
    // 1. Custom user override from localStorage or window
    let custom = (typeof localStorage !== 'undefined' && localStorage.getItem('corn_mp_server')) ||
      (typeof window !== 'undefined' && window.CORN_MP_SERVER);

    // Auto-clean any dev preview domains (e.g. *.run.app, googleusercontent) accidentally stored in previous sessions
    if (custom && (custom.includes('run.app') || custom.includes('ais-dev') || custom.includes('googleusercontent') || custom.includes('ais-pre'))) {
      if (typeof localStorage !== 'undefined') localStorage.removeItem('corn_mp_server');
      custom = null;
    }

    if (custom && custom.trim().length > 0) return custom.trim();

    // 2. Explicit local development override flag
    if (typeof localStorage !== 'undefined' && localStorage.getItem('corn_use_local') === 'true') {
      if (typeof window !== 'undefined' && window.location && window.location.host) {
        const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${proto}//${window.location.host}`;
      }
    }

    // 3. Optional local WiFi server via Android native bridge
    if (typeof window !== 'undefined' && typeof window.AndroidBridge !== 'undefined' && window.USE_LOCAL_WIFI) {
      try {
        const localIP = window.AndroidBridge.getLocalIP();
        if (localIP) return `ws://${localIP}:8765`;
      } catch (e) {
        console.warn('AndroidBridge error:', e);
      }
    }

    // 4. Default for itch.io HTML5 game and preview: unconditionally point to Render.com WebSocket server
    return DEFAULT_RENDER_SERVER;
  }

  function connect() {
    if (ws && (ws.readyState === WebSocket.OPEN)) {
      return Promise.resolve();
    }
    if (ws && ws.readyState === WebSocket.CONNECTING) {
      return new Promise((resolve, reject) => {
        const check = setInterval(() => {
          if (!ws) { clearInterval(check); reject(new Error('Connection aborted')); }
          else if (ws.readyState === WebSocket.OPEN) { clearInterval(check); resolve(); }
          else if (ws.readyState === WebSocket.CLOSED) { clearInterval(check); reject(new Error('Connection closed')); }
        }, 100);
      });
    }

    return new Promise((resolve, reject) => {
      const targetUrl = getWsUrl();
      let isSettled = false;
      let wakeToastTimer = null;
      let timeoutTimer = null;

      try {
        // Show notice if connection takes longer than 2.2s (Render cold start)
        wakeToastTimer = setTimeout(() => {
          if (!isSettled && typeof Game !== 'undefined' && Game.toast) {
            Game.toast('Waking up Render multiplayer server... (free-tier spinup takes ~20s)');
          }
        }, 2200);

        // 45-second timeout for Render free tier spin-up
        timeoutTimer = setTimeout(() => {
          if (!isSettled) {
            isSettled = true;
            clearTimeout(wakeToastTimer);
            if (ws) { try { ws.close(); } catch (e) {} ws = null; }
            reject(new Error(`Timed out connecting to Render server (${targetUrl}). Please try again in 10s.`));
          }
        }, 45000);

        ws = new WebSocket(targetUrl);

        ws.onopen = () => {
          if (isSettled) return;
          isSettled = true;
          clearTimeout(wakeToastTimer);
          clearTimeout(timeoutTimer);
          if (typeof Game !== 'undefined' && Game.toast) {
            Game.toast('Connected to multiplayer server!');
          }
          resolve();
        };

        ws.onerror = (e) => {
          if (isSettled) return;
          isSettled = true;
          clearTimeout(wakeToastTimer);
          clearTimeout(timeoutTimer);
          reject(new Error(`Could not reach Render server (${targetUrl}). Check connection or click 'Edit URL'.`));
        };

        ws.onmessage = onMessage;
        ws.onclose = () => {
          if (inMultiplayer && S.state === 'play') {
            Game.toast('Disconnected from multiplayer server.');
          }
        };
      } catch (err) {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(wakeToastTimer);
          clearTimeout(timeoutTimer);
          reject(err);
        }
      }
    });
  }

  function send(msg) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }

  function onMessage(event) {
    try {
      const msg = JSON.parse(event.data);
      switch (msg.type) {
        case 'room_created':
        case 'room_joined':
          room = {
            code: msg.code,
            mode: msg.mode,
            seed: msg.seed,
            players: msg.players || [],
          };
          myId = msg.playerId;
          const me = room.players.find(p => p.id === myId);
          isHost = !!me?.isHost;
          myRole = me?.role || (room.mode === '1v1' ? 'nazer' : 'thief');
          updateLobbyUI();
          showScreen('lobby');
          break;

        case 'player_joined':
          if (!room) return;
          room.players = msg.players;
          updateLobbyUI();
          Game.toast(`${msg.player.name} joined the lobby!`);
          Snd.play('ding');
          break;

        case 'player_left':
          if (!room) return;
          room.players = msg.players;
          if (remotePlayers.has(msg.playerId)) {
            removeRemoteSprite(msg.playerId);
          }
          const hostPlayer = room.players.find(p => p.isHost);
          if (hostPlayer && hostPlayer.id === myId) isHost = true;
          updateLobbyUI();
          Game.toast(`${msg.name} left the room.`);
          break;

        case 'role_changed':
          if (!room) return;
          room.players = msg.players;
          if (msg.playerId === myId) myRole = msg.role;
          updateLobbyUI();
          break;

        case 'game_started':
          launchGame(msg);
          break;

        case 'player_moved':
          handleRemoteMove(msg);
          break;

        case 'corn_collected':
          handleCornCollected(msg);
          break;

        case 'player_caught':
          handlePlayerCaught(msg);
          break;

        case 'player_escaped':
          Game.toast(`\uD83C\uDFC6 ${msg.name} escaped the maze!`);
          if (room && room.mode === 'duo') {
            Game.win();
          }
          break;

        case 'item_used':
          handleItemUsed(msg);
          break;

        case 'monster_ability':
          handleMonsterAbility(msg);
          break;

        case 'error':
          if (typeof Game !== 'undefined' && Game.toast) Game.toast(msg.message || 'An error occurred');
          const joinBtn = $('joinSubmitBtn');
          if (joinBtn) joinBtn.disabled = false;
          break;
      }
    } catch (e) {
      console.error('Failed to parse WS msg:', e);
    }
  }

  // ---- 3D Remote Player Representation ----
  function getSpriteForRole(role, index = 0) {
    if (role === 'nazer') return Art.nazer();
    if (role === 'puppet') return Art.puppet();
    if (role === 'hurter') return Art.hurter();
    const col = THIEF_COLORS[index % THIEF_COLORS.length];
    return Art.thief(col);
  }

  function createRemoteSprite(p, index) {
    const group = new THREE.Group();
    const canvas = getSpriteForRole(p.role, index);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: Art.spriteTex(canvas),
      transparent: true,
      alphaTest: 0.05
    }));
    const h = p.role === 'nazer' ? 3.6 : (p.role === 'puppet' ? 3.4 : (p.role === 'hurter' ? 2.9 : 3.2));
    sprite.scale.set(h * 2 / 3, h, 1);
    sprite.position.y = h / 2;
    group.add(sprite);

    // Floating name tag badge
    const roleCol = ROLES[p.role]?.color || '#f2c230';
    const badgeCanvas = Art.nameBadge(p.name, roleCol);
    const badgeSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: Art.spriteTex(badgeCanvas),
      transparent: true,
      depthTest: false
    }));
    badgeSprite.scale.set(2.4, 0.6, 1);
    badgeSprite.position.y = h + 0.4;
    group.add(badgeSprite);

    group.position.set(p.x || 0, 0, p.z || 0);
    G.scene.add(group);

    const record = {
      group,
      sprite,
      badgeSprite,
      targetX: p.x || 0,
      targetZ: p.z || 0,
      currentX: p.x || 0,
      currentZ: p.z || 0,
      role: p.role,
      name: p.name,
      h,
      vent: false,
      downed: false
    };
    remotePlayers.set(p.id, record);
    return record;
  }

  function removeRemoteSprite(id) {
    const rec = remotePlayers.get(id);
    if (rec) {
      G.scene.remove(rec.group);
      remotePlayers.delete(id);
    }
  }

  function clearAllRemoteSprites() {
    for (const rec of remotePlayers.values()) {
      G.scene.remove(rec.group);
    }
    remotePlayers.clear();
  }

  function handleRemoteMove(msg) {
    let rec = remotePlayers.get(msg.id);
    if (!rec) {
      const p = room?.players.find(x => x.id === msg.id) || { id: msg.id, name: 'Player', role: 'thief' };
      const idx = Array.from(remotePlayers.keys()).length;
      rec = createRemoteSprite({ ...p, ...msg }, idx);
    }
    rec.targetX = msg.x;
    rec.targetZ = msg.z;
    rec.vent = !!msg.vent;
    rec.downed = !!msg.downed;
  }

  function handleCornCollected(msg) {
    // Sync corn pickup across all players
    const pickup = AI.pickups[msg.index];
    if (pickup && !pickup.taken) {
      pickup.taken = true;
      pickup.sp.visible = false;
    }
    S.corns = msg.total;
    $('corns').textContent = S.corns + ' / ' + CORNS;
    Snd.play('pickup');
    Game.flash('#ffd700');
    Game.toast(`${msg.collectorName} found a corn! (${msg.total}/${CORNS})`);

    if (S.corns >= CORNS) {
      World.unlockExit();
      Game.toast('ALL 10 CORNS FOUND! The EXIT on the east border is open!');
      Snd.play('win');
    }
  }

  function handlePlayerCaught(msg) {
    const roleSound = msg.hunterRole === 'hurter' ? 'hurterboy_stabbed' : (msg.hunterRole === 'puppet' ? 'puppet_exploded' : 'nazer');
    Snd.play(roleSound);
    Game.toast(`${msg.hunterName} caught ${msg.thiefName}!`);
    if (msg.thiefId === myId) {
      // I am the caught thief!
      S.downed = true;
      S.stamina = 0;
      S.stunT = 5.0;
      Game.flash('#d6201f');
      Game.toast(`You were caught by ${msg.hunterName || 'the monster'}!`);
    }
  }

  function handleItemUsed(msg) {
    if (msg.item === 'coke') {
      Game.flash('#9fe8ff');
      Snd.play('spray');
    } else if (msg.item === 'smoke') {
      Snd.play('spray');
    } else if (msg.item === 'clock') {
      Snd.play('fanfare');
    }
  }

  function handleMonsterAbility(msg) {
    if (msg.hunterRole === 'puppet' || msg.ability === 'blackout') {
      if (myRole === 'thief') {
        S.darkT = Math.max(S.darkT, 5.0);
        S.flickerT = 4.0;
        Snd.play('puppet_exploded');
        Game.flash('#d9467a');
        Game.toast(`⚠️ ${msg.hunterName} casts STRING BLACKOUT! Corridors plunge into darkness!`);
      } else {
        Game.toast(`${msg.hunterName} cast String Blackout!`);
      }
    } else if (msg.ability === 'lunge') {
      Snd.play('nazer');
      Game.toast(`⚡ ${msg.hunterName} charged forward with Pitchfork Lunge!`);
    } else if (msg.ability === 'shadow_dash') {
      Snd.play('hurterboy_stabbed');
      Game.toast(`💨 ${msg.hunterName} surged with Shadow Dash!`);
    }
  }

  const MONSTER_CONFIGS = {
    nazer: {
      tag: 'MAZERNAZER (HUNTER)',
      tagColor: '#e0432f',
      strikeName: 'PITCHFORK STRIKE',
      strikeIcon: '🔱',
      skillName: 'PITCHFORK LUNGE',
      skillIcon: '⚡',
      skillCdMax: 7.0,
      onSkill: () => {
        S.boost = 2.5;
        S.zoomT = 2.2;
        Snd.play('nazer');
        Game.toast('MAZERNAZER: PITCHFORK LUNGE!');
        send({ type: 'monster_ability', ability: 'lunge' });
      }
    },
    puppet: {
      tag: 'THE PUPPET (HUNTER)',
      tagColor: '#d9467a',
      strikeName: 'MARIONETTE CATCH',
      strikeIcon: '🎪',
      skillName: 'STRING BLACKOUT',
      skillIcon: '🕸️',
      skillCdMax: 12.0,
      onSkill: () => {
        Snd.play('puppet_exploded');
        Game.flash('#d9467a');
        Game.toast('THE PUPPET: STRING BLACKOUT!');
        send({ type: 'monster_ability', ability: 'blackout' });
      }
    },
    hurter: {
      tag: 'HURTERBOY (HUNTER)',
      tagColor: '#8e44ad',
      strikeName: 'SHADOW SLASH',
      strikeIcon: '🗡️',
      skillName: 'SHADOW DASH',
      skillIcon: '💨',
      skillCdMax: 7.0,
      onSkill: () => {
        S.springT = 3.5;
        S.zoomT = 1.5;
        Snd.play('hurterboy_stabbed');
        Game.toast('HURTERBOY: SHADOW DASH!');
        send({ type: 'monster_ability', ability: 'shadow_dash' });
      }
    }
  };

  let skillCooldown = 0;
  let closestThief = null;

  function setupMonsterActionBar(role) {
    const bar = $('monsterActionBar');
    if (!bar) return;
    if (role === 'thief') {
      bar.hidden = true;
      return;
    }
    bar.hidden = false;
    const cfg = MONSTER_CONFIGS[role] || MONSTER_CONFIGS.nazer;
    const tagEl = $('monsterRoleTag');
    if (tagEl) {
      tagEl.textContent = cfg.tag;
      tagEl.style.borderColor = cfg.tagColor;
      tagEl.style.color = cfg.tagColor;
    }
    const catchIcon = $('monsterCatchIcon');
    const catchText = $('monsterCatchText');
    if (catchIcon) catchIcon.textContent = cfg.strikeIcon;
    if (catchText) catchText.textContent = cfg.strikeName;

    const skillIcon = $('monsterSkillIcon');
    const skillText = $('monsterSkillText');
    if (skillIcon) skillIcon.textContent = cfg.skillIcon;
    if (skillText) skillText.textContent = cfg.skillName;

    skillCooldown = 0;
    const skillBtn = $('monsterSkillBtn');
    const skillCd = $('monsterSkillCd');
    if (skillBtn) skillBtn.classList.remove('on-cd');
    if (skillCd) skillCd.textContent = 'READY (Q)';
  }

  function executeCatch(targetId, targetRec) {
    if (myRole === 'thief' || S.downed) return;
    send({ type: 'thief_caught', targetId, hunterRole: myRole });
    targetRec.downed = true;
    const sound = myRole === 'hurter' ? 'hurterboy_stabbed' : (myRole === 'puppet' ? 'puppet_exploded' : 'nazer');
    Snd.play(sound);
    Game.flash('#ff0000');
    Game.toast(`You caught ${targetRec.name}!`);
  }

  function onCatchBtnClick() {
    if (myRole === 'thief' || S.downed) return;
    if (closestThief && closestThief.d < 2.8) {
      executeCatch(closestThief.id, closestThief.rec);
    } else {
      const sound = myRole === 'hurter' ? 'snip' : (myRole === 'puppet' ? 'zap' : 'nazer');
      Snd.play(sound);
      Game.toast('Swung weapon! (Thief out of reach: get within 2.8m)');
    }
  }

  function onSkillBtnClick() {
    if (myRole === 'thief' || S.downed) return;
    const cfg = MONSTER_CONFIGS[myRole] || MONSTER_CONFIGS.nazer;
    if (skillCooldown > 0) {
      Game.toast(`${cfg.skillName} cooling down (${Math.ceil(skillCooldown)}s)`);
      Snd.play('nope');
      return;
    }
    skillCooldown = cfg.skillCdMax;
    cfg.onSkill();
  }

  // ---- Game Loop Hook ----
  function update(dt) {
    if (!inMultiplayer || S.state !== 'play') return;

    // Send local player state to server throttled (~25Hz)
    sendTimer += dt;
    if (sendTimer >= 0.04) {
      sendTimer = 0;
      send({
        type: 'update_pos',
        x: G.p.x,
        z: G.p.z,
        yaw: G.p.yaw,
        pitch: G.p.pitch,
        running: !!S.running,
        vent: !!S.vent,
        downed: !!S.downed
      });
    }

    // Smoothly interpolate remote players in 3D
    for (const [id, rec] of remotePlayers.entries()) {
      rec.currentX += (rec.targetX - rec.currentX) * Math.min(1, dt * 15);
      rec.currentZ += (rec.targetZ - rec.currentZ) * Math.min(1, dt * 15);
      const eyeY = rec.downed ? -0.4 : (rec.vent ? -1.0 : 0);
      rec.group.position.set(rec.currentX, eyeY, rec.currentZ);

      // In vents, remote sprite is semi-transparent or low
      rec.sprite.material.opacity = rec.vent ? 0.35 : 1.0;
    }

    // Hunter actions and cooldown updates (if playing as any monster in 1v1)
    if (myRole !== 'thief') {
      if (skillCooldown > 0) {
        skillCooldown -= dt;
        if (skillCooldown < 0) skillCooldown = 0;
        const skillBtn = $('monsterSkillBtn');
        const skillCd = $('monsterSkillCd');
        if (skillBtn) skillBtn.classList.add('on-cd');
        if (skillCd) skillCd.textContent = Math.ceil(skillCooldown) + 's';
      } else {
        const skillBtn = $('monsterSkillBtn');
        const skillCd = $('monsterSkillCd');
        if (skillBtn) skillBtn.classList.remove('on-cd');
        if (skillCd) skillCd.textContent = 'READY (Q)';
      }

      // Check closest thief
      closestThief = null;
      let minD = 999;
      if (!S.downed) {
        for (const [id, rec] of remotePlayers.entries()) {
          if (rec.role === 'thief' && !rec.downed && !rec.vent) {
            const d = Math.hypot(rec.currentX - G.p.x, rec.currentZ - G.p.z);
            if (d < minD) {
              minD = d;
              closestThief = { id, rec, d };
            }
          }
        }
      }

      const catchBtn = $('monsterCatchBtn');
      const catchSub = $('monsterCatchSub');
      const cross = $('cross');

      if (closestThief && closestThief.d < 2.8) {
        if (catchBtn) catchBtn.classList.add('in-range');
        if (catchSub) catchSub.textContent = `TARGET IN REACH (${closestThief.d.toFixed(1)}m)`;
        if (cross) {
          cross.style.background = '#ff0000';
          cross.style.transform = 'scale(2.5)';
        }

        if (keysDown['KeyE'] || keysDown['Space'] || keysDown['click']) {
          executeCatch(closestThief.id, closestThief.rec);
          keysDown['KeyE'] = false;
          keysDown['Space'] = false;
          keysDown['click'] = false;
        }
      } else {
        if (catchBtn) catchBtn.classList.remove('in-range');
        if (catchSub) catchSub.textContent = closestThief ? `${closestThief.rec.name} (${closestThief.d.toFixed(1)}m away)` : 'OUT OF RANGE';
        if (cross) {
          cross.style.background = 'rgba(255,255,255,.55)';
          cross.style.transform = 'none';
        }
      }
    }
  }

  const keysDown = {};
  window.addEventListener('keydown', e => { keysDown[e.code] = true; });
  window.addEventListener('keyup', e => { keysDown[e.code] = false; });
  window.addEventListener('mousedown', () => { keysDown['click'] = true; setTimeout(() => keysDown['click'] = false, 150); });

  // Corn pickup override for multiplayer: only thieves can collect corns!
  function tryPickupCorn(index) {
    if (!inMultiplayer || myRole !== 'thief') return false;
    send({ type: 'pickup_corn', index });
    return true;
  }

  function reportEscape() {
    if (!inMultiplayer) return;
    send({ type: 'thief_escaped' });
  }

  // ---- UI Helpers ----
  function showScreen(screenId) {
    ['intro', 'modeSelect', 'mpMenu', 'hostMenu', 'joinMenu', 'lobby', 'about'].forEach(id => {
      const el = $(id);
      if (el) el.hidden = (id !== screenId);
    });
  }

  function updateLobbyUI() {
    if (!room) return;
    $('lobbyCode').textContent = room.code;
    $('lobbyModeBadge').textContent = room.mode === 'duo' ? 'DUO CO-OP' : '1V1 / VERSUS PARTY';

    const pList = $('lobbyPlayers');
    pList.innerHTML = '';

    room.players.forEach((p, idx) => {
      const isMe = p.id === myId;
      const card = document.createElement('div');
      card.className = `p-card ${isMe ? 'is-me' : ''}`;
      const roleInfo = ROLES[p.role] || ROLES.thief;

      card.innerHTML = `
        <div class="p-card-top">
          <div class="p-badge" style="background:${roleInfo.color}"></div>
          <span class="p-name">${escapeHtml(p.name)} ${p.isHost ? '<span class="tag-host">HOST</span>' : ''} ${isMe ? '<span class="tag-you">(YOU)</span>' : ''}</span>
        </div>
        <div class="p-role-label">Character: <b>${roleInfo.name}</b></div>
      `;
      pList.appendChild(card);
    });

    // Role switcher dropdown/buttons for current player
    const roleSelector = $('roleSelectWrap');
    if (roleSelector) {
      if (room.mode === 'duo') {
        // In duo, both are thieves
        roleSelector.innerHTML = `<p class="note" style="color:var(--corn)">In Duo mode, everyone plays as a Thief working together!</p>`;
      } else {
        // In 1v1 / party, allow picking roles
        roleSelector.innerHTML = `
          <label style="font-weight:700;color:var(--paper);margin-bottom:6px;display:block">Choose Your Character:</label>
          <div class="role-grid">
            ${Object.entries(ROLES).map(([key, info]) => `
              <button type="button" class="role-btn ${myRole === key ? 'active' : ''}" data-role="${key}">
                <b style="color:${info.color}">${info.name}</b>
                <small>${info.desc.slice(0, 48)}...</small>
              </button>
            `).join('')}
          </div>
        `;
        roleSelector.querySelectorAll('.role-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const r = btn.dataset.role;
            if (r) {
              myRole = r;
              send({ type: 'change_role', role: r });
            }
          });
        });
      }
    }

    // Host controls
    const startBtn = $('hostStartGameBtn');
    if (startBtn) {
      startBtn.style.display = isHost ? 'block' : 'none';
      startBtn.textContent = isHost ? (room.players.length >= 2 ? 'START GAME' : 'START GAME (WAITING FOR OTHERS)') : '';
    }
    const guestWaiting = $('guestWaitingText');
    if (guestWaiting) {
      guestWaiting.style.display = isHost ? 'none' : 'block';
    }
  }

  function launchGame(msg) {
    inMultiplayer = true;
    clearAllRemoteSprites();

    // Use seed from room so both players build identical maze and room positions!
    World.setSeed(msg.seed);
    Game.newGame(msg.seed);

    if (myRole !== 'thief') {
      const roleInfo = ROLES[myRole] || ROLES.nazer;
      Game.toast(`You are ${roleInfo.name.toUpperCase()}! You have the FULL MAP. Catch the thieves!`);
      $('cornbox') && ($('cornbox').style.borderColor = roleInfo.color);
      if (Game.mmRevealAll) Game.mmRevealAll();
      setupMonsterActionBar(myRole);
    } else {
      Game.toast('You are a THIEF! Collect all 10 corns and reach the exit! Monsters have full map vision!');
      $('cornbox') && ($('cornbox').style.borderColor = 'var(--line)');
      const bar = $('monsterActionBar');
      if (bar) bar.hidden = true;
    }

    $('lobby').hidden = true;
    Menu.stop();
    $('hud').hidden = false;
    S.state = 'play';
    Game.lock();
  }

  function copyRoomCode() {
    if (!room) return;
    navigator.clipboard.writeText(room.code).then(() => {
      Game.toast('Teamcode ' + room.code + ' copied to clipboard!');
      const btn = $('copyCodeBtn');
      if (btn) {
        btn.textContent = 'COPIED!';
        setTimeout(() => btn.textContent = 'Copy Code', 2000);
      }
    }).catch(() => {
      prompt('Copy your Teamcode:', room.code);
    });
  }

  function escapeHtml(str) {
    return (str || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
  }

  function init() {
    // Mode Select: Single-Player vs Multiplayer
    $('singlePlayerBtn')?.addEventListener('click', async () => {
      inMultiplayer = false;
      const b = $('start');
      if (b) b.textContent = 'Loading sounds...';
      try { await Snd.init(); } catch (e) {}
      $('modeSelect').hidden = true;
      const bar = $('monsterActionBar');
      if (bar) bar.hidden = true;
      Game.newGame();
      $('intro').hidden = true;
      Menu.stop();
      $('hud').hidden = false;
      S.state = 'play';
      Game.lock();
      Game.toast('Each colored room holds a corn. Read the posters for the rules.');
    });

    $('multiplayerBtn')?.addEventListener('click', () => {
      showScreen('mpMenu');
    });

    $('modeSelectBack')?.addEventListener('click', () => {
      showScreen('intro');
    });

    // Multiplayer Menu: Host vs Join
    $('hostGameBtn')?.addEventListener('click', () => {
      showScreen('hostMenu');
    });

    $('joinGameBtn')?.addEventListener('click', () => {
      showScreen('joinMenu');
    });

    function updateServerDisplay() {
      const el = $('serverUrlDisplay');
      if (el) el.textContent = getWsUrl();
      updateDevSettingsUI();
    }

    function updateDevSettingsUI() {
      const input = $('devServerInput');
      const label = $('devServerActiveLabel');
      const status = $('devServerStatusLabel');
      const activeUrl = getWsUrl();
      const custom = (typeof localStorage !== 'undefined' && localStorage.getItem('corn_mp_server'));

      if (input && document.activeElement !== input) input.value = custom || activeUrl;
      if (label) label.textContent = activeUrl;
      if (status) {
        if (custom) {
          status.textContent = 'CUSTOM OVERRIDE';
          status.style.color = 'var(--cool)';
        } else {
          status.textContent = 'DEFAULT (RENDER)';
          status.style.color = 'var(--husk)';
        }
      }
    }
    updateServerDisplay();

    // Sync dev settings when About button is tapped
    $('aboutBtn')?.addEventListener('click', updateDevSettingsUI);

    $('devServerSaveBtn')?.addEventListener('click', () => {
      const input = $('devServerInput');
      const val = (input?.value || '').trim();
      if (val && (val.startsWith('ws://') || val.startsWith('wss://'))) {
        localStorage.setItem('corn_mp_server', val);
        updateServerDisplay();
        if (ws) { ws.close(); ws = null; }
        if (typeof Game !== 'undefined' && Game.toast) Game.toast('Developer Setting: Server set to ' + val);
      } else if (!val) {
        localStorage.removeItem('corn_mp_server');
        updateServerDisplay();
        if (ws) { ws.close(); ws = null; }
        if (typeof Game !== 'undefined' && Game.toast) Game.toast('Developer Setting: Reset to default Render server');
      } else {
        if (typeof Game !== 'undefined' && Game.toast) Game.toast('Invalid URL! Must start with wss:// or ws://');
      }
    });

    $('devServerResetBtn')?.addEventListener('click', () => {
      localStorage.removeItem('corn_mp_server');
      updateServerDisplay();
      if (ws) { ws.close(); ws = null; }
      if (typeof Game !== 'undefined' && Game.toast) Game.toast('Developer Setting: Reset to default Render server');
    });

    $('serverConfigBtn')?.addEventListener('click', () => {
      const current = getWsUrl();
      const entered = prompt('Enter your Render.com WebSocket Server URL:\n(e.g. wss://corn-thief-multiplayer.onrender.com)', current);
      if (entered !== null) {
        const trimmed = entered.trim();
        if (trimmed && (trimmed.startsWith('ws://') || trimmed.startsWith('wss://'))) {
          localStorage.setItem('corn_mp_server', trimmed);
          updateServerDisplay();
          Game.toast('Server set to ' + trimmed);
        } else if (!trimmed) {
          localStorage.removeItem('corn_mp_server');
          updateServerDisplay();
          Game.toast('Server reset to default Render server');
        } else {
          if (typeof Game !== 'undefined' && Game.toast) Game.toast('Invalid WebSocket URL! Must start with wss:// or ws://');
        }
        if (ws) { ws.close(); ws = null; }
      }
    });

    $('mpMenuBack')?.addEventListener('click', () => {
      showScreen('modeSelect');
    });

    // Host Menu: Duo vs 1v1
    $('hostDuoBtn')?.addEventListener('click', async () => {
      try {
        await Snd.init();
        if (typeof Game !== 'undefined' && Game.toast) Game.toast('Connecting to multiplayer server...');
        await connect();
        const pName = ($('hostPlayerName')?.value || 'Host').trim();
        send({ type: 'create_room', mode: 'duo', name: pName });
      } catch (e) {
        if (typeof Game !== 'undefined' && Game.toast) Game.toast('Connection error: ' + e.message);
      }
    });

    $('host1v1Btn')?.addEventListener('click', async () => {
      try {
        await Snd.init();
        if (typeof Game !== 'undefined' && Game.toast) Game.toast('Connecting to multiplayer server...');
        await connect();
        const pName = ($('hostPlayerName')?.value || 'Host').trim();
        send({ type: 'create_room', mode: '1v1', name: pName });
      } catch (e) {
        if (typeof Game !== 'undefined' && Game.toast) Game.toast('Connection error: ' + e.message);
      }
    });

    // Question marks (?) for Duo and 1v1
    $('duoHelpBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const tip = $('duoHelpTip');
      tip.hidden = !tip.hidden;
    });

    $('versusHelpBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const tip = $('versusHelpTip');
      tip.hidden = !tip.hidden;
    });

    $('hostMenuBack')?.addEventListener('click', () => {
      showScreen('mpMenu');
    });

    // Join Menu
    $('joinSubmitBtn')?.addEventListener('click', async () => {
      const code = ($('joinCodeInput')?.value || '').trim().toUpperCase();
      const pName = ($('joinPlayerName')?.value || 'Player').trim();
      if (!code) {
        if (typeof Game !== 'undefined' && Game.toast) Game.toast('Please enter a teamcode!');
        return;
      }
      try {
        await Snd.init();
        if (typeof Game !== 'undefined' && Game.toast) Game.toast('Connecting to room ' + code + '...');
        await connect();
        send({ type: 'join_room', code, name: pName });
      } catch (e) {
        if (typeof Game !== 'undefined' && Game.toast) Game.toast('Connection error: ' + e.message);
      }
    });

    $('joinCodeInput')?.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') $('joinSubmitBtn')?.click();
    });

    $('joinMenuBack')?.addEventListener('click', () => {
      showScreen('mpMenu');
    });

    // Lobby Actions
    $('copyCodeBtn')?.addEventListener('click', copyRoomCode);
    $('hostStartGameBtn')?.addEventListener('click', () => {
      if (isHost) {
        send({ type: 'start_game' });
      }
    });

    $('lobbyLeaveBtn')?.addEventListener('click', () => {
      if (ws) send({ type: 'leave_room' });
      room = null;
      inMultiplayer = false;
      clearAllRemoteSprites();
      const bar = $('monsterActionBar');
      if (bar) bar.hidden = true;
      showScreen('intro');
    });

    // Monster Action buttons
    $('monsterCatchBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      onCatchBtnClick();
    });
    $('monsterSkillBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      onSkillBtnClick();
    });
  }

  function updateMinimap(k) {
    const container = $('mpMapDots');
    if (!container) return;
    if (!inMultiplayer || S.state !== 'play') {
      container.innerHTML = '';
      return;
    }

    const is1v1Hunter = room && room.mode === '1v1' && myRole !== 'thief';
    const isDuo = room && room.mode === 'duo';

    // In 1v1, hunter sees all players (including thieves).
    // In Duo, thieves see each other.
    // In 1v1, thief does NOT see the hunter (thief has no full map/radar).
    if (!is1v1Hunter && !isDuo) {
      container.innerHTML = '';
      return;
    }

    let html = '';
    for (const [id, rec] of remotePlayers.entries()) {
      if (is1v1Hunter) {
        // Monster sees thieves in glowing gold, other monsters in role color
        const color = rec.role === 'thief' ? '#ffd700' : (ROLES[rec.role]?.color || '#ff4444');
        const x = Math.round(rec.currentX * k - 3);
        const z = Math.round(rec.currentZ * k - 3);
        const opacity = rec.vent ? 0.45 : 1;
        const icon = rec.vent ? ' [VENT]' : '';
        html += `<div style="position:absolute;left:${x}px;top:${z}px;width:7px;height:7px;border-radius:50%;background:${color};box-shadow:0 0 6px ${color};opacity:${opacity};pointer-events:none;border:1px solid #000;" title="${escapeHtml(rec.name)}${icon}"></div>`;
      } else if (isDuo) {
        // Duo co-op thieves see partner
        const color = '#27ae60';
        const x = Math.round(rec.currentX * k - 3);
        const z = Math.round(rec.currentZ * k - 3);
        const opacity = rec.vent ? 0.5 : 1;
        html += `<div style="position:absolute;left:${x}px;top:${z}px;width:7px;height:7px;border-radius:50%;background:${color};box-shadow:0 0 6px ${color};opacity:${opacity};pointer-events:none;border:1px solid #000;" title="${escapeHtml(rec.name)}"></div>`;
      }
    }
    container.innerHTML = html;
  }

  return {
    init,
    update,
    updateMinimap,
    updateDevSettingsUI,
    showModeSelect: () => showScreen('modeSelect'),
    tryPickupCorn,
    reportEscape,
    onCatchBtnClick,
    onSkillBtnClick,
    get inMultiplayer() { return inMultiplayer; },
    get myRole() { return myRole; },
    get room() { return room; }
  };
})();
