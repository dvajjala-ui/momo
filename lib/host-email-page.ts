import {db} from './momo-server';
import {emailRequestVersion} from './email';
import type {EmailInviteRow,HostEmailRequest} from './invitation-types';
import type {InboxFilter} from './request-inbox';

const PAGE_SIZE=200;
type Row=EmailInviteRow&{event_title:string|null};
type Cursor={created:number;userId:string};
type Delivery={id:string;user_id:string;event_id:string;status:string;error:string|null;created:number};
type StageCounts=Record<InboxFilter,number>;
type PageOptions={cursor?:string|null;scope?:string|null;eventId?:string|null;filter?:string|null;search?:string|null};
const scopes=['all','selected','interest'];
const stages=['all','requested','reviewed','confirmed','invited','declined','unverified','attention'];

function readCursor(value:string|null):Cursor|null{
 if(value===null)return null;
 if(value.length<1||value.length>256||!/^[A-Za-z0-9_-]+$/.test(value))throw Error('Invalid inbox page cursor.');
 try{
  const [created,userId,...extra]=JSON.parse(atob(value.replace(/-/g,'+').replace(/_/g,'/'))) as unknown[];
  if(extra.length||typeof created!=='number'||!Number.isSafeInteger(created)||created<0||typeof userId!=='string'||!/^[-\w:]{1,128}$/.test(userId))throw Error();
  return {created,userId};
 }catch{throw Error('Invalid inbox page cursor.')}
}

function pageCursor(row:Row){return btoa(JSON.stringify([row.created,row.user_id])).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}

export async function hostEmailPage(options:PageOptions={}):Promise<{emailInvites:HostEmailRequest[];emailDeliveries:Delivery[];nextCursor:string|null;total:number;stageCounts:StageCounts}>{
 const cursor=readCursor(options.cursor??null),scope=options.scope||'all',filter=options.filter||'all',eventId=options.eventId||'',search=(options.search||'').trim();
 if(!scopes.includes(scope)||!stages.includes(filter)||eventId.length>60||search.length>100)throw Error('Invalid inbox filter.');
 const conditions:string[]=[],values:(string|number)[]=[];
 if(scope==='selected'){conditions.push(eventId?'i.event_id=?':'1=0');if(eventId)values.push(eventId)}
 if(scope==='interest')conditions.push('i.event_id IS NULL');
 if(search){conditions.push('('+['p.nickname','i.email','i.city','e.title'].map(field=>`instr(lower(coalesce(${field},'')),lower(?))>0`).join(' OR ')+')');values.push(search,search,search,search)}
 const from=' FROM email_invites i LEFT JOIN profiles p ON p.id=i.user_id LEFT JOIN events e ON e.id=i.event_id';
 const baseWhere=conditions.length?' WHERE '+conditions.join(' AND '):'';
 const attention="coalesce((SELECT d.status FROM email_deliveries d WHERE d.user_id=i.user_id AND d.event_id=coalesce(i.event_id,?) ORDER BY d.created DESC,d.id DESC LIMIT 1),'') IN ('failed','unknown','sending')";
 const counts=await db().prepare(`SELECT COUNT(*) AS all_count,
  SUM(CASE WHEN i.status='requested' THEN 1 ELSE 0 END) AS requested,
  SUM(CASE WHEN i.status='reviewed' THEN 1 ELSE 0 END) AS reviewed,
  SUM(CASE WHEN i.status='confirmed' THEN 1 ELSE 0 END) AS confirmed,
  SUM(CASE WHEN i.status='invited' THEN 1 ELSE 0 END) AS invited,
  SUM(CASE WHEN i.status='declined' THEN 1 ELSE 0 END) AS declined,
  SUM(CASE WHEN i.verified_at IS NULL THEN 1 ELSE 0 END) AS unverified,
  SUM(CASE WHEN ${attention} THEN 1 ELSE 0 END) AS attention${from}${baseWhere}`).bind(eventId,...values).first<Record<string,number|null>>();
 const stageCounts=Object.fromEntries(stages.map(stage=>[stage,Number(counts?.[stage==='all'?'all_count':stage]||0)])) as StageCounts;
 const pageConditions=[...conditions],pageValues=[...values];
 if(filter==='unverified')pageConditions.push('i.verified_at IS NULL');
 else if(filter==='attention'){pageConditions.push(attention);pageValues.push(eventId)}
 else if(filter!=='all'){pageConditions.push('i.status=?');pageValues.push(filter)}
 if(cursor){pageConditions.push('(i.created<? OR (i.created=? AND i.user_id>?))');pageValues.push(cursor.created,cursor.created,cursor.userId)}
 const where=pageConditions.length?' WHERE '+pageConditions.join(' AND '):'';
 const statement=db().prepare('SELECT i.*,p.nickname,e.title AS event_title'+from+where+' ORDER BY i.created DESC,i.user_id ASC LIMIT ?');
 const rows=(await statement.bind(...pageValues,PAGE_SIZE+1).all<Row>()).results;
 const page=rows.slice(0,PAGE_SIZE);
 const emailInvites=await Promise.all(page.map(async i=>({user_id:i.user_id,email:i.email,city:i.city,event_id:i.event_id,event_title:i.event_title,status:i.status,created:i.created,updated:i.updated,food_theme:i.food_theme,letter_style:i.letter_style,verified_at:i.verified_at,nickname:i.nickname,requestVersion:await emailRequestVersion(i)})));
 const attempts=db().prepare('SELECT d.id,d.user_id,d.event_id,d.status,d.error,d.created FROM email_deliveries d JOIN (SELECT i.user_id'+from+where+' ORDER BY i.created DESC,i.user_id ASC LIMIT ?) page ON page.user_id=d.user_id ORDER BY d.created DESC,d.id DESC');
 const emailDeliveries=(await attempts.bind(...pageValues,PAGE_SIZE).all<Delivery>()).results;
 return {emailInvites,emailDeliveries,nextCursor:rows.length>PAGE_SIZE?pageCursor(page[page.length-1]):null,total:stageCounts[filter as InboxFilter],stageCounts};
}
