// World: huge maze generation, rendering, collision, line of sight, pathfinding.
const World = (() => {
  const T = 4, H = 4.2, C = 32, N = 2 * C + 1;   // tile size, wall height, cells per side, grid size
  let grid, group, scene, openTiles, exit, door, exitGlow, rooms = [];
  const idx = (x, z) => z * N + x;
  const tileOf = v => Math.floor(v / T);
  const center = t => t * T + T / 2;

  let rnd = Math.random;
  function setSeed(s) {
    if (s == null) { rnd = Math.random; return; }
    let a = ((typeof s === 'number' ? s : 1234567) ^ 0xDEADBEEF) >>> 0;
    rnd = function() {
      let t = a += 0x6D2B79F5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function generate() {
    grid = new Uint8Array(N * N).fill(1);
    const seen = new Uint8Array(N * N), stack = [[1, 1]];
    grid[idx(1, 1)] = 0; seen[idx(1, 1)] = 1;
    const D = [[2, 0], [-2, 0], [0, 2], [0, -2]];
    while (stack.length) {
      const [x, z] = stack[stack.length - 1];
      const nb = D.map(d => [x + d[0], z + d[1], d]).filter(([a, b]) => a > 0 && b > 0 && a < N - 1 && b < N - 1 && !seen[idx(a, b)]);
      if (!nb.length) { stack.pop(); continue; }
      const [a, b, d] = nb[Math.floor(rnd() * nb.length)];
      grid[idx(x + d[0] / 2, z + d[1] / 2)] = 0; grid[idx(a, b)] = 0; seen[idx(a, b)] = 1; stack.push([a, b]);
    }
    // braid: knock out some walls so there are loops (makes escaping and getting lost both possible)
    for (let i = 0; i < N * N * 0.035; i++) {
      const x = 1 + Math.floor(rnd() * (N - 2)), z = 1 + Math.floor(rnd() * (N - 2));
      if (grid[idx(x, z)] !== 1) continue;
      const h = !grid[idx(x - 1, z)] && !grid[idx(x + 1, z)] && grid[idx(x, z - 1)] && grid[idx(x, z + 1)];
      const v = !grid[idx(x, z - 1)] && !grid[idx(x, z + 1)] && grid[idx(x - 1, z)] && grid[idx(x + 1, z)];
      if (h || v) grid[idx(x, z)] = 0;
    }
    // rooms: 10 open 5x5 chambers (3x3 cells) with four pillars; each holds one corn
    rooms = []; let tries = 0;
    while (rooms.length < 10 && tries++ < 800) {
      const cx = Math.floor(rnd() * (C - 2)), cz = Math.floor(rnd() * (C - 2));
      if (cx < 3 && cz < 3) continue;
      if (rooms.some(r => Math.abs(r.cx - cx) < 4 && Math.abs(r.cz - cz) < 4)) continue;
      const x0 = 1 + 2 * cx, z0 = 1 + 2 * cz, x1 = x0 + 4, z1 = z0 + 4;
      for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) grid[idx(x, z)] = 0;
      for (const [px, pz] of [[x0 + 1, z0 + 1], [x1 - 1, z0 + 1], [x0 + 1, z1 - 1], [x1 - 1, z1 - 1]]) grid[idx(px, pz)] = 1;
      rooms.push({ cx, cz, x0, z0, x1, z1, tx: x0 + 2, tz: z0 + 2 });
    }
    // exit on the east border, locked until all corns are found
    let ez = 1 + 2 * Math.floor(rnd() * C);
    exit = { x: N - 1, z: ez };
    grid[idx(exit.x, exit.z)] = 2;
    openTiles = [];
    for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) if (grid[idx(x, z)] === 0) openTiles.push([x, z]);
  }

  const solid = (tx, tz) => tx < 0 || tz < 0 || tx >= N || tz >= N || grid[idx(tx, tz)] !== 0;
  function blocked(x, z, r) {
    const x0 = tileOf(x - r), x1 = tileOf(x + r), z0 = tileOf(z - r), z1 = tileOf(z + r);
    for (let a = x0; a <= x1; a++) for (let b = z0; b <= z1; b++) if (solid(a, b)) return true;
    return false;
  }
  function los(x0, z0, x1, z1) {
    const dx = x1 - x0, dz = z1 - z0, d = Math.hypot(dx, dz), n = Math.ceil(d / 0.8);
    for (let i = 1; i < n; i++) { const t = i / n; if (solid(tileOf(x0 + dx * t), tileOf(z0 + dz * t))) return false; }
    return true;
  }
  // distance a ray travels from (x,z) in direction (dx,dz) before hitting a wall (capped)
  function rayDist(x, z, dx, dz, max) {
    let d = 0;
    while (d < max && !solid(tileOf(x + dx * d), tileOf(z + dz * d))) d += 0.5;
    return Math.max(0, d - 1.2);
  }

  // BFS over open tiles; returns list of tile centers from start to goal (excluding start)
  const par = new Int32Array(N * N), q = new Int32Array(N * N);
  function path(sx, sz, gx, gz) {
    par.fill(-2); let h = 0, t = 0;
    const s = idx(sx, sz), g = idx(gx, gz);
    if (solid(gx, gz) || solid(sx, sz)) return [];
    q[t++] = s; par[s] = -1;
    while (h < t) {
      const c = q[h++]; if (c === g) break;
      const cx = c % N, cz = (c / N) | 0;
      for (const [ax, az] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + ax, nz = cz + az;
        if (solid(nx, nz)) continue;
        const ni = idx(nx, nz);
        if (par[ni] !== -2) continue;
        par[ni] = c; q[t++] = ni;
      }
    }
    if (par[g] === -2) return [];
    const out = []; let c = g;
    while (c !== s) { out.push([center(c % N), center((c / N) | 0)]); c = par[c]; }
    return out.reverse();
  }
  const randomOpen = (minDistFrom, minDist) => {
    for (let i = 0; i < 400; i++) {
      const [x, z] = openTiles[Math.floor(Math.random() * openTiles.length)];
      if (!minDistFrom || Math.hypot(center(x) - minDistFrom.x, center(z) - minDistFrom.z) >= minDist) return { x: center(x), z: center(z) };
    }
    const [x, z] = openTiles[0]; return { x: center(x), z: center(z) };
  };

  let vents = [], ventGrid = null;
  function generateVents() {
    ventGrid = new Uint8Array(N * N).fill(1);
    vents = [];

    const carveDuct = (x0, z0, x1, z1) => {
      let cx = x0, cz = z0;
      ventGrid[idx(cx, cz)] = 0;
      while (cx !== x1) {
        cx += (x1 > cx ? 1 : -1);
        ventGrid[idx(cx, cz)] = 0;
      }
      while (cz !== z1) {
        cz += (z1 > cz ? 1 : -1);
        ventGrid[idx(cx, cz)] = 0;
      }
    };

    const isNearRoom = (tx, tz) => rooms.some(r => Math.hypot(r.tx - tx, r.tz - tz) < 7);

    // Place 8 vents strictly in neutral corridors/intersections, completely away from corn rooms!
    const corridorPool = openTiles.filter(([ox, oz]) => {
      if (isNearRoom(ox, oz)) return false;
      if (ox < 3 && oz < 3) return false; // Not right at player start
      if (ox > N - 4 && oz === exit.z) return false; // Not right in front of exit
      return true;
    });

    const ventNames = [
      'Northwest Alley Vent',
      'North Bypass Vent',
      'Northeast Hallway Vent',
      'West Tunnel Vent',
      'Central Crossroads Vent',
      'East Corridor Vent',
      'Southwest Junction Vent',
      'South Alley Vent'
    ];

    // Pick 8 well-spaced corridor locations
    for (const name of ventNames) {
      if (vents.length >= 8) break;
      let best = null, bestDist = 0;
      for (let t = 0; t < 120; t++) {
        const candidate = corridorPool[Math.floor(rnd() * corridorPool.length)];
        if (!candidate) continue;
        const [cx, cz] = candidate;
        const minDistToExisting = vents.length === 0 ? 999 : Math.min(...vents.map(v => Math.hypot(v.tx - cx, v.tz - cz)));
        if (minDistToExisting > bestDist && minDistToExisting > 10) {
          bestDist = minDistToExisting;
          best = candidate;
        }
      }
      if (best) {
        const vx = best[0], vz = best[1];
        vents.push({
          id: 'vent_' + vents.length,
          name: name,
          tx: vx,
          tz: vz,
          x: center(vx),
          z: center(vz)
        });
        ventGrid[idx(vx, vz)] = 0;
      }
    }

    // Connect all corridor vents into an interconnected crawlable duct network!
    for (let i = 0; i < vents.length; i++) {
      const v1 = vents[i];
      const others = vents
        .filter((_, j) => j !== i)
        .sort((a, b) => Math.hypot(a.tx - v1.tx, a.tz - v1.tz) - Math.hypot(b.tx - v1.tx, b.tz - v1.tz));
      for (let k = 0; k < Math.min(2, others.length); k++) {
        carveDuct(v1.tx, v1.tz, others[k].tx, others[k].tz);
      }
    }
    if (vents.length >= 2) {
      carveDuct(vents[0].tx, vents[0].tz, vents[vents.length - 1].tx, vents[vents.length - 1].tz);
    }
  }

  const ventSolid = (tx, tz) => tx < 0 || tz < 0 || tx >= N || tz >= N || ventGrid[idx(tx, tz)] !== 0;
  function ventBlocked(x, z, r) {
    const x0 = tileOf(x - r), x1 = tileOf(x + r), z0 = tileOf(z - r), z1 = tileOf(z + r);
    for (let a = x0; a <= x1; a++) for (let b = z0; b <= z1; b++) if (ventSolid(a, b)) return true;
    return false;
  }

  function getNearVent(x, z, maxDist = 2.4) {
    let best = null, bd = maxDist;
    for (const v of vents) {
      const d = Math.hypot(v.x - x, v.z - z);
      if (d < bd) { bd = d; best = v; }
    }
    return best ? { ...best, dist: bd } : null;
  }

  function build(scn, seed) {
    if (seed != null) setSeed(seed);
    scene = scn;
    if (group) { scene.remove(group); group.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
    generate();
    generateVents();
    group = new THREE.Group(); scene.add(group);
    const wallTex = Art.wall();
    const wallMat = new THREE.MeshLambertMaterial({ map: wallTex });
    let count = 0; for (let i = 0; i < grid.length; i++) if (grid[i] === 1) count++;
    const walls = new THREE.InstancedMesh(new THREE.BoxGeometry(T, H, T), wallMat, count);
    const m = new THREE.Matrix4(); let k = 0;
    for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) if (grid[idx(x, z)] === 1) { m.setPosition(center(x), H / 2, center(z)); walls.setMatrixAt(k++, m); }
    group.add(walls);
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(N * T, N * T), new THREE.MeshLambertMaterial({ map: Art.floor(N / 1) }));
    fl.rotation.x = -Math.PI / 2; fl.position.set(N * T / 2, 0, N * T / 2); group.add(fl);
    const ce = new THREE.Mesh(new THREE.PlaneGeometry(N * T, N * T), new THREE.MeshLambertMaterial({ map: Art.ceil(N / 1) }));
    ce.rotation.x = Math.PI / 2; ce.position.set(N * T / 2, H, N * T / 2); group.add(ce);
    // exit door (locked) and bright outside beyond it
    door = new THREE.Mesh(new THREE.BoxGeometry(T * 0.5, H, T), new THREE.MeshLambertMaterial({ color: 0x7a1414, emissive: 0x330000 }));
    door.position.set(center(exit.x), H / 2, center(exit.z)); group.add(door);
    exitGlow = new THREE.Mesh(new THREE.PlaneGeometry(T * 3, H), new THREE.MeshBasicMaterial({ color: 0xfff3c0, fog: false }));
    exitGlow.position.set((exit.x + 1) * T + 0.2, H / 2, center(exit.z)); exitGlow.rotation.y = -Math.PI / 2; group.add(exitGlow);
    // colored floor patch per room so you can spot them
    rooms.forEach((r, i) => {
      const col = new THREE.Color().setHSL((i * 0.097) % 1, 0.55, 0.38);
      const p = new THREE.Mesh(new THREE.PlaneGeometry(5 * T, 5 * T), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.5 }));
      p.rotation.x = -Math.PI / 2; p.position.set(center(r.tx), 0.03, center(r.tz)); group.add(p);
    });

    // ---- 3D VENTS & UNDERGROUND DUCT SYSTEM ----
    const rimMat = new THREE.MeshLambertMaterial({ color: 0x22252c });
    const topGrateMat = new THREE.MeshLambertMaterial({ map: Art.ventGrate() });
    const ventBoxMaterials = [rimMat, rimMat, topGrateMat, rimMat, rimMat, rimMat];
    const ductWallMat = new THREE.MeshLambertMaterial({ map: Art.ductWall() });
    const ductFloorMat = new THREE.MeshLambertMaterial({ map: Art.ductFloor(1) });
    const ductCeilMat = new THREE.MeshLambertMaterial({ map: Art.ductCeil(1) });

    // 1. Surface physical 3D metal vent hatches (clearly visible on corridor floor, NO blue decals)
    vents.forEach(v => {
      const ventBox = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.12, 2.8), ventBoxMaterials);
      ventBox.position.set(v.x, 0.06, v.z);
      group.add(ventBox);

      // Vertical shaft under the vent connecting to subterranean crawl level
      const shaft = new THREE.Mesh(
        new THREE.BoxGeometry(2.8, 1.6, 2.8),
        new THREE.MeshBasicMaterial({ color: 0x14161b, side: THREE.BackSide })
      );
      shaft.position.set(v.x, -0.8, v.z);
      group.add(shaft);
    });

    // 2. Subterranean duct tunnels (Floor at -1.6, Ceiling at -0.2, Height = 1.4)
    const DUCT_FLOOR = -1.6, DUCT_CEIL = -0.2, DUCT_H = 1.4;
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const wallGeo = new THREE.BoxGeometry(T, DUCT_H, 0.4);

    for (let z = 0; z < N; z++) {
      for (let x = 0; x < N; x++) {
        if (ventGrid[idx(x, z)] === 0) {
          const cx = center(x), cz = center(z);

          // Duct floor
          const dFl = new THREE.Mesh(new THREE.PlaneGeometry(T, T), ductFloorMat);
          dFl.rotation.x = -Math.PI / 2;
          dFl.position.set(cx, DUCT_FLOOR, cz);
          group.add(dFl);

          // Duct ceiling
          const dCe = new THREE.Mesh(new THREE.PlaneGeometry(T, T), ductCeilMat);
          dCe.rotation.x = Math.PI / 2;
          dCe.position.set(cx, DUCT_CEIL, cz);
          group.add(dCe);

          // Walls around open duct tiles
          dirs.forEach(([dx, dz]) => {
            const nx = x + dx, nz = z + dz;
            if (nx < 0 || nz < 0 || nx >= N || nz >= N || ventGrid[idx(nx, nz)] === 1) {
              const dw = new THREE.Mesh(wallGeo, ductWallMat);
              dw.position.set(cx + dx * (T / 2 - 0.2), (DUCT_FLOOR + DUCT_CEIL) / 2, cz + dz * (T / 2 - 0.2));
              if (dx !== 0) dw.rotation.y = Math.PI / 2;
              group.add(dw);
            }
          });
        }
      }
    }

    placePosters();
    return { N, T, exit, start: { x: center(1), z: center(1) } };
  }

  function placePosters() {
    const rules = Art.rulesPoster(), info = Art.infoPoster();
    const geo = new THREE.PlaneGeometry(1.6, 2.4);
    const mR = new THREE.MeshBasicMaterial({ map: rules }), mI = new THREE.MeshBasicMaterial({ map: info });
    let placed = 0, tries = 0;
    while (placed < 70 && tries++ < 4000) {
      const [x, z] = openTiles[Math.floor(rnd() * openTiles.length)];
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([a, b]) => solid(x + a, z + b));
      if (!dirs.length || (x < 3 && z < 3)) continue;
      const [a, b] = dirs[Math.floor(rnd() * dirs.length)];
      const p = new THREE.Mesh(geo, placed % 6 === 5 ? mI : mR);
      p.position.set(center(x) + a * (T / 2 - 0.03), 2.3, center(z) + b * (T / 2 - 0.03));
      p.rotation.y = Math.atan2(-a, -b);   // face into the corridor
      group.add(p); placed++;
    }
  }
  function unlockExit() { grid[idx(exit.x, exit.z)] = 0; door.visible = false; }
  return { T, H, N, build, solid, blocked, los, rayDist, path, randomOpen, tileOf, center, unlockExit, ventBlocked, getNearVent, setSeed, get rnd() { return rnd; }, get vents() { return vents; }, get ventGrid() { return ventGrid; }, get exit() { return exit; }, get rooms() { return rooms; }, get grid() { return grid; }, get openTiles() { return openTiles; } };
})();
