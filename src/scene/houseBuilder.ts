import * as THREE from 'three';
import type { ArchitecturalMaterials } from './materials';

export interface BuiltEstate {
  root: THREE.Group;
  siteGroup: THREE.Group;
  groundFloorGroup: THREE.Group;
  upperFloorGroup: THREE.Group;
  roofGroup: THREE.Group;
  dimensionGuidesGroup: THREE.Group;
  poolWaterMesh: THREE.Mesh;
  interiorLights: THREE.PointLight[];
  dispose: () => void;
}

export function buildRidgeviewEstate(mats: ArchitecturalMaterials): BuiltEstate {
  const geometries: THREE.BufferGeometry[] = [];
  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };

  const makeBox = (
    w: number,
    h: number,
    d: number,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
    castShadow = true,
    receiveShadow = true
  ): THREE.Mesh => {
    const mesh = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(w, h, d)), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = receiveShadow;
    return mesh;
  };

  const root = new THREE.Group();
  const siteGroup = new THREE.Group();
  const groundFloorGroup = new THREE.Group();
  const upperFloorGroup = new THREE.Group();
  const roofGroup = new THREE.Group();
  const dimensionGuidesGroup = new THREE.Group();
  const interiorLights: THREE.PointLight[] = [];

  root.add(siteGroup, groundFloorGroup, upperFloorGroup, roofGroup, dimensionGuidesGroup);

  // =========================================================================
  // 1. EXTENDED HILLSIDE TERRAIN & LANDSCAPED SITE (NO FLOATING BOX IN VOID)
  // =========================================================================
  const terrainGeo = trackGeo(new THREE.PlaneGeometry(190, 190, 64, 64));
  terrainGeo.rotateX(-Math.PI / 2);
  const posAttr = terrainGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vz = posAttr.getZ(i);
    const distFromParcel = Math.max(Math.abs(vx) - 14.5, Math.abs(vz) - 13.5, 0);
    if (distFromParcel > 0) {
      const smooth = Math.min(1, distFromParcel / 16);
      const ridge =
        Math.sin(vx * 0.065 + 0.4) * Math.cos(vz * 0.055) * 3.8 +
        Math.sin(vx * 0.14 - vz * 0.09) * 1.1;
      // Gently slope down toward south (+z) coastal view and rise slightly behind north (-z)
      const slope = vz < -12 ? (-vz - 12) * 0.09 : vz > 14 ? -(vz - 14) * 0.08 : 0;
      posAttr.setY(i, (ridge + slope) * smooth * smooth - 0.12);
    } else {
      posAttr.setY(i, -0.04);
    }
  }
  terrainGeo.computeVertexNormals();
  const terrainMesh = new THREE.Mesh(terrainGeo, mats.hillside);
  terrainMesh.receiveShadow = true;
  siteGroup.add(terrainMesh);

  // Manicured estate lawn pad
  const lawnPad = makeBox(28.0, 0.12, 25.0, mats.lawn, 0, -0.06, 1.0, false, true);
  siteGroup.add(lawnPad);

  // Architectural perimeter stone low wall & cedar privacy fencing (north & west)
  siteGroup.add(makeBox(28.0, 0.85, 0.35, mats.exteriorWall, 0, 0.425, -11.4, true, true));
  siteGroup.add(makeBox(0.35, 1.45, 24.8, mats.accentCladding, -13.9, 0.725, 1.0, true, true));
  siteGroup.add(makeBox(0.35, 0.85, 12.0, mats.exteriorWall, 13.9, 0.425, -5.4, true, true));

  // Main Travertine Architectural Plinth (y = 0 to 0.24)
  siteGroup.add(makeBox(22.4, 0.24, 18.8, mats.travertine, -0.4, 0.12, 1.0, false, true));

  // Entry stepping stones across front lawn
  for (let i = 0; i < 4; i++) {
    siteGroup.add(makeBox(2.2, 0.08, 0.75, mats.travertine, -0.8, 0.04, -8.8 - i * 1.1, false, true));
  }

  // Concrete Architectural Driveway (East side)
  siteGroup.add(makeBox(5.2, 0.2, 17.5, mats.concrete, 9.6, 0.1, -2.5, false, true));

  // =========================================================================
  // 2. INFINITY-EDGE LAP POOL & OUTDOOR LOUNGE
  // =========================================================================
  // Pool recessed dark coping rim & interior basin
  const poolCenterX = -1.6;
  const poolCenterZ = 7.0;
  const poolW = 9.4;
  const poolD = 4.2;

  // Pool interior mosaic bed
  siteGroup.add(makeBox(poolW - 0.3, 0.08, poolD - 0.3, mats.poolTile, poolCenterX, 0.08, poolCenterZ, false, true));
  // Pool inner walls
  siteGroup.add(makeBox(poolW, 0.28, 0.22, mats.travertine, poolCenterX, 0.15, poolCenterZ - poolD / 2, true, true));
  siteGroup.add(makeBox(0.24, 0.28, poolD, mats.travertine, poolCenterX - poolW / 2, 0.15, poolCenterZ, true, true));
  siteGroup.add(makeBox(0.24, 0.28, poolD, mats.travertine, poolCenterX + poolW / 2, 0.15, poolCenterZ, true, true));
  // South infinity spillway wall (slightly lower than water edge)
  siteGroup.add(makeBox(poolW, 0.22, 0.18, mats.roofTrim, poolCenterX, 0.11, poolCenterZ + poolD / 2, true, true));
  // Underwater warm LED strip along north wall of pool
  siteGroup.add(makeBox(poolW - 1.2, 0.06, 0.06, mats.warmGlow, poolCenterX, 0.18, poolCenterZ - poolD / 2 + 0.14, false, false));

  // Shimmering Pool Water Mesh
  const waterGeo = trackGeo(new THREE.PlaneGeometry(poolW - 0.24, poolD - 0.24, 16, 8));
  waterGeo.rotateX(-Math.PI / 2);
  const poolWaterMesh = new THREE.Mesh(waterGeo, mats.poolWater);
  poolWaterMesh.position.set(poolCenterX, 0.23, poolCenterZ);
  poolWaterMesh.renderOrder = 2;
  siteGroup.add(poolWaterMesh);

  // Teak Sun Loungers (West of pool)
  const buildSunLounger = (lx: number, lz: number) => {
    const g = new THREE.Group();
    g.position.set(lx, 0.24, lz);
    // Legs
    g.add(makeBox(0.06, 0.24, 0.06, mats.darkWalnut, -0.34, 0.12, -0.82));
    g.add(makeBox(0.06, 0.24, 0.06, mats.darkWalnut, 0.34, 0.12, -0.82));
    g.add(makeBox(0.06, 0.24, 0.06, mats.darkWalnut, -0.34, 0.12, 0.82));
    g.add(makeBox(0.06, 0.24, 0.06, mats.darkWalnut, 0.34, 0.12, 0.82));
    // Frame + flat cushion
    g.add(makeBox(0.78, 0.08, 1.9, mats.darkWalnut, 0, 0.26, 0));
    g.add(makeBox(0.72, 0.1, 1.25, mats.sofaFabric, 0, 0.34, 0.26));
    // Angled backrest
    const back = makeBox(0.72, 0.1, 0.68, mats.sofaFabric, 0, 0.5, -0.58);
    back.rotation.x = 0.48;
    g.add(back);
    // Accent headrest pillow
    const pillow = makeBox(0.46, 0.08, 0.22, mats.accentFabric, 0, 0.65, -0.78);
    pillow.rotation.x = 0.48;
    g.add(pillow);
    siteGroup.add(g);
  };
  buildSunLounger(-8.6, 7.1);
  buildSunLounger(-7.3, 7.1);
  // Side table between loungers
  siteGroup.add(makeBox(0.44, 0.36, 0.44, mats.darkWalnut, -7.95, 0.42, 6.75));

  // Architectural Cedar Pergola & Outdoor Dining Set (East of pool)
  const pergolaGroup = new THREE.Group();
  pergolaGroup.position.set(6.4, 0.24, 6.8);
  const pW = 5.0;
  const pD = 4.0;
  const pH = 2.95;
  // 4 matte black steel posts
  for (const sx of [-pW / 2 + 0.1, pW / 2 - 0.1]) {
    for (const sz of [-pD / 2 + 0.1, pD / 2 - 0.1]) {
      pergolaGroup.add(makeBox(0.14, pH, 0.14, mats.matteBlack, sx, pH / 2, sz));
    }
  }
  // Perimeter steel header beams
  pergolaGroup.add(makeBox(pW, 0.18, 0.14, mats.matteBlack, 0, pH, -pD / 2 + 0.1));
  pergolaGroup.add(makeBox(pW, 0.18, 0.14, mats.matteBlack, 0, pH, pD / 2 - 0.1));
  pergolaGroup.add(makeBox(0.14, 0.18, pD, mats.matteBlack, -pW / 2 + 0.1, pH, 0));
  pergolaGroup.add(makeBox(0.14, 0.18, pD, mats.matteBlack, pW / 2 - 0.1, pH, 0));
  // 11 Cedar louver slats
  for (let i = 0; i < 11; i++) {
    const sx = -pW / 2 + 0.35 + i * ((pW - 0.7) / 10);
    pergolaGroup.add(makeBox(0.08, 0.14, pD - 0.18, mats.soffitWood, sx, pH + 0.04, 0));
  }
  // Outdoor teak dining table + 4 chairs
  pergolaGroup.add(makeBox(2.2, 0.08, 1.05, mats.darkWalnut, 0, 0.76, 0));
  pergolaGroup.add(makeBox(0.1, 0.74, 0.85, mats.matteBlack, -0.82, 0.37, 0));
  pergolaGroup.add(makeBox(0.1, 0.74, 0.85, mats.matteBlack, 0.82, 0.37, 0));
  for (const cx of [-0.55, 0.55]) {
    for (const cz of [-0.82, 0.82]) {
      pergolaGroup.add(makeBox(0.46, 0.07, 0.44, mats.sofaFabric, cx, 0.45, cz));
      pergolaGroup.add(makeBox(0.46, 0.36, 0.06, mats.darkWalnut, cx, 0.65, cz + (cz < 0 ? -0.2 : 0.2)));
      pergolaGroup.add(makeBox(0.4, 0.42, 0.38, mats.matteBlack, cx, 0.21, cz));
    }
  }
  siteGroup.add(pergolaGroup);

  // =========================================================================
  // 3. COMPOSITE MODERN ARCHITECTURAL EV (FOR HUMAN SCALE ON DRIVEWAY)
  // =========================================================================
  const carGroup = new THREE.Group();
  carGroup.position.set(9.4, 0.21, -2.2);
  // Contact shadow
  const carShadow = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(2.6, 5.2)), mats.contactShadow);
  carShadow.rotation.x = -Math.PI / 2;
  carShadow.position.y = 0.02;
  carGroup.add(carShadow);
  // Lower body chassis
  carGroup.add(makeBox(1.86, 0.56, 4.45, mats.carBody, 0, 0.56, 0));
  // Sculpted upper cabin greenhouse
  carGroup.add(makeBox(1.56, 0.46, 2.35, mats.carGlass, 0, 1.02, -0.15));
  carGroup.add(makeBox(1.5, 0.08, 1.75, mats.carBody, 0, 1.26, -0.18));
  // Headlights & taillight bar
  carGroup.add(makeBox(1.66, 0.08, 0.05, mats.warmGlow, 0, 0.66, 2.23, false, false));
  carGroup.add(makeBox(1.66, 0.08, 0.05, mats.accentFabric, 0, 0.68, -2.23, false, false));
  // 4 composite wheels (tire + brushed rim)
  const wheelGeo = trackGeo(new THREE.CylinderGeometry(0.32, 0.32, 0.24, 18));
  wheelGeo.rotateZ(Math.PI / 2);
  const rimGeo = trackGeo(new THREE.CylinderGeometry(0.2, 0.2, 0.25, 14));
  rimGeo.rotateZ(Math.PI / 2);
  for (const wx of [-0.9, 0.9]) {
    for (const wz of [-1.35, 1.35]) {
      const tire = new THREE.Mesh(wheelGeo, mats.tireRubber);
      tire.position.set(wx, 0.32, wz);
      tire.castShadow = true;
      carGroup.add(tire);
      const rim = new THREE.Mesh(rimGeo, mats.brushedSteel);
      rim.position.set(wx, 0.32, wz);
      carGroup.add(rim);
    }
  }
  siteGroup.add(carGroup);

  // =========================================================================
  // 4. PROCEDURAL COMPOSITE LANDSCAPING (OLIVE & CYPRESS TREES, INSTANCED)
  // =========================================================================
  const treePositions: [number, number, number, number][] = [
    [-12.2, 0, -9.0, 1.15],
    [-12.5, 0, -4.5, 0.95],
    [-12.4, 0, 1.8, 1.08],
    [-11.8, 0, 7.6, 1.12],
    [-9.5, 0, -10.2, 0.92],
    [-5.0, 0, -10.5, 1.05],
    [4.6, 0, -10.2, 1.15],
    [12.4, 0, -9.8, 1.0],
    [12.6, 0, 3.8, 0.95],
    [12.2, 0, 8.6, 1.1],
    [-14.8, -0.05, 11.4, 1.25],
    [14.5, -0.05, 11.2, 1.2],
    [-16.5, 0.1, -13.0, 1.35],
    [0.5, 0.1, -14.2, 1.3],
    [15.8, 0.05, -13.5, 1.25],
    [-17.2, -0.1, 4.5, 1.18],
    [16.8, -0.08, -2.5, 1.15],
  ];

  const trunkGeo = trackGeo(new THREE.CylinderGeometry(0.11, 0.19, 1.75, 8));
  const crownGeo = trackGeo(new THREE.IcosahedronGeometry(1.15, 1));
  const trunkInst = new THREE.InstancedMesh(trunkGeo, mats.bark, treePositions.length);
  const crownInst = new THREE.InstancedMesh(crownGeo, mats.foliage, treePositions.length * 3);
  trunkInst.castShadow = true;
  trunkInst.receiveShadow = true;
  crownInst.castShadow = true;
  crownInst.receiveShadow = true;

  const dummy = new THREE.Object3D();
  const tintColor = new THREE.Color();
  let crownIdx = 0;

  treePositions.forEach(([tx, ty, tz, s], idx) => {
    // Trunk grounded cleanly at ty
    dummy.position.set(tx, ty + 0.875 * s, tz);
    dummy.rotation.set(0, idx * 1.1, 0);
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    trunkInst.setMatrixAt(idx, dummy.matrix);

    // 3 layered foliage clusters per tree for natural organic silhouette
    const offsets: [number, number, number, number][] = [
      [0, 2.35 * s, 0, 1.05 * s],
      [0.45 * s, 1.95 * s, 0.35 * s, 0.78 * s],
      [-0.42 * s, 2.0 * s, -0.3 * s, 0.82 * s],
    ];
    offsets.forEach(([ox, oy, oz, cs], sub) => {
      dummy.position.set(tx + ox, ty + oy, tz + oz);
      dummy.rotation.set(sub * 0.6, idx * 0.9, sub * 0.4);
      dummy.scale.set(cs, cs * 0.85, cs);
      dummy.updateMatrix();
      crownInst.setMatrixAt(crownIdx, dummy.matrix);
      const shade = 0.88 + ((idx * 7 + sub * 13) % 10) * 0.025;
      tintColor.setRGB(0.36 * shade, 0.51 * shade, 0.3 * shade);
      crownInst.setColorAt(crownIdx, tintColor);
      crownIdx++;
    });
  });
  trunkInst.instanceMatrix.needsUpdate = true;
  crownInst.instanceMatrix.needsUpdate = true;
  if (crownInst.instanceColor) crownInst.instanceColor.needsUpdate = true;
  trunkInst.computeBoundingSphere();
  crownInst.computeBoundingSphere();
  siteGroup.add(trunkInst, crownInst);

  // Ornamental architectural hedge planters near front entry & pool deck
  siteGroup.add(makeBox(4.8, 0.45, 0.65, mats.exteriorWall, -5.2, 0.46, -6.2));
  siteGroup.add(makeBox(4.5, 0.52, 0.46, mats.foliage, -5.2, 0.85, -6.2));
  siteGroup.add(makeBox(3.6, 0.45, 0.65, mats.exteriorWall, 4.2, 0.46, -6.2));
  siteGroup.add(makeBox(3.3, 0.52, 0.46, mats.foliage, 4.2, 0.85, -6.2));

  // =========================================================================
  // 5. GROUND FLOOR GROUP (y = 0.24 to 3.44)
  // =========================================================================
  const gfY = 0.24;
  const gfWallH = 3.16;
  const gfWallMid = gfY + gfWallH / 2;

  // Interior floor slabs (offset +0.02 above terrace plinth to eliminate Z-fighting)
  groundFloorGroup.add(makeBox(7.8, 0.06, 5.1, mats.oakFloor, -3.5, gfY + 0.03, 1.25, false, true)); // Living
  groundFloorGroup.add(makeBox(6.2, 0.06, 8.9, mats.oakFloor, 3.5, gfY + 0.03, -0.65, false, true)); // Kitchen/Dining
  groundFloorGroup.add(makeBox(5.5, 0.06, 3.8, mats.oakFloor, -4.65, gfY + 0.03, -3.2, false, true)); // Studio/Office
  groundFloorGroup.add(makeBox(2.3, 0.06, 3.8, mats.travertine, -0.75, gfY + 0.03, -3.2, false, true)); // Foyer/Stair

  // Exterior structural walls (North, West, East)
  // North back wall with entry door opening and studio window
  groundFloorGroup.add(makeBox(5.4, gfWallH, 0.26, mats.exteriorWall, -4.8, gfWallMid, -5.15));
  groundFloorGroup.add(makeBox(1.8, 0.72, 0.26, mats.exteriorWall, -0.9, gfY + gfWallH - 0.36, -5.15)); // Entry transom header
  groundFloorGroup.add(makeBox(1.6, 2.44, 0.12, mats.darkWalnut, -0.9, gfY + 1.22, -5.15)); // Pivot walnut entry door
  groundFloorGroup.add(makeBox(6.6, gfWallH, 0.26, mats.exteriorWall, 3.4, gfWallMid, -5.15));

  // West exterior wall with cedar accent panel and living room picture window
  groundFloorGroup.add(makeBox(0.26, gfWallH, 3.6, mats.exteriorWall, -7.45, gfWallMid, -3.4));
  groundFloorGroup.add(makeBox(0.26, gfWallH, 1.8, mats.accentCladding, -7.45, gfWallMid, 2.9));
  // West picture window frame + glass
  groundFloorGroup.add(makeBox(0.14, 0.35, 3.6, mats.exteriorWall, -7.45, gfY + 0.18, 0.2));
  groundFloorGroup.add(makeBox(0.14, 0.35, 3.6, mats.exteriorWall, -7.45, gfY + gfWallH - 0.18, 0.2));
  groundFloorGroup.add(makeBox(0.06, 2.48, 3.5, mats.glass, -7.45, gfY + 1.58, 0.2, false, false));

  // East exterior wall (Kitchen + Dining side with cedar slats & glass slider)
  groundFloorGroup.add(makeBox(0.26, gfWallH, 4.4, mats.accentCladding, 6.65, gfWallMid, -3.0));
  groundFloorGroup.add(makeBox(0.26, 0.36, 4.6, mats.exteriorWall, 6.65, gfY + gfWallH - 0.18, 1.5));
  groundFloorGroup.add(makeBox(0.08, 2.8, 4.4, mats.glass, 6.65, gfY + 1.42, 1.5, false, false));
  groundFloorGroup.add(makeBox(0.12, 2.8, 0.12, mats.windowFrame, 6.65, gfY + 1.42, 1.5));
  groundFloorGroup.add(makeBox(0.12, 2.8, 0.12, mats.windowFrame, 6.65, gfY + 1.42, 3.72));

  // South Pavilion Floor-to-Ceiling Glass Wall (x: -7.3 .. 6.6, z = 3.8)
  groundFloorGroup.add(makeBox(14.1, 0.28, 0.24, mats.windowFrame, -0.35, gfY + gfWallH - 0.14, 3.8));
  groundFloorGroup.add(makeBox(14.1, 0.08, 0.18, mats.windowFrame, -0.35, gfY + 0.04, 3.8));
  const southMullionXs = [-7.3, -4.5, -1.7, 1.1, 3.9, 6.6];
  southMullionXs.forEach((mx) => {
    groundFloorGroup.add(makeBox(0.1, gfWallH - 0.1, 0.14, mats.windowFrame, mx, gfWallMid, 3.8));
  });
  const southGlass = makeBox(13.8, gfWallH - 0.36, 0.05, mats.glass, -0.35, gfY + 1.48, 3.8, false, false);
  southGlass.renderOrder = 3;
  groundFloorGroup.add(southGlass);

  // Interior partition walls (Studio/Office separation + Powder room)
  groundFloorGroup.add(makeBox(3.8, gfWallH, 0.16, mats.interiorWall, -5.45, gfWallMid, -1.35));
  groundFloorGroup.add(makeBox(0.16, gfWallH, 3.7, mats.interiorWall, -2.05, gfWallMid, -3.25));
  // Architectural hearth feature wall on West side of Living Room
  groundFloorGroup.add(makeBox(0.45, gfWallH, 2.4, mats.exteriorWall, -7.12, gfWallMid, 0.2));
  groundFloorGroup.add(makeBox(0.5, 0.42, 1.6, mats.matteBlack, -7.08, gfY + 0.65, 0.2));
  groundFloorGroup.add(makeBox(0.52, 0.18, 1.25, mats.warmGlow, -7.06, gfY + 0.62, 0.2, false, false)); // Linear fireplace flame glow

  // --- Living Pavilion Furniture ---
  // Area rug
  groundFloorGroup.add(makeBox(4.4, 0.03, 3.3, mats.rugFabric, -3.7, gfY + 0.08, 1.35, false, true));
  // L-Shaped Sectional Sofa
  const sofa = new THREE.Group();
  sofa.position.set(-3.4, gfY + 0.08, 1.3);
  sofa.add(makeBox(3.1, 0.16, 0.96, mats.darkWalnut, 0, 0.14, -1.05));
  sofa.add(makeBox(3.04, 0.24, 0.92, mats.sofaFabric, 0, 0.34, -1.05));
  sofa.add(makeBox(3.04, 0.46, 0.24, mats.sofaFabric, 0, 0.66, -1.4));
  // Chaise arm
  sofa.add(makeBox(0.98, 0.16, 2.0, mats.darkWalnut, 1.06, 0.14, 0.38));
  sofa.add(makeBox(0.94, 0.24, 1.96, mats.sofaFabric, 1.06, 0.34, 0.38));
  sofa.add(makeBox(0.24, 0.46, 1.9, mats.sofaFabric, 1.42, 0.66, 0.35));
  // Accent pillows
  sofa.add(makeBox(0.42, 0.36, 0.16, mats.accentFabric, -0.95, 0.64, -1.2));
  sofa.add(makeBox(0.42, 0.36, 0.16, mats.accentFabric, 0.72, 0.64, -1.2));
  sofa.add(makeBox(0.16, 0.36, 0.42, mats.accentFabric, 1.22, 0.64, 0.52));
  groundFloorGroup.add(sofa);
  // Sculptural Coffee Table
  groundFloorGroup.add(makeBox(1.45, 0.08, 0.92, mats.darkWalnut, -3.75, gfY + 0.44, 1.55));
  groundFloorGroup.add(makeBox(0.28, 0.34, 0.68, mats.exteriorWall, -4.18, gfY + 0.23, 1.55));
  groundFloorGroup.add(makeBox(0.28, 0.34, 0.68, mats.exteriorWall, -3.32, gfY + 0.23, 1.55));
  // Accent Armchair
  groundFloorGroup.add(makeBox(0.84, 0.38, 0.82, mats.accentFabric, -5.65, gfY + 0.34, 2.35));
  groundFloorGroup.add(makeBox(0.84, 0.36, 0.2, mats.accentFabric, -5.65, gfY + 0.68, 2.68));
  // Floor lamp with warm glow shade
  groundFloorGroup.add(makeBox(0.05, 1.85, 0.05, mats.matteBlack, -5.9, gfY + 0.98, -0.3));
  const lampShade = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.18, 0.24, 0.3, 16)), mats.warmGlow);
  lampShade.position.set(-5.9, gfY + 1.92, -0.3);
  groundFloorGroup.add(lampShade);

  // --- Chef's Kitchen & Dining Furniture ---
  // Rear cabinetry & appliance wall along North wall (x: 0.6 .. 6.2, z = -4.65)
  groundFloorGroup.add(makeBox(5.5, 0.9, 0.68, mats.darkWalnut, 3.4, gfY + 0.48, -4.65));
  groundFloorGroup.add(makeBox(5.52, 0.06, 0.72, mats.marble, 3.4, gfY + 0.96, -4.65));
  groundFloorGroup.add(makeBox(5.5, 0.88, 0.42, mats.oakFloor, 3.4, gfY + 2.35, -4.78));
  // Tall stainless fridge & oven tower
  groundFloorGroup.add(makeBox(1.15, 2.45, 0.74, mats.brushedSteel, 5.65, gfY + 1.28, -4.62));
  // Range hood
  groundFloorGroup.add(makeBox(1.05, 0.65, 0.5, mats.matteBlack, 3.2, gfY + 2.35, -4.72));

  // Waterfall Carrara Marble Island (x: 1.5 .. 4.9, z = -2.35)
  groundFloorGroup.add(makeBox(3.4, 0.92, 1.12, mats.marble, 3.2, gfY + 0.49, -2.35));
  groundFloorGroup.add(makeBox(0.76, 0.05, 0.46, mats.matteBlack, 3.2, gfY + 0.96, -2.35)); // Sink basin
  // 3 Bar Stools on south side of island
  for (const sx of [2.15, 3.2, 4.25]) {
    groundFloorGroup.add(makeBox(0.36, 0.64, 0.36, mats.matteBlack, sx, gfY + 0.35, -1.52));
    groundFloorGroup.add(makeBox(0.42, 0.09, 0.42, mats.accentFabric, sx, gfY + 0.7, -1.52));
  }
  // Linear Brass/Warm Pendant over Kitchen Island
  groundFloorGroup.add(makeBox(2.4, 0.07, 0.09, mats.warmGlow, 3.2, gfY + 2.48, -2.35, false, false));

  // 6-Seat Oak Dining Table (South-East zone)
  groundFloorGroup.add(makeBox(2.6, 0.08, 1.1, mats.oakFloor, 3.4, gfY + 0.78, 1.25));
  groundFloorGroup.add(makeBox(0.12, 0.74, 0.82, mats.matteBlack, 2.45, gfY + 0.4, 1.25));
  groundFloorGroup.add(makeBox(0.12, 0.74, 0.82, mats.matteBlack, 4.35, gfY + 0.4, 1.25));
  for (const dx of [2.6, 3.4, 4.2]) {
    for (const dz of [0.46, 2.04]) {
      groundFloorGroup.add(makeBox(0.46, 0.06, 0.44, mats.sofaFabric, dx, gfY + 0.46, dz));
      groundFloorGroup.add(makeBox(0.42, 0.4, 0.4, mats.darkWalnut, dx, gfY + 0.24, dz));
      groundFloorGroup.add(makeBox(0.46, 0.38, 0.06, mats.darkWalnut, dx, gfY + 0.68, dz + (dz < 1.25 ? -0.2 : 0.2)));
    }
  }

  // --- Garden Studio / Home Office Furniture ---
  groundFloorGroup.add(makeBox(1.85, 0.07, 0.82, mats.darkWalnut, -4.65, gfY + 0.78, -3.55));
  groundFloorGroup.add(makeBox(0.08, 0.74, 0.72, mats.matteBlack, -5.45, gfY + 0.4, -3.55));
  groundFloorGroup.add(makeBox(0.08, 0.74, 0.72, mats.matteBlack, -3.85, gfY + 0.4, -3.55));
  // Office chair
  groundFloorGroup.add(makeBox(0.54, 0.42, 0.52, mats.matteBlack, -4.65, gfY + 0.38, -2.75));
  groundFloorGroup.add(makeBox(0.52, 0.54, 0.08, mats.accentFabric, -4.65, gfY + 0.8, -2.5));
  // Floor-to-ceiling built-in bookshelf along north office wall
  groundFloorGroup.add(makeBox(3.4, 2.6, 0.38, mats.darkWalnut, -4.8, gfY + 1.34, -4.82));

  // --- Architectural Floating Staircase (Foyer to Upper Floor) ---
  const stairSteps = 13;
  for (let i = 0; i < stairSteps; i++) {
    const sy = gfY + 0.26 + i * (3.18 / stairSteps);
    const sz = -1.6 - i * 0.25;
    groundFloorGroup.add(makeBox(1.25, 0.07, 0.28, mats.oakFloor, -1.1, sy, sz));
  }
  // Steel diagonal stringer beam
  const stringer = makeBox(0.12, 0.22, 4.45, mats.matteBlack, -1.1, gfY + 1.75, -3.1);
  stringer.rotation.x = 0.76;
  groundFloorGroup.add(stringer);
  // Glass stair balustrade
  const stairRail = makeBox(0.05, 1.0, 3.6, mats.glass, -0.46, gfY + 2.1, -3.0, false, false);
  stairRail.rotation.x = 0.74;
  groundFloorGroup.add(stairRail);

  // =========================================================================
  // 6. UPPER FLOOR GROUP (y = 3.44 to 6.54) — CANTILEVERED MASSING
  // =========================================================================
  const ufY = 3.44;
  const ufWallH = 3.04;
  const ufWallMid = ufY + ufWallH / 2;

  // Cantilevered structural floor slab + cedar soffit underside
  upperFloorGroup.add(makeBox(14.6, 0.22, 9.8, mats.exteriorWall, -0.9, ufY - 0.11, -0.2));
  upperFloorGroup.add(makeBox(14.4, 0.05, 9.6, mats.soffitWood, -0.9, ufY - 0.23, -0.2, false, true));
  // Upper interior oak floor (offset +0.02 above structural slab)
  upperFloorGroup.add(makeBox(13.8, 0.05, 8.9, mats.oakFloor, -0.9, ufY + 0.03, -0.35, false, true));

  // Private Cantilevered Primary Balcony Deck (South-West overhang)
  upperFloorGroup.add(makeBox(7.2, 0.2, 1.8, mats.travertine, -4.6, ufY - 0.08, 5.35));
  // Frameless glass balcony guardrails
  upperFloorGroup.add(makeBox(7.15, 1.05, 0.06, mats.glass, -4.6, ufY + 0.54, 6.2, false, false));
  upperFloorGroup.add(makeBox(0.06, 1.05, 1.75, mats.glass, -8.15, ufY + 0.54, 5.35, false, false));
  upperFloorGroup.add(makeBox(0.06, 1.05, 1.75, mats.glass, -1.05, ufY + 0.54, 5.35, false, false));
  upperFloorGroup.add(makeBox(7.2, 0.05, 0.08, mats.windowFrame, -4.6, ufY + 1.08, 6.2));

  // Upper Exterior Walls
  upperFloorGroup.add(makeBox(14.4, ufWallH, 0.26, mats.exteriorWall, -0.9, ufWallMid, -5.0)); // North wall
  upperFloorGroup.add(makeBox(0.26, ufWallH, 9.4, mats.exteriorWall, -8.05, ufWallMid, -0.3)); // West wall
  upperFloorGroup.add(makeBox(0.26, ufWallH, 9.4, mats.exteriorWall, 6.25, ufWallMid, -0.3)); // East wall

  // Cedar vertical architectural sun-screen louvers on West & South-East upper facade
  for (let i = 0; i < 9; i++) {
    upperFloorGroup.add(makeBox(0.08, ufWallH - 0.1, 0.22, mats.accentCladding, 3.6 + i * 0.28, ufWallMid, 4.58));
  }

  // Upper South Glass Wall (Primary Suite + Guest Bedroom 2)
  upperFloorGroup.add(makeBox(14.4, 0.26, 0.22, mats.windowFrame, -0.9, ufY + ufWallH - 0.13, 4.45));
  const upperMullions = [-8.0, -5.5, -3.2, -1.1, 1.2, 3.4, 6.2];
  upperMullions.forEach((mx) => {
    upperFloorGroup.add(makeBox(0.1, ufWallH - 0.1, 0.14, mats.windowFrame, mx, ufWallMid, 4.45));
  });
  const upperGlass = makeBox(14.1, ufWallH - 0.34, 0.05, mats.glass, -0.9, ufY + 1.44, 4.45, false, false);
  upperGlass.renderOrder = 3;
  upperFloorGroup.add(upperGlass);

  // Upper Interior Partition Walls
  upperFloorGroup.add(makeBox(0.16, ufWallH, 8.9, mats.interiorWall, -1.25, ufWallMid, -0.35)); // Separates Primary Wing
  upperFloorGroup.add(makeBox(6.6, ufWallH, 0.16, mats.interiorWall, -4.6, ufWallMid, -1.1)); // Primary Bed / Spa Bath divider
  upperFloorGroup.add(makeBox(0.16, ufWallH, 5.2, mats.interiorWall, 1.35, ufWallMid, -2.2)); // Guest Bath / Hall
  upperFloorGroup.add(makeBox(4.8, ufWallH, 0.16, mats.interiorWall, 3.75, ufWallMid, -0.35)); // Bed 2 / Bed 3 divider

  // --- Primary Bedroom Suite Furnishings ---
  upperFloorGroup.add(makeBox(3.6, 0.03, 3.0, mats.rugFabric, -4.75, ufY + 0.06, 1.65, false, true));
  // King platform bed
  upperFloorGroup.add(makeBox(2.2, 0.26, 2.25, mats.darkWalnut, -4.8, ufY + 0.18, 1.25));
  upperFloorGroup.add(makeBox(2.05, 0.28, 2.08, mats.bedLinen, -4.8, ufY + 0.44, 1.25));
  upperFloorGroup.add(makeBox(2.08, 0.12, 1.35, mats.accentFabric, -4.8, ufY + 0.56, 1.62)); // Throw blanket
  upperFloorGroup.add(makeBox(2.45, 1.05, 0.16, mats.darkWalnut, -4.8, ufY + 0.68, 0.12)); // Headboard
  // Pillows
  upperFloorGroup.add(makeBox(0.75, 0.18, 0.42, mats.sofaFabric, -5.3, ufY + 0.64, 0.46));
  upperFloorGroup.add(makeBox(0.75, 0.18, 0.42, mats.sofaFabric, -4.3, ufY + 0.64, 0.46));
  // Twin nightstands + glowing warm lamps
  for (const nx of [-6.35, -3.25]) {
    upperFloorGroup.add(makeBox(0.56, 0.46, 0.46, mats.darkWalnut, nx, ufY + 0.28, 0.45));
    const nLamp = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.12, 0.15, 0.24, 14)), mats.warmGlow);
    nLamp.position.set(nx, ufY + 0.64, 0.45);
    upperFloorGroup.add(nLamp);
  }
  // Balcony lounge chairs
  upperFloorGroup.add(makeBox(0.74, 0.44, 0.74, mats.sofaFabric, -6.2, ufY + 0.28, 5.35));
  upperFloorGroup.add(makeBox(0.74, 0.44, 0.74, mats.sofaFabric, -4.6, ufY + 0.28, 5.35));
  upperFloorGroup.add(makeBox(0.48, 0.36, 0.48, mats.darkWalnut, -5.4, ufY + 0.22, 5.35));

  // --- Primary Spa Bathroom ---
  // Freestanding oval soaking tub
  const tubGeo = trackGeo(new THREE.CylinderGeometry(0.62, 0.52, 0.62, 24));
  tubGeo.scale(1.45, 1, 0.85);
  const tub = new THREE.Mesh(tubGeo, mats.marble);
  tub.position.set(-6.35, ufY + 0.36, -3.35);
  tub.castShadow = true;
  upperFloorGroup.add(tub);
  // Double marble vanity
  upperFloorGroup.add(makeBox(2.4, 0.84, 0.58, mats.darkWalnut, -3.55, ufY + 0.46, -4.55));
  upperFloorGroup.add(makeBox(2.44, 0.07, 0.62, mats.marble, -3.55, ufY + 0.9, -4.55));
  // Glass walk-in shower enclosure
  upperFloorGroup.add(makeBox(0.05, 2.25, 1.75, mats.glass, -2.15, ufY + 1.18, -2.4, false, false));

  // --- Guest Bedrooms 2 & 3 (East Wing) ---
  // Bedroom 2 (South-East)
  upperFloorGroup.add(makeBox(1.72, 0.44, 2.05, mats.bedLinen, 3.85, ufY + 0.28, 2.15));
  upperFloorGroup.add(makeBox(1.9, 0.88, 0.14, mats.darkWalnut, 3.85, ufY + 0.56, 1.1));
  upperFloorGroup.add(makeBox(1.6, 2.35, 0.58, mats.oakFloor, 5.75, ufY + 1.22, 2.2)); // Wardrobe
  // Bedroom 3 (North-East)
  upperFloorGroup.add(makeBox(1.65, 0.44, 2.0, mats.bedLinen, 3.75, ufY + 0.28, -2.85));
  upperFloorGroup.add(makeBox(1.85, 0.88, 0.14, mats.darkWalnut, 3.75, ufY + 0.56, -3.9));
  upperFloorGroup.add(makeBox(1.35, 0.74, 0.62, mats.darkWalnut, 5.35, ufY + 0.42, -1.65)); // Desk

  // =========================================================================
  // 7. ROOF, SKYLIGHT, SUNSET DECK & SOLAR ARRAY (y = 6.54+)
  // =========================================================================
  const rfY = 6.54;
  // Main cantilevered roof slab with deep overhangs
  roofGroup.add(makeBox(15.6, 0.34, 11.2, mats.roofSlab, -0.9, rfY + 0.17, -0.1));
  // Warm cedar soffit under the roof eaves
  roofGroup.add(makeBox(15.4, 0.05, 11.0, mats.soffitWood, -0.9, rfY - 0.02, -0.1, false, true));
  // Dark anodized metal fascia coping trim
  roofGroup.add(makeBox(15.72, 0.14, 11.32, mats.roofTrim, -0.9, rfY + 0.36, -0.1));

  // Stairwell Skylight Frame & Glass
  roofGroup.add(makeBox(2.6, 0.26, 2.2, mats.windowFrame, -0.9, rfY + 0.46, -2.7));
  roofGroup.add(makeBox(2.35, 0.06, 1.95, mats.glass, -0.9, rfY + 0.58, -2.7, false, false));

  // Sunset Rooftop Viewing Deck (West roof half)
  roofGroup.add(makeBox(7.0, 0.08, 6.6, mats.travertine, -4.5, rfY + 0.38, 1.1, false, true));
  // Frameless glass perimeter railings on rooftop deck
  roofGroup.add(makeBox(7.0, 1.0, 0.06, mats.glass, -4.5, rfY + 0.9, 4.4, false, false));
  roofGroup.add(makeBox(0.06, 1.0, 6.6, mats.glass, -8.0, rfY + 0.9, 1.1, false, false));
  roofGroup.add(makeBox(7.0, 0.05, 0.08, mats.windowFrame, -4.5, rfY + 1.42, 4.4));
  roofGroup.add(makeBox(0.08, 0.05, 6.6, mats.windowFrame, -8.0, rfY + 1.42, 1.1));
  // Rooftop lounge sectional & fire-pit table
  roofGroup.add(makeBox(2.8, 0.44, 0.85, mats.sofaFabric, -4.6, rfY + 0.64, -0.7));
  roofGroup.add(makeBox(0.85, 0.44, 2.2, mats.sofaFabric, -6.1, rfY + 0.64, 0.75));
  roofGroup.add(makeBox(1.15, 0.38, 0.88, mats.concrete, -4.4, rfY + 0.6, 1.05));
  roofGroup.add(makeBox(0.65, 0.08, 0.32, mats.warmGlow, -4.4, rfY + 0.81, 1.05, false, false));

  // High-Efficiency 9.6 kW Solar Panel Array (East roof wing)
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 4; col++) {
      const panel = makeBox(1.15, 0.06, 1.85, mats.solarPanel, 1.4 + col * 1.32, rfY + 0.56, -2.5 + row * 2.35);
      panel.rotation.x = 0.22;
      roofGroup.add(panel);
    }
  }

  // =========================================================================
  // 8. WARM ARCHITECTURAL INTERIOR LIGHTING (GLOWS AT GOLDEN HOUR & EVENING)
  // =========================================================================
  const addInteriorLight = (x: number, y: number, z: number, parent: THREE.Group) => {
    const light = new THREE.PointLight(0xffcb8c, 0.0, 14, 1.6);
    light.position.set(x, y, z);
    parent.add(light);
    interiorLights.push(light);
  };
  addInteriorLight(-3.5, gfY + 2.55, 1.2, groundFloorGroup);
  addInteriorLight(3.2, gfY + 2.55, -1.2, groundFloorGroup);
  addInteriorLight(-4.6, ufY + 2.45, 1.2, upperFloorGroup);
  addInteriorLight(3.5, ufY + 2.45, 0.8, upperFloorGroup);

  // =========================================================================
  // 9. 3D ARCHITECTURAL DIMENSION GUIDES (TOGGLEABLE FOR BUYER CLARITY)
  // =========================================================================
  const dimPoints: number[] = [];
  const addDimLine = (x1: number, y1: number, z1: number, x2: number, y2: number, z2: number, tickAxis: 'x' | 'z') => {
    dimPoints.push(x1, y1, z1, x2, y2, z2);
    const t = 0.4;
    if (tickAxis === 'z') {
      dimPoints.push(x1, y1, z1 - t, x1, y1, z1 + t);
      dimPoints.push(x2, y2, z2 - t, x2, y2, z2 + t);
    } else {
      dimPoints.push(x1 - t, y1, z1, x1 + t, y1, z1);
      dimPoints.push(x2 - t, y2, z2, x2 + t, y2, z2);
    }
  };
  // House Width (~47 ft / 14.4 m) along front south edge
  addDimLine(-7.6, 0.34, 4.35, 6.8, 0.34, 4.35, 'z');
  // House Depth (~30 ft / 9.2 m) along west side
  addDimLine(-8.4, 0.34, -5.2, -8.4, 0.34, 3.8, 'x');
  // Pool Length (32 ft / 9.4 m) along south edge
  addDimLine(-6.3, 0.34, 9.65, 3.1, 0.34, 9.65, 'z');
  // Full Estate Plinth Width (~74 ft / 22.4 m)
  addDimLine(-11.6, 0.3, 11.2, 10.8, 0.3, 11.2, 'z');

  const dimGeo = trackGeo(new THREE.BufferGeometry());
  dimGeo.setAttribute('position', new THREE.Float32BufferAttribute(dimPoints, 3));
  const dimMat = new THREE.LineBasicMaterial({
    color: 0xf59e0b,
    transparent: true,
    opacity: 0.9,
  });
  const dimLines = new THREE.LineSegments(dimGeo, dimMat);
  dimensionGuidesGroup.add(dimLines);
  dimensionGuidesGroup.visible = false;

  return {
    root,
    siteGroup,
    groundFloorGroup,
    upperFloorGroup,
    roofGroup,
    dimensionGuidesGroup,
    poolWaterMesh,
    interiorLights,
    dispose: () => {
      for (const g of geometries) {
        g.dispose();
      }
      dimMat.dispose();
    },
  };
}
