'use client';
import {createContext,useContext,useEffect,useState,ReactNode} from 'react';
export type FoodTheme='momo'|'menu';
const Brand=createContext({theme:'momo' as FoodTheme,setTheme:(_t:FoodTheme)=>{}});
export function BrandProvider({children}:{children:ReactNode}){const[theme,set]=useState<FoodTheme>('momo');useEffect(()=>{const q=new URLSearchParams(location.search).get('food');try{const saved=localStorage.getItem('momo-food-theme');if(q==='menu'||q==='momo')set(q);else if(saved==='menu')set('menu')}catch{}},[]);function setTheme(t:FoodTheme){set(t);try{localStorage.setItem('momo-food-theme',t)}catch{}const url=new URL(location.href);url.searchParams.set('food',t);history.replaceState(null,'',url)}useEffect(()=>{document.documentElement.dataset.food=theme;document.title=theme==='menu'?'The whole menu — a Momo weekend':'Momo — kal milte hain?';},[theme]);return <Brand.Provider value={{theme,setTheme}}>{children}</Brand.Provider>}
export const useBrand=()=>useContext(Brand);
export const themeCast=(t:FoodTheme)=>t==='momo'?'/momo-flavours.png':'/whole-menu.png';
export const themeNames=(t:FoodTheme)=>t==='momo'?['Steamed','Deep-fried','Tandoori','Schezwan']:['Pizza','Vada pav','Noodles','Pasta','Chai + coffee','Dal baati'];
export function ThemeSwitch(){const{theme,setTheme}=useBrand();return <button className="food-switch" onClick={()=>setTheme(theme==='momo'?'menu':'momo')} aria-label={theme==='momo'?"Don’t like momos? Change to all foods":"Back to the momo menu"}><span aria-hidden="true">✳</span>{theme==='momo'?"don’t like momos?":"missing the momos?"}<span className="switch-note">{theme==='momo'?'there’s a whole menu.':'bring them back.'}</span></button>}
export function Cast({className=''}:{className?:string}){const{theme}=useBrand();return <img className={className} src={themeCast(theme)} alt={theme==='momo'?'Crayon-drawn steamed, fried, tandoori and Schezwan momo friends':'Crayon-drawn pizza, vada pav, noodles, pasta, chai, coffee and dal baati friends'}/>}
export function wordmark(theme:FoodTheme){return theme==='momo'?'momo':'the menu'}
