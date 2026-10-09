import {db,identity,json,readBounded,sameOrigin,str} from '../../../lib/momo-server';
import {memberIsActive,canStartDirectThread} from '../../../lib/member-access';
import {sha256} from '../../../lib/device-session';
type PeerRow={id:string;nickname:string;avatar:number};
type ThreadRow={id:string;user_a:string;user_b:string;created:number;nickname_a:string;nickname_b:string};

export async function GET(){
  try{
    const user=await identity();
    if(!user)return json({error:'Pull up a chair first.'},401);
    if(!await memberIsActive(user.userId))return json({error:'This seat is paused. Contact the host if this seems wrong.'},403);
    const profile=await db().prepare('SELECT dm_opt_in FROM profiles WHERE id=?').bind(user.userId).first<{dm_opt_in:number}>();
    const attended=await db().prepare('SELECT COUNT(*) AS n FROM event_attendance a JOIN events e ON e.id=a.event_id WHERE a.user_id=?').bind(user.userId).first<{n:number}>();
    const blocked=(await db().prepare('SELECT b.blocked_id AS id,p.nickname FROM blocks b JOIN profiles p ON p.id=b.blocked_id WHERE b.user_id=? ORDER BY p.nickname COLLATE NOCASE LIMIT 500').bind(user.userId).all()).results;
    if(!profile?.dm_opt_in)return json({optedIn:false,attended:Number(attended?.n||0)>0,peers:[],threads:[],blocked});
    const peers=(await db().prepare(`SELECT DISTINCT p.id,p.nickname,p.avatar FROM event_attendance mine
      JOIN event_attendance theirs ON theirs.event_id=mine.event_id AND theirs.user_id<>mine.user_id
      JOIN events e ON e.id=mine.event_id
      JOIN profiles p ON p.id=theirs.user_id AND p.dm_opt_in=1
      WHERE mine.user_id=?
        AND NOT EXISTS (SELECT 1 FROM member_controls c WHERE c.user_id=p.id AND c.status='suspended')
        AND NOT EXISTS (SELECT 1 FROM blocks b WHERE (b.user_id=? AND b.blocked_id=p.id) OR (b.user_id=p.id AND b.blocked_id=?))
      ORDER BY p.nickname COLLATE NOCASE LIMIT 500`).bind(user.userId,user.userId,user.userId).all<PeerRow>()).results;
    const allowed=new Set(peers.map(p=>p.id));
    const threads=(await db().prepare(`SELECT t.id,t.user_a,t.user_b,t.created,pa.nickname AS nickname_a,pb.nickname AS nickname_b
      FROM direct_threads t JOIN profiles pa ON pa.id=t.user_a JOIN profiles pb ON pb.id=t.user_b
      WHERE t.user_a=? OR t.user_b=? ORDER BY t.created DESC LIMIT 100`).bind(user.userId,user.userId).all<ThreadRow>()).results
      .filter(t=>allowed.has(t.user_a===user.userId?t.user_b:t.user_a))
      .map(t=>({room:'d_'+t.id,peerId:t.user_a===user.userId?t.user_b:t.user_a,nickname:t.user_a===user.userId?t.nickname_b:t.nickname_a}));
    return json({optedIn:true,attended:Number(attended?.n||0)>0,peers,threads,blocked});
  }catch(e){console.error('direct list failed',e);return json({error:'Private notes could not load right now.'},503)}
}

export async function POST(req:Request){
  try{
    if(!sameOrigin(req))return json({error:'Please submit from this site.'},403);
    const user=await identity();
    if(!user)return json({error:'Pull up a chair first.'},401);
    if(!await memberIsActive(user.userId))return json({error:'This seat is paused. Contact the host if this seems wrong.'},403);
    const b=JSON.parse(new TextDecoder().decode(await readBounded(req,2000))||'{}');
    if(b.action==='preference'){
      if(typeof b.enabled!=='boolean')return json({error:'Choose whether to open private notes.'},400);
      const attended=await db().prepare('SELECT a.id FROM event_attendance a JOIN events e ON e.id=a.event_id WHERE a.user_id=? LIMIT 1').bind(user.userId).first();
      if(b.enabled&&!attended)return json({error:'Private notes open after a host confirms your attendance.'},403);
      const result=await db().prepare('UPDATE profiles SET dm_opt_in=? WHERE id=?').bind(b.enabled?1:0,user.userId).run();
      if(!result.meta.changes)return json({error:'Pick a nickname first.'},400);
      return json({ok:true});
    }
    if(b.action==='start'){
      const peerId=str(b.peerId,1,150);
      if(!await canStartDirectThread(user.userId,peerId))return json({error:'Private notes need shared confirmed attendance and both people opting in.'},403);
      const [userA,userB]=[user.userId,peerId].sort();
      const id=(await sha256('direct:'+JSON.stringify([userA,userB]))).slice(0,32);
      await db().prepare('INSERT OR IGNORE INTO direct_threads(id,user_a,user_b,created) VALUES(?,?,?,?)').bind(id,userA,userB,Date.now()).run();
      return json({room:'d_'+id});
    }
    if(b.action==='blockPeer'){
      const peerId=str(b.peerId,1,150);
      if(peerId===user.userId)return json({error:'Choose another member.'},400);
      await db().prepare('INSERT OR IGNORE INTO blocks(id,user_id,blocked_id) VALUES(?,?,?)').bind(user.userId+':'+peerId,user.userId,peerId).run();
      return json({ok:true});
    }
    if(b.action==='unblockPeer'){
      const peerId=str(b.peerId,1,150);
      await db().prepare('DELETE FROM blocks WHERE user_id=? AND blocked_id=?').bind(user.userId,peerId).run();
      return json({ok:true});
    }
    return json({error:'Unknown action.'},400);
  }catch(e){return json({error:e instanceof Error&&e.message.startsWith('Please')?e.message:'Private notes could not save that change.'},400)}
}
