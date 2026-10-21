import type {InvitationEvent} from './invitation-types';

function searchable(text:string){return text.normalize('NFKC').toLocaleLowerCase('en').replace(/\s+/g,' ').trim()}

export function upcomingPlans<T extends InvitationEvent>(events:T[],now:number,query=''):T[]{
  const terms=searchable(query).split(' ').filter(Boolean);
  return events.filter(event=>{
    const starts=Date.parse(event.date);
    const text=searchable([event.title,event.venue,event.description,event.cost].join(' '));
    return Number.isFinite(starts)&&starts>now&&terms.every(term=>text.includes(term));
  }).sort((a,b)=>Date.parse(a.date)-Date.parse(b.date)||a.id.localeCompare(b.id));
}

// Construct a public link afresh: invitation tokens and personal URL parameters never travel with it.
export function planShareUrl(pageUrl:string,eventId:string){
  const url=new URL('/join',new URL(pageUrl).origin);
  url.searchParams.set('event',eventId);
  return url.toString();
}
