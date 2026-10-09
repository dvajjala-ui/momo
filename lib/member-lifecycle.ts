import {db,bucket,photosEnabled} from './momo-server';

// Shared by self-service deletion and host moderation. Keep the hashed email
// delivery tombstone, but remove its link to the member and all contact data.
export async function deleteMemberData(userId:string,now=Date.now()){
  const p=await db().prepare('SELECT photo FROM profiles WHERE id=?').bind(userId).first<{photo:string|null}>();
  if(p?.photo&&photosEnabled())await bucket().delete(p.photo);
  await db().batch([
    db().prepare("UPDATE email_deliveries SET user_id='',revision='',unsubscribe_hash=NULL,message_id=NULL,error=NULL,status='withdrawn',updated=? WHERE user_id=?").bind(now,userId),
    db().prepare('DELETE FROM email_invites WHERE user_id=?').bind(userId),
    db().prepare('DELETE FROM deliveries WHERE user_id=?').bind(userId),
    db().prepare('DELETE FROM reports WHERE user_id=? OR message_id IN (SELECT id FROM messages WHERE user_id=? OR room IN (SELECT \'w_\'||id FROM wishes WHERE user_id=?) OR room IN (SELECT \'d_\'||id FROM direct_threads WHERE user_a=? OR user_b=?)) OR (kind=\'wish\' AND message_id IN (SELECT id FROM wishes WHERE user_id=?))').bind(userId,userId,userId,userId,userId,userId),
    db().prepare("DELETE FROM messages WHERE user_id=? OR room IN (SELECT 'w_'||id FROM wishes WHERE user_id=?) OR room IN (SELECT 'd_'||id FROM direct_threads WHERE user_a=? OR user_b=?)").bind(userId,userId,userId,userId),
    db().prepare('DELETE FROM direct_threads WHERE user_a=? OR user_b=?').bind(userId,userId),
    db().prepare('DELETE FROM event_attendance WHERE user_id=?').bind(userId),
    db().prepare('UPDATE events SET wish_id=NULL WHERE wish_id IN (SELECT id FROM wishes WHERE user_id=?)').bind(userId),
    db().prepare('DELETE FROM invites WHERE user_id=?').bind(userId),
    db().prepare('DELETE FROM phone_verifications WHERE user_id=?').bind(userId),
    db().prepare('DELETE FROM blocks WHERE user_id=? OR blocked_id=?').bind(userId,userId),
    db().prepare('DELETE FROM wish_joins WHERE user_id=? OR wish_id IN (SELECT id FROM wishes WHERE user_id=?)').bind(userId,userId),
    db().prepare('DELETE FROM wishes WHERE user_id=?').bind(userId),
    db().prepare("UPDATE wishes SET status=CASE WHEN (SELECT COUNT(*) FROM wish_joins j WHERE j.wish_id=wishes.id)>=spots THEN 'ready' ELSE 'open' END"),
    db().prepare('DELETE FROM member_controls WHERE user_id=?').bind(userId),
    db().prepare('DELETE FROM sessions WHERE user_id=?').bind(userId),
    db().prepare("UPDATE admin_audit SET actor_id=CASE WHEN actor_id=? THEN 'deleted-member' ELSE actor_id END,subject_id=CASE WHEN subject_id=? THEN 'deleted-member' ELSE subject_id END WHERE actor_id=? OR subject_id=?").bind(userId,userId,userId,userId),
    db().prepare('DELETE FROM profiles WHERE id=?').bind(userId),
  ]);
}
