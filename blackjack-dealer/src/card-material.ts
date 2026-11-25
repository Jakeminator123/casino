import * as THREE from 'three';

export const CARD = { width: 2.5, height: 3.5, thickness: 0.025, radius: 0.18, columns: 48, rows: 96, maxBend: 0.18 } as const;
export const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'] as const;
export const SUITS = ['spades','hearts','diamonds','clubs'] as const;
export type CardValue = { rank: typeof RANKS[number]; suit: typeof SUITS[number] };
export type CardLightProfile = 'warm' | 'neutral' | 'cool';
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, Number.isFinite(value) ? value : low));

// Scout's scout/gaming wordmark and framed mark are read-only design references.
// The yellow SG treatment is this study's requested adaptation, not an official logo asset.
// Paper stays neutral: light colour belongs to the scene, never the face texture.
export const CARD_PRINT = { paper: '#f2f2f2', ink: '#0a0b0d', red: '#a32635', yellow: '#edce39', line: '#bba335' } as const;
export const CARD_LIGHTS = {
  warm: { key: '#ffe0b2', fill: '#f1e8dc', sky: '#ffedda', ground: '#31312e' },
  neutral: { key: '#ffffff', fill: '#e7edf1', sky: '#f1f2f3', ground: '#2e3231' },
  cool: { key: '#d7e8ff', fill: '#dfeaff', sky: '#e2edff', ground: '#2b3038' },
} as const;

type ColouredLight = { color: InstanceType<typeof THREE.Color> };
export function applyCardLights(profile: CardLightProfile, key: ColouredLight, fill: ColouredLight, hemisphere: ColouredLight & { groundColor: InstanceType<typeof THREE.Color> }) {
  const light=CARD_LIGHTS[profile];
  key.color.set(light.key);fill.color.set(light.fill);hemisphere.color.set(light.sky);hemisphere.groundColor.set(light.ground);
}

export function paperMaterialParameters(gloss: number) {
  const amount = clamp(gloss, 0, 1);
  return { color: '#ffffff', roughness: 0.7 - amount * 0.26, metalness: 0,
    clearcoat: 0.06 + amount * 0.26, clearcoatRoughness: 0.5 - amount * 0.18,
    specularIntensity: 0.3 + amount * 0.22, envMapIntensity: 0.38, ior: 1.46, iridescence: 0 };
}

/** One closed indexed surface: front, back and the connecting paper edge. Units are model units. */
export function createCardSurface(bend = 0) {
  const { width, height, thickness, radius, columns, rows } = CARD;
  const count = (columns + 1) * (rows + 1);
  const positions = new Float32Array(count * 2 * 3), uv = new Float32Array(count * 2 * 2);
  const curvature = clamp(bend, 0, CARD.maxBend) / (height / 2);
  for (let side = 0; side < 2; side++) for (let row = 0; row <= rows; row++) {
    const y = (row / rows - 0.5) * height;
    const cornerY = Math.max(0, Math.abs(y) - (height / 2 - radius));
    const halfWidth = width / 2 - radius + Math.sqrt(Math.max(0, radius * radius - cornerY * cornerY));
    const angle = curvature * y, sine = Math.sin(angle), cosine = Math.cos(angle);
    const centreY = curvature === 0 ? y : sine / curvature;
    const centreZ = curvature === 0 ? 0 : (1 - cosine) / curvature;
    const z = (side === 0 ? 1 : -1) * thickness / 2;
    for (let col = 0; col <= columns; col++) {
      const index = side * count + row * (columns + 1) + col;
      const x = (col / columns * 2 - 1) * halfWidth;
      positions.set([x, centreY - z * sine, centreZ + z * cosine], index * 3);
      const u = (x + width / 2) / width;
      // The reverse is viewed from -Z; mirror its UV, not its readable print.
      uv.set([side === 0 ? u : 1 - u, (y + height / 2) / height], index * 2);
    }
  }
  const indices: number[] = [], groups: { start: number; count: number; materialIndex: number }[] = [];
  for (let side = 0; side < 2; side++) {
    const start = indices.length, offset = side * count;
    for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
      const a = offset + row * (columns + 1) + col, b = a + 1, d = a + columns + 1, c = d + 1;
      indices.push(...(side === 0 ? [a,b,d,b,c,d] : [a,d,b,b,d,c]));
    }
    groups.push({ start, count: indices.length - start, materialIndex: side });
  }
  const perimeter: number[] = [];
  for (let col = 0; col <= columns; col++) perimeter.push(col);
  for (let row = 1; row <= rows; row++) perimeter.push(row * (columns + 1) + columns);
  for (let col = columns - 1; col >= 0; col--) perimeter.push(rows * (columns + 1) + col);
  for (let row = rows - 1; row > 0; row--) perimeter.push(row * (columns + 1));
  const edgeStart = indices.length;
  for (let i = 0; i < perimeter.length; i++) {
    const a = perimeter[i], b = perimeter[(i + 1) % perimeter.length];
    indices.push(a, a + count, b, b, a + count, b + count);
  }
  groups.push({ start: edgeStart, count: indices.length - edgeStart, materialIndex: 2 });
  return { positions, uv, indices: new Uint16Array(indices), groups, faceVertexCount: count };
}

