import {CalendarPlus,MapPin} from 'lucide-react';
import type {InvitationEvent} from '../lib/invitation-types';
import {venueMapUrl} from '../lib/plan-calendar';

export default function PlanTools({event}:{event:InvitationEvent}){
  return <div className="plan-tools"><div className="actions">
    <a className="button small" href={venueMapUrl(event.venue)} target="_blank" rel="noreferrer"><MapPin size={16}/>View venue map<span className="sr-only"> (Google Maps, new tab)</span></a>
    <a className="button small" href={'/api/plans/'+encodeURIComponent(event.id)+'/calendar'} download><CalendarPlus size={16}/>Save plan reminder</a>
  </div><p className="hint">The map opens Google Maps. A calendar reminder saves the start time, not a confirmed place. Check the host’s plan for the end time and any changes before travelling.</p></div>;
}
