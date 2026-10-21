import type {InvitationEvent} from './invitation-types';
import {planShareUrl} from './plan-discovery';

function calendarText(value:string){
  return value.replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'');
}
function calendarDate(value:number){return new Date(value).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z')}
function fold(line:string){
  const encoder=new TextEncoder();let current='',size=0;const lines:string[]=[];
  for(const character of line){const bytes=encoder.encode(character).length;if(size+bytes>75){lines.push(current);current=' ';size=1}current+=character;size+=bytes}
  lines.push(current);return lines.join('\r\n');
}

export function venueMapUrl(venue:string){return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(venue)}

export function buildPlanCalendar(event:InvitationEvent,pageUrl:string,now=Date.now()){
  const starts=Date.parse(event.date);
  if(!Number.isFinite(starts)||starts<=now)throw Error('This plan is not open for a reminder.');
  const url=planShareUrl(pageUrl,event.id);
  const description=['Plan reminder only. Your place must be confirmed separately with the host.',event.description,'Full cost: '+event.cost,'Only the published start time is saved; confirm the end time with the host.','Check the current plan before travelling. Downloaded reminders do not update automatically.',url].join('\n\n');
  return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Momo to Pizza//Plan Reminder//EN','CALSCALE:GREGORIAN','BEGIN:VEVENT',
    'UID:'+calendarText('momo-'+event.id+'@'+new URL(url).hostname),'DTSTAMP:'+calendarDate(now),'DTSTART:'+calendarDate(starts),
    'SUMMARY:'+calendarText('Momo plan reminder: '+event.title),'LOCATION:'+calendarText(event.venue),'DESCRIPTION:'+calendarText(description),
    'URL:'+url,'STATUS:TENTATIVE','TRANSP:TRANSPARENT','BEGIN:VALARM','ACTION:DISPLAY','TRIGGER:-PT15M',
    'DESCRIPTION:Check your Momo plan and host confirmation.','END:VALARM','END:VEVENT','END:VCALENDAR'].map(fold).join('\r\n')+'\r\n';
}
