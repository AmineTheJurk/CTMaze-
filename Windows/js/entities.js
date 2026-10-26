// Shared state + the Agent class used by the Police, MazerNazer, HurterBoy, Hospital Lady and the Puppet.
const G = { scene: null, p: { x: 0, z: 0, yaw: 0, pitch: 0 } };

class Agent {
  constructor(canvas, h) {
    this.h = h;
    this.sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: Art.spriteTex(canvas), transparent: true, alphaTest: 0.06 }));
    this.sp.scale.set(h * 2 / 3, h, 1);
    this.sp.position.y = h / 2;
    this.x = 0; this.z = 0; this.path = []; this.stun = 0; this.push = null; this.repath = 0; this.ignore = 0; this.state = 'roam';
    G.scene.add(this.sp);
  }
  place(p) { this.x = p.x; this.z = p.z; this.path = []; this.sync(); }
  sync() { this.sp.position.x = this.x; this.sp.position.z = this.z; }
  dist() { return Math.hypot(G.p.x - this.x, G.p.z - this.z); }
  sees(r) { return !G.hidden && this.dist() < r && World.los(this.x, this.z, G.p.x, G.p.z); }
  goTo(tx, tz) { this.path = World.path(World.tileOf(this.x), World.tileOf(this.z), World.tileOf(tx), World.tileOf(tz)); }
  roam(minD = 40) { const t = World.randomOpen(this, minD); this.goTo(t.x, t.z); }
  chase(dt, tx = G.p.x, tz = G.p.z) { this.repath -= dt; if (this.repath <= 0) { this.repath = 0.4; this.goTo(tx, tz); } }
  knock(dx, dz, secs, stunS) { this.push = { dx, dz, t: secs }; this.stun = stunS; this.path = []; }
  move(dt, speed, direct) {
    if (this.stun > 0) this.stun -= dt;
    if (this.push) {
      const p = this.push; p.t -= dt;
      const nx = this.x + p.dx * 14 * dt, nz = this.z + p.dz * 14 * dt;
      if (!World.blocked(nx, this.z, 0.6)) this.x = nx;
      if (!World.blocked(this.x, nz, 0.6)) this.z = nz;
      if (p.t <= 0) this.push = null;
      this.sync(); return;
    }
    if (this.stun > 0) return;
    const step = speed * (G.mult || 1) * dt;
    let tx, tz, fromPath = false;
    if (direct && this.dist() < 14 && World.los(this.x, this.z, G.p.x, G.p.z)) {
      const d = this.dist() || 1;
      if (!World.blocked(this.x + (G.p.x - this.x) / d * step, this.z + (G.p.z - this.z) / d * step, 0.5)) { tx = G.p.x; tz = G.p.z; }
    }
    if (tx === undefined) { const n = this.path[0]; if (!n) return; tx = n[0]; tz = n[1]; fromPath = true; }
    const dx = tx - this.x, dz = tz - this.z, d = Math.hypot(dx, dz);
    if (d <= step) { this.x = tx; this.z = tz; if (fromPath) this.path.shift(); }
    else { this.x += dx / d * step; this.z += dz / d * step; }
    this.sync();
  }
}
