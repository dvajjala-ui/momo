import {FoodTheme,themeKinds} from './brand';
import {foodSvg,FoodKind} from './food-art';
export type LetterStyle='hero'|'princess'|'notebook';
export const LETTER_STYLES:{id:LetterStyle,name:string,note:string}[]=[
  {id:'hero',name:'Hero post',note:'night sky, cape & the Momo-signal'},
  {id:'princess',name:'Princess post',note:'pink, glitter, tiara & a wax seal'},
  {id:'notebook',name:'Notebook post',note:'crayon, ruled paper & the food gang'},
];
const W=1080,H=1350;
type Ctx=CanvasRenderingContext2D;

async function fonts(){try{await Promise.all(['700 40px Caveat','40px Bangers','40px "Great Vibes"','700 40px Nunito','900 40px Nunito','40px "Archivo Black"'].map(f=>document.fonts.load(f)))}catch{}}
function rng(seed:number){return()=>{seed=seed*16807%2147483647;return (seed-1)/2147483646}}
async function icon(kind:FoodKind,id:string){const img=new Image();img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(foodSvg(kind,id));await img.decode();return img}
function silhouette(img:HTMLImageElement,size:number,color:string){const c=document.createElement('canvas');c.width=c.height=size;const x=c.getContext('2d')!;x.drawImage(img,0,0,size,size);x.globalCompositeOperation='source-in';x.fillStyle=color;x.fillRect(0,0,size,size);return c}
function wrap(ctx:Ctx,text:string,x:number,y:number,max:number,line:number){const words=text.split(' ');let row='';for(const word of words){const test=row+word+' ';if(ctx.measureText(test).width>max&&row){ctx.fillText(row.trim(),x,y);y+=line;row=word+' '}else row=test}ctx.fillText(row.trim(),x,y);return y+line}
function star(ctx:Ctx,x:number,y:number,r:number,points=4,inner=.35){ctx.beginPath();for(let i=0;i<points*2;i++){const a=Math.PI*i/points-Math.PI/2,rr=i%2?r*inner:r;ctx.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr)}ctx.closePath()}
function details(event?:any){return event?[event.title,new Date(event.date).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',dateStyle:'medium',timeStyle:'short'})+' IST',event.venue,'Full cost: '+event.cost]:['Ahmedabad · our first table is taking shape','Date, public venue & full cost come first.','You decide after that. No pressure.']}
function detailLines(ctx:Ctx,text:string,width:number){
  const lines:string[]=[];let line='';
  for(const word of text.trim().split(/\s+/)){
    if(!word)continue;
    const next=line?line+' '+word:word;
    if(ctx.measureText(next).width<=width){line=next;continue}
    if(line){lines.push(line);line=''}
    if(ctx.measureText(word).width<=width){line=word;continue}
    for(const letter of Array.from(word)){
      if(line&&ctx.measureText(line+letter).width>width){lines.push(line);line=''}
      line+=letter;
    }
  }
  if(line)lines.push(line);
  return lines;
}
function drawDetails(ctx:Ctx,event:any,x:number,top:number,bottom:number,width:number){
  const items=details(event);let lines:string[]=[],lineHeight=0;
  for(let size=34;size>=18;size--){
    ctx.font=`700 ${size}px Nunito`;lineHeight=Math.ceil(size*1.3);
    lines=items.flatMap(item=>detailLines(ctx,item,width));
    if(top+(lines.length-1)*lineHeight<=bottom)break;
  }
  const capacity=Math.floor((bottom-top)/lineHeight)+1;
  if(lines.length>capacity){
    throw new Error('This plan is too long for the postcard. Shorten its title, venue or cost before exporting.');
  }
  lines.forEach((line,i)=>ctx.fillText(line,x,top+i*lineHeight));
}
const fine='18+ · public venue · full cost before you decide · leave anytime';

async function hero(ctx:Ctx,theme:FoodTheme,event?:any){
  const r=rng(7);
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#0a1433');g.addColorStop(.55,'#1a2d6b');g.addColorStop(1,'#2b4aa3');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  for(let i=0;i<140;i++){ctx.fillStyle=`rgba(255,255,255,${.25+r()*.6})`;ctx.beginPath();ctx.arc(r()*W,r()*H*.55,r()*2.2+.4,0,7);ctx.fill()}
  // Halftone dots, comic-book style
  ctx.fillStyle='rgba(255,255,255,.05)';for(let y=0;y<H;y+=22)for(let x=(y/22)%2?11:0;x<W;x+=22){ctx.beginPath();ctx.arc(x,y,3,0,7);ctx.fill()}
  // The Momo-signal: a searchlight beam and our own emblem in the clouds
  const sx=560,sy=275;const beam=ctx.createLinearGradient(140,H,sx,sy);beam.addColorStop(0,'rgba(255,236,160,.05)');beam.addColorStop(1,'rgba(255,236,160,.42)');ctx.fillStyle=beam;ctx.beginPath();ctx.moveTo(110,H);ctx.lineTo(200,H);ctx.lineTo(sx+190,sy+60);ctx.lineTo(sx-190,sy-60);ctx.closePath();ctx.fill();
  ctx.save();ctx.shadowColor='rgba(255,240,170,.9)';ctx.shadowBlur=60;ctx.fillStyle='#fff3b5';ctx.beginPath();ctx.ellipse(sx,sy,215,135,-.08,0,7);ctx.fill();ctx.restore();
  ctx.strokeStyle='rgba(10,20,51,.35)';ctx.lineWidth=6;ctx.beginPath();ctx.ellipse(sx,sy,200,122,-.08,0,7);ctx.stroke();
  const main=await icon(themeKinds(theme)[0],'hs');ctx.drawImage(silhouette(main,230,'#0d1736'),sx-115,sy-125,230,230);
  ctx.textAlign='center';ctx.fillStyle='rgba(255,255,255,.75)';ctx.font='700 24px Nunito';ctx.fillText('MOMO HERO POST · FOR YOUR EYES ONLY',W/2,70);
  // Title
  ctx.save();ctx.translate(W/2,585);ctx.rotate(-.04);ctx.lineJoin='round';
  for(const [text,size,y] of [['CALLING ALL',96,-70],['HEROES!',168,80]] as [string,number,number][]){ctx.font=`${size}px Bangers`;ctx.fillStyle='#0a1433';ctx.fillText(text,8,y+10);ctx.strokeStyle='#d7263d';ctx.lineWidth=18;ctx.strokeText(text,0,y);ctx.fillStyle='#ffd23f';ctx.fillText(text,0,y)}
  ctx.restore();
  ctx.fillStyle='#fff';ctx.font='900 40px Nunito';ctx.fillText('Your gang needs you this weekend.',W/2,745);
  // Comic panel with the mission
  ctx.save();ctx.translate(W/2,950);ctx.rotate(.012);ctx.fillStyle='#fffdf2';ctx.strokeStyle='#0a1433';ctx.lineWidth=8;ctx.beginPath();ctx.roundRect(-440,-180,880,365,18);ctx.fill();ctx.stroke();
  ctx.textAlign='left';ctx.fillStyle='#d7263d';ctx.font='54px Bangers';ctx.fillText(event?'THE MISSION:':'MISSION LOADING…',-395,-113);ctx.fillStyle='#1b1b2f';drawDetails(ctx,event,-395,-72,160,790);ctx.restore();
  // Lightning emblem + POW burst
  ctx.save();ctx.translate(140,165);ctx.fillStyle='#d7263d';ctx.strokeStyle='#ffd23f';ctx.lineWidth=8;ctx.beginPath();ctx.arc(0,0,74,0,7);ctx.fill();ctx.stroke();ctx.fillStyle='#ffd23f';ctx.beginPath();ctx.moveTo(14,-52);ctx.lineTo(-28,8);ctx.lineTo(-2,8);ctx.lineTo(-16,54);ctx.lineTo(30,-10);ctx.lineTo(4,-10);ctx.closePath();ctx.fill();ctx.restore();
  ctx.save();ctx.translate(940,170);ctx.rotate(.18);star(ctx,0,0,104,12,.62);ctx.fillStyle='#ffd23f';ctx.fill();ctx.strokeStyle='#d7263d';ctx.lineWidth=7;ctx.stroke();ctx.fillStyle='#d7263d';ctx.font='62px Bangers';ctx.textAlign='center';ctx.fillText('POW!',0,20);ctx.restore();
  // Skyline
  const r2=rng(3);ctx.fillStyle='#070e26';let x=0;while(x<W){const w=60+r2()*90,h=90+r2()*170;ctx.fillRect(x,H-h,w,h);ctx.fillStyle='rgba(255,214,90,.75)';for(let wy=H-h+18;wy<H-20;wy+=30)for(let wx=x+12;wx<x+w-12;wx+=24)if(r2()>.55)ctx.fillRect(wx,wy,9,13);ctx.fillStyle='#070e26';x+=w+4}
  ctx.fillStyle='rgba(7,14,38,.82)';ctx.fillRect(0,1160,W,190);ctx.textAlign='center';ctx.fillStyle='#ffd23f';ctx.font='54px Bangers';ctx.fillText('MAKE A WISH. WE’LL GET YOUR GANG READY.',W/2,1215);ctx.fillStyle='rgba(255,255,255,.85)';ctx.font='700 25px Nunito';ctx.fillText(fine,W/2,1270);
}

async function princess(ctx:Ctx,theme:FoodTheme,event?:any){
  const r=rng(11);
  const g=ctx.createLinearGradient(0,0,W,H);g.addColorStop(0,'#ffe6f3');g.addColorStop(.5,'#fcc6e2');g.addColorStop(1,'#e6d2ff');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  // Castle silhouette
  ctx.fillStyle='rgba(176,120,214,.35)';const towers=[[120,980,90,260],[260,900,110,340],[430,820,220,420],[690,900,110,340],[840,980,90,260]];for(const [tx,ty,tw,th] of towers){ctx.fillStyle='rgba(176,120,214,.35)';ctx.fillRect(tx,ty,tw,th);for(let bx=tx;bx<tx+tw;bx+=tw/4)ctx.fillRect(bx,ty-18,tw/8,18);ctx.beginPath();ctx.moveTo(tx-16,ty-18);ctx.lineTo(tx+tw/2,ty-100);ctx.lineTo(tx+tw+16,ty-18);ctx.fill();ctx.fillStyle='rgba(255,255,255,.55)';ctx.beginPath();ctx.roundRect(tx+tw/2-12,ty+40,24,40,[12,12,0,0]);ctx.fill();ctx.strokeStyle='rgba(176,120,214,.5)';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(tx+tw/2,ty-100);ctx.lineTo(tx+tw/2,ty-135);ctx.stroke();ctx.fillStyle='rgba(255,111,170,.55)';ctx.beginPath();ctx.moveTo(tx+tw/2,ty-135);ctx.lineTo(tx+tw/2+26,ty-126);ctx.lineTo(tx+tw/2,ty-117);ctx.fill()}
  // Glitter
  const cols=['#ffffff','#ffd6ec','#ffe9a8','#f7a8d0','#d9c2ff'];for(let i=0;i<320;i++){ctx.fillStyle=cols[i%5];ctx.globalAlpha=.4+r()*.6;ctx.beginPath();ctx.arc(r()*W,r()*H,r()*3+.6,0,7);ctx.fill()}ctx.globalAlpha=1;
  for(let i=0;i<34;i++){star(ctx,r()*W,r()*H,8+r()*16);ctx.fillStyle=r()>.5?'#fff':'#ffe08a';ctx.fill()}
  // Scalloped frame
  ctx.strokeStyle='#e46aa8';ctx.lineWidth=4;ctx.setLineDash([2,14]);ctx.lineCap='round';ctx.strokeRect(48,48,W-96,H-96);ctx.setLineDash([]);ctx.strokeStyle='rgba(228,106,168,.5)';ctx.lineWidth=2;ctx.strokeRect(66,66,W-132,H-132);
  // Tiara
  ctx.save();ctx.translate(W/2,210);const gold=ctx.createLinearGradient(0,-110,0,40);gold.addColorStop(0,'#fff1a8');gold.addColorStop(1,'#d9a520');ctx.fillStyle=gold;ctx.strokeStyle='#a8740c';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-190,30);ctx.lineTo(-170,-40);ctx.lineTo(-110,10);ctx.lineTo(-60,-80);ctx.lineTo(-22,-20);ctx.lineTo(0,-118);ctx.lineTo(22,-20);ctx.lineTo(60,-80);ctx.lineTo(110,10);ctx.lineTo(170,-40);ctx.lineTo(190,30);ctx.quadraticCurveTo(0,70,-190,30);ctx.closePath();ctx.fill();ctx.stroke();
  for(const [gx,gy,c,s] of [[0,-60,'#ff5fa2',22],[-60,-30,'#7ec8ff',14],[60,-30,'#7ec8ff',14],[-140,0,'#ff5fa2',11],[140,0,'#ff5fa2',11]] as [number,number,string,number][]){ctx.fillStyle=c;ctx.beginPath();ctx.arc(gx,gy,s,0,7);ctx.fill();ctx.fillStyle='rgba(255,255,255,.8)';ctx.beginPath();ctx.arc(gx-s*.35,gy-s*.35,s*.3,0,7);ctx.fill()}
  ctx.restore();
  ctx.textAlign='center';ctx.fillStyle='#a8276a';ctx.font='118px "Great Vibes"';ctx.fillText('You’re royally invited',W/2,385);
  ctx.fillStyle='#6b2a52';ctx.font='italic 700 36px Nunito';ctx.fillText('The palace (a cosy café) requests your presence.',W/2,455);
  ctx.fillStyle='rgba(255,255,255,.86)';ctx.strokeStyle='#e46aa8';ctx.lineWidth=4;ctx.beginPath();ctx.roundRect(120,485,840,400,36);ctx.fill();ctx.stroke();
  ctx.fillStyle='#a8276a';ctx.font='64px "Great Vibes"';ctx.fillText(event?'The royal plan':'A little preview',W/2,555);ctx.fillStyle='#4a2440';drawDetails(ctx,event,W/2,610,855,740);
  // Wax seal
  ctx.save();ctx.translate(W/2,960);ctx.fillStyle='#d94c8a';ctx.beginPath();for(let i=0;i<18;i++){const a=i/18*Math.PI*2,rr=i%2?82:92;ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr)}ctx.closePath();ctx.fill();ctx.strokeStyle='#f39bc2';ctx.lineWidth=5;ctx.beginPath();ctx.arc(0,0,60,0,7);ctx.stroke();ctx.fillStyle='#f6b3d1';ctx.beginPath();ctx.moveTo(0,30);ctx.bezierCurveTo(-55,-5,-30,-50,0,-22);ctx.bezierCurveTo(30,-50,55,-5,0,30);ctx.fill();ctx.restore();
  const kinds=themeKinds(theme);const a=await icon(kinds[0],'pa'),b=await icon(kinds[1],'pb');ctx.drawImage(a,250,880,170,170);ctx.drawImage(b,660,880,170,170);
  ctx.fillStyle='#a8276a';ctx.font='80px "Great Vibes"';ctx.fillText('Come and be found.',W/2,1170);ctx.fillStyle='#6b2a52';ctx.font='700 25px Nunito';ctx.fillText(fine,W/2,1240);
}