export function createCardGeometry(bend = 0) {
  const data = createCardSurface(bend), geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(data.uv, 2));
  geometry.setIndex(new THREE.BufferAttribute(data.indices, 1));
  for (const group of data.groups) geometry.addGroup(group.start, group.count, group.materialIndex);
  geometry.computeVertexNormals(); geometry.computeBoundingSphere();
  return geometry;
}

export function validateCard(value: CardValue): CardValue {
  if (!value || !RANKS.includes(value.rank) || !SUITS.includes(value.suit)) throw Error('Kortvärdet måste innehålla giltig rank och suit.');
  return { rank: value.rank, suit: value.suit };
}

const suitGlyph = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' } as const;
function canvas(width: number, height: number) {
  const element = document.createElement('canvas'); element.width = width; element.height = height;
  const context = element.getContext('2d'); if (!context) throw Error('Canvas 2D saknas.');
  return { element, context };
}
function drawWordmark(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, ink: string) {
  ctx.font = `600 ${size}px "Segoe UI", Arial, sans-serif`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  const parts = [['scout', ink], ['/', CARD_PRINT.yellow], ['gaming', ink]] as const;
  let cursor = x - parts.reduce((sum, [text]) => sum + ctx.measureText(text).width, 0) / 2;
  for (const [text, colour] of parts) { ctx.fillStyle = colour; ctx.fillText(text, cursor, y); cursor += ctx.measureText(text).width; }
}

