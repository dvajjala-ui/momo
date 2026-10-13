type TurnstileApi={
  render:(container:HTMLElement,options:{sitekey:string;action:string;callback:(token:string)=>void;'error-callback':()=>void;'expired-callback':()=>void})=>string;
  remove:(id:string)=>void;
};
type TurnstileWindow=Window&{turnstile?:TurnstileApi};
let scriptPromise:Promise<TurnstileApi>|null=null;
let challengeOpen=false;

function loadTurnstile(){
  const browser=window as TurnstileWindow;
  if(browser.turnstile)return Promise.resolve(browser.turnstile);
  if(scriptPromise)return scriptPromise;
  scriptPromise=new Promise<TurnstileApi>((resolve,reject)=>{
    const script=document.createElement('script');
    script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async=true;
    const timeout=setTimeout(()=>{script.remove();reject(new Error('Seat verification timed out.'))},20000);
    script.onload=()=>{clearTimeout(timeout);if(browser.turnstile)resolve(browser.turnstile);else reject(new Error('Seat verification did not load.'))};
    script.onerror=()=>{clearTimeout(timeout);script.remove();reject(new Error('Seat verification did not load.'))};
    document.head.appendChild(script);
  }).catch(error=>{scriptPromise=null;throw error});
  return scriptPromise;
}

export function solveSeatChallenge(sitekey:string):Promise<string>{
  if(challengeOpen)return Promise.reject(new Error('Seat verification is already open.'));
  challengeOpen=true;
  return new Promise<string>((resolve,reject)=>{
    const dialog=document.createElement('dialog');
    dialog.className='seat-challenge-dialog';
    dialog.setAttribute('aria-labelledby','seat-challenge-title');
    const title=document.createElement('h2');title.id='seat-challenge-title';title.textContent='One quick check.';
    const note=document.createElement('p');note.textContent='Verify this device to pull up a chair.';
    const widget=document.createElement('div');widget.className='seat-challenge-widget';
    const cancel=document.createElement('button');cancel.type='button';cancel.className='button';cancel.textContent='Cancel';
    dialog.appendChild(title);dialog.appendChild(note);dialog.appendChild(widget);dialog.appendChild(cancel);
    document.body.appendChild(dialog);
    let settled=false,widgetId:string|null=null,api:TurnstileApi|null=null;
    const finish=(token?:string,error?:Error)=>{
      if(settled)return;
      settled=true;challengeOpen=false;
      try{if(widgetId&&api)api.remove(widgetId)}catch{}
      if(dialog.open)dialog.close();dialog.remove();
      if(token)resolve(token);else reject(error||new Error('Seat verification was canceled.'));
    };
    cancel.addEventListener('click',()=>finish());
    dialog.addEventListener('cancel',event=>{event.preventDefault();finish()});
    try{dialog.showModal()}
    catch{finish(undefined,new Error('Seat verification could not open.'));return}
    void loadTurnstile().then(turnstile=>{
      if(settled)return;
      api=turnstile;
      widgetId=turnstile.render(widget,{
        sitekey,action:'seat',
        callback:token=>finish(token),
        'error-callback':()=>finish(undefined,new Error('Seat verification failed. Please try again.')),
        'expired-callback':()=>finish(undefined,new Error('Seat verification expired. Please try again.')),
      });
    }).catch(()=>finish(undefined,new Error('Seat verification did not load. Please try again.')));
  });
}
