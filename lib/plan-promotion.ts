import type {InvitationEvent} from './invitation-types';
import {planShareUrl} from './plan-discovery';

export const PROMOTION_CHANNELS=[{id:'whatsapp',label:'WhatsApp group'},{id:'reddit',label:'Reddit / local community'},{id:'instagram',label:'Instagram caption'}] as const;
export type PromotionChannel=typeof PROMOTION_CHANNELS[number]['id'];

export function promotionDraft(event:InvitationEvent,channel:PromotionChannel,pageUrl:string,now=Date.now()){
  if(!Number.isFinite(Date.parse(event.date))||Date.parse(event.date)<=now)throw Error('Choose an upcoming published plan before preparing a promotion.');
  if(!PROMOTION_CHANNELS.some(item=>item.id===channel))throw Error('Choose a promotion channel.');
  const when=new Date(event.date).toLocaleString('en-IN',{dateStyle:'full',timeStyle:'short',timeZone:'Asia/Kolkata'})+' IST';
  const opening=channel==='reddit'?`${event.title} | a Momo meetup`:channel==='instagram'?`A little plan to step out for.\n${event.title}`:`Anyone up for ${event.title}?`;
  return [opening,`When: ${when}\nWhere: ${event.venue}\nFull cost: ${event.cost}`,event.description,`Request an invitation: ${planShareUrl(pageUrl,event.id)}`,'The host confirms your place separately. Momo collects no payment here.','Momo to Pizza'].join('\n\n');
}
