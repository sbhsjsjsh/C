import * as THREE from 'three';
import { FINISH_PRESETS, type FinishId } from '../data/propertyData';
import type { ProceduralTextureSet } from './textures';

export interface ArchitecturalMaterials {
  exteriorWall: THREE.MeshStandardMaterial;
  interiorWall: THREE.MeshStandardMaterial;
  accentCladding: THREE.MeshStandardMaterial;
  roofSlab: THREE.MeshStandardMaterial;
  roofTrim: THREE.MeshStandardMaterial;
  soffitWood: THREE.MeshStandardMaterial;
  windowFrame: THREE.MeshStandardMaterial;
  glass: THREE.MeshPhysicalMaterial;
  oakFloor: THREE.MeshStandardMaterial;
  travertine: THREE.MeshStandardMaterial;
  concrete: THREE.MeshStandardMaterial;
  marble: THREE.MeshStandardMaterial;
  poolTile: THREE.MeshStandardMaterial;
  poolWater: THREE.MeshPhysicalMaterial;
  lawn: THREE.MeshStandardMaterial;
  hillside: THREE.MeshStandardMaterial;
  sofaFabric: THREE.MeshStandardMaterial;
  accentFabric: THREE.MeshStandardMaterial;
  rugFabric: THREE.MeshStandardMaterial;
  darkWalnut: THREE.MeshStandardMaterial;
  brushedSteel: THREE.MeshStandardMaterial;
  matteBlack: THREE.MeshStandardMaterial;
  bedLinen: THREE.MeshStandardMaterial;
  warmGlow: THREE.MeshStandardMaterial;
  solarPanel: THREE.MeshStandardMaterial;
  carBody: THREE.MeshPhysicalMaterial;
  carGlass: THREE.MeshPhysicalMaterial;
  tireRubber: THREE.MeshStandardMaterial;
  bark: THREE.MeshStandardMaterial;
  foliage: THREE.MeshStandardMaterial;
  contactShadow: THREE.MeshBasicMaterial;
  applyFinishPreset: (finishId: FinishId) => void;
  setNightGlow: (factor: number) => void;
  dispose: () => void;
}

