export type GuidedPlan={title:string;date:string;venue:string;cost:string;description:string;category:string};

function text(value:unknown,label:string,min:number,max:number,multiline=false){
  if(typeof value!=='string')throw Error('Please enter '+label+'.');
  const result=multiline?value.trim():value.replace(/\s+/g,' ').trim();
  if(result.length<min||result.length>max)throw Error(`Please keep ${label} between ${min} and ${max} characters.`);
  return result;
}

export function guidedPlan(input:Record<string,unknown>,now=Date.now(),preview=false):GuidedPlan{
  const raw=input.planDetails;
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Please complete the guided plan details.');
  const details=raw as Record<string,unknown>;
  const title=text(input.title,'the plan name',3,100),date=text(input.date,'the start date',10,35),venue=text(input.venue,'the public venue and address',3,150),cost=text(input.cost,'the full cost',1,100),category=text(input.category,'the category',2,30);
  const starts=Date.parse(date),ends=Date.parse(text(details.endDate,'the finish date',10,35));
  if(!Number.isFinite(starts)||starts<=now)throw Error('Please choose a future start date and time.');
  if(!Number.isFinite(ends)||ends<=starts)throw Error('Please choose a finish after the start time.');
  const capacity=Number(details.capacity);
  if(!Number.isInteger(capacity)||capacity<2||capacity>100)throw Error('Please choose a planned group size from 2 to 100.');
  const host=text(details.hostName,'the host name',2,60),meetingPoint=text(details.meetingPoint,'the meeting point',3,150),contact=text(details.contact,'the public host contact',3,120),emergency=text(details.emergencyPlan,'the exit and help plan',5,200),notes=text(details.notes,'what the group will do',5,500,true);
  const access=details.access?text(details.access,'the venue access notes',2,160):'Ask the host about access and dietary needs before confirming.';
  if(!preview&&details.publicDetailsConfirmed!==true)throw Error('Please confirm the venue details and permission to publish the host contact.');
  const finish=new Date(ends).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Kolkata'})+' IST';
  const description=[notes,`Host: ${host}`,`Planned finish: ${finish}`,`Planned group: ${capacity} people. The host confirms places.`,`Meet here: ${meetingPoint}`,`Host / moderation contact (public): ${contact}`,`Venue access: ${access}`,`Exit and help plan: ${emergency}`].join('\n\n');
  if(description.length>1000)throw Error('Please shorten the plan notes; the full description must fit 1,000 characters.');
  return {title,date,venue,cost,description,category};
}
