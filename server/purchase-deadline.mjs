export const PURCHASE_LIMIT_MS=180000;
export function purchaseDeadline(message,now=Date.now()){return /\b(compr[a-záéíóúãõç]*|carrinho|checkout|pix|pedido)\b/i.test(message||'')?now+PURCHASE_LIMIT_MS:null}
export function armPurchaseDeadline(deadline,onTimeout,{now=Date.now,set=setTimeout,clear=clearTimeout}={}){if(!deadline)return ()=>{};const timer=set(onTimeout,Math.max(0,deadline-now()));timer?.unref?.();return ()=>clear(timer)}
