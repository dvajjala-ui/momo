import {db,identity,isAdmin,json,readBounded,sameOrigin,str} from '../../../lib/momo-server';
import {deleteMemberData} from '../../../lib/member-lifecycle';

const member=(value:unknown)=>str(value,1,150);
const record=async(actor:string,action:string,subject:string,note:string|null=null)=>db().prepare('INSERT INTO admin_audit(id,actor_id,action,subject_id,note,created) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),actor,action,subject,note,Date.now()).run();

export async function GET(req:Request){
  try{
    const user=await identity();
    if(!isAdmin(user))return json({error:'Host access is restricted.'},403);
    const url=new URL(req.url),view=url.searchParams.get('view')||'overview';
    if(view==='overview'){
      const counts=await db().prepare('SELECT (SELECT COUNT(*) FROM profiles) AS members,(SELECT COUNT(*) FROM wishes) AS wishes,(SELECT COUNT(*) FROM wish_joins) AS gang_seats,(SELECT COUNT(*) FROM messages) AS messages,(SELECT COUNT(*) FROM reports) AS reports,(SELECT COUNT(*) FROM member_controls WHERE status=\'suspended\') AS suspended,(SELECT COUNT(*) FROM event_attendance) AS attended').first();
      const audit=(await db().prepare('SELECT actor_id,action,subject_id,note,created FROM admin_audit ORDER BY created DESC LIMIT 30').all()).results;
      return json({counts,audit});
    }
    if(view==='members'){
      const query=(url.searchParams.get('q')||'').trim().slice(0,80),page=Math.min(100,Math.max(0,Number(url.searchParams.get('page')||0)||0));
      const match='%'+query.replace(/[\\%_]/g,'\\$&')+'%';
      const filter=' WHERE p.nickname LIKE ? ESCAPE \'\\\' OR COALESCE(i.phone,\'\') LIKE ? ESCAPE \'\\\' OR COALESCE(ei.email,\'\') LIKE ? ESCAPE \'\\\'';
      const base=' FROM profiles p LEFT JOIN member_controls mc ON mc.user_id=p.id LEFT JOIN invites i ON i.user_id=p.id LEFT JOIN email_invites ei ON ei.user_id=p.id';
      const rows=(await db().prepare('SELECT p.id,p.nickname,p.avatar,p.created,p.dm_opt_in,COALESCE(mc.status,\'active\') AS status,mc.reason,i.phone,i.city,ei.email,ei.verified_at AS email_verified_at,(SELECT COUNT(*) FROM wish_joins j WHERE j.user_id=p.id) AS gangs'+base+filter+' ORDER BY p.created DESC,p.id DESC LIMIT 50 OFFSET ?').bind(match,match,match,page*50).all()).results;
      const total=await db().prepare('SELECT COUNT(*) AS n'+base+filter).bind(match,match,match).first<{n:number}>();
      return json({members:rows,page,total:Number(total?.n||0)});
    }
    if(view==='gangs'){
      const rows=(await db().prepare('SELECT w.id,w.user_id,w.title,w.when_text,w.area,w.spots,w.status,w.created,p.nickname AS creator,(SELECT COUNT(*) FROM wish_joins j WHERE j.wish_id=w.id) AS joined FROM wishes w LEFT JOIN profiles p ON p.id=w.user_id ORDER BY w.created DESC LIMIT 100').all()).results;
      return json({gangs:rows});
    }
    if(view==='gang'){
      const id=member(url.searchParams.get('id'));
      const wish=await db().prepare('SELECT id,title,user_id,spots FROM wishes WHERE id=?').bind(id).first();
      if(!wish)return json({error:'Wish not found.'},404);
      const members=(await db().prepare('SELECT j.user_id,p.nickname,j.created FROM wish_joins j LEFT JOIN profiles p ON p.id=j.user_id WHERE j.wish_id=? ORDER BY j.created ASC LIMIT 500').bind(id).all()).results;
      return json({wish,members});
    }
    if(view==='attendance'){
      const eventId=member(url.searchParams.get('eventId'));
      const event=await db().prepare('SELECT id,title,date,wish_id FROM events WHERE id=?').bind(eventId).first<{id:string;title:string;date:string;wish_id:string|null}>();
      if(!event)return json({error:'Plan not found.'},404);
      const eligible=(await db().prepare("SELECT p.id,p.nickname,COALESCE(mc.status,'active') AS status,a.attended_at FROM profiles p LEFT JOIN member_controls mc ON mc.user_id=p.id LEFT JOIN event_attendance a ON a.event_id=? AND a.user_id=p.id WHERE a.attended_at IS NOT NULL OR EXISTS (SELECT 1 FROM wish_joins j WHERE j.user_id=p.id AND j.wish_id=?) OR EXISTS (SELECT 1 FROM email_invites ei WHERE ei.user_id=p.id AND ei.event_id=? AND ei.status='confirmed') OR EXISTS (SELECT 1 FROM invites i WHERE i.user_id=p.id AND i.event_id=? AND i.status='confirmed') ORDER BY p.nickname COLLATE NOCASE LIMIT 500").bind(eventId,event.wish_id||'',eventId,eventId).all()).results;
      return json({event,eligible,canConfirm:Date.parse(event.date)<=Date.now()});
    }
    if(view==='messages'){
      const room=member(url.searchParams.get('room'));
      if(!['weekend','food','games'].includes(room)&&!/^w_[0-9a-f-]{36}$/.test(room))return json({error:'Choose a community room.'},400);
      if(room.startsWith('w_')&&!await db().prepare('SELECT id FROM wishes WHERE id=?').bind(room.slice(2)).first())return json({error:'Gang not found.'},404);
      const messages=(await db().prepare('SELECT m.id,m.room,m.body,m.created,p.nickname FROM messages m LEFT JOIN profiles p ON p.id=m.user_id WHERE m.room=? ORDER BY m.created DESC LIMIT 100').bind(room).all()).results;
      return json({room,messages});
    }
    return json({error:'Not found.'},404);
  }catch(e){console.error('admin read failed',e);return json({error:'The host notebook could not load this section.'},503)}
}

export async function POST(req:Request){
  try{
    if(!sameOrigin(req))return json({error:'Please submit from this site.'},403);
    const user=await identity();
    if(!isAdmin(user))return json({error:'Host access is restricted.'},403);
    const b=JSON.parse(new TextDecoder().decode(await readBounded(req,5000))||'{}');
    const actor=user!.userId,now=Date.now();
    if(b.action==='memberStatus'){
      const id=member(b.userId),status=b.status;
      if(id===actor)return json({error:'Use another host account to moderate your own account.'},400);
      if(status!=='active'&&status!=='suspended')return json({error:'Choose active or suspended.'},400);
      if(!await db().prepare('SELECT id FROM profiles WHERE id=?').bind(id).first())return json({error:'Member not found.'},404);
      const reason=status==='suspended'?str(b.reason,3,160):null;
      await db().prepare('INSERT INTO member_controls(user_id,status,reason,updated) VALUES(?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET status=excluded.status,reason=excluded.reason,updated=excluded.updated').bind(id,status,reason,now).run();
      await record(actor,'member:'+status,id,reason);
      return json({ok:true});
    }
    if(b.action==='memberNickname'){
      const id=member(b.userId),nickname=str(b.nickname,2,30);
      const result=await db().prepare('UPDATE profiles SET nickname=? WHERE id=?').bind(nickname,id).run();
      if(!result.meta.changes)return json({error:'Member not found.'},404);
      await record(actor,'member:nickname',id);
      return json({ok:true});
    }
    if(b.action==='deleteMember'){
      const id=member(b.userId),current=await db().prepare('SELECT nickname FROM profiles WHERE id=?').bind(id).first<{nickname:string}>();
      if(id===actor)return json({error:'Use your own account controls to delete your seat.'},400);
      if(!current)return json({error:'Member not found.'},404);
      if(b.confirmNickname!==current.nickname)return json({error:'Type the exact nickname to confirm removal.'},400);
      await deleteMemberData(id,now);
      await record(actor,'member:deleted','deleted-member');
      return json({ok:true});
    }
    if(b.action==='gangSize'){
      const id=member(b.wishId),spots=Number(b.spots);
      if(!Number.isInteger(spots)||spots<2||spots>500)return json({error:'Choose a group size from 2 to 500.'},400);
      const wish=await db().prepare('SELECT id FROM wishes WHERE id=?').bind(id).first();
      if(!wish)return json({error:'Wish not found.'},404);
      const resized=await db().prepare("UPDATE wishes SET spots=?,status=CASE WHEN ?<=(SELECT COUNT(*) FROM wish_joins WHERE wish_id=?) THEN 'ready' ELSE 'open' END WHERE id=? AND ?>=(SELECT COUNT(*) FROM wish_joins WHERE wish_id=?)").bind(spots,spots,id,id,spots,id).run();
      if(!resized.meta.changes)return json({error:'Group size cannot be below the number already in the gang.'},409);
      await record(actor,'gang:size',id,String(spots));
      return json({ok:true});
    }
    if(b.action==='removeGangMember'){
      const wishId=member(b.wishId),id=member(b.userId);
      const wish=await db().prepare('SELECT user_id FROM wishes WHERE id=?').bind(wishId).first<{user_id:string}>();
      if(!wish)return json({error:'Wish not found.'},404);
      if(wish.user_id===id)return json({error:'Remove the wish itself to remove its creator.'},400);
      const removed=await db().prepare('DELETE FROM wish_joins WHERE wish_id=? AND user_id=?').bind(wishId,id).run();
      if(!removed.meta.changes)return json({error:'Member is not in this gang.'},404);
      await db().prepare("UPDATE wishes SET status=CASE WHEN (SELECT COUNT(*) FROM wish_joins WHERE wish_id=?)>=spots THEN 'ready' ELSE 'open' END WHERE id=?").bind(wishId,wishId).run();
      await record(actor,'gang:remove',wishId,id);
      return json({ok:true});
    }
    if(b.action==='attendance'){
      const eventId=member(b.eventId),id=member(b.userId);
      const event=await db().prepare('SELECT id,date,wish_id FROM events WHERE id=?').bind(eventId).first<{date:string,wish_id:string|null}>();
      if(!event)return json({error:'Plan not found.'},404);
      if(Date.parse(event.date)>now)return json({error:'Attendance can be recorded after the meetup begins.'},400);
      if(b.attended===true){
        const eligible=await db().prepare("SELECT p.id FROM profiles p LEFT JOIN member_controls mc ON mc.user_id=p.id WHERE p.id=? AND COALESCE(mc.status,'active')='active' AND (EXISTS (SELECT 1 FROM wish_joins j WHERE j.user_id=p.id AND j.wish_id=?) OR EXISTS (SELECT 1 FROM email_invites ei WHERE ei.user_id=p.id AND ei.event_id=? AND ei.status='confirmed') OR EXISTS (SELECT 1 FROM invites i WHERE i.user_id=p.id AND i.event_id=? AND i.status='confirmed'))").bind(id,event.wish_id||'',eventId,eventId).first();
        if(!eligible)return json({error:'Member must be in this gang or have a confirmed request for this plan.'},403);
        await db().prepare('INSERT OR IGNORE INTO event_attendance(id,event_id,user_id,confirmed_by,attended_at) VALUES(?,?,?,?,?)').bind(eventId+':'+id,eventId,id,actor,now).run();
      }else if(b.attended===false)await db().prepare('DELETE FROM event_attendance WHERE event_id=? AND user_id=?').bind(eventId,id).run();
      else return json({error:'Choose an attendance action.'},400);
      await record(actor,b.attended?'attendance:confirmed':'attendance:removed',eventId,id);
      return json({ok:true});
    }
    if(b.action==='eventUpdate'){
      const id=member(b.eventId),date=str(b.date,10,35);
      if(!Number.isFinite(Date.parse(date)))return json({error:'Choose a valid date.'},400);
      const event=await db().prepare('SELECT id FROM events WHERE id=?').bind(id).first();
      if(!event)return json({error:'Plan not found.'},404);
      const changed=await db().prepare('UPDATE events SET title=?,date=?,venue=?,cost=?,description=?,category=? WHERE id=? AND NOT EXISTS(SELECT 1 FROM email_deliveries WHERE event_id=events.id) AND NOT EXISTS(SELECT 1 FROM deliveries WHERE event_id=events.id) AND NOT EXISTS(SELECT 1 FROM event_attendance WHERE event_id=events.id)').bind(str(b.title,3,100),date,str(b.venue,3,150),str(b.cost,1,100),str(b.description,5,1000),str(b.category,2,30),id).run();
      if(!changed.meta.changes)return json({error:'This plan already has invitation attempts or attendance. Contact people before changing its details.'},409);
      await record(actor,'event:updated',id);
      return json({ok:true});
    }
    return json({error:'Unknown host action.'},400);
  }catch(e){return json({error:e instanceof Error&&e.message.startsWith('Please')?e.message:'The host notebook could not save that change.'},400)}
}
