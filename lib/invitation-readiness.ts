import {db} from './momo-server';
import {PHONE_VERIFICATION_WINDOW} from './phone-verification';
import {whatsappConfig} from './whatsapp';

export async function invitationReadiness(eventId:string){
  const [events,requests]=await db().batch([
    db().prepare('SELECT id,title,date FROM events WHERE id=?').bind(eventId),
    db().prepare('SELECT i.user_id,i.phone,i.consent,i.status,i.event_id,p.nickname,v.verified_at,d.id AS attempt FROM invites i LEFT JOIN profiles p ON p.id=i.user_id LEFT JOIN phone_verifications v ON v.user_id=i.user_id AND v.phone=i.phone AND v.verified_at>=? LEFT JOIN deliveries d ON d.user_id=i.user_id AND d.event_id=? ORDER BY i.created ASC LIMIT 201').bind(Date.now()-PHONE_VERIFICATION_WINDOW,eventId),
  ]);
  const event=events.results[0] as {title:string,date:string}|undefined;
  if(!event||!Number.isFinite(Date.parse(String(event.date)))||Date.parse(String(event.date))<=Date.now())throw Error('Choose an upcoming published plan.');
  if(requests.results.length>200)throw Error('This preview supports up to 200 requests. Narrow the invitation workflow before a larger send.');
  const labels={noConsent:'No invitation consent',declined:'Request declined',otherPlan:'Asked for a different plan',unverified:'Number not verified',attempted:'Invitation already attempted',review:'Host review needed',ready:'Ready after business setup'};
  const rows=requests.results as unknown as {nickname:string|null,phone:string,consent:string,status:string,event_id:string|null,verified_at:number|null,attempt:string|null}[];
  const entries=rows.map(r=>{
    const reason=!r.consent?'noConsent':r.status==='declined'?'declined':r.event_id&&r.event_id!==eventId?'otherPlan':!r.verified_at?'unverified':r.attempt?'attempted':!['reviewed','confirmed','invited'].includes(r.status)?'review':'ready';
    return {nickname:r.nickname||'A person at the table',maskedPhone:'•••• '+String(r.phone).slice(-4),reason,label:labels[reason]};
  });
  const configured=whatsappConfig().configured;
  return {eventId,title:event.title,configured,eligible:entries.filter(r=>r.reason==='ready').length,entries};
}
