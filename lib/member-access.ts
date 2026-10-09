import {db} from './momo-server';

export async function memberIsActive(userId:string){
  const control=await db().prepare('SELECT status FROM member_controls WHERE user_id=?').bind(userId).first<{status:string}>();
  return control?.status!=='suspended';
}

// Both people must still opt in, remain unblocked, and share an attendance
// record. Revoking any condition closes existing conversations on the server.
export async function canUseDirectThread(threadId:string,userId:string){
  const row=await db().prepare(`SELECT t.id FROM direct_threads t
    JOIN profiles a ON a.id=t.user_a JOIN profiles b ON b.id=t.user_b
    WHERE t.id=? AND (t.user_a=? OR t.user_b=?) AND a.dm_opt_in=1 AND b.dm_opt_in=1
      AND NOT EXISTS (SELECT 1 FROM member_controls c WHERE c.user_id IN (t.user_a,t.user_b) AND c.status='suspended')
      AND NOT EXISTS (SELECT 1 FROM blocks x WHERE (x.user_id=t.user_a AND x.blocked_id=t.user_b) OR (x.user_id=t.user_b AND x.blocked_id=t.user_a))
      AND EXISTS (SELECT 1 FROM event_attendance x JOIN event_attendance y ON y.event_id=x.event_id JOIN events e ON e.id=x.event_id
        WHERE x.user_id=t.user_a AND y.user_id=t.user_b LIMIT 1)`).bind(threadId,userId,userId).first();
  return !!row;
}

export async function canStartDirectThread(userA:string,userB:string){
  if(userA===userB)return false;
  const row=await db().prepare(`SELECT a.id FROM profiles a JOIN profiles b ON b.id=?
    WHERE a.id=? AND a.dm_opt_in=1 AND b.dm_opt_in=1
      AND NOT EXISTS (SELECT 1 FROM member_controls c WHERE c.user_id IN (a.id,b.id) AND c.status='suspended')
      AND NOT EXISTS (SELECT 1 FROM blocks x WHERE (x.user_id=a.id AND x.blocked_id=b.id) OR (x.user_id=b.id AND x.blocked_id=a.id))
      AND EXISTS (SELECT 1 FROM event_attendance x JOIN event_attendance y ON y.event_id=x.event_id JOIN events e ON e.id=x.event_id
        WHERE x.user_id=a.id AND y.user_id=b.id LIMIT 1)`).bind(userB,userA).first();
  return !!row;
}
