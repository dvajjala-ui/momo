# Connecting Momo to WhatsApp Business

The integration code is implemented. A real business sender is not connected, and no WhatsApp message was sent during this build.

## Built

Host-only template sending; saved opt-in checks; duplicate-send protection per person/event; accepted/sent/delivered/read/failed/unknown status; HMAC-signed webhook validation; STOP/UNSUBSCRIBE/CANCEL/QUIT opt-out; host setup checklist; participant request receipt. Saving the signup form does not send a message.

## Required owner setup

1. Set up the actual Meta business app and WhatsApp sender.
2. Obtain the sender phone-number ID and server-side access token with the required messaging permissions.
3. Choose a currently supported Graph API version in Meta.
4. Approve an invitation template and language.
5. Configure the app secret and a private random webhook verification token.
6. Make the HTTPS webhook reachable and verify it with Meta. The current owner-private Site requires sign-in and cannot receive external callbacks directly. Make a deliberate public-hosting decision or use a separately secured public relay. Never place a private-site bypass token in the URL.
7. Verify recipient phone ownership or complete a documented host verification process. A typed number and checkbox do not prove control of a phone.

Set runtime values in private hosting settings. Do not paste tokens in chat, client code or GitHub:

```
WHATSAPP_ACCESS_TOKEN       secret
WHATSAPP_PHONE_NUMBER_ID    sender ID
WHATSAPP_GRAPH_VERSION      supported vNN.N
WHATSAPP_TEMPLATE_NAME      approved template
WHATSAPP_TEMPLATE_LANGUAGE  approved language
WHATSAPP_APP_SECRET         secret
WHATSAPP_VERIFY_TOKEN       secret
WHATSAPP_WEBHOOK_PUBLIC     true only after public verification succeeds
WHATSAPP_PHONE_VERIFICATION_READY true only after the verification prerequisite is met
```

“Configured” means the settings exist; it is not proof of delivery. Test with your own verified number before inviting anyone else.

## Template contract

The sender uses a BODY with four text parameters: meetup title; date/time in India; public venue; full cost. Proposed copy to submit to Meta (not yet approved):

> A little Momo plan for your weekend: {{1}}.
> When: {{2}}
> Where: {{3}}
> Full cost: {{4}}
> Reply YES if you’d like a seat; the host will confirm. Reply STOP to leave the invite list.

Choose the appropriate category in Meta. The approved template must use this parameter order.

## Callback

Path: `/api/whatsapp/webhook`

GET checks the verify token and returns the challenge. POST checks `X-Hub-Signature-256` against the raw body using the app secret, and accepts only events for the configured sender. Receipt processing does not downgrade read/delivered status. Opt-out removes matching invite requests.

## Limits

A network timeout is recorded as unknown, with no automatic retry because Meta may have accepted the message. Repeated clicks for the same person/event are rejected. Inspect provider status before manual recovery. There is no automatic failed-send retry or automatic booking when someone replies YES; the host confirms attendance. No billing terms or payment methods were accepted.

Sources: Meta’s Cloud API collection at https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api ; webhook reference at https://whatsapp.github.io/WhatsApp-Nodejs-SDK/api-reference/webhooks/start/ (archived SDK; the app does not depend on it); messaging policy at https://business.whatsapp.com/policy .
