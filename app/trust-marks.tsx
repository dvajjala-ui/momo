import {BadgeCheck,UserRoundCheck} from 'lucide-react';

type TrustState={contactChecked?:boolean;attended?:boolean};

export default function TrustMarks({state}:{state:TrustState}){
  if(!state.contactChecked&&!state.attended)return null;
  return <span className="trust-marks" aria-label="Momo trust checks">
    {state.contactChecked&&<span title="This person confirmed an email address or phone number"><BadgeCheck size={13}/>contact checked</span>}
    {state.attended&&<span title="A host recorded this person at a Momo meetup"><UserRoundCheck size={13}/>met at Momo</span>}
  </span>;
}
