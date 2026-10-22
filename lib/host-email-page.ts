import {db} from './momo-server';
import {emailRequestVersion} from './email';
import type {EmailInviteRow,HostEmailRequest} from './invitation-types';

const PAGE_SIZE=200;
type Row=EmailInviteRow&{event_title:string|null};
type Cursor={created:number;userId:string};
type Delivery={id:string;user_id:string;event_id:string;status:string;error:string|null;created:number};

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

export async function hostEmailPage(value:string|null=null):Promise<{emailInvites:HostEmailRequest[];emailDeliveries:Delivery[];nextCursor:string|null}>{
 const cursor=readCursor(value);
 const where=cursor?' WHERE i.created<? OR (i.created=? AND i.user_id>?)':'';
 const statement=db().prepare('SELECT i.*,p.nickname,e.title AS event_title FROM email_invites i LEFT JOIN profiles p ON p.id=i.user_id LEFT JOIN events e ON e.id=i.event_id'+where+' ORDER BY i.created DESC,i.user_id ASC LIMIT ?');
 const rows=(await (cursor?statement.bind(cursor.created,cursor.created,cursor.userId,PAGE_SIZE+1):statement.bind(PAGE_SIZE+1)).all<Row>()).results;
 const page=rows.slice(0,PAGE_SIZE);
 const emailInvites=await Promise.all(page.map(async i=>({user_id:i.user_id,email:i.email,city:i.city,event_id:i.event_id,event_title:i.event_title,status:i.status,created:i.created,updated:i.updated,food_theme:i.food_theme,letter_style:i.letter_style,verified_at:i.verified_at,nickname:i.nickname,requestVersion:await emailRequestVersion(i)})));
 const attempts=db().prepare('SELECT d.id,d.user_id,d.event_id,d.status,d.error,d.created FROM email_deliveries d JOIN (SELECT i.user_id FROM email_invites i'+where+' ORDER BY i.created DESC,i.user_id ASC LIMIT ?) page ON page.user_id=d.user_id ORDER BY d.created DESC');
 const emailDeliveries=(await (cursor?attempts.bind(cursor.created,cursor.created,cursor.userId,PAGE_SIZE):attempts.bind(PAGE_SIZE)).all<Delivery>()).results;
 return {emailInvites,emailDeliveries,nextCursor:rows.length>PAGE_SIZE?pageCursor(page[page.length-1]):null};
}
