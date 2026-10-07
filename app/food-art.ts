// Hand-built SVG food friends. Plain strings so the same art renders in the page
// (with CSS motion: .fi-* classes in globals.css) and on invitation canvases.
export type FoodKind='steamed'|'fried'|'tandoori'|'gravy'|'pizza'|'vadapav'|'noodles'|'chai'|'dalbaati';
const INK='#3b2b24';

function face(cx:number,cy:number,s=1){
  const e=(x:number)=>`<ellipse cx="${x}" cy="${cy}" rx="${3.3*s}" ry="${4.2*s}" fill="${INK}"/><circle cx="${x+1.2*s}" cy="${cy-1.5*s}" r="${1.2*s}" fill="#fff"/>`;
  return `<g class="fi-face">${e(cx-10*s)}${e(cx+10*s)}<path d="M${cx-5.5*s} ${cy+6*s} Q${cx} ${cy+11*s} ${cx+5.5*s} ${cy+6*s}" fill="none" stroke="${INK}" stroke-width="${2.6*s}" stroke-linecap="round"/><ellipse cx="${cx-17*s}" cy="${cy+5*s}" rx="${5*s}" ry="${3*s}" fill="#ff7f96" opacity=".5"/><ellipse cx="${cx+17*s}" cy="${cy+5*s}" rx="${5*s}" ry="${3*s}" fill="#ff7f96" opacity=".5"/></g>`;
}
const defs=(id:string,stops:Record<string,[string,string]>)=>`<defs><filter id="w${id}" x="-8%" y="-8%" width="116%" height="116%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="1.8"/></filter>${Object.entries(stops).map(([k,[a,b]])=>`<linearGradient id="${k}${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`).join('')}</defs>`;
const shadow=`<ellipse cx="60" cy="117" rx="40" ry="4.5" fill="#2a1d14" opacity=".1"/>`;
const steam=(xs:number[],y:number,cls='fi-steam',color='#a9bccd')=>xs.map((x,i)=>`<path class="${cls}" style="animation-delay:${i*.55}s" d="M${x} ${y} q-5 -5 0 -10 t0 -10" fill="none" stroke="${color}" stroke-width="3.2" stroke-linecap="round" opacity=".85"/>`).join('');
const MOMO_BODY='M60 36 C66 40 70 45 76 49 C94 58 106 74 104 92 C102 106 86 113 60 113 C34 113 18 106 16 92 C14 74 26 58 44 49 C50 45 54 40 60 36 Z';
const pleats=(op=.5)=>`<g fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round" opacity="${op}"><path d="M60 39 Q45 50 34 66"/><path d="M60 39 Q51 54 47 68"/><path d="M60 39 Q69 54 73 68"/><path d="M60 39 Q75 50 86 66"/></g>`;
const knot=(fill:string)=>`<path d="M52 41 Q60 25 68 41 Z" fill="${fill}" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>`;

function momo(id:string,kind:'steamed'|'fried'|'tandoori'|'gravy'){
  const fills={steamed:['#fffdf7','#efe2cf'],fried:['#f7c65c','#c8741d'],tandoori:['#f4914a','#c2410c'],gravy:['#fff8f0','#f1d6c6']}[kind] as [string,string];
  let back='',front='',over='';
  if(kind==='steamed')back=steam([46,60,74],30);
  if(kind==='fried'){
    over=[[36,74,3],[44,96,2.6],[78,90,3.2],[86,72,2.4],[66,100,2.2],[52,60,2],[30,88,2],[92,96,2]].map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" fill="#ffe7a3" opacity=".85"/><circle cx="${x+1.2}" cy="${y+1.4}" r="${r*.55}" fill="#a2560f" opacity=".45"/>`).join('')+`<path d="M24 98 Q60 118 96 98" fill="none" stroke="#8a4510" stroke-width="3" opacity=".35"/>`;
    front=[[98,52],[20,58],[104,74]].map(([x,y],i)=>`<path class="fi-twinkle" style="animation-delay:${i*.6}s" d="M${x} ${y-6} L${x+1.6} ${y-1.6} L${x+6} ${y} L${x+1.6} ${y+1.6} L${x} ${y+6} L${x-1.6} ${y+1.6} L${x-6} ${y} L${x-1.6} ${y-1.6} Z" fill="#ffd34d"/>`).join('');
  }
  if(kind==='tandoori'){
    over=`<g stroke="#4f220d" stroke-width="4" stroke-linecap="round" opacity=".55"><path d="M30 76 L44 66"/><path d="M58 104 L80 86"/><path d="M78 64 L90 56"/><path d="M28 98 L38 92"/></g>`+[[40,88],[70,60],[86,82],[52,70],[64,96],[32,66]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="1.6" fill="#7c1d0b" opacity=".6"/>`).join('');
    back=steam([64],32,'fi-smoke','#b7b0a8');
    front=`<ellipse cx="22" cy="112" rx="8" ry="4" fill="none" stroke="#c98bc4" stroke-width="2.6"/><path d="M92 112 A12 12 0 0 1 116 112 Z" fill="#f6dd5b" stroke="${INK}" stroke-width="2"/><path d="M104 112 L104 102 M98 111 L94 104 M110 111 L114 104" stroke="#e9c43b" stroke-width="1.5"/>`;
  }
  if(kind==='gravy'){
    back=`<ellipse class="fi-ripple" cx="60" cy="108" rx="56" ry="12" fill="#c8261d"/><ellipse cx="60" cy="106" rx="44" ry="7" fill="#e2493b" opacity=".7"/>`;
    over=`<path d="M17 94 Q28 104 38 98 Q48 108 60 101 Q72 108 82 98 Q92 104 103 94 L104 100 Q102 108 60 113 Q18 108 16 100 Z" fill="#d23a2c"/><path class="fi-drip" d="M44 101 q2 9 0 11" stroke="#d23a2c" stroke-width="4" stroke-linecap="round"/>`;
    front=[[14,108],[30,114],[90,114],[106,106],[70,118]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="2.4" fill="none" stroke="#5aa33c" stroke-width="1.8"/>`).join('');
  }
  return `${defs(id,{b:fills})}${kind!=='gravy'?shadow:''}${back}<g filter="url(#w${id})"><path d="${MOMO_BODY}" fill="url(#b${id})" stroke="${INK}" stroke-width="2.8" stroke-linejoin="round"/>${knot(fills[0])}${pleats(kind==='steamed'?.45:.35)}</g><path d="M30 66 Q35 56 45 52" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".55"/>${over}${face(60,84)}${front}`;
}

