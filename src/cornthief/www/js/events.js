// Random events announced by MazerNazer on a screen that drops down in the top corner, plus flickering lights.
const Events = (() => {
  const $ = id => document.getElementById(id);
  let next = 28, lastId = '', flT = 0, hideT = null, faceDrawn = false;

  const near = (min, max) => {
    for (let i = 0; i < 80; i++) { const p = World.randomOpen(G.p, min); if (Math.hypot(p.x - G.p.x, p.z - G.p.z) <= max) return p; }
    return World.randomOpen(G.p, min);
  };
  const everyone = () => [AI.police, AI.nazer, AI.lady, AI.hurter, ...Cast.list()].filter(Boolean);

  const LIST = [
    { id: 'boxes', title: 'BOX MANIA!', text: 'WOWZIZ! Items have been doubled in effect and are now wrapped in boxes! Every box gives you a random item! But be careful, one of these boxes might EXPLOOOODE and warn HurterBoy!',
      run() { S.dbl = 45; for (let i = 0; i < 14; i++) AI.addPickup('box', near(8, 75)); } },
    { id: 'blackout', title: 'BLACKOUT!', text: 'The power is out! Twenty seconds of darkness with the lights flickering. Something moves in the flickers...',
      run() { Game.darkness(20, true); S.flickerT = 20; } },
    { id: 'cornrain', title: 'CORN RAIN!', text: 'MazerNazer dropped his corn sack! Extra corns landed near you. Bonus corns turn into random items once you have all 10.',
      run() { for (let i = 0; i < 3; i++) AI.addPickup('corn', near(6, 45)); } },
    { id: 'zoomies', title: 'ZOOMIES!', text: 'Everyone drank too much Coke! Every character moves 50% faster for 20 seconds. You get unlimited stamina too!',
      run() { S.zoomT = 20; S.boost = Math.max(S.boost, 20); } },
    { id: 'protein', title: 'PROTEIN PARTY!', text: 'Free protein bars for the thief! Check your inventory.',
      run() { let n = 0; for (let i = 0; i < 2; i++) if (AI.giveItem('bar')) n++; if (!n) Game.toast('Your inventory is full, no bars for you!'); } },
    { id: 'raid', title: 'POLICE RAID!', text: 'The Police got a tip about the corn thief and knows exactly where you are! Run!',
      run() { const P = AI.police; P.ignore = 0; P.alertT = 15; P.path = []; Snd.play('police_detect'); } },
    { id: 'shuffle', title: 'MAZE SHUFFLE!', text: 'The maze hiccuped! Everybody was teleported to random spots.',
      run() { const t = World.randomOpen(G.p, 50); G.p.x = t.x; G.p.z = t.z; everyone().forEach(a => { a.place(World.randomOpen(G.p, 25)); if (a.roam) a.roam(); }); Game.flash('#ffffff'); } },
    { id: 'nap', title: 'NAP TIME!', text: 'MazerNazer fell asleep on the job. He is distracted for 25 seconds. Hurry up and grab those corns!',
      run() { const N = AI.nazer; N.ignore = Math.max(N.ignore, 25); N.state = 'roam'; N.path = []; } },
    { id: 'flicker', title: 'FLICKER NIGHT!', text: 'The lights are flickering for 25 seconds. Do not trust the dark.',
      run() { S.flickerT = 25; } },
    { id: 'dizzy', title: 'DIZZY SPELL!', text: 'MazerNazer spiked your drink. Your controls are reversed for 15 seconds.',
      run() { S.revT = 15; } },
    { id: 'flood', title: 'FLOOD!', text: 'The maze is flooding! Tunamies swim around and Grabbers lurk in the deep. Press K to dive for up to 30 seconds and hide. If a Grabber drags you under, mash P!',
      run() { Flood.start(); } }
  ];

  function face() {
    if (faceDrawn) return; faceDrawn = true;
    const c = $('evFace'), x = c.getContext('2d'); x.imageSmoothingEnabled = true;
    x.fillStyle = '#1a1710'; x.fillRect(0, 0, 96, 96); x.drawImage(Art.nazer(), 56, 36, 144, 144, 0, 0, 96, 96);
  }
  function announce(ev) {
    face();
    $('evTitle').textContent = ev.title; $('evText').textContent = ev.text;
    const el = $('event'); el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
    clearTimeout(hideT); hideT = setTimeout(() => el.classList.remove('on'), 10000);
    Snd.play('fanfare');
  }
  function fire(id) {
    const pool = LIST.filter(e => e.id !== lastId && !(e.id === 'flood' && S.floodT > 0)), ev = id ? LIST.find(e => e.id === id) : pool[Math.floor(Math.random() * pool.length)];
    lastId = ev.id; announce(ev); ev.run();
  }
  function openBox() {
    if (Math.random() < 0.2) {
      Game.flash('#ff9a20'); Snd.play('boom'); S.stunT = 0.8;
      const H = AI.hurter; H.ignore = 0; H.last = { x: G.p.x, z: G.p.z }; H.state = 'chase';
      Game.toast('BOOM! The box exploded and HurterBoy heard it!');
    } else {
      const t = Game.randomItem();
      if (AI.giveItem(t)) { Snd.play('pickup'); Game.toast('The box contained a ' + Game.ITEMS[t].name + '!'); }
    }
  }
  function update(dt) {
    if (S.zoomT > 0) { S.zoomT -= dt; G.mult = 1.5; } else G.mult = 1;
    if (S.flickerT > 0) {
      S.flickerT -= dt; flT -= dt;
      if (flT <= 0) { S.flOff = !S.flOff; flT = S.flOff ? 0.12 + Math.random() * 0.8 : 0.4 + Math.random() * 2.2; Snd.play('zap'); }
      if (S.flickerT <= 0) S.flOff = false;
    } else if (S.flOff) S.flOff = false;
    next -= dt;
    if (next <= 0 && S.state === 'play') { fire(); next = 50 + Math.random() * 40; }
  }
  function reset() {
    next = 28; lastId = ''; flT = 0; G.mult = 1; clearTimeout(hideT);
    const el = $('event'); if (el) el.classList.remove('on');
  }
  return { update, fire, openBox, reset, list: LIST };
})();
