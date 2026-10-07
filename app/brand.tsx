'use client';
import {createContext,useContext,useEffect,useId,useState,ReactNode} from 'react';
import {foodSvg,FoodKind} from './food-art';
export type FoodTheme='momo'|'menu';
const Brand=createContext({theme:'momo' as FoodTheme,setTheme:(_t:FoodTheme)=>{}});
export function BrandProvider({children}:{children:ReactNode}){const[theme,set]=useState<FoodTheme>('momo');useEffect(()=>{const q=new URLSearchParams(location.search).get('food');try{const saved=localStorage.getItem('momo-food-theme');if(q==='menu'||q==='momo')set(q);else if(saved==='menu')set('menu')}catch{}},[]);function setTheme(t:FoodTheme){set(t);try{localStorage.setItem('momo-food-theme',t)}catch{}const url=new URL(location.href);url.searchParams.set('food',t);history.replaceState(null,'',url)}useEffect(()=>{document.documentElement.dataset.food=theme;document.title=theme==='menu'?'The whole menu — a Momo weekend':'Momo — kal milte hain?';},[theme]);return <Brand.Provider value={{theme,setTheme}}>{children}</Brand.Provider>}
export const useBrand=()=>useContext(Brand);

export const themeKinds=(t:FoodTheme):FoodKind[]=>t==='momo'?['steamed','fried','tandoori','gravy']:['pizza','vadapav','noodles','chai','dalbaati'];
export const themeNames=(t:FoodTheme)=>t==='momo'?['Steamed','Fried','Tandoori','Gravy']:['Pizza','Vada pav','Noodles','Chai','Dal baati'];

// One real photo per edition. Freely licensed via Wikimedia Commons; credit stays visible.
export const themePhoto=(t:FoodTheme)=>t==='momo'
  ?{src:'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Steamed_Momos_-_KOLKATA.jpg/1280px-Steamed_Momos_-_KOLKATA.jpg',alt:'Steamed momos with steam rising',credit:'Tapas Kumar Halder',license:'CC BY-SA 4.0',page:'https://commons.wikimedia.org/wiki/File:Steamed_Momos_-_KOLKATA.jpg'}
  :{src:'https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Pizza-napoletana.jpg/1280px-Pizza-napoletana.jpg',alt:'A Neapolitan pizza margherita',credit:'Fabryx98',license:'CC BY-SA 4.0',page:'https://commons.wikimedia.org/wiki/File:Pizza-napoletana.jpg'};

export const SLOGANS=['Make a wish. We’ll get your gang ready.','Come and be found.','Your people are out there. Let’s go meet them.','Phones down. Plates up.','The group chat that actually meets.','Some friends you find. Some find you.','Bring yourself. We’ll bring the gang.','Kal milte hain? Pakka.'];

export function FoodIcon({kind,className='',label}:{kind:FoodKind,className?:string,label?:string}){const id=useId().replace(/[^a-zA-Z0-9]/g,'');return <span className={'food-icon '+className} role={label?'img':undefined} aria-label={label} aria-hidden={label?undefined:true} dangerouslySetInnerHTML={{__html:foodSvg(kind,id)}}/>}
export function Cast({labels=false,className=''}:{labels?:boolean,className?:string}){const{theme}=useBrand();const names=themeNames(theme);return <div className={'cast '+className}>{themeKinds(theme).map((k,i)=><figure key={k}><FoodIcon kind={k} label={names[i]}/>{labels&&<figcaption>{names[i]}</figcaption>}</figure>)}</div>}
export function ThemeSwitch(){const{theme,setTheme}=useBrand();return <button className="food-switch" onClick={()=>setTheme(theme==='momo'?'menu':'momo')} aria-label={theme==='momo'?"Don’t like momos? Change to all foods":"Back to the momo menu"}><span aria-hidden="true">✳</span>{theme==='momo'?"don’t like momos?":"missing the momos?"}<span className="switch-note">{theme==='momo'?'there’s a whole menu.':'bring them back.'}</span></button>}
export function wordmark(theme:FoodTheme){return theme==='momo'?'momo':'the menu'}
