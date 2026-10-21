import {db,json} from '../../../../../lib/momo-server';
import {buildPlanCalendar} from '../../../../../lib/plan-calendar';
import type {InvitationEvent} from '../../../../../lib/invitation-types';

export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const{id}=await params;
    if(!/^[0-9a-f-]{36}$/.test(id))return json({error:'This plan is no longer available.'},404);
    const event=await db().prepare('SELECT id,title,date,venue,cost,description FROM events WHERE id=?').bind(id).first<InvitationEvent>();
    if(!event)return json({error:'This plan is no longer available.'},404);
    const now=Date.now();
    if(!Number.isFinite(Date.parse(event.date))||Date.parse(event.date)<=now)return json({error:'This plan has started. A new reminder is not available.'},409);
    return new Response(buildPlanCalendar(event,req.url,now),{headers:{'Content-Type':'text/calendar; charset=utf-8','Content-Disposition':'attachment; filename="momo-plan-reminder.ics"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
  }catch{return json({error:'We could not create this reminder. Please try again.'},503)}
}
