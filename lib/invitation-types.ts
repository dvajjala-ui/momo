export type InvitationEvent={id:string,title:string,date:string,venue:string,cost:string,description:string};
export type EmailInviteRow={user_id:string,email:string,city:string,event_id:string|null,consent:string,status:string,food_theme:string,letter_style:string,revision:string,created:number,updated:number,verified_at:number|null,verify_hash:string|null,verify_expires:number|null,nickname?:string|null};
export type EmailInviteInput={email:unknown,city:unknown,consent:unknown,adult:unknown,eventId?:unknown,foodTheme?:unknown,letterStyle?:unknown};