/** Flat ink only. Highlights and paper grain are supplied by physical material maps. */
export function createCardPrint(value?: CardValue) {
  const { element, context: ctx } = canvas(750, 1050);
  ctx.fillStyle = value ? CARD_PRINT.paper : CARD_PRINT.ink; ctx.fillRect(0, 0, 750, 1050);
  ctx.strokeStyle = value ? '#c7c7c7' : CARD_PRINT.yellow; ctx.lineWidth = value ? 6 : 8;
  ctx.beginPath(); ctx.roundRect(25, 25, 700, 1000, 38); ctx.stroke();
  if (value) {
    // Short yellow rails give the frame definition without competing with the pips.
    ctx.strokeStyle = CARD_PRINT.line; ctx.lineWidth = 7; ctx.lineCap = 'round';
    for (const x of [39, 711]) { ctx.beginPath(); ctx.moveTo(x, 265); ctx.lineTo(x, 785); ctx.stroke(); }
    const brand = () => {
      ctx.fillStyle = CARD_PRINT.ink; ctx.beginPath(); ctx.roundRect(326, 58, 98, 64, 9); ctx.fill();
      ctx.fillStyle = CARD_PRINT.yellow; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '700 42px "Segoe UI", Arial, sans-serif'; ctx.fillText('SG', 375, 91);
      drawWordmark(ctx, 375, 153, 24, CARD_PRINT.ink);
      ctx.strokeStyle = CARD_PRINT.line; ctx.lineWidth = 6;
      for (const [start,end] of [[209,300],[450,541]]) { ctx.beginPath(); ctx.moveTo(start,91); ctx.lineTo(end,91); ctx.stroke(); }
    };
    brand(); ctx.save(); ctx.translate(750, 1050); ctx.rotate(Math.PI); brand(); ctx.restore();
    const glyph = suitGlyph[value.suit], ink = ['hearts','diamonds'].includes(value.suit) ? CARD_PRINT.red : CARD_PRINT.ink;
    ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const corner = () => { ctx.font = '600 89px Georgia, serif'; ctx.fillText(value.rank, 90, 100); ctx.font = '74px "Segoe UI Symbol", serif'; ctx.fillText(glyph, 90, 184); };
    corner(); ctx.save(); ctx.translate(750,1050); ctx.rotate(Math.PI); corner(); ctx.restore();
    const numeric = Number(value.rank);
    if (value.rank === 'A') { ctx.font = '230px "Segoe UI Symbol", serif'; ctx.fillText(glyph,375,525); }
    else if (Number.isInteger(numeric)) {
      const pips: Record<number, [number,number][]> = {
        2:[[0, -0.7],[0,0.7]],3:[[0,-0.7],[0,0],[0,0.7]],
        4:[[-1,-0.7],[1,-0.7],[-1,0.7],[1,0.7]],
        5:[[-1,-0.7],[1,-0.7],[0,0],[-1,0.7],[1,0.7]],
        6:[[-1,-0.7],[1,-0.7],[-1,0],[1,0],[-1,0.7],[1,0.7]],
        7:[[-1,-0.7],[1,-0.7],[0,-0.35],[-1,0],[1,0],[-1,0.7],[1,0.7]],
        8:[[-1,-0.7],[1,-0.7],[0,-0.35],[-1,0],[1,0],[0,0.35],[-1,0.7],[1,0.7]],
        9:[[-1,-0.75],[1,-0.75],[-1,-0.25],[1,-0.25],[0,0],[-1,0.25],[1,0.25],[-1,0.75],[1,0.75]],
        10:[[-1,-0.75],[1,-0.75],[0,-0.5],[-1,-0.25],[1,-0.25],[-1,0.25],[1,0.25],[0,0.5],[-1,0.75],[1,0.75]],
      };
      ctx.font = '95px "Segoe UI Symbol", serif';
      for (const [x,y] of pips[numeric]) { ctx.save(); ctx.translate(375+x*130,525+y*390); if (y>0) ctx.rotate(Math.PI); ctx.fillText(glyph,0,0); ctx.restore(); }
    } else {
      ctx.strokeStyle = CARD_PRINT.line; ctx.lineWidth = 7; ctx.beginPath(); ctx.roundRect(195,255,360,540,18); ctx.stroke();
      ctx.font = '150px Georgia, serif'; ctx.fillText(value.rank,375,465); ctx.font = '110px "Segoe UI Symbol", serif'; ctx.fillText(glyph,375,625);
    }
  } else {
    ctx.save(); ctx.beginPath(); ctx.roundRect(49,49,652,952,20); ctx.clip();
    ctx.strokeStyle = '#3a3521'; ctx.lineWidth = 4;
    for (let x=-1050;x<1800;x+=54) { ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+1050,1050);ctx.stroke();ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x-1050,1050);ctx.stroke(); }
    ctx.restore(); ctx.strokeStyle=CARD_PRINT.line;ctx.lineWidth=3;ctx.beginPath();ctx.roundRect(49,49,652,952,20);ctx.stroke();
    ctx.fillStyle=CARD_PRINT.ink;ctx.beginPath();ctx.roundRect(142,337,466,376,22);ctx.fill();
    // The bracket motif echoes Scout's framed S mark; SG is a study monogram.
    ctx.strokeStyle=CARD_PRINT.yellow;ctx.lineWidth=9;ctx.lineCap='square';
    for (const [x,y,sx,sy] of [[170,365,1,1],[580,365,-1,1],[580,685,-1,-1],[170,685,1,-1]]) {
      ctx.beginPath();ctx.moveTo(x,y+sy*46);ctx.lineTo(x,y);ctx.lineTo(x+sx*46,y);ctx.stroke();
    }
    ctx.fillStyle=CARD_PRINT.yellow;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='700 166px "Segoe UI", Arial, sans-serif';ctx.fillText('SG',375,490);
    drawWordmark(ctx,375,615,40,CARD_PRINT.paper);
    for (const [y,rotation] of [[178,0],[872,Math.PI]]) {
      ctx.save();ctx.translate(375,y);ctx.rotate(rotation);ctx.fillStyle=CARD_PRINT.yellow;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='43px "Segoe UI Symbol", serif';ctx.fillText('♠  ♥  ♦  ♣',0,0);ctx.restore();
    }
  }
  return element;
}