async function notebook(ctx:Ctx,theme:FoodTheme,event?:any){
  ctx.fillStyle='#fff8dc';ctx.fillRect(0,0,W,H);ctx.strokeStyle='rgba(70,110,200,.22)';ctx.lineWidth=2;for(let y=170;y<H;y+=56){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}ctx.strokeStyle='rgba(220,70,70,.45)';ctx.beginPath();ctx.moveTo(118,0);ctx.lineTo(118,H);ctx.stroke();
  ctx.fillStyle='rgba(172,202,208,.75)';ctx.save();ctx.translate(W/2,40);ctx.rotate(-.05);ctx.fillRect(-90,-22,180,48);ctx.restore();
  const blue=theme==='momo'?'#2448ce':'#bc421c';
  ctx.textAlign='left';ctx.fillStyle='#4a4a4a';ctx.font='700 24px Nunito';ctx.fillText(theme==='momo'?'A NOTE FROM MOMO':'A NOTE FROM THE WHOLE MENU',150,130);
  ctx.fillStyle='#282c33';ctx.font='700 104px Caveat';ctx.fillText('Dear you,',150,265);ctx.fillStyle=blue;ctx.font='700 130px Caveat';ctx.fillText('got plans?',150,385);
  ctx.fillStyle='#282c33';ctx.font='700 46px Caveat';['Come eat something good.','Stay for one more game.','Leave with a small story.'].forEach((t,i)=>ctx.fillText(t,150,480+i*56));
  ctx.setLineDash([12,10]);ctx.strokeStyle=blue;ctx.lineWidth=4;ctx.strokeRect(140,620,800,320);ctx.setLineDash([]);ctx.fillStyle='#282c33';drawDetails(ctx,event,170,675,915,740);
  ctx.save();ctx.translate(880,180);ctx.rotate(.2);ctx.setLineDash([8,6]);ctx.strokeStyle=blue;ctx.lineWidth=4;ctx.strokeRect(-80,-70,160,140);ctx.setLineDash([]);ctx.fillStyle=blue;ctx.font='700 22px Nunito';ctx.textAlign='center';ctx.fillText('REAL LIFE',0,-15);ctx.fillText('POST',0,15);ctx.font='40px Nunito';ctx.fillText('✳',0,58);ctx.restore();
  const kinds=themeKinds(theme);const size=Math.min(190,860/kinds.length);for(let i=0;i<kinds.length;i++){const img=await icon(kinds[i],'n'+i);ctx.drawImage(img,110+i*(860/kinds.length)+(860/kinds.length-size)/2,960,size,size)}
  ctx.textAlign='center';ctx.fillStyle=blue;ctx.font='700 56px Caveat';ctx.fillText('Make a wish. We’ll get your gang ready.',W/2,1220);ctx.fillStyle='#4a4a4a';ctx.font='700 25px Nunito';ctx.fillText(fine,W/2,1275);
}

