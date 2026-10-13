import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,realpathSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {chatAccess,chatHistory,chatRecipients,persistChat} from '../lib/chat-core.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
const {Miniflare}=createRequire(realpathSync(root+'/node_modules/wrangler/package.json'))('miniflare');
const mf=new Miniflare({
  modules:true,
  script:`export default {fetch(){return new Response('ok')}}`,
  compatibilityDate:'2026-05-15',
  d1Databases:['DB'],
});

try{
  const db=await mf.getD1Database('DB');
  for(const file of readdirSync(root+'/drizzle').filter(file=>file.endsWith('.sql')).sort()){
    for(const statement of readFileSync(root+'/drizzle/'+file,'utf8').split('--> statement-breakpoint')){
      if(statement.trim())await db.prepare(statement).run();
    }
  }

  await db.prepare("INSERT INTO profiles(id,nickname,age,gender,created) VALUES('sender','Chai',24,'Test profile',1)").run();
  const wish=randomUUID(),room='w_'+wish;
  await db.prepare("INSERT INTO wishes(id,user_id,title,when_text,area,spots,status,created) VALUES(?,'sender','Read first','Sunday','Ahmedabad',5,'open',1)").bind(wish).run();
  await db.prepare("INSERT INTO wish_joins(id,wish_id,user_id,created) VALUES(?,?,?,1)").bind(wish+':reader',wish,'reader').run();

  assert(await chatAccess(db,'weekend','reader',false),'a signed-in seat can read a public table before profile setup');
  assert(await chatAccess(db,room,'reader',false),'a joined seat can read its gang before profile setup');
  assert.deepEqual(await chatHistory(db,room,'reader',false),[]);

  const blockedWrite=await persistChat(db,{room,userId:'reader',admin:false,clientId:randomUUID(),body:'Not yet'});
  assert.equal(blockedWrite.status,400);
  assert.match(blockedWrite.error,/profile/i);
  const outsiderWrite=await persistChat(db,{room,userId:'outsider',admin:false,clientId:randomUUID(),body:'Not a member'});
  assert.equal(outsiderWrite.status,403);
  assert.match(outsiderWrite.error,/no longer available/i);

  const saved=await persistChat(db,{room,userId:'sender',admin:false,clientId:randomUUID(),body:'Welcome to the gang'});
  assert.equal(saved.status,200);
  const history=await chatHistory(db,room,'reader',false);
  assert.equal(history.length,1);
  assert.equal(history[0].body,'Welcome to the gang');

  const recipients=await chatRecipients(db,room,[{userId:'reader',admin:false},{userId:'sender',admin:false}],'sender');
  assert(recipients.eligible.has('reader'));
  assert(recipients.allowed.has('reader'),'profile-less joined seats receive live fanout');

  await db.prepare("INSERT INTO member_controls(user_id,status,updated) VALUES('reader','suspended',2)").run();
  assert.equal(await chatAccess(db,room,'reader',false),null);
  const suspended=await chatRecipients(db,room,[{userId:'reader',admin:false},{userId:'sender',admin:false}],'sender');
  assert(!suspended.eligible.has('reader'));
  assert(!suspended.allowed.has('reader'));

  console.log('PASS read-before-profile access, send gate, fanout and suspension');
}finally{
  await mf.dispose();
}
