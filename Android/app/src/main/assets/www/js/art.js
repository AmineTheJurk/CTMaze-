// Procedural art: textures, character sprites, item icons. Everything is drawn with code.
const Art = (() => {
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
  const tex = (c, rep) => {
    const t = new THREE.CanvasTexture(c);
    if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); }
    t.anisotropy = 4;
    return t;
  };
  const speckle = (x, w, h, n, a) => {
    for (let i = 0; i < n; i++) {
      x.fillStyle = Math.random() < 0.5 ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a * 0.6})`;
      x.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
  };
  const circ = (x, cx, cy, r, f) => { x.fillStyle = f; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); };
  const rect = (x, a, b, w, h, f) => { x.fillStyle = f; x.fillRect(a, b, w, h); };
  const line = (x, a, b, c, d, w, s) => { x.strokeStyle = s; x.lineWidth = w; x.lineCap = 'round'; x.beginPath(); x.moveTo(a, b); x.lineTo(c, d); x.stroke(); };

  function wall() {
    const [c, x] = mk(256, 256);
    rect(x, 0, 0, 256, 256, '#b8a258');
    for (let i = 0; i < 256; i += 32) rect(x, i, 0, 12, 256, 'rgba(110,80,25,.35)');
    rect(x, 0, 196, 256, 60, '#4d3a28');
    rect(x, 0, 190, 256, 8, '#2f2418');
    speckle(x, 256, 256, 2500, 0.1);
    return tex(c);
  }
  function floor(n) {
    const [c, x] = mk(128, 128);
    rect(x, 0, 0, 128, 128, '#3a3820');
    rect(x, 0, 0, 64, 64, '#45431f'); rect(x, 64, 64, 64, 64, '#45431f');
    speckle(x, 128, 128, 800, 0.12);
    return tex(c, n);
  }
  function ceil(n) {
    const [c, x] = mk(128, 128);
    rect(x, 0, 0, 128, 128, '#26262c');
    x.strokeStyle = '#17171b'; x.lineWidth = 4; x.strokeRect(0, 0, 128, 128);
    speckle(x, 128, 128, 300, 0.1);
    return tex(c, n);
  }
  const RULES = ['NO RUNNING', 'NO DRINKING COKE', 'NO GRAPPLING HOOK', 'NO TELEPORTING', 'NO EATING PROTEIN BARS', 'NO SMOKING'];
  function rulesPoster() {
    const [c, x] = mk(256, 384);
    rect(x, 0, 0, 256, 384, '#ece3c6');
    x.strokeStyle = '#b3261e'; x.lineWidth = 10; x.strokeRect(5, 5, 246, 374);
    x.fillStyle = '#b3261e'; x.font = 'bold 34px Arial Black, Impact, sans-serif'; x.textAlign = 'center';
    x.fillText('MAZE RULES', 128, 58);
    rect(x, 28, 72, 200, 4, '#b3261e');
    x.textAlign = 'left';
    RULES.forEach((r, i) => {
      const y = 108 + i * 42;
      circ(x, 40, y - 8, 14, '#b3261e');
      line(x, 33, y - 15, 47, y - 1, 4, '#fff'); line(x, 47, y - 15, 33, y - 1, 4, '#fff');
      x.fillStyle = '#1b1b1b'; x.font = 'bold 17px Arial, sans-serif';
      x.fillText(r, 64, y - 2);
    });
    x.textAlign = 'center'; x.fillStyle = '#333'; x.font = 'bold 13px Arial';
    x.fillText('The Police is watching.', 128, 366);
    return tex(c);
  }
  function infoPoster() {
    const [c, x] = mk(256, 384);
    rect(x, 0, 0, 256, 384, '#e9d9a0');
    x.strokeStyle = '#3a2b12'; x.lineWidth = 8; x.strokeRect(4, 4, 248, 376);
    x.fillStyle = '#3a2b12'; x.textAlign = 'center'; x.font = 'bold 40px Arial Black, Impact';
    x.fillText('WANTED', 128, 62);
    circ(x, 128, 170, 56, '#cfa57a'); rect(x, 70, 120, 116, 16, '#222'); rect(x, 96, 108, 64, 20, '#222');
    rect(x, 96, 150, 20, 8, '#222'); rect(x, 142, 150, 20, 8, '#222');
    x.fillStyle = '#222'; x.fillRect(98, 152, 16, 5); x.fillRect(142, 152, 16, 5);
    line(x, 108, 205, 148, 205, 4, '#5a2a1a');
    x.fillStyle = '#3a2b12'; x.font = 'bold 22px Arial'; x.fillText('CORN THIEF', 128, 270);
    x.font = '15px Arial'; x.fillText('10 stolen corns.', 128, 305); x.fillText('Report to MazerNazer.', 128, 328);
    return tex(c);
  }

  // ---- characters (256x384 canvases) ----
  const charCanvas = () => mk(256, 384);
  function police() {
    const [c, x] = charCanvas();
    rect(x, 78, 150, 100, 150, '#1c3a8a');           // torso
    rect(x, 60, 160, 24, 110, '#1c3a8a'); rect(x, 172, 160, 24, 110, '#1c3a8a'); // arms
    circ(x, 72, 276, 13, '#d9a77d'); circ(x, 184, 276, 13, '#d9a77d');
    rect(x, 84, 296, 38, 80, '#13265c'); rect(x, 134, 296, 38, 80, '#13265c'); // legs
    rect(x, 78, 240, 100, 12, '#111');               // belt
    rect(x, 122, 240, 12, 12, '#d6b23a');
    circ(x, 128, 112, 42, '#d9a77d');                // head
    rect(x, 80, 66, 96, 28, '#13265c'); rect(x, 70, 90, 116, 10, '#0b1738'); // cap
    circ(x, 128, 80, 9, '#d6b23a');
    rect(x, 99, 104, 20, 12, '#111'); rect(x, 137, 104, 20, 12, '#111'); // shades
    rect(x, 106, 134, 44, 10, '#3b2a1a');            // mustache
    // star badge
    x.fillStyle = '#d6b23a'; x.beginPath();
    for (let i = 0; i < 10; i++) { const r = i % 2 ? 6 : 14, a = i * Math.PI / 5 - Math.PI / 2; x.lineTo(150 + Math.cos(a) * r, 188 + Math.sin(a) * r); }
    x.fill();
    return c;
  }
  function nazer() {
    const [c, x] = charCanvas();
    rect(x, 78, 150, 100, 110, '#e0c14a');           // shirt
    rect(x, 88, 170, 80, 140, '#2f5fa8');            // overalls
    rect(x, 88, 150, 14, 40, '#2f5fa8'); rect(x, 154, 150, 14, 40, '#2f5fa8');
    rect(x, 56, 160, 24, 100, '#e0c14a'); rect(x, 176, 160, 24, 100, '#e0c14a');
    circ(x, 68, 268, 14, '#d98a6a'); circ(x, 188, 268, 14, '#d98a6a');
    rect(x, 90, 310, 36, 66, '#2a4c85'); rect(x, 130, 310, 36, 66, '#2a4c85');
    line(x, 214, 110, 214, 372, 6, '#6b4a22');       // pitchfork
    [200, 214, 228].forEach(px => line(x, px, 110, px, 78, 5, '#999'));
    line(x, 200, 110, 228, 110, 5, '#999');
    circ(x, 128, 112, 42, '#d98a6a');
    rect(x, 60, 80, 136, 10, '#d2b05a'); rect(x, 88, 46, 80, 40, '#d2b05a'); // straw hat
    line(x, 100, 100, 122, 108, 6, '#2a1608'); line(x, 156, 100, 134, 108, 6, '#2a1608'); // angry brows
    circ(x, 110, 114, 5, '#111'); circ(x, 146, 114, 5, '#111');
    rect(x, 108, 138, 40, 8, '#6a1b1b'); rect(x, 112, 138, 6, 6, '#fff'); rect(x, 138, 138, 6, 6, '#fff');
    return c;
  }
  function hurter() {
    const [c, x] = charCanvas();
    rect(x, 84, 190, 88, 110, '#161616');            // hoodie
    rect(x, 66, 196, 22, 90, '#161616'); rect(x, 168, 196, 22, 90, '#161616');
    circ(x, 76, 288, 12, '#e8e0d8'); circ(x, 180, 288, 12, '#e8e0d8');
    rect(x, 92, 300, 32, 76, '#2c2c3c'); rect(x, 132, 300, 32, 76, '#2c2c3c');
    // knife
    line(x, 188, 290, 224, 230, 7, '#c9ccd4'); line(x, 186, 292, 196, 306, 9, '#4a2a14');
    line(x, 216, 244, 224, 230, 5, '#b3261e');
    circ(x, 128, 150, 46, '#161616');                // hood
    circ(x, 128, 156, 34, '#e8e0d8');                // face
    circ(x, 114, 150, 6, '#000'); circ(x, 142, 150, 6, '#000');
    x.strokeStyle = '#000'; x.lineWidth = 3; x.beginPath(); x.arc(128, 160, 18, 0.15, Math.PI - 0.15); x.stroke();
    for (let i = 0; i < 6; i++) line(x, 112 + i * 6.4, 168, 112 + i * 6.4, 176, 2, '#000');
    return c;
  }
  function lady() {
    const [c, x] = charCanvas();
    x.fillStyle = '#f4f4f4'; x.beginPath(); x.moveTo(98, 150); x.lineTo(158, 150); x.lineTo(196, 340); x.lineTo(60, 340); x.fill();
    rect(x, 60, 336, 136, 8, '#cfd4da');
    rect(x, 62, 160, 22, 100, '#f4f4f4'); rect(x, 172, 160, 22, 100, '#f4f4f4');
    circ(x, 72, 262, 12, '#f0c4a4'); circ(x, 184, 262, 12, '#f0c4a4');
    rect(x, 92, 344, 28, 34, '#f0c4a4'); rect(x, 136, 344, 28, 34, '#f0c4a4');
    rect(x, 174, 250, 38, 30, '#b3261e'); rect(x, 188, 240, 10, 10, '#7a1812'); // medic bag
    rect(x, 187, 256, 12, 4, '#fff'); rect(x, 191, 252, 4, 12, '#fff');
    circ(x, 128, 108, 40, '#2a1a12');                // hair
    rect(x, 88, 108, 80, 70, '#2a1a12');
    circ(x, 128, 112, 32, '#f0c4a4');
    rect(x, 92, 62, 72, 24, '#fff'); rect(x, 120, 66, 16, 4, '#b3261e'); rect(x, 126, 60, 4, 16, '#b3261e');
    rect(x, 124, 62, 8, 20, '#b3261e'); rect(x, 118, 68, 20, 8, '#b3261e');
    circ(x, 116, 112, 4, '#222'); circ(x, 140, 112, 4, '#222');
    x.strokeStyle = '#a33'; x.lineWidth = 3; x.beginPath(); x.arc(128, 126, 8, 0.2, Math.PI - 0.2); x.stroke();
    return c;
  }
  function puppet() {
    const [c, x] = charCanvas();
    for (const px of [70, 110, 150, 186]) line(x, px, 0, px < 128 ? px + 20 : px - 20, 130, 2, 'rgba(230,230,230,.7)'); // strings
    rect(x, 94, 190, 68, 92, '#b3261e');
    for (let i = 0; i < 5; i++) rect(x, 94, 190 + i * 20, 68, 10, '#f0f0f0');
    line(x, 94, 200, 56, 262, 14, '#8a5a30'); line(x, 162, 200, 200, 262, 14, '#8a5a30');
    line(x, 108, 282, 100, 360, 14, '#8a5a30'); line(x, 148, 282, 160, 360, 14, '#8a5a30');
    rect(x, 86, 354, 28, 14, '#222'); rect(x, 146, 354, 28, 14, '#222');
    circ(x, 128, 140, 54, '#d9b98a');
    circ(x, 108, 132, 16, '#fff'); circ(x, 148, 132, 16, '#fff');
    circ(x, 108, 132, 8, '#000'); circ(x, 148, 132, 8, '#000');
    circ(x, 96, 160, 8, 'rgba(200,60,60,.7)'); circ(x, 160, 160, 8, 'rgba(200,60,60,.7)');
    x.strokeStyle = '#000'; x.lineWidth = 4; x.beginPath(); x.moveTo(94, 170); x.lineTo(162, 170); x.stroke();
    for (let i = 0; i < 7; i++) line(x, 98 + i * 10, 164, 98 + i * 10, 178, 3, '#000');
    return c;
  }

  function ventGrate() {
    const [c, x] = mk(256, 256);
    // Outer metal frame
    rect(x, 0, 0, 256, 256, '#181a20');
    x.strokeStyle = '#6b7486'; x.lineWidth = 14; x.strokeRect(7, 7, 242, 242);
    x.strokeStyle = '#2d3340'; x.lineWidth = 4; x.strokeRect(14, 14, 228, 228);
    // Dark recessed pit
    rect(x, 20, 20, 216, 216, '#08090d');
    // Corner bolts
    const bolts = [[20, 20], [236, 20], [20, 236], [236, 236]];
    bolts.forEach(([bx, by]) => {
      circ(x, bx, by, 9, '#7c869a');
      circ(x, bx, by, 6, '#b0bacd');
      circ(x, bx, by, 2.5, '#0b0c10');
    });
    // Slats / Louvers
    for (let i = 0; i < 9; i++) {
      const y = 36 + i * 20;
      rect(x, 28, y, 200, 11, '#3b4352');
      rect(x, 28, y, 200, 3, '#7c869a'); // top metallic highlight
      rect(x, 28, y + 10, 200, 4, '#0a0b0e'); // underside shadow
    }
    // Vertical center brace (iconic vent divider)
    rect(x, 120, 20, 16, 216, '#282e3a');
    rect(x, 122, 20, 4, 216, '#6b7486');
    speckle(x, 256, 256, 1000, 0.1);
    return tex(c);
  }
  function ductWall() {
    const [c, x] = mk(256, 256);
    rect(x, 0, 0, 256, 256, '#3a3f4a');
    for (let i = 0; i < 256; i += 32) {
      rect(x, 0, i, 256, 2, '#555d6e');
      rect(x, 0, i + 2, 256, 28, '#323742');
      rect(x, 0, i + 30, 256, 2, '#1e2229');
      for (let rx = 16; rx < 256; rx += 32) {
        circ(x, rx, i + 16, 2.5, '#788296');
        circ(x, rx, i + 16, 1, '#111');
      }
    }
    speckle(x, 256, 256, 1800, 0.1);
    return tex(c);
  }
  function ductFloor(n) {
    const [c, x] = mk(128, 128);
    rect(x, 0, 0, 128, 128, '#252932');
    x.strokeStyle = '#3a404e'; x.lineWidth = 2;
    for (let i = -128; i < 256; i += 16) {
      x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 128, 128); x.stroke();
      x.beginPath(); x.moveTo(i + 128, 0); x.lineTo(i, 128); x.stroke();
    }
    speckle(x, 128, 128, 900, 0.12);
    return tex(c, n);
  }
  function ductCeil(n) {
    const [c, x] = mk(128, 128);
    rect(x, 0, 0, 128, 128, '#1e2128');
    x.strokeStyle = '#121419'; x.lineWidth = 4; x.strokeRect(0, 0, 128, 128);
    rect(x, 48, 56, 32, 16, '#243b44');
    rect(x, 52, 60, 24, 8, '#38fedc');
    speckle(x, 128, 128, 400, 0.08);
    return tex(c, n);
  }

  // ---- item icons (96x96) ----
  function icon(type, size = 96) {
    const [c, x] = mk(96, 96);
    if (type === 'vent') {
      rect(x, 12, 18, 72, 60, '#2e323b'); rect(x, 18, 24, 60, 48, '#12141a');
      x.strokeStyle = '#4a5260'; x.lineWidth = 3; x.strokeRect(12, 18, 72, 60);
      for (let i = 0; i < 5; i++) line(x, 24, 32 + i * 8, 72, 32 + i * 8, 3, '#788496');
      circ(x, 16, 22, 2.5, '#aaa'); circ(x, 80, 22, 2.5, '#aaa'); circ(x, 16, 74, 2.5, '#aaa'); circ(x, 80, 74, 2.5, '#aaa');
    } else if (type === 'grapple') {
      x.strokeStyle = '#d0d0d8'; x.lineWidth = 9; x.lineCap = 'round';
      x.beginPath(); x.arc(48, 40, 24, 0.2, Math.PI + 0.1, true); x.stroke();
      line(x, 48, 62, 48, 90, 7, '#c8a050'); line(x, 24, 28, 18, 14, 8, '#d0d0d8'); line(x, 72, 28, 78, 14, 8, '#d0d0d8');
    } else if (type === 'teleporter') {
      rect(x, 22, 30, 52, 50, '#4a2a7a'); rect(x, 28, 36, 40, 26, '#0b0b18');
      x.strokeStyle = '#c58cff'; x.lineWidth = 4; x.beginPath(); x.arc(48, 49, 9, 0, 6); x.stroke();
      x.beginPath(); x.arc(48, 49, 4, 0, 6); x.stroke();
      circ(x, 36, 72, 4, '#ff6'); circ(x, 60, 72, 4, '#6f6'); line(x, 48, 30, 48, 14, 5, '#999'); circ(x, 48, 12, 5, '#f55');
    } else if (type === 'coke') {
      rect(x, 30, 18, 36, 64, '#c4161c'); rect(x, 30, 18, 36, 8, '#bbb'); rect(x, 30, 74, 36, 8, '#bbb');
      x.strokeStyle = '#fff'; x.lineWidth = 5; x.beginPath(); x.moveTo(30, 52); x.bezierCurveTo(42, 38, 54, 66, 66, 48); x.stroke();
    } else if (type === 'bar') {
      rect(x, 14, 34, 68, 32, '#6a3f1f'); rect(x, 26, 40, 44, 20, '#6bbf3a');
      x.fillStyle = '#fff'; x.font = 'bold 13px Arial'; x.textAlign = 'center'; x.fillText('PRO', 48, 55);
      x.fillStyle = '#6a3f1f'; x.beginPath(); x.moveTo(14, 34); x.lineTo(6, 50); x.lineTo(14, 66); x.fill(); x.beginPath(); x.moveTo(82, 34); x.lineTo(90, 50); x.lineTo(82, 66); x.fill();
    } else if (type === 'corn') {
      x.fillStyle = '#2f8a3a'; x.beginPath(); x.moveTo(48, 90); x.lineTo(14, 40); x.lineTo(40, 70); x.fill();
      x.beginPath(); x.moveTo(48, 90); x.lineTo(82, 40); x.lineTo(56, 70); x.fill();
      x.fillStyle = '#f2c230'; x.beginPath(); x.ellipse(48, 46, 17, 36, 0, 0, 7); x.fill();
      x.fillStyle = '#c99a14';
      for (let r = 0; r < 6; r++) for (let q = -1; q <= 1; q++) x.fillRect(42 + q * 9, 20 + r * 10, 5, 5);
    }
    else if (type === 'glow') {
      const g = x.createRadialGradient(48, 48, 4, 48, 48, 46); g.addColorStop(0, 'rgba(140,255,120,.8)'); g.addColorStop(1, 'rgba(140,255,120,0)'); x.fillStyle = g; x.fillRect(0, 0, 96, 96);
      x.save(); x.translate(48, 48); x.rotate(-0.7); rect(x, -8, -34, 16, 68, '#7dff5a'); rect(x, -8, -34, 16, 8, '#fff'); rect(x, -8, 26, 16, 8, '#3a8a2a'); x.restore();
    } else if (type === 'smoke') {
      circ(x, 36, 34, 18, 'rgba(210,210,210,.7)'); circ(x, 58, 30, 20, 'rgba(230,230,230,.7)'); circ(x, 48, 20, 16, 'rgba(240,240,240,.7)');
      rect(x, 32, 44, 32, 44, '#4a4f58'); rect(x, 32, 44, 32, 8, '#8a909c'); rect(x, 40, 58, 16, 16, '#e8c040');
    } else if (type === 'banana') {
      x.strokeStyle = '#f2d230'; x.lineWidth = 16; x.lineCap = 'round'; x.beginPath(); x.arc(48, 40, 30, 0.5, 2.7); x.stroke();
      x.strokeStyle = '#c8a010'; x.lineWidth = 4; x.beginPath(); x.arc(48, 40, 24, 0.6, 2.6); x.stroke(); line(x, 20, 60, 14, 72, 6, '#5a4a10');
    } else if (type === 'clock') {
      circ(x, 48, 54, 28, '#c4161c'); circ(x, 48, 54, 21, '#f4f4f0'); line(x, 48, 54, 48, 40, 3, '#111'); line(x, 48, 54, 58, 58, 3, '#111');
      circ(x, 26, 24, 11, '#999'); circ(x, 70, 24, 11, '#999'); line(x, 34, 74, 28, 88, 4, '#333'); line(x, 62, 74, 68, 88, 4, '#333');
    } else if (type === 'shoes') {
      x.fillStyle = '#f4f4f4'; x.beginPath(); x.moveTo(14, 40); x.lineTo(48, 40); x.lineTo(54, 58); x.lineTo(84, 64); x.lineTo(84, 76); x.lineTo(14, 76); x.fill();
      rect(x, 14, 72, 70, 8, '#2a6ae0'); line(x, 30, 80, 30, 92, 3, '#999'); line(x, 38, 80, 38, 92, 3, '#999'); line(x, 46, 80, 46, 92, 3, '#999'); line(x, 54, 80, 54, 92, 3, '#999');
      rect(x, 22, 46, 20, 6, '#2a6ae0');
    } else if (type === 'medkit') {
      rect(x, 14, 28, 68, 52, '#f4f4f4'); rect(x, 14, 28, 68, 8, '#cfd4da'); rect(x, 38, 20, 20, 10, '#cfd4da');
      rect(x, 42, 42, 12, 28, '#c4161c'); rect(x, 34, 50, 28, 12, '#c4161c');
    } else if (type === 'radar') {
      circ(x, 48, 48, 38, '#10200f'); x.strokeStyle = '#59ff59'; x.lineWidth = 3;
      x.beginPath(); x.arc(48, 48, 28, 0, 7); x.stroke(); x.beginPath(); x.arc(48, 48, 14, 0, 7); x.stroke(); line(x, 48, 48, 74, 28, 4, '#59ff59'); circ(x, 66, 64, 5, '#f2c230');
    } else if (type === 'box') {
      rect(x, 14, 30, 68, 54, '#b98a4a'); rect(x, 14, 30, 68, 12, '#9a6e34'); rect(x, 42, 30, 12, 54, '#d6303a'); rect(x, 14, 52, 68, 8, '#d6303a');
      circ(x, 40, 24, 9, '#d6303a'); circ(x, 56, 24, 9, '#d6303a'); circ(x, 48, 28, 5, '#8a1a22');
      x.fillStyle = '#fff'; x.font = 'bold 20px Arial'; x.textAlign = 'center'; x.fillText('?', 48, 76);
    }
    return c;
  }
  function thief(beanieCol = '#16161a', shirtCol = '#4a5060') {
    const [c, x] = charCanvas();
    rect(x, 88, 296, 34, 76, '#22252f'); rect(x, 134, 296, 34, 76, '#22252f');
    circ(x, 102, 372, 16, '#d6d0c0'); circ(x, 154, 372, 16, '#d6d0c0');
    rect(x, 78, 150, 100, 146, shirtCol);
    for (let i = 0; i < 4; i++) rect(x, 78, 170 + i * 28, 100, 10, 'rgba(0,0,0,.25)');
    rect(x, 56, 160, 24, 110, shirtCol); rect(x, 176, 160, 24, 110, shirtCol);
    circ(x, 68, 276, 14, '#e0b48c'); circ(x, 188, 276, 14, '#e0b48c');
    x.fillStyle = '#b79a62'; x.beginPath(); x.ellipse(70, 175, 26, 32, 0.3, 0, 7); x.fill();
    for (let i = 0; i < 3; i++) { circ(x, 62 + i * 8, 150 - (i % 2) * 4, 4, '#f2c230'); }
    circ(x, 128, 108, 42, '#e0b48c');
    rect(x, 86, 96, 84, 18, '#111');
    circ(x, 110, 105, 5, '#fff'); circ(x, 146, 105, 5, '#fff');
    circ(x, 112, 105, 2.5, '#111'); circ(x, 148, 105, 2.5, '#111');
    x.fillStyle = beanieCol; x.beginPath(); x.arc(128, 104, 44, Math.PI, 0); x.fill();
    rect(x, 80, 100, 96, 14, beanieCol);
    rect(x, 76, 108, 104, 8, 'rgba(0,0,0,.3)');
    line(x, 114, 132, 142, 132, 3, '#333'); line(x, 136, 132, 144, 126, 3, '#333');
    return c;
  }
  function nameBadge(name, roleCol = '#f2c230') {
    const [c, x] = mk(256, 64);
    x.fillStyle = 'rgba(13, 12, 9, 0.85)';
    if (x.roundRect) x.roundRect(8, 8, 240, 48, 12); else x.fillRect(8, 8, 240, 48);
    x.fill();
    x.strokeStyle = roleCol;
    x.lineWidth = 3;
    x.stroke();
    x.fillStyle = '#ffffff';
    x.font = 'bold 24px Arial, sans-serif';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText((name || 'Player').slice(0, 14), 128, 32);
    return c;
  }
  const spriteTex = c => { const t = new THREE.CanvasTexture(c); return t; };
  return { h: { mk, circ, rect, line }, wall, floor, ceil, rulesPoster, infoPoster, police, nazer, hurter, lady, puppet, thief, nameBadge, icon, spriteTex, RULES, ventGrate, ductWall, ductFloor, ductCeil };
})();
