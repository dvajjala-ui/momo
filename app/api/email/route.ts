import {emailTokenAction} from '../../../lib/email';
import {json,sameOrigin,readBounded} from '../../../lib/momo-server';
// Token possession proves the inbox. No device login required; links can open on another device.
export async function POST(req:Request){try{if(!sameOrigin(req))return json({error:'Please confirm from this site.'},403);const b=JSON.parse(new TextDecoder().decode(await readBounded(req,1000)));return json(await emailTokenAction(b.action,b.token))}catch(error){return json({error:error instanceof Error&&error.message.startsWith('Please')?error.message:'Please try again later.'},400)}}
