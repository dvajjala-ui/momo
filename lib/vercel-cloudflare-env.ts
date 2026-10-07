// Stand-in for `cloudflare:workers` when the app is built with `next build`
// (Vercel). Next.config aliases the import here only for that build.
import {createD1,storageMode} from './sqlite-d1';

let database:ReturnType<typeof createD1>|null=null;
export const env:any=new Proxy({},{
  get(_t,key){
    if(key==='MOMO_PLATFORM')return 'vercel';
    if(key==='MOMO_STORAGE')return storageMode();
    if(key==='DB')return database??=createD1();
    if(key==='BUCKET')return undefined; // photo storage is not configured on this platform yet
    return typeof key==='string'?process.env[key]:undefined;
  },
});
