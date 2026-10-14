import type {Chat} from './workspace'
export const isClearCommand=(text:string)=>/^\/(?:clear|q)\s*$/i.test(text.trim())
export function restartConversation(chat:Chat,id:string,now=Date.now()):Chat{return {...chat,id,title:chat.projectId?chat.title:'Nova conversa',messages:[],updated:now,archived:false,pinned:false}}
