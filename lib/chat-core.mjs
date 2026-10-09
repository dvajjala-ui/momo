// Shared by the standalone chat Worker and its disposable integration suite.
export const validRoom=room=>typeof room==='string'&&/^(weekend|food|games|w_[0-9a-f-]{36}|d_[0-9a-f]{32})$/.test(room);
export const activeSql="NOT EXISTS (SELECT 1 FROM member_controls c WHERE c.user_id=p.id AND c.status='suspended')";

export function roomCondition(room,adminSql='?'){
  if(!validRoom(room))throw Error('Invalid room.');
  if(room.startsWith('w_'))return {sql:`EXISTS (SELECT 1 FROM wishes w WHERE w.id=? AND (${adminSql}=1 OR EXISTS (SELECT 1 FROM wish_joins j WHERE j.wish_id=w.id AND j.user_id=p.id)))`,params:[room.slice(2)]};
  if(room.startsWith('d_'))return {sql:`EXISTS (SELECT 1 FROM direct_threads t JOIN profiles a ON a.id=t.user_a JOIN profiles b ON b.id=t.user_b
    WHERE t.id=? AND (t.user_a=p.id OR t.user_b=p.id) AND a.dm_opt_in=1 AND b.dm_opt_in=1
    AND NOT EXISTS (SELECT 1 FROM member_controls c WHERE c.user_id IN (t.user_a,t.user_b) AND c.status='suspended')
    AND NOT EXISTS (SELECT 1 FROM blocks x WHERE (x.user_id=t.user_a AND x.blocked_id=t.user_b) OR (x.user_id=t.user_b AND x.blocked_id=t.user_a))
    AND EXISTS (SELECT 1 FROM event_attendance x JOIN event_attendance y ON y.event_id=x.event_id JOIN events e ON e.id=x.event_id WHERE x.user_id=t.user_a AND y.user_id=t.user_b))`,params:[room.slice(2)]};
  return {sql:'1=1',params:[]};
}

function accessQuery(room,userId,admin){
  const condition=roomCondition(room);
  return {sql:`SELECT p.id,p.nickname,p.avatar,p.photo FROM profiles p WHERE p.id=? AND ${activeSql} AND ${condition.sql}`,params:[userId,...condition.params,...(room.startsWith('w_')?[admin?1:0]:[])]};
}
export async function chatAccess(db,room,userId,admin=false){
  const q=accessQuery(room,userId,admin);
  return db.prepare(q.sql).bind(...q.params).first();
}
export const publicMessage=(m,userId)=>({id:m.id,body:m.body,created:Number(m.created),nickname:m.nickname,avatar:Number(m.avatar),photo:m.photo||null,mine:m.user_id===userId});

export async function chatHistory(db,room,userId,admin=false){
  if(!await chatAccess(db,room,userId,admin))return null;
  const rows=await db.prepare(`SELECT m.*,p.nickname,p.avatar,p.photo FROM messages m JOIN profiles p ON p.id=m.user_id
    WHERE m.room=? AND NOT EXISTS (SELECT 1 FROM blocks b WHERE b.user_id=? AND b.blocked_id=m.user_id)
    ORDER BY m.created DESC,m.id DESC LIMIT 80`).bind(room,userId).all();
  // Recheck after the read so a revocation during it does not return history.
  if(!await chatAccess(db,room,userId,admin))return null;
  return rows.results.reverse().map(m=>publicMessage(m,userId));
}

async function digest(value){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('')}
export async function persistChat(db,{room,userId,admin=false,clientId,body},now=Date.now()){
  if(!validRoom(room)||typeof clientId!=='string'||!/^[0-9a-f-]{36}$/.test(clientId)||typeof body!=='string'||!body.trim()||body.trim().length>500)return {status:400,error:'Write a note of up to 500 characters.'};
  body=body.trim();
  if(!await chatAccess(db,room,userId,admin))return {status:403,error:'This conversation is no longer available to your seat.'};
  const id='chat-'+(await digest(JSON.stringify([userId,clientId]))).slice(0,40);
  const fingerprint=await digest(JSON.stringify([room,body]));
  const receipt=await db.prepare('SELECT body_hash FROM chat_send_receipts WHERE id=? AND user_id=?').bind(id,userId).first();
  if(receipt){
    if(receipt.body_hash!==fingerprint)return {status:409,error:'This message ID has already been used.'};
    return {status:200,id,duplicate:true};
  }
  const gate=accessQuery(room,userId,admin);
  const exists=`EXISTS (${gate.sql})`;
  const statements=[
    db.prepare(`INSERT INTO chat_send_limits(user_id,window_start,sent,last_id) SELECT ?,?,1,?
      WHERE NOT EXISTS (SELECT 1 FROM chat_send_receipts WHERE id=?) AND ${exists}
      ON CONFLICT(user_id) DO UPDATE SET window_start=CASE WHEN window_start<=? THEN excluded.window_start ELSE window_start END,
      sent=CASE WHEN window_start<=? THEN 1 ELSE sent+1 END,last_id=excluded.last_id WHERE window_start<=? OR sent<10`)
      .bind(userId,now,id,id,...gate.params,now-10000,now-10000,now-10000),
    db.prepare(`INSERT OR IGNORE INTO chat_send_receipts(id,user_id,body_hash,created) SELECT ?,?,?,? FROM chat_send_limits
      WHERE user_id=? AND last_id=? AND ${exists}`).bind(id,userId,fingerprint,now,userId,id,...gate.params),
    db.prepare(`INSERT OR IGNORE INTO messages(id,user_id,room,body,created) SELECT ?,?,?,?,? FROM chat_send_receipts
      WHERE id=? AND created=? AND body_hash=? AND ${exists}`).bind(id,userId,room,body,now,id,now,fingerprint,...gate.params),
    db.prepare('SELECT m.*,p.nickname,p.avatar,p.photo FROM messages m JOIN profiles p ON p.id=m.user_id WHERE m.id=?').bind(id),
  ];
  const results=await db.batch(statements);
  const committed=await db.prepare('SELECT body_hash FROM chat_send_receipts WHERE id=?').bind(id).first();
  if(committed&&committed.body_hash!==fingerprint)return {status:409,error:'This message ID has already been used.'};
  const message=results[3].results[0];
  if(!message){
    if(!await chatAccess(db,room,userId,admin))return {status:403,error:'This conversation is no longer available to your seat.'};
    return {status:429,error:'A few too many notes at once. Please wait a moment.'};
  }
  return {status:200,id,message,duplicate:!results[2].meta.changes};
}

// All connected recipients are checked in one bounded D1 query per delivery.
export async function chatRecipients(db,room,seats,senderId){
  const users=[...new Set(seats.map(s=>s.userId))],admins=[...new Set(seats.filter(s=>s.admin).map(s=>s.userId))];
  if(!users.length)return {eligible:new Set(),allowed:new Set()};
  const condition=roomCondition(room,"p.id IN (SELECT value FROM json_each(?))");
  const rows=await db.prepare(`SELECT p.id,NOT EXISTS (SELECT 1 FROM blocks b WHERE b.user_id=p.id AND b.blocked_id=?) AS visible
    FROM profiles p WHERE p.id IN (SELECT value FROM json_each(?)) AND ${activeSql} AND ${condition.sql}`)
    .bind(senderId,JSON.stringify(users),...condition.params,...(room.startsWith('w_')?[JSON.stringify(admins)]:[])).all();
  return {eligible:new Set(rows.results.map(r=>r.id)),allowed:new Set(rows.results.filter(r=>r.visible).map(r=>r.id))};
}
