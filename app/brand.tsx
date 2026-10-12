'use client';
import {createContext,useContext,useEffect,useId,useSyncExternalStore,ReactNode} from 'react';
import {foodSvg,FoodKind} from './food-art';
export type FoodTheme='momo'|'menu';
const Brand=createContext<{theme:FoodTheme,setTheme:(theme:FoodTheme)=>void}>({theme:'momo',setTheme:()=>{}});
function currentTheme():FoodTheme{const q=new URLSearchParams(location.search).get('food');if(q==='menu'||q==='momo')return q;try{return localStorage.getItem('momo-food-theme')==='menu'?'menu':'momo'}catch{return 'momo'}}
function subscribeTheme(listener:()=>void){window.addEventListener('momo-theme-change',listener);window.addEventListener('storage',listener);window.addEventListener('popstate',listener);return()=>{window.removeEventListener('momo-theme-change',listener);window.removeEventListener('storage',listener);window.removeEventListener('popstate',listener)}}
export function BrandProvider({children}:{children:ReactNode}){const theme=useSyncExternalStore(subscribeTheme,currentTheme,()=>'momo' as FoodTheme);function setTheme(t:FoodTheme){try{localStorage.setItem('momo-food-theme',t)}catch{}const url=new URL(location.href);url.searchParams.set('food',t);history.replaceState(null,'',url);window.dispatchEvent(new Event('momo-theme-change'))}useEffect(()=>{document.documentElement.dataset.food=theme;document.title='Momo to Pizza';},[theme]);return <Brand.Provider value={{theme,setTheme}}>{children}</Brand.Provider>}
export const useBrand=()=>useContext(Brand);

export const themeKinds=(t:FoodTheme):FoodKind[]=>t==='momo'?['steamed','fried','tandoori','gravy']:['pizza','vadapav','noodles','chai','dalbaati'];
export const themeNames=(t:FoodTheme)=>t==='momo'?['Steamed','Fried','Tandoori','Gravy']:['Pizza','Vada pav','Noodles','Chai','Dal baati'];

// One real photo per edition. Attribution stays available in the collapsed photo credits.
export const themePhoto=(t:FoodTheme)=>t==='momo'
  ?{src:'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Steamed_Momos_-_KOLKATA.jpg/1280px-Steamed_Momos_-_KOLKATA.jpg',alt:'Steamed momos',credit:'Tapas Kumar Halder',license:'CC BY-SA 4.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/',page:'https://commons.wikimedia.org/wiki/File:Steamed_Momos_-_KOLKATA.jpg'}
  :{src:'https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Pizza-napoletana.jpg/1280px-Pizza-napoletana.jpg',alt:'A Neapolitan pizza margherita',credit:'Fabryx98',license:'CC BY-SA 4.0',licenseUrl:'https://creativecommons.org/licenses/by-sa/4.0/',page:'https://commons.wikimedia.org/wiki/File:Pizza-napoletana.jpg'};

export const SLOGANS=['Make a wish. We’ll get your gang ready.','Come and be found.','Your people are out there. Let’s go meet them.','Phones down. Plates up.','The group chat that actually meets.','Some friends you find. Some find you.','Bring yourself. We’ll bring the gang.','Kal milte hain? Pakka.'];

export function FoodIcon({kind,className='',label}:{kind:FoodKind,className?:string,label?:string}){const id=useId().replace(/[^a-zA-Z0-9]/g,'');return <span className={'food-icon '+className} role={label?'img':undefined} aria-label={label} aria-hidden={label?undefined:true} dangerouslySetInnerHTML={{__html:foodSvg(kind,id)}}/>}
export function Cast({labels=false,className=''}:{labels?:boolean,className?:string}){const{theme}=useBrand();const names=themeNames(theme);return <div className={'cast '+className}>{themeKinds(theme).map((k,i)=><figure key={k}><FoodIcon kind={k} label={labels?undefined:names[i]}/>{labels&&<figcaption>{names[i]}</figcaption>}</figure>)}</div>}
export function ThemeSwitch(){const{theme,setTheme}=useBrand();const next=theme==='momo'?'pizza and more':'momos';return <button className="food-switch" onClick={()=>setTheme(theme==='momo'?'menu':'momo')} aria-label={`Switch food edition to ${next}`}><span className="switch-food" aria-hidden="true">{theme==='momo'?'🥟':'🍕'}</span><span><b>{theme==='momo'?'Momo edition':'Pizza edition'}</b><small>Switch to {next}</small></span><span className="switch-arrow" aria-hidden="true">↔</span></button>}
export function wordmark(){return 'Momo to Pizza'}
