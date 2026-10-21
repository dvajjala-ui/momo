import assert from 'node:assert/strict';
import {upcomingPlans,planShareUrl} from '../lib/plan-discovery.ts';

const now=Date.parse('2026-11-01T12:00:00Z');
const plan=(id,date,details={})=>({id,date,title:'Books and chai',venue:'Ahmedabad public cafe',description:'A quiet table for reading',cost:'Pay for your own chai',...details});
const events=[
  plan('later','2026-11-02T09:00:00+05:30'),
  plan('started','2026-11-01T12:00:00Z'),
  plan('past','2026-10-31T17:00:00Z'),
  plan('invalid','not-a-date'),
  plan('earlier','2026-11-01T08:30:00-04:00'),
  plan('other','2026-11-04T12:00:00Z',{title:'Badminton',venue:'Public court',description:'Bring your racket',cost:'Court split equally'})
];
assert.deepEqual(upcomingPlans(events,now).map(p=>p.id),['earlier','later','other'],'only future valid plans appear, sorted by instant across timezones');
assert.equal(events[0].id,'later','sorting must not mutate shared event data');
assert.deepEqual(upcomingPlans(events,now,'  ＢＯＯＫＳ   ahmedabad  ').map(p=>p.id),['earlier','later'],'search handles case, spacing and Unicode forms across fields');
assert.deepEqual(upcomingPlans(events,now,'court equally').map(p=>p.id),['other'],'venue and cost can be searched together');
assert.deepEqual(upcomingPlans(events,now,'no matching plan'),[]);
assert.deepEqual(upcomingPlans(events,Date.parse('2026-11-10T00:00:00Z')),[],'the same plan list expires as time advances');
const shared=new URL(planShareUrl('https://momo.example/join?verify=private-token&email=person%40example.test#private','public-event'));
assert.equal(shared.pathname,'/join');assert.deepEqual([...shared.searchParams],[['event','public-event']]);assert.equal(shared.hash,'');
assert.equal(shared.origin,'https://momo.example','shares stay on the current deployment');
console.log('PASS upcoming-plan expiry, timezone order, search and public-only sharing');
