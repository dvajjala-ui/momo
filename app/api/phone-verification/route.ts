import {db,identity,json} from '../../../lib/momo-server';
import {verificationSetup,PHONE_VERIFICATION_WINDOW} from '../../../lib/phone-verification';

export async function GET(){
  try{
    const user=await identity();
    if(!user)return json({error:'Pull up a chair first.'},401);
    const verified=await db().prepare('SELECT i.user_id FROM invites i JOIN phone_verifications v ON v.user_id=i.user_id AND v.phone=i.phone WHERE i.user_id=? AND v.verified_at>=? AND i.consent IS NOT NULL AND i.consent<>\'\'').bind(user.userId,Date.now()-PHONE_VERIFICATION_WINDOW).first();
    return json({verified:!!verified,available:verificationSetup().available});
  }catch{return json({error:'We could not check your number right now.'},503);}
}
