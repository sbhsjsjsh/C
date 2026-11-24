import * as THREE from 'three';

export interface ProceduralTextureSet {
  limestone: THREE.CanvasTexture;
  oakWood: THREE.CanvasTexture;
  travertine: THREE.CanvasTexture;
  concrete: THREE.CanvasTexture;
  cedarSlats: THREE.CanvasTexture;
  marble: THREE.CanvasTexture;
  poolTile: THREE.CanvasTexture;
  lawn: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  dispose: () => void;
}

function createCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function configureTexture(
  canvas: HTMLCanvasElement,
  repeatX: number,
  repeatY: number,
  maxAnisotropy: number,
  isColor = true
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = maxAnisotropy;
  if (isColor) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.needsUpdate = true;
  return tex;
}

function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTextureSet {
  const textures: THREE.CanvasTexture[] = [];

  // 1. Architectural Limestone / Stucco
  const [limeCanvas, limeCtx] = createCanvas(512);
  const rand1 = seededRandom(101);
  limeCtx.fillStyle = '#ede8df';
  limeCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 6500; i++) {
    const x = rand1() * 512;
    const y = rand1() * 512;
    const w = 1 + rand1() * 4;
    const shade = Math.floor(220 + rand1() * 26);
    limeCtx.fillStyle = `rgba(${shade}, ${shade - 4}, ${shade - 10}, 0.16)`;
    limeCtx.fillRect(x, y, w, w);
  }
  // Subtle architectural stone joint lines
  limeCtx.strokeStyle = 'rgba(130, 122, 110, 0.14)';
  limeCtx.lineWidth = 1.5;
  for (let y = 0; y < 512; y += 128) {
    limeCtx.beginPath();
    limeCtx.moveTo(0, y);
    limeCtx.lineTo(512, y);
    limeCtx.stroke();
  }
  const limestone = configureTexture(limeCanvas, 3, 2, maxAnisotropy);
  textures.push(limestone);

  // 2. Wide-Plank European Oak Flooring
  const [oakCanvas, oakCtx] = createCanvas(512);
  const rand2 = seededRandom(202);
  oakCtx.fillStyle = '#c49b6c';
  oakCtx.fillRect(0, 0, 512, 512);
  const plankCount = 8;
  const plankH = 512 / plankCount;
  for (let p = 0; p < plankCount; p++) {
    const py = p * plankH;
    const toneShift = (rand2() - 0.5) * 18;
    oakCtx.fillStyle = `rgb(${194 + toneShift}, ${152 + toneShift * 0.8}, ${106 + toneShift * 0.6})`;
    oakCtx.fillRect(0, py, 512, plankH - 1.5);
    // Fine grain lines
    for (let g = 0; g < 38; g++) {
      const gy = py + rand2() * (plankH - 3);
      oakCtx.strokeStyle = `rgba(98, 66, 36, ${0.06 + rand2() * 0.1})`;
      oakCtx.lineWidth = 0.8 + rand2() * 1.4;
      oakCtx.beginPath();
      oakCtx.moveTo(0, gy);
      oakCtx.bezierCurveTo(170, gy + (rand2() - 0.5) * 4, 340, gy + (rand2() - 0.5) * 4, 512, gy);
      oakCtx.stroke();
    }
    // Seam line
    oakCtx.fillStyle = 'rgba(65, 42, 22, 0.28)';
    oakCtx.fillRect(0, py + plankH - 1.5, 512, 1.5);
    // Staggered cross seam
    const crossX = ((p * 173 + 90) % 440) + 36;
    oakCtx.fillRect(crossX, py, 1.5, plankH);
  }
  const oakWood = configureTexture(oakCanvas, 4, 4, maxAnisotropy);
  textures.push(oakWood);

  // 3. Travertine Terrace Pavers
  const [travCanvas, travCtx] = createCanvas(512);
  const rand3 = seededRandom(303);
  travCtx.fillStyle = '#dfd7c8';
  travCtx.fillRect(0, 0, 512, 512);
  const tileW = 128;
  const tileH = 128;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const x = c * tileW;
      const y = r * tileH;
      const delta = (rand3() - 0.5) * 14;
      travCtx.fillStyle = `rgb(${222 + delta}, ${214 + delta}, ${199 + delta})`;
      travCtx.fillRect(x + 2, y + 2, tileW - 4, tileH - 4);
      // Subtle horizontal travertine pores
      for (let k = 0; k < 22; k++) {
        travCtx.fillStyle = `rgba(145, 134, 118, ${0.07 + rand3() * 0.08})`;
        travCtx.fillRect(x + 6 + rand3() * (tileW - 24), y + 4 + rand3() * (tileH - 8), 8 + rand3() * 18, 1.5);
      }
    }
  }
  travCtx.strokeStyle = 'rgba(115, 108, 98, 0.35)';
  travCtx.lineWidth = 2;
  for (let i = 0; i <= 512; i += 128) {
    travCtx.beginPath();
    travCtx.moveTo(i, 0);
    travCtx.lineTo(i, 512);
    travCtx.stroke();
    travCtx.beginPath();
    travCtx.moveTo(0, i);
    travCtx.lineTo(512, i);
    travCtx.stroke();
  }
  const travertine = configureTexture(travCanvas, 6, 6, maxAnisotropy);
  textures.push(travertine);

  // 4. Architectural Concrete
  const [concCanvas, concCtx] = createCanvas(512);
  const rand4 = seededRandom(404);
  concCtx.fillStyle = '#9aa0a6';
  concCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 8000; i++) {
    const x = rand4() * 512;
    const y = rand4() * 512;
    const v = Math.floor(135 + rand4() * 45);
    concCtx.fillStyle = `rgba(${v}, ${v + 2}, ${v + 4}, 0.16)`;
    concCtx.fillRect(x, y, 2.5, 2.5);
  }
  concCtx.strokeStyle = 'rgba(70, 74, 80, 0.22)';
  concCtx.lineWidth = 2;
  concCtx.strokeRect(1, 1, 254, 254);
  concCtx.strokeRect(257, 257, 254, 254);
  const concrete = configureTexture(concCanvas, 4, 4, maxAnisotropy);
  textures.push(concrete);

  // 5. Exterior Cedar Timber Slats
  const [cedarCanvas, cedarCtx] = createCanvas(512);
  const rand5 = seededRandom(505);
  cedarCtx.fillStyle = '#3a2618';
  cedarCtx.fillRect(0, 0, 512, 512);
  const slats = 16;
  const slatW = 512 / slats;
  for (let s = 0; s < slats; s++) {
    const sx = s * slatW;
    const shift = (rand5() - 0.5) * 20;
    cedarCtx.fillStyle = `rgb(${182 + shift}, ${126 + shift * 0.75}, ${78 + shift * 0.5})`;
    cedarCtx.fillRect(sx + 2, 0, slatW - 5, 512);
    for (let g = 0; g < 16; g++) {
      cedarCtx.fillStyle = `rgba(88, 52, 24, ${0.08 + rand5() * 0.1})`;
      cedarCtx.fillRect(sx + 3 + rand5() * (slatW - 8), 0, 1.5, 512);
    }
  }
  const cedarSlats = configureTexture(cedarCanvas, 3, 1, maxAnisotropy);
  textures.push(cedarSlats);

  // 6. Honed Carrara Marble
  const [marbCanvas, marbCtx] = createCanvas(512);
  const rand6 = seededRandom(606);
  marbCtx.fillStyle = '#f4f3ef';
  marbCtx.fillRect(0, 0, 512, 512);
  for (let v = 0; v < 24; v++) {
    marbCtx.strokeStyle = `rgba(148, 152, 160, ${0.08 + rand6() * 0.16})`;
    marbCtx.lineWidth = 1 + rand6() * 3.5;
    marbCtx.beginPath();
    let x = rand6() * 512;
    let y = 0;
    marbCtx.moveTo(x, y);
    for (let step = 0; step < 8; step++) {
      x += (rand6() - 0.42) * 85;
      y += 64;
      marbCtx.lineTo(x, y);
    }
    marbCtx.stroke();
  }
  const marble = configureTexture(marbCanvas, 2, 2, maxAnisotropy);
  textures.push(marble);

  // 7. Pool Mosaic Tile
  const [poolCanvas, poolCtx] = createCanvas(512);
  const rand7 = seededRandom(707);
  poolCtx.fillStyle = '#1b6f86';
  poolCtx.fillRect(0, 0, 512, 512);
  const cell = 32;
  for (let r = 0; r < 16; r++) {
    for (let c = 0; c < 16; c++) {
      const tint = (rand7() - 0.5) * 24;
      poolCtx.fillStyle = `rgb(${26 + tint * 0.4}, ${118 + tint}, ${146 + tint})`;
      poolCtx.fillRect(c * cell + 1.5, r * cell + 1.5, cell - 3, cell - 3);
    }
  }
  const poolTile = configureTexture(poolCanvas, 5, 3, maxAnisotropy);
  textures.push(poolTile);

  // 8. Landscaped Coastal Lawn
  const [lawnCanvas, lawnCtx] = createCanvas(512);
  const rand8 = seededRandom(808);
  lawnCtx.fillStyle = '#557447';
  lawnCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 12000; i++) {
    const x = rand8() * 512;
    const y = rand8() * 512;
    const g = Math.floor(96 + rand8() * 38);
    lawnCtx.fillStyle = `rgba(${Math.floor(g * 0.72)}, ${g}, ${Math.floor(g * 0.58)}, 0.35)`;
    lawnCtx.fillRect(x, y, 2, 4);
  }
  const lawn = configureTexture(lawnCanvas, 18, 18, maxAnisotropy);
  textures.push(lawn);

  // 9. Soft Radial Contact Shadow
  const [shadowCanvas, shadowCtx] = createCanvas(256);
  const grad = shadowCtx.createRadialGradient(128, 128, 14, 128, 128, 124);
  grad.addColorStop(0, 'rgba(10, 14, 20, 0.55)');
  grad.addColorStop(0.55, 'rgba(10, 14, 20, 0.22)');
  grad.addColorStop(1, 'rgba(10, 14, 20, 0.0)');
  shadowCtx.fillStyle = grad;
  shadowCtx.fillRect(0, 0, 256, 256);
  const contactShadow = new THREE.CanvasTexture(shadowCanvas);
  contactShadow.needsUpdate = true;
  textures.push(contactShadow);

  return {
    limestone,
    oakWood,
    travertine,
    concrete,
    cedarSlats,
    marble,
    poolTile,
    lawn,
    contactShadow,
    dispose: () => {
      for (const t of textures) {
        t.dispose();
      }
    },
  };
}
