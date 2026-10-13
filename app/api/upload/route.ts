import {db,bucket,identity,isAdmin,json,sameOrigin,str,readBounded,uploadsEnabled,processPhoto} from '../../../lib/momo-server';

function imageType(bytes:Uint8Array){
  if(bytes.length>=8&&bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71)return 'image/png';
  if(bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg';
  if(bytes.length>=12&&String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP')return 'image/webp';
  return null;
}

export async function POST(req:Request){
  try{
    if(!sameOrigin(req))return json({error:'Invalid origin'},403);
    const user=await identity();
    if(!user)return json({error:'Sign in first.'},401);
    if(Number(req.headers.get('content-length')||0)>3_200_000)return json({error:'Photo must be under 3 MB.'},413);
    const bytesBody=await readBounded(req,3_200_000);
    const form=await new Response(bytesBody,{headers:{'Content-Type':req.headers.get('content-type')||''}}).formData();
    const file=form.get('photo'),kind=form.get('kind');
    if(!(file instanceof File)||file.size>3_000_000)return json({error:'Choose an image under 3 MB.'},400);
    if(kind!=='gallery'&&kind!=='profile')return json({error:'Choose a photo destination.'},400);
    if(kind==='gallery'&&!isAdmin(user))return json({error:'Only hosts can add gallery photos.'},403);
    if(form.get('consent')!=='yes')return json({error:'Confirm photo permissions first.'},400);
    const profile=await db().prepare('SELECT photo FROM profiles WHERE id=?').bind(user.userId).first<{photo:string}>();
    if(kind==='profile'&&!profile)return json({error:'Create your profile first.'},400);
    if(!uploadsEnabled())return json({error:'Photo uploads are paused until image processing is ready.'},503);
    const input=new Uint8Array(await file.arrayBuffer()),type=imageType(input);
    if(!type)return json({error:'Choose a PNG, JPEG or WebP image.'},400);
    let safeBytes:Uint8Array;
    try{safeBytes=await processPhoto(input,type)}
    catch{return json({error:'Photo processing is unavailable. Please try again later.'},503)}
    const id=crypto.randomUUID(),caption=kind==='gallery'?str(form.get('caption'),2,160):'';
    await bucket().put(id,safeBytes,{httpMetadata:{contentType:'image/webp'}});
    if(kind==='gallery')await db().prepare('INSERT INTO gallery(id,caption,category,created) VALUES(?,?,?,?)').bind(id,caption,str(form.get('category'),2,30),Date.now()).run();
    else {await db().prepare('UPDATE profiles SET photo=? WHERE id=?').bind(id,user.userId).run();if(profile?.photo)await bucket().delete(profile.photo)}
    return json({ok:true,id});
  }catch{return json({error:'Photo could not be saved. Try a smaller image.'},400)}
}
