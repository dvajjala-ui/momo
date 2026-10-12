import type {InvitationEvent} from '../lib/invitation-types';
import type {WishData} from './wishes';

export type CommunityEvent=InvitationEvent&{category:string;wish_id?:string|null};
export type GalleryPhoto={id:string;caption:string;category:string;created?:number};
export type CommunityData={events:CommunityEvent[];gallery:GalleryPhoto[];wishes:WishData[];pilot?:{active:number;capacity:number}};
export type MemberProfile={nickname:string;avatar:number;photo?:string|null};
export type GangRoom={room:string;title:string};
export type EmailInviteReceipt={reference:string;maskedEmail:string;city:string;eventTitle?:string;status:string;deliveryStatus:string;verified:boolean;letterStyle:string;eventId?:string|null};
export type PhoneInviteReceipt={reference:string;maskedPhone:string;city:string;eventTitle?:string;status:string;deliveryStatus:string;phoneVerified:boolean;letterStyle:string;event_id?:string|null;created:number;foodTheme:string};

type MemberBase={admin?:boolean;auth?:'device';storage?:string;error?:string};
export type SignedOutMember=MemberBase&{signedIn:false;profile?:never;gangs?:never;photos?:never;phoneVerificationAvailable?:never;emailConfigured?:never;emailInvite?:never;invite?:never};
export type SignedInMember=MemberBase&{signedIn:true;profile:MemberProfile|null;gangs:GangRoom[];photos:boolean;phoneVerificationAvailable:boolean;emailConfigured:boolean;emailInvite:EmailInviteReceipt|null;invite:PhoneInviteReceipt|null};
export type MemberState=SignedOutMember|SignedInMember;

export type HostInvite={user_id:string;nickname?:string|null;city:string;phone:string;status:string;phone_verified_at?:number|null;created:number;food_theme:string;letter_style?:'hero'|'princess'|'notebook'|null};
export type HostDelivery={user_id:string;event_id:string;status:string;error?:string|null};
export type HostReport={id:string;kind:'wish'|'message';message_id:string;body?:string|null;reason:string};
export type HostEmailInvite={user_id:string;email:string;city:string;event_id:string|null;status:string;verified_at:number|null;nickname?:string|null;food_theme:string;letter_style:string};
export type HostState={error?:string;email?:{configured:boolean};emailInvites?:HostEmailInvite[];emailDeliveries?:HostDelivery[];whatsapp?:{configured:boolean;missing:string[]};deliveries:HostDelivery[];invites:HostInvite[];reports:HostReport[]};
export type InvitationReadiness={eventId:string;title:string;configured:boolean;eligible:number;entries:{nickname:string;maskedPhone:string;label:string}[]};