function pizza(id:string){
  const spots=[[26,30],[40,22],[56,19],[74,20],[90,25],[100,32],[33,26],[66,18],[84,22],[48,20]];
  return `${defs(id,{c:['#f3c27c','#d9954a'],s:['#e9452d','#c9301f']})}${shadow}<g filter="url(#w${id})"><path d="M16 36 Q60 20 104 36 L63 110 Q60 116 57 110 Z" fill="#f5d48c" stroke="${INK}" stroke-width="2.8" stroke-linejoin="round"/><path d="M24 40 Q60 28 96 40 L61 102 Q60 104 59 102 Z" fill="url(#s${id})"/><path d="M12 38 Q60 12 108 38 Q110 26 101 21 Q60 4 19 21 Q10 26 12 38 Z" fill="url(#c${id})" stroke="${INK}" stroke-width="2.8" stroke-linejoin="round"/></g>${spots.map(([x,y],i)=>`<ellipse cx="${x}" cy="${y}" rx="${i%3?2.6:3.6}" ry="${i%3?2:2.8}" fill="#4a2410" opacity=".8"/>`).join('')}<path d="M24 26 Q60 12 96 26" fill="none" stroke="#fff3d6" stroke-width="3" stroke-linecap="round" opacity=".6"/>${[[44,48,9,6],[74,52,8,6],[60,82,7,5],[50,66,5,4]].map(([x,y,rx,ry])=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#fffaf0" stroke="#efe3cc" stroke-width="1"/>`).join('')}<g fill="#3e8e3a" stroke="#2b6a29" stroke-width="1"><path d="M30 44 q8 -9 15 -2 q-7 8 -15 2 Z"/><path d="M80 40 q9 -6 14 2 q-9 6 -14 -2 Z"/><path d="M62 92 q6 -8 12 -1 q-6 7 -12 1 Z"/></g>${face(60,62,.9)}<path class="fi-drip" d="M60 110 q-1 6 0 9" stroke="#fff6dc" stroke-width="4" stroke-linecap="round"/>`;
}

function vadapav(id:string){
  return `${defs(id,{t:['#f6c178','#df9443'],v:['#dc9a35','#b8701b']})}${shadow}<g filter="url(#w${id})"><path d="M18 88 Q18 112 60 112 Q102 112 102 88 Z" fill="#e7a95c" stroke="${INK}" stroke-width="2.8" stroke-linejoin="round"/><ellipse cx="60" cy="84" rx="47" ry="13" fill="url(#v${id})" stroke="${INK}" stroke-width="2.6"/><path d="M15 80 Q25 74 35 80 T55 80 T75 80 T95 80 T107 80" fill="none" stroke="#4f9a35" stroke-width="4" stroke-linecap="round"/><g class="fi-bounce"><path d="M14 78 Q14 34 60 32 Q106 34 106 78 Z" fill="url(#t${id})" stroke="${INK}" stroke-width="2.8" stroke-linejoin="round"/></g></g>${[[36,48],[52,42],[72,44],[86,54],[44,60],[78,64]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="1.8" fill="#fff8ea" opacity=".75"/>`).join('')}<path d="M28 58 Q34 44 48 40" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".45"/>${[[38,86],[56,88],[76,86],[66,82],[46,82]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="1.6" fill="#8d4f12" opacity=".6"/>`).join('')}<path d="M98 100 Q114 96 116 80 Q108 92 96 94 Z" fill="#3f8a2a" stroke="${INK}" stroke-width="1.8"/>${face(60,60,.95)}`;
}

function noodles(id:string){
  return `${defs(id,{b:['#ef6a52','#c93d29']})}${shadow}${steam([40,56],38)}<g filter="url(#w${id})"><path d="M22 66 Q30 44 60 44 Q90 44 98 66 Z" fill="#f4cd57" stroke="${INK}" stroke-width="2.4"/>${[0,1,2,3,4].map(i=>`<path d="M${28+i*13} 66 q4 -12 -2 -18 q-4 -4 2 -6" fill="none" stroke="#e0ac2c" stroke-width="2.4" stroke-linecap="round"/>`).join('')}<path d="M16 64 L104 64 Q100 108 60 112 Q20 108 16 64 Z" fill="url(#b${id})" stroke="${INK}" stroke-width="2.8" stroke-linejoin="round"/><path d="M20 74 L100 74" stroke="#fff3e6" stroke-width="3" stroke-dasharray="6 5" opacity=".8"/></g><circle cx="44" cy="56" r="3" fill="#57a23d"/><circle cx="70" cy="54" r="3" fill="#ff8b3d"/><circle cx="56" cy="52" r="2.4" fill="#57a23d"/><g class="fi-lift"><path d="M74 58 L112 14" stroke="#a0622d" stroke-width="4" stroke-linecap="round"/><path d="M80 60 L116 22" stroke="#8a5124" stroke-width="4" stroke-linecap="round"/><path d="M84 46 q-6 8 0 14 q6 6 0 12" fill="none" stroke="#f0c13c" stroke-width="3" stroke-linecap="round"/></g>${face(60,90,.9)}`;
}

function chai(id:string){
  return `${defs(id,{t:['#dca36a','#a4612c']})}${shadow}${steam([50,62],30)}<path class="fi-heart" d="M56 14 c-4 -6 -12 -1 -6 6 l6 6 l6 -6 c6 -7 -2 -12 -6 -6 Z" fill="#ff8fa3" opacity=".9"/><g filter="url(#w${id})"><path d="M34 40 L86 40 L79 110 Q60 115 41 110 Z" fill="#eef6f7" stroke="${INK}" stroke-width="2.8" stroke-linejoin="round"/><path d="M37 54 L83 54 L78.5 106 Q60 110 41.5 106 Z" fill="url(#t${id})"/><ellipse cx="60" cy="54" rx="23" ry="4" fill="#ecc791"/></g><g stroke="#ffffff" stroke-width="2" opacity=".55">${[44,52,68,76].map(x=>`<path d="M${x} 44 L${x+(x<60?1:-1)} 104"/>`).join('')}</g><g transform="rotate(18 96 92)"><rect x="86" y="66" width="20" height="44" rx="5" fill="#e3ad57" stroke="${INK}" stroke-width="2"/>${[0,1,2,3].map(i=>`<circle cx="${92+(i%2)*8}" cy="${76+i*8}" r="1.6" fill="#a8702b"/>`).join('')}</g>${face(60,80,.9)}`;
}

function dalbaati(id:string){
  const ball=(x:number,y:number,r:number)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="url(#g${id})" stroke="${INK}" stroke-width="2.6"/><path d="M${x-r*.5} ${y-r*.4} l${r*.35} ${r*.25} l${r*.3} -${r*.3}" fill="none" stroke="#8a4d13" stroke-width="2" stroke-linecap="round" opacity=".7"/>`;
  return `${defs(id,{g:['#f0b75a','#c97d26'],d:['#f7cf3d','#e2a91d']})}${shadow}<g filter="url(#w${id})">${ball(32,62,17)}${ball(88,62,17)}${ball(60,52,22)}<path d="M22 84 L98 84 Q94 112 60 113 Q26 112 22 84 Z" fill="#c9ced6" stroke="${INK}" stroke-width="2.8" stroke-linejoin="round"/><ellipse cx="60" cy="84" rx="38" ry="8" fill="url(#d${id})" stroke="${INK}" stroke-width="2.4"/></g>${[[50,83],[64,85],[72,82],[56,86]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="1.7" fill="#c0391f"/>`).join('')}<path d="M30 92 L90 92" stroke="#fff" stroke-width="2.4" opacity=".5"/><path class="fi-twinkle" d="M50 36 l2 5 l5 2 l-5 2 l-2 5 l-2 -5 l-5 -2 l5 -2 Z" fill="#fff6c4"/><path class="fi-twinkle" style="animation-delay:.8s" d="M92 48 l1.5 3.5 l3.5 1.5 l-3.5 1.5 l-1.5 3.5 l-1.5 -3.5 l-3.5 -1.5 l3.5 -1.5 Z" fill="#fff6c4"/>${face(60,54,.8)}<g opacity=".95">${face(60,100,.55)}</g>`;
}

export function foodSvg(kind:FoodKind,id='x'){
  const body=kind==='pizza'?pizza(id):kind==='vadapav'?vadapav(id):kind==='noodles'?noodles(id):kind==='chai'?chai(id):kind==='dalbaati'?dalbaati(id):momo(id,kind);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 124 124" role="img" aria-hidden="true">${body}</svg>`;
}
