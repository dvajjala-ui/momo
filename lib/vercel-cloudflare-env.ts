// Stand-in for `cloudflare:workers` when the app is built with `next build`
// (Vercel). Next.config aliases the import here only for that build.
import {createD1,storageMode} from './sqlite-d1';
import {createR2Bucket,r2Config} from './r2-bucket';

let database:ReturnType<typeof createD1>|null=null;
let bucket:ReturnType<typeof createR2Bucket>|null=null;
export const env:any=new Proxy({},{
  get(_t,key){
    if(key==='MOMO_PLATFORM')return 'vercel';
    if(key==='MOMO_STORAGE')return storageMode();
    if(key==='DB')return database??=createD1();
    if(key==='BUCKET'){const config=r2Config();return config?(bucket??=createR2Bucket(config)):undefined;}
    return typeof key==='string'?process.env[key]:undefined;
  },
});
