// Two local Next servers configured with the same disposable storage resources.
// No production URL, real recipient or WhatsApp send is permitted by this test.
import assert from 'node:assert/strict';
const origins=[process.env.MOMO_TEST_ORIGIN||'http://localhost:4319',process.env.MOMO_TEST_SECOND_ORIGIN||'http://localhost:4320'];
for(const origin of origins)if(!['localhost','127.0.0.1'].includes(new URL(origin).hostname))throw Error('Only local test servers are allowed.');
const sessions=[];let eventId=null,galleryId=null;
async function call(session,path='/api/community',data=null,instance=0){
  const headers={Origin:origins[instance],...(session?.cookie?{Cookie:session.cookie}:{})};
  if(data)headers['Content-Type']='application/json';
  const response=await fetch(origins[instance]+path,{method:data?'POST':'GET',headers,body:data?JSON.stringify(data):undefined});
  if(session){const cookies=response.headers.getSetCookie().map(x=>x.split(';')[0]);if(cookies.length)session.cookie=[...session.cookie.split('; ').filter(Boolean).filter(x=>!cookies.some(c=>c.split('=')[0]===x.split('=')[0])),...cookies].join('; ');}
  const body=await response.json();return {status:response.status,body};
}
async function member(name){const s={cookie:''};sessions.push(s);assert.equal((await call(s,'/api/session',{action:'start'})).status,200);assert.equal((await call(s,'/api/community',{action:'profile',nickname:name,avatar:1,adult:true,rules:true})).status,200);return s;}
async function upload(session,kind){
  const form=new FormData();form.set('kind',kind);form.set('consent','yes');form.set('caption','Disposable storage test');form.set('category','Food');form.set('photo',new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==','base64')],{type:'image/png'}),'test.png');
  const response=await fetch(origins[0]+'/api/upload',{method:'POST',headers:{Origin:origins[0],Cookie:session.cookie},body:form});const body=await response.json();assert.equal(response.status,200);return body.id;
}
try{
  const a=await member('Disposable QA A'),b=await member('Disposable QA B'),outsider=await member('Disposable QA outsider');
  const me=await call(a,'/api/community?view=me');assert.equal(me.body.storage,'durable');assert.equal(me.body.photos,true);
  assert.equal((await call(a,'/api/community?view=host')).status,403);
  const forged=await fetch(origins[0]+'/api/community?view=host',{headers:{'oai-authenticated-user-id':'host','oai-authenticated-user-email':'host@example.test'}});assert.equal(forged.status,401);
  console.log('PASS Vercel durable/photo status, member host denial and forged identity denial');
  const made=await call(a,'/api/community',{action:'wish',title:'Disposable storage QA wish',whenText:'Local check only',area:'Test only',spots:2});assert.equal(made.status,200);const wishId=made.body.id;
  assert.equal((await call(b,'/api/community',{action:'joinWish',id:wishId},1)).status,200);
  assert.equal((await call(b,'/api/community?view=home',null,1)).body.wishes.find(w=>w.id===wishId).status,'ready');
  assert.equal((await call(b,'/api/community',{action:'message',room:'w_'+wishId,body:'Disposable cross-instance message'},1)).status,200);
  assert.equal((await call(a,'/api/community?view=chat&room=w_'+wishId)).body.messages[0].body,'Disposable cross-instance message');
  assert.equal((await call(outsider,'/api/community?view=chat&room=w_'+wishId,null,1)).status,403);
  console.log('PASS wish and gang chat persist across two independent Next instances, outsider denied');
  const photoId=await upload(a,'profile');
  assert.equal((await fetch(origins[1]+'/api/media/'+photoId)).status,401);
  const photo=await fetch(origins[1]+'/api/media/'+photoId,{headers:{Cookie:b.cookie}});assert.equal(photo.status,200);assert.equal(photo.headers.get('content-type'),'image/png');assert.equal(photo.headers.get('cache-control'),'private, no-store');
  console.log('PASS private R2 photo through independent Vercel runtime');
  if(process.env.MOMO_TEST_HOST_PASSCODE){
    assert.equal((await call(outsider,'/api/session',{action:'host',username:process.env.MOMO_TEST_ADMIN_USERNAME||'momo',passcode:process.env.MOMO_TEST_HOST_PASSCODE})).status,200);
    const host=await call(outsider,'/api/community?view=host');assert.equal(host.status,200);assert.equal(host.body.whatsapp.configured,false);
    assert.equal((await call(outsider,'/api/community',{action:'event',title:'Disposable QA event',date:'2026-11-01T18:00:00+05:30',venue:'Public test venue',cost:'Test only',description:'Disposable local verification only',category:'Food'})).status,200);
    eventId=(await call(outsider,'/api/community?view=home')).body.events.find(e=>e.title==='Disposable QA event').id;
    galleryId=await upload(outsider,'gallery');assert.equal((await fetch(origins[1]+'/api/media/'+galleryId)).status,200);
    console.log('PASS host event/gallery flows and WhatsApp remains disabled');
  }
}finally{
  const host=sessions[2];
  if(galleryId)assert.equal((await call(host,'/api/community',{action:'removePhoto',id:galleryId})).status,200);
  if(eventId)assert.equal((await call(host,'/api/community',{action:'removeEvent',id:eventId})).status,200);
  for(const s of sessions)assert.equal((await call(s,'/api/community',{action:'deleteAccount'})).status,200);
  console.log('Disposable application data cleaned up.');
}
