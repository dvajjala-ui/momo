import {fileURLToPath} from 'node:url';
import {createHmac} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFileSync,realpathSync,readdirSync} from 'node:fs';
const root=fileURLToPath(new URL('..',import.meta.url)).replace(/[\\/]$/,'');
const require=createRequire(realpathSync(root+'/node_modules/wrangler/package.json'));
const {Miniflare}=require('miniflare');
const mf=new Miniflare({modules:[{type:'ESModule',path:root+'/dist/server/index.js'},...readdirSync(root+'/dist/server',{recursive:true}).filter(p=>p.endsWith('.js')&&p!=='index.js').map(p=>({type:'ESModule',path:root+'/dist/server/'+p}))],modulesRoot:root+'/dist/server',modulesRules:[{type:'ESModule',include:['**/*.js','**/*.mjs']}],compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['BUCKET'],bindings:{ADMIN_EMAILS:'host@example.test',WHATSAPP_APP_SECRET:'local-test-secret',WHATSAPP_PHONE_NUMBER_ID:'123456789',WHATSAPP_VERIFY_TOKEN:'local-verify'}});
try{
const db=await mf.getD1Database('DB');
for(const file of readdirSync(root+'/drizzle').filter(f=>f.endsWith('.sql')).sort())for(const s of readFileSync(root+'/drizzle/'+file,'utf8').split('--> statement-breakpoint'))if(s.trim())await db.prepare(s).run();
async function call(path='/api/community',data,user='member'){
 const headers={'Content-Type':'application/json',Origin:'https://momo.test'};
 if(user){headers['oai-authenticated-user-id']=user;headers['oai-authenticated-user-email']=user+'@example.test'}
 const r=await mf.dispatchFetch('https://momo.test'+path,{headers,method:data?'POST':'GET',body:data?JSON.stringify(data):undefined});
 const d=await r.json();return {status:r.status,data:d};
}
function assert(name,r,status){if(r.status!==status)throw Error(name+': '+JSON.stringify(r));console.log('PASS '+name+' ('+status+')')}
assert('public event data',await call('/api/community',null,null),200);
assert('anonymous mutation denied',await call('/api/community',{action:'profile'},null),401);
assert('member host access denied',await call('/api/community?view=host'),403);
assert('host access granted',await call('/api/community?view=host',null,'host'),200);
assert('age/rules required',await call('/api/community',{action:'profile',nickname:'Test',avatar:0}),400);
assert('profile saved',await call('/api/community',{action:'profile',nickname:'Chutney',avatar:2,adult:true,rules:true}),200);
const photoBytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==','base64');
async function uploadPhoto(kind,user='member',consent=true){
 const form=new FormData();form.set('photo',new Blob([photoBytes],{type:'image/png'}),'test.png');form.set('kind',kind);form.set('caption','Disposable local photo');form.set('category','Food');if(consent)form.set('consent','yes');
 const headers={Origin:'https://momo.test'};if(user){headers['oai-authenticated-user-id']=user;headers['oai-authenticated-user-email']=user+'@example.test'}
 const request=new Request('https://momo.test/api/upload',{method:'POST',headers,body:form});const r=await mf.dispatchFetch(request.url,{method:'POST',headers:request.headers,body:await request.arrayBuffer()});return {status:r.status,data:await r.json()};
}
assert('anonymous upload denied',await uploadPhoto('profile',null),401);
assert('member gallery upload denied',await uploadPhoto('gallery'),403);
assert('photo consent required',await uploadPhoto('profile','member',false),400);
const profilePhoto=await uploadPhoto('profile');assert('profile photo saved',profilePhoto,200);
assert('member photo requires sign-in',await call('/api/media/'+profilePhoto.data.id,null,null),401);
const signedPhoto=await mf.dispatchFetch('https://momo.test/api/media/'+profilePhoto.data.id,{headers:{'oai-authenticated-user-id':'other','oai-authenticated-user-email':'other@example.test'}});
if(signedPhoto.status!==200||signedPhoto.headers.get('content-type')!=='image/png'||signedPhoto.headers.get('cache-control')!=='private, no-store')throw Error('Member photo access or cache policy failed');console.log('PASS member photo signed-in access and private cache policy');
const replacedPhoto=await uploadPhoto('profile');assert('profile photo replaced',replacedPhoto,200);
const photoBucket=await mf.getR2Bucket('BUCKET');if(await photoBucket.get(profilePhoto.data.id))throw Error('Old profile photo left in R2');console.log('PASS replaced photo removed from R2');
const galleryPhoto=await uploadPhoto('gallery','host');assert('host gallery photo saved',galleryPhoto,200);
if((await mf.dispatchFetch('https://momo.test/api/media/'+galleryPhoto.data.id)).status!==200)throw Error('Published gallery photo not visible');console.log('PASS published gallery photo public through media route');
assert('host removes gallery photo',await call('/api/community',{action:'removePhoto',id:galleryPhoto.data.id},'host'),200);
if(await photoBucket.get(galleryPhoto.data.id))throw Error('Removed gallery photo left in R2');console.log('PASS gallery deletion removes R2 object');
assert('invalid phone rejected',await call('/api/community',{action:'invite',phone:'bad',city:'Test City',adult:true,consent:true}),400);
assert('invite saved',await call('/api/community',{action:'invite',phone:'+12025550123',city:'Test City',adult:true,consent:true,foodTheme:'menu'}),200);
const me=await call('/api/community?view=me');if('phone' in me.data.invite)throw Error('phone leaked');console.log('PASS profile response excludes phone');
if(me.data.invite.foodTheme!=='menu'||!/^MM-[A-F0-9]{10}$/i.test(me.data.invite.reference)||me.data.invite.deliveryStatus!=='Not sent')throw Error('Missing invite receipt');console.log('PASS themed request receipt');
assert('message saved',await call('/api/community',{action:'message',room:'weekend',body:'Test hello'}),200);
assert('rate limit',await call('/api/community',{action:'message',room:'weekend',body:'too fast'}),429);
const chat=await call('/api/community?view=chat&room=weekend');const m=chat.data.messages[0];if(m.user_id||m.phone||m.email||m.nickname!=='Chutney')throw Error('Chat privacy failure');console.log('PASS chat uses nickname without identity or phone');
assert('report saved',await call('/api/community',{action:'report',messageId:m.id,reason:'Test moderation'},'other'),200);
assert('block saved',await call('/api/community',{action:'block',messageId:m.id},'other'),200);
const blocked=await call('/api/community?view=chat&room=weekend',null,'other');if(blocked.data.messages.length)throw Error('Block failed');console.log('PASS blocked messages hidden');
assert('member cannot publish',await call('/api/community',{action:'event'}),403);
assert('host can publish',await call('/api/community',{action:'event',title:'Test meetup',date:'2026-11-01T18:00:00+05:30',venue:'Test venue',cost:'Pay at venue',description:'Local testing only',category:'Food'},'host'),200);
const home=await call('/api/community',null,null);const eventId=home.data.events[0].id;
assert('WhatsApp fails closed without setup',await call('/api/community',{action:'sendWhatsApp',userId:'member',eventId},'host'),400);
assert('host can review request',await call('/api/community',{action:'requestStatus',userId:'member',status:'reviewed'},'host'),200);
assert('member cannot review requests',await call('/api/community',{action:'requestStatus',userId:'member',status:'reviewed'}),403);
const host=await call('/api/community?view=host',null,'host');if(host.data.whatsapp.configured||!host.data.whatsapp.missing.includes('WHATSAPP_ACCESS_TOKEN'))throw Error('Setup guard failed');console.log('PASS WhatsApp missing setup disclosed without secrets');
await db.prepare("INSERT INTO deliveries(id,user_id,event_id,message_id,status,created,updated) VALUES('test','member',?,'wamid.test','accepted',1,1)").bind(eventId).run();
async function webhook(value,valid=true){const body=JSON.stringify({object:'whatsapp_business_account',entry:[{changes:[{field:'messages',value:{metadata:{phone_number_id:'123456789'},...value}}]}]});const signature=createHmac('sha256',valid?'local-test-secret':'wrong').update(body).digest('hex');const r=await mf.dispatchFetch('https://momo.test/api/whatsapp/webhook',{method:'POST',headers:{'Content-Type':'application/json','x-hub-signature-256':'sha256='+signature},body});return {status:r.status,data:await r.json()}}
assert('forged WhatsApp callback denied',await webhook({statuses:[{id:'wamid.test',status:'delivered'}]},false),403);
assert('signed WhatsApp callback accepted',await webhook({statuses:[{id:'wamid.test',status:'read'}]}),200);
assert('out-of-order status callback acknowledged',await webhook({statuses:[{id:'wamid.test',status:'sent'}]}),200);
if((await db.prepare("SELECT status FROM deliveries WHERE id='test'").first()).status!=='read')throw Error('Status downgraded');console.log('PASS delivery status does not downgrade');
assert('signed STOP processed',await webhook({messages:[{type:'text',from:'12025550123',text:{body:'STOP'}}]}),200);
if((await call('/api/community?view=me')).data.invite!==null)throw Error('STOP did not remove request');console.log('PASS STOP removes request');
assert('wish needs a nickname',await call('/api/community',{action:'wish',title:'Badminton',whenText:'Sunday',area:'Test',spots:2},'nobody'),400);
assert('wish saved',await call('/api/community',{action:'wish',title:'Sunday badminton',whenText:'Sunday 7am',area:'Test City',spots:2}),200);
assert('other member profile',await call('/api/community',{action:'profile',nickname:'Gary',avatar:1,adult:true,rules:true},'other'),200);
const wishes=(await call('/api/community',null,'other')).data.wishes;const wish=wishes[0];if(!wish||wish.by.nickname!=='Chutney'||wish.joined!==1||'user_id' in wish)throw Error('Wish board shape');console.log('PASS wish board shows nickname without identity');
const anonWish=(await call('/api/community',null,null)).data.wishes[0];if(anonWish.by!==null||anonWish.gang.length)throw Error('Anonymous visitors saw nicknames');console.log('PASS anonymous wish view hides nicknames');
assert('member joins wish',await call('/api/community',{action:'joinWish',id:wish.id},'other'),200);
if((await call('/api/community',null,'other')).data.wishes[0].status!=='ready')throw Error('Gang not ready');console.log('PASS full gang marked ready');
assert('third member profile',await call('/api/community',{action:'profile',nickname:'Pari',avatar:2,adult:true,rules:true},'third'),200);
assert('full gang refuses more',await call('/api/community',{action:'joinWish',id:wish.id},'third'),409);
assert('gang member posts in gang room',await call('/api/community',{action:'message',room:'w_'+wish.id,body:'see you at the court'},'other'),200);
assert('outsider cannot read gang room',await call('/api/community?view=chat&room=w_'+wish.id,null,'third'),403);
assert('outsider cannot post in gang room',await call('/api/community',{action:'message',room:'w_'+wish.id,body:'hi'},'third'),403);
const gm=(await call('/api/community?view=me',null,'other')).data.gangs;if(!gm?.some(g=>g.room==='w_'+wish.id))throw Error('Gang room not listed');console.log('PASS gang room listed for members');
assert('unknown room rejected',await call('/api/community?view=chat&room=nope'),403);
assert('host plans the ready wish',await call('/api/community',{action:'event',wishId:wish.id,title:'Badminton, planned',date:'2026-11-08T07:00:00+05:30',venue:'Public court, Test City',cost:'Court fee split',description:'From a wish',category:'Play'},'host'),200);
const planned=(await call('/api/community',null,'other')).data.wishes[0];if(planned.status!=='planned'||!planned.eventId)throw Error('Wish not marked planned');console.log('PASS planned wish links to its event');
assert('plan for a missing wish rejected',await call('/api/community',{action:'event',wishId:'nope',title:'x plan',date:'2026-11-08T07:00:00+05:30',venue:'Somewhere',cost:'Free',description:'Nothing',category:'Play'},'host'),400);
assert('member reports a wish',await call('/api/community',{action:'reportWish',id:wish.id,reason:'Not a public place'},'third'),200);
const wr=(await call('/api/community?view=host',null,'host')).data.reports.find(r=>r.kind==='wish');if(!wr||!wr.body.startsWith('Wish: '))throw Error('Wish report missing');console.log('PASS hosts see wish reports');
assert('non-owner cannot remove wish',await call('/api/community',{action:'removeWish',id:wish.id},'other'),403);
assert('host can remove wish',await call('/api/community',{action:'removeWish',id:wish.id},'host'),200);
if((await call('/api/community?view=host',null,'host')).data.reports.some(r=>r.kind==='wish'))throw Error('Wish report left behind');if((await db.prepare("SELECT COUNT(*) AS n FROM messages WHERE substr(room,1,2)='w_'").first()).n)throw Error('Gang room messages left behind');console.log('PASS removing a wish clears its reports');
assert('withdraw invite',await call('/api/community',{action:'withdraw'}),200);
assert('delete own data',await call('/api/community',{action:'deleteAccount'}),200);
const count=await db.prepare("SELECT (SELECT COUNT(*) FROM profiles WHERE id='member')+(SELECT COUNT(*) FROM wishes WHERE user_id='member')+(SELECT COUNT(*) FROM wish_joins WHERE user_id='member') AS n").first();if(count.n)throw Error('Cleanup failed');console.log('PASS account data deleted');
if(await photoBucket.get(replacedPhoto.data.id))throw Error('Account photo left in R2');console.log('PASS account deletion removes profile photo');
}finally{await mf.dispose()}
