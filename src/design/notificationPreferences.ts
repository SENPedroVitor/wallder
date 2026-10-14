type Preferences={enabled:boolean;tasks?:boolean;routines?:boolean;approvals?:boolean;quiet?:boolean;quietStart?:string;quietEnd?:string}
export function notificationAllowed(preferences:Preferences,kind:'message'|'task'|'routine'|'approval',now=new Date(),timezone='America/Sao_Paulo'){
 if(!preferences.enabled)return false
 if(kind==='task'&&preferences.tasks===false||kind==='routine'&&preferences.routines===false||kind==='approval'&&preferences.approvals===false)return false
 if(!preferences.quiet)return true
 const minutes=(value:string)=>{const match=/^(\d{2}):(\d{2})$/.exec(value);return match&&Number(match[1])<24&&Number(match[2])<60?Number(match[1])*60+Number(match[2]):null}
 const start=minutes(preferences.quietStart??'22:00'),end=minutes(preferences.quietEnd??'08:00')
 if(start===null||end===null)return true
 const clock=new Intl.DateTimeFormat('en-GB',{timeZone:timezone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(now),current=minutes(clock)!
 const silent=start===end||start<end?current>=start&&current<end:current>=start||current<end
 return !silent
}