export async function renderLetter(style:LetterStyle,theme:FoodTheme,event?:any){await fonts();const c=document.createElement('canvas');c.width=W;c.height=H;const ctx=c.getContext('2d');if(!ctx)throw Error('Your browser cannot draw this postcard.');await (style==='hero'?hero:style==='princess'?princess:notebook)(ctx,theme,event);return c}
export async function saveCanvas(c:HTMLCanvasElement,name:string){const blob=await new Promise<Blob|null>(r=>c.toBlob(r,'image/png'));if(!blob)throw Error('Could not export the image.');const a=document.createElement('a');const url=URL.createObjectURL(blob);a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000)}
export async function downloadInvitation(theme:FoodTheme,event?:any,style:LetterStyle='notebook'){await saveCanvas(await renderLetter(style,theme,event),`momo-${style}-invitation.png`)}

// "This is who's coming on Saturday" — a member badge made entirely in the browser.
export async function renderBadge({name,role,photo,kind}:{name:string,role:string,photo?:string|null,kind:FoodKind}){
  await fonts();const c=document.createElement('canvas');c.width=W;c.height=H;const ctx=c.getContext('2d')!;
  ctx.fillStyle='#ecebe7';ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#9a9ea5';ctx.beginPath();ctx.roundRect(470,0,140,150,20);ctx.fill();ctx.fillStyle='#c9ccd1';ctx.beginPath();ctx.roundRect(490,90,100,110,14);ctx.fill();ctx.fillStyle='#ecebe7';ctx.beginPath();ctx.roundRect(515,120,50,40,8);ctx.fill();
  ctx.save();ctx.shadowColor='rgba(0,0,0,.12)';ctx.shadowBlur=30;ctx.shadowOffsetY=14;ctx.fillStyle='rgba(255,255,255,.55)';ctx.beginPath();ctx.roundRect(140,190,800,1080,34);ctx.fill();ctx.restore();ctx.strokeStyle='rgba(160,170,180,.6)';ctx.lineWidth=3;ctx.beginPath();ctx.roundRect(140,190,800,1080,34);ctx.stroke();
  ctx.fillStyle='#fff';ctx.fillRect(190,270,700,950);ctx.fillStyle='#d9dbe0';ctx.beginPath();ctx.arc(250,232,10,0,7);ctx.fill();
  ctx.fillStyle='#111';ctx.textAlign='left';ctx.font='84px "Archivo Black"';['THIS IS WHO’S','COMING ON','SATURDAY'].forEach((t,i)=>ctx.fillText(t,225,375+i*84));
  const px=360,py=600,ps=360;if(photo){const img=new Image();img.src=photo;await img.decode();const s=Math.min(img.width,img.height);ctx.drawImage(img,(img.width-s)/2,(img.height-s)/2,s,s,px,py,ps,ps)}else{const bg=ctx.createLinearGradient(px,py,px+ps,py+ps);bg.addColorStop(0,'#ffe9a6');bg.addColorStop(1,'#ffc6dd');ctx.fillStyle=bg;ctx.fillRect(px,py,ps,ps);ctx.drawImage(await icon(kind,'bd'),px+30,py+30,ps-60,ps-60)}
  ctx.strokeStyle='#e5e5e5';ctx.lineWidth=2;ctx.strokeRect(px,py,ps,ps);
  ctx.fillStyle='#555';ctx.font='700 24px Nunito';ctx.fillText('NAME',225,1040);ctx.fillText('OCCUPATION',225,1130);
  ctx.setLineDash([10,8]);ctx.strokeStyle='#b5b5b5';ctx.beginPath();ctx.moveTo(320,1050);ctx.lineTo(850,1050);ctx.moveTo(400,1140);ctx.lineTo(850,1140);ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle='#1a1a1a';ctx.font='700 60px Caveat';ctx.fillText(name.slice(0,22),340,1035);ctx.font='700 50px Caveat';wrap(ctx,role.slice(0,40),420,1125,440,50);
  ctx.textAlign='right';ctx.fillStyle='#777';ctx.font='700 26px Nunito';ctx.fillText('momo ✳ weekend club',1030,1320);
  return c;
}
