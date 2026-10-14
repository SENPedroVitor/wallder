import {useEffect,useState} from 'react';
import './run-progress.css';
export function RunProgress({started,activity}:{started:number;activity:string}){
 const [now,setNow]=useState(Date.now());
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return ()=>clearInterval(timer)},[]);
 const seconds=Math.max(0,Math.floor((now-started)/1000));
 return <p className="waddle-run-progress"><span role="status">{activity}</span><small aria-label="Tempo decorrido">{Math.floor(seconds/60)}:{String(seconds%60).padStart(2,'0')}</small></p>;
}