export function createArchitecturalMaterials(
  textures: ProceduralTextureSet,
  isSoftwareGl: boolean
): ArchitecturalMaterials {
  const tracked: THREE.Material[] = [];
  const track = <T extends THREE.Material>(m: T): T => {
    tracked.push(m);
    return m;
  };

  const exteriorWall = track(
    new THREE.MeshStandardMaterial({
      color: 0xe8e2d8,
      map: textures.limestone,
      roughness: 0.86,
      metalness: 0.02,
    })
  );

  const interiorWall = track(
    new THREE.MeshStandardMaterial({
      color: 0xf4f1eb,
      roughness: 0.88,
      metalness: 0.0,
    })
  );

  const accentCladding = track(
    new THREE.MeshStandardMaterial({
      color: 0xc29768,
      map: textures.cedarSlats,
      roughness: 0.68,
      metalness: 0.04,
    })
  );

  const roofSlab = track(
    new THREE.MeshStandardMaterial({
      color: 0xd6d2c9,
      map: textures.concrete,
      roughness: 0.84,
      metalness: 0.05,
    })
  );

  const roofTrim = track(
    new THREE.MeshStandardMaterial({
      color: 0x33373d,
      roughness: 0.34,
      metalness: 0.78,
    })
  );

  const soffitWood = track(
    new THREE.MeshStandardMaterial({
      color: 0xb98b5c,
      map: textures.oakWood,
      roughness: 0.62,
      metalness: 0.04,
    })
  );

  const windowFrame = track(
    new THREE.MeshStandardMaterial({
      color: 0x26292e,
      roughness: 0.28,
      metalness: 0.82,
    })
  );

  const glass = track(
    new THREE.MeshPhysicalMaterial({
      color: 0xd8ecf4,
      roughness: 0.06,
      metalness: 0.05,
      transmission: isSoftwareGl ? 0 : 0.72,
      transparent: true,
      opacity: isSoftwareGl ? 0.34 : 0.92,
      ior: 1.5,
      thickness: 0.12,
      clearcoat: 0.8,
      clearcoatRoughness: 0.08,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );

  const oakFloor = track(
    new THREE.MeshStandardMaterial({
      color: 0xd9be9e,
      map: textures.oakWood,
      roughness: 0.56,
      metalness: 0.04,
    })
  );

  const travertine = track(
    new THREE.MeshStandardMaterial({
      color: 0xe3dccf,
      map: textures.travertine,
      roughness: 0.76,
      metalness: 0.02,
    })
  );

  const concrete = track(
    new THREE.MeshStandardMaterial({
      color: 0xaab0b6,
      map: textures.concrete,
      roughness: 0.85,
      metalness: 0.05,
    })
  );

  const marble = track(
    new THREE.MeshStandardMaterial({
      color: 0xf7f6f2,
      map: textures.marble,
      roughness: 0.22,
      metalness: 0.04,
    })
  );

  const poolTile = track(
    new THREE.MeshStandardMaterial({
      color: 0x3ea3bd,
      map: textures.poolTile,
      roughness: 0.28,
      metalness: 0.08,
    })
  );

  const poolWater = track(
    new THREE.MeshPhysicalMaterial({
      color: 0x38b6cf,
      roughness: 0.08,
      metalness: 0.05,
      transmission: isSoftwareGl ? 0 : 0.58,
      transparent: true,
      opacity: isSoftwareGl ? 0.74 : 0.86,
      ior: 1.33,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      depthWrite: false,
    })
  );

  const lawn = track(
    new THREE.MeshStandardMaterial({
      color: 0x6b8756,
      map: textures.lawn,
      roughness: 0.95,
      metalness: 0.0,
    })
  );

  const hillside = track(
    new THREE.MeshStandardMaterial({
      color: 0x5c6e4e,
      roughness: 0.96,
      metalness: 0.0,
    })
  );

  const sofaFabric = track(
    new THREE.MeshStandardMaterial({
      color: 0xe5dfd6,
      roughness: 0.94,
      metalness: 0.0,
    })
  );

  const accentFabric = track(
    new THREE.MeshStandardMaterial({
      color: 0xb97546,
      roughness: 0.9,
      metalness: 0.0,
    })
  );

  const rugFabric = track(
    new THREE.MeshStandardMaterial({
      color: 0xd4cec4,
      roughness: 0.96,
      metalness: 0.0,
    })
  );

  const darkWalnut = track(
    new THREE.MeshStandardMaterial({
      color: 0x5a3e2b,
      roughness: 0.54,
      metalness: 0.06,
    })
  );

  const brushedSteel = track(
    new THREE.MeshStandardMaterial({
      color: 0xd0d5dc,
      roughness: 0.24,
      metalness: 0.88,
    })
  );

  const matteBlack = track(
    new THREE.MeshStandardMaterial({
      color: 0x22262c,
      roughness: 0.42,
      metalness: 0.65,
    })
  );

  const bedLinen = track(
    new THREE.MeshStandardMaterial({
      color: 0xf4f2ee,
      roughness: 0.92,
      metalness: 0.0,
    })
  );

  const warmGlow = track(
    new THREE.MeshStandardMaterial({
      color: 0xfff0d4,
      emissive: new THREE.Color(0xffb454),
      emissiveIntensity: 0.45,
      roughness: 0.35,
      metalness: 0.0,
    })
  );

  const solarPanel = track(
    new THREE.MeshStandardMaterial({
      color: 0x162238,
      roughness: 0.18,
      metalness: 0.68,
    })
  );

  const carBody = track(
    new THREE.MeshPhysicalMaterial({
      color: 0xd9dde2,
      roughness: 0.22,
      metalness: 0.65,
      clearcoat: 0.9,
      clearcoatRoughness: 0.12,
    })
  );

  const carGlass = track(
    new THREE.MeshPhysicalMaterial({
      color: 0x1e2936,
      roughness: 0.08,
      metalness: 0.25,
      clearcoat: 1.0,
    })
  );

  const tireRubber = track(
    new THREE.MeshStandardMaterial({
      color: 0x1e2126,
      roughness: 0.88,
      metalness: 0.05,
    })
  );

  const bark = track(
    new THREE.MeshStandardMaterial({
      color: 0x5b4a3a,
      roughness: 0.92,
      metalness: 0.0,
    })
  );

  const foliage = track(
    new THREE.MeshStandardMaterial({
      color: 0x5c7c4a,
      roughness: 0.84,
      metalness: 0.0,
    })
  );

  const contactShadow = track(
    new THREE.MeshBasicMaterial({
      map: textures.contactShadow,
      transparent: true,
      depthWrite: false,
      opacity: 0.48,
    })
  );

  const applyFinishPreset = (finishId: FinishId) => {
    const preset = FINISH_PRESETS.find((p) => p.id === finishId) ?? FINISH_PRESETS[0];
    exteriorWall.color.setHex(preset.exteriorWall);
    accentCladding.color.setHex(preset.accentCladding);
    roofTrim.color.setHex(preset.roofTrim);
    windowFrame.color.setHex(preset.windowFrame);
    soffitWood.color.setHex(preset.woodTone);
  };

  const setNightGlow = (factor: number) => {
    warmGlow.emissiveIntensity = 0.28 + factor * 2.2;
  };

  return {
    exteriorWall,
    interiorWall,
    accentCladding,
    roofSlab,
    roofTrim,
    soffitWood,
    windowFrame,
    glass,
    oakFloor,
    travertine,
    concrete,
    marble,
    poolTile,
    poolWater,
    lawn,
    hillside,
    sofaFabric,
    accentFabric,
    rugFabric,
    darkWalnut,
    brushedSteel,
    matteBlack,
    bedLinen,
    warmGlow,
    solarPanel,
    carBody,
    carGlass,
    tireRubber,
    bark,
    foliage,
    contactShadow,
    applyFinishPreset,
    setNightGlow,
    dispose: () => {
      for (const m of tracked) {
        m.dispose();
      }
    },
  };
}
