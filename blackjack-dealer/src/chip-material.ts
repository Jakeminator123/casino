export const CHIP = { radius: 1.55, thickness: 0.25, bevel: 0.055, radialSegments: 128, bevelSegments: 6 } as const;
export const CHIP_VALUES = ['1','5','25','100','500','1000'] as const;
export const CHIP_COLOURS = {
  black: { label: 'Svart', ink: '#17191d' },
  red: { label: 'Röd', ink: '#992e3b' },
  blue: { label: 'Blå', ink: '#24577e' },
  green: { label: 'Grön', ink: '#2c6656' },
  purple: { label: 'Lila', ink: '#65487f' },
} as const;
export const CHIP_PRINT = { paper: '#eeeeee', ink: '#0a0b0d', yellow: '#edce39' } as const;
export type ChipValue = typeof CHIP_VALUES[number];
export type ChipColour = keyof typeof CHIP_COLOURS;
const clamp=(value:number,low:number,high:number)=>Math.min(high,Math.max(low,Number.isFinite(value)?value:low));

/** Eight equal inlays, symmetric on both faces. They never encode side or hidden state. */
export function isChipInlaySegment(segment: number) {
  const index=((segment%CHIP.radialSegments)+CHIP.radialSegments)%CHIP.radialSegments;
  const within=index%(CHIP.radialSegments/8);
  return within<2 || within>=CHIP.radialSegments/8-2;
}

/** One closed revolved surface, with tangent quarter-circle bevels and four material groups. */
export function createChipSurface() {
  const { radius, thickness, bevel, radialSegments, bevelSegments }=CHIP;
  const profile:{radius:number;z:number}[]=[];
  for(let step=0;step<=bevelSegments;step++) {
    const angle=step/bevelSegments*Math.PI/2;
    profile.push({radius:radius-bevel+bevel*Math.sin(angle),z:thickness/2-bevel+bevel*Math.cos(angle)});
  }
  for(let step=0;step<=bevelSegments;step++) {
    const angle=step/bevelSegments*Math.PI/2;
    profile.push({radius:radius-bevel+bevel*Math.cos(angle),z:-thickness/2+bevel-bevel*Math.sin(angle)});
  }
  const positions:number[]=[0,0,thickness/2],uv:number[]=[0.5,0.5];
  for(let ring=0;ring<profile.length;ring++) for(let segment=0;segment<radialSegments;segment++) {
    const angle=segment/radialSegments*Math.PI*2,{radius:r,z}=profile[ring];
    const x=Math.cos(angle)*r,y=Math.sin(angle)*r,u=0.5+x/(radius*2);
    positions.push(x,y,z);
    uv.push(ring===profile.length-1?1-u:u,0.5+y/(radius*2));
  }
  const bottomCentre=positions.length/3;positions.push(0,0,-thickness/2);uv.push(0.5,0.5);
  const indices:number[]=[],groups:{start:number;count:number;materialIndex:number}[]=[];
  const vertex=(ring:number,segment:number)=>1+ring*radialSegments+(segment%radialSegments);
  let start=indices.length;
  for(let segment=0;segment<radialSegments;segment++)indices.push(0,vertex(0,segment),vertex(0,segment+1));
  groups.push({start,count:indices.length-start,materialIndex:0});start=indices.length;
  for(let segment=0;segment<radialSegments;segment++)indices.push(bottomCentre,vertex(profile.length-1,segment+1),vertex(profile.length-1,segment));
  groups.push({start,count:indices.length-start,materialIndex:1});
  for(const inlay of [false,true]) {
    start=indices.length;
    for(let ring=0;ring<profile.length-1;ring++)for(let segment=0;segment<radialSegments;segment++) {
      if(isChipInlaySegment(segment)!==inlay)continue;
      const a=vertex(ring,segment),b=vertex(ring,segment+1),c=vertex(ring+1,segment),d=vertex(ring+1,segment+1);
      indices.push(a,c,b,b,c,d);
    }
    groups.push({start,count:indices.length-start,materialIndex:inlay?3:2});
  }
  return {positions:new Float32Array(positions),uv:new Float32Array(uv),indices:new Uint16Array(indices),groups,profileRings:profile.length};
}

export function chipMaterialParameters(gloss: number) {
  const amount=clamp(gloss,0,1);
  return {color:'#ffffff',roughness:0.64-amount*0.28,metalness:0,clearcoat:0.06+amount*0.3,
    clearcoatRoughness:0.5-amount*0.2,specularIntensity:0.36+amount*0.2,envMapIntensity:0.4,ior:1.48,iridescence:0};
}

function canvas(width:number,height:number) {
  const element=document.createElement('canvas');element.width=width;element.height=height;
  const context=element.getContext('2d');if(!context)throw Error('Canvas 2D saknas.');return {element,context};
}

/** The same flat artwork is used on both faces, with no light or sheen baked in. */
export function createChipPrint(value:ChipValue,colour:ChipColour) {
  if(!CHIP_VALUES.includes(value)||!Object.hasOwn(CHIP_COLOURS,colour))throw Error('Ogiltig valör eller markerfärg.');
  const {element,context:ctx}=canvas(1024,1024);
  ctx.fillStyle=CHIP_COLOURS[colour].ink;ctx.fillRect(0,0,1024,1024);
  ctx.fillStyle=CHIP_PRINT.yellow;
  for(let i=0;i<8;i++) {
    const middle=i*Math.PI/4,half=Math.PI/32;
    ctx.beginPath();ctx.arc(512,512,512,middle-half,middle+half);ctx.arc(512,512,420,middle+half,middle-half,true);ctx.closePath();ctx.fill();
  }
  ctx.strokeStyle=CHIP_PRINT.yellow;ctx.lineWidth=8;ctx.beginPath();ctx.arc(512,512,385,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle=CHIP_PRINT.paper;ctx.beginPath();ctx.arc(512,512,364,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#d2d2d2';ctx.lineWidth=4;ctx.beginPath();ctx.arc(512,512,342,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle=CHIP_PRINT.ink;ctx.beginPath();ctx.roundRect(412,259,200,100,16);ctx.fill();
  ctx.fillStyle=CHIP_PRINT.yellow;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='700 68px "Segoe UI", Arial, sans-serif';ctx.fillText('SG',512,310);
  ctx.fillStyle=CHIP_PRINT.ink;ctx.font=`650 ${value==='1000'?158:210}px "Segoe UI", Arial, sans-serif`;ctx.fillText(value==='1000'?'1 000':value,512,528,590);
  ctx.strokeStyle=CHIP_PRINT.yellow;ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(444,661);ctx.lineTo(580,661);ctx.stroke();
  ctx.font='600 42px "Segoe UI", Arial, sans-serif';ctx.textAlign='left';
  const parts=[['scout',CHIP_PRINT.ink],['/',CHIP_PRINT.yellow],['gaming',CHIP_PRINT.ink]] as const;
  let cursor=512-parts.reduce((sum,[text])=>sum+ctx.measureText(text).width,0)/2;
  for(const [text,ink] of parts){ctx.fillStyle=ink;ctx.fillText(text,cursor,717);cursor+=ctx.measureText(text).width;}
  return element;
}
