import {chatConfig,chatRequest,roomTicket} from '../../../lib/realtime';
import {identity,isAdmin,json,readBounded,sameOrigin} from '../../../lib/momo-server';
import {validRoom} from '../../../lib/chat-core.mjs';

export async function POST(req:Request){
  try{
    if(!sameOrigin(req))return json({error:'Please submit from this site.'},403);
    const user=await identity();if(!user)return json({error:'Pull up a chair first.'},401);
    const config=chatConfig();if(!config)return json({enabled:false});
    if(req.headers.get('origin')!==config.appOrigin)return json({error:'This chat connection is not configured for this site.'},403);
    const body=JSON.parse(new TextDecoder().decode(await readBounded(req,1000)));
    if(!validRoom(body.room))return json({error:'Choose a room.'},400);
    // Identity and the host role come only from the existing server session.
    const seat={room:body.room,userId:user.userId,admin:isAdmin(user)};
    // Validate the deployed chat binding too; never issue a ticket for an
    // unavailable database/room and then expose stale cached history.
    const check=await chatRequest(config,'access',seat);
    if(check.status!==200)return json({error:check.result.error||'Chat could not open right now.'},check.status);
    return json({enabled:true,...await roomTicket(config,seat)});
  }catch{return json({error:'Chat could not open right now. Please retry.'},503)}
}
