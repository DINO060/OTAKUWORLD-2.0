import { useState, useEffect, useRef } from 'react';
import LoupGarou from './LoupGarou';
import PrivateMessages from './PrivateMessages';
import Otaku from './Otaku';

const PAGES = [
  { id: "chat", name: "Global Chat", emoji: "🌐", grad: "linear-gradient(135deg,#6c5ce7,#a855f7)" },
  { id: "dm", name: "Messages Privés", emoji: "💬", grad: "linear-gradient(135deg,#4facfe,#00f2fe)", unread: 5 },
  { id: "otaku", name: "Otaku", emoji: "🎌", grad: "linear-gradient(135deg,#f093fb,#f5576c)" },
  { id: "loup-garou", name: "Loup-Garou", emoji: "🐺", grad: "linear-gradient(135deg,#43e97b,#38f9d7)" },
];

const AC = ["linear-gradient(135deg,#6c5ce7,#a855f7)","linear-gradient(135deg,#f093fb,#f5576c)","linear-gradient(135deg,#4facfe,#00f2fe)","linear-gradient(135deg,#43e97b,#38f9d7)","linear-gradient(135deg,#fa709a,#fee140)"];
const EMOJIS = ["😀","😂","😎","🥺","😭","💀","🤡","😈","🤯","👍","👎","❤️","🔥","⭐","💎","🎉","🚀","⚡"];
const MOCK_MSGS = [
  {id:"1",uid:"u2",name:"Alex",color:AC[1],content:"Yo tout le monde! 🔥",reply:null,reactions:[],time:Date.now()-300000},
  {id:"2",uid:"u3",name:"Sophie",color:AC[2],content:"Quelqu'un a lu Solo Leveling?",reply:null,reactions:[{emoji:"🔥",count:5,mine:false}],time:Date.now()-240000},
  {id:"3",uid:"u4",name:"Jean",color:AC[3],content:"@alex ouiii le plot twist!! 🤯",reply:null,reactions:[],time:Date.now()-180000},
  {id:"4",uid:"u1",name:"DINO",color:AC[0],content:"Ce site est trop bien 💯",reply:null,reactions:[{emoji:"❤️",count:8,mine:true}],time:Date.now()-120000},
  {id:"5",uid:"u2",name:"Alex",color:AC[1],content:"Merci! 😎",reply:{author:"DINO",content:"Ce site est trop bien 💯"},reactions:[],time:Date.now()-60000},
  {id:"6",uid:"u5",name:"Marie",color:AC[4],content:"Sa k ap fèt? 🇭🇹",reply:null,reactions:[],time:Date.now()-30000},
];

const Av = ({ name, color, size = 36 }) => (
  <div style={{width:size,height:size,borderRadius:size>30?12:10,background:color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*.4,fontWeight:700,color:"#fff",flexShrink:0}}>{name[0].toUpperCase()}</div>
);

function GlobalChat({t}){
  const ME={id:"u1",name:"DINO",color:AC[0]};
  const[msgs,setMsgs]=useState(MOCK_MSGS);const[inp,setInp]=useState("");const[reply,setReply]=useState(null);const[hov,setHov]=useState(null);const[showE,setShowE]=useState(false);
  const ref=useRef(null);const iref=useRef(null);
  useEffect(()=>{ref.current?.scrollIntoView({behavior:"smooth"});},[msgs]);
  const send=()=>{if(!inp.trim())return;setMsgs(p=>[...p,{id:`m${Date.now()}`,uid:ME.id,name:ME.name,color:ME.color,content:inp,reply:reply?{author:reply.name,content:reply.content}:null,reactions:[],time:Date.now()}]);setInp("");setReply(null);};
  const react=(mid,em)=>{setMsgs(p=>p.map(m=>{if(m.id!==mid)return m;const ex=m.reactions.find(r=>r.emoji===em);if(ex)return{...m,reactions:ex.mine?(ex.count===1?m.reactions.filter(r=>r.emoji!==em):m.reactions.map(r=>r.emoji===em?{...r,count:r.count-1,mine:false}:r)):m.reactions.map(r=>r.emoji===em?{...r,count:r.count+1,mine:true}:r)};return{...m,reactions:[...m.reactions,{emoji:em,count:1,mine:true}]};}));};
  const fmt=ts=>new Date(ts).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});

  return(<div style={{flex:1,display:"flex",flexDirection:"column"}}>
    <div style={{padding:"14px 20px",borderBottom:`1px solid ${t.bd}`,background:t.bg2,display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:20}}>🌐</span><div><div style={{fontWeight:700,fontSize:15}}>Global Chat</div><div style={{fontSize:11,color:t.tm}}>1,247 en ligne</div></div></div>
    <div style={{flex:1,overflowY:"auto",padding:"12px 20px",display:"flex",flexDirection:"column",gap:2}}>
      {msgs.map((m,i)=>{const sa=i===0||msgs[i-1]?.uid!==m.uid;const own=m.uid===ME.id;const h=hov===m.id;return(
        <div key={m.id} onMouseEnter={()=>setHov(m.id)} onMouseLeave={()=>setHov(null)} style={{display:"flex",gap:10,padding:"3px 8px",marginTop:sa?10:0,borderRadius:8,background:h?t.bgM:"transparent",position:"relative"}}>
          <div style={{width:36,flexShrink:0}}>{sa&&<Av name={m.name} color={m.color} size={36}/>}</div>
          <div style={{flex:1,minWidth:0}}>
            {sa&&<div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:2}}><span style={{fontWeight:600,fontSize:13,color:own?t.ac:t.t1}}>{m.name}</span><span style={{fontSize:10,color:t.tm}}>{fmt(m.time)}</span></div>}
            {m.reply&&<div style={{display:"flex",alignItems:"center",gap:6,padding:"3px 10px",marginBottom:3,borderLeft:`3px solid ${t.ac}`,background:t.acs,borderRadius:"0 6px 6px 0",fontSize:12,color:t.t2}}><span style={{fontWeight:600}}>@{m.reply.author}</span><span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.reply.content}</span></div>}
            <div style={{fontSize:14,lineHeight:1.5,wordBreak:"break-word"}}>{m.content.split(/(@\w+)/g).map((p,j)=>p.startsWith("@")?<span key={j} style={{background:t.acs,color:t.ac,borderRadius:4,padding:"1px 4px",fontWeight:500}}>{p}</span>:p)}</div>
            {m.reactions.length>0&&<div style={{display:"flex",gap:4,marginTop:5}}>{m.reactions.map(r=><button key={r.emoji} onClick={()=>react(m.id,r.emoji)} style={{display:"flex",alignItems:"center",gap:4,padding:"2px 8px",borderRadius:20,fontSize:12,fontFamily:"inherit",border:`1px solid ${r.mine?t.ac:t.bd}`,background:r.mine?t.acs:"transparent",color:t.t1,cursor:"pointer"}}><span>{r.emoji}</span><span style={{fontSize:11,fontWeight:600}}>{r.count}</span></button>)}</div>}
          </div>
          {h&&<div style={{position:"absolute",top:-12,right:8,display:"flex",gap:1,background:t.bg3,border:`1px solid ${t.bd}`,borderRadius:8,padding:2,boxShadow:"0 4px 16px rgba(0,0,0,.3)",zIndex:10}}>
            {["😀","❤️","👍"].map(e=><button key={e} onClick={()=>react(m.id,e)} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:14,padding:"3px 5px",borderRadius:4}}>{e}</button>)}
            <div style={{width:1,background:t.bd,margin:"3px 1px"}}/>
            <button onClick={()=>{setReply(m);iref.current?.focus();}} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:12,padding:"3px 5px",color:t.tm}}>↩️</button>
          </div>}
        </div>);})}
      <div ref={ref}/>
    </div>
    <div style={{borderTop:`1px solid ${t.bd}`,background:t.bg2}}>
      {reply&&<div style={{padding:"8px 20px",display:"flex",alignItems:"center",gap:8,background:t.acs,borderBottom:`1px solid ${t.bd}`}}><div style={{width:3,height:20,background:t.ac,borderRadius:2}}/><div style={{flex:1}}><div style={{fontSize:11,fontWeight:600,color:t.ac}}>Réponse à @{reply.name}</div><div style={{fontSize:12,color:t.t2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{reply.content}</div></div><button onClick={()=>setReply(null)} style={{background:"transparent",border:"none",cursor:"pointer",color:t.tm,fontSize:14}}>✕</button></div>}
      {showE&&<div style={{padding:"10px 20px",borderBottom:`1px solid ${t.bd}`,display:"flex",flexWrap:"wrap",gap:2}}>{EMOJIS.map(em=><button key={em} onClick={()=>{setInp(p=>p+em);iref.current?.focus();}} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:20,padding:3,borderRadius:6}}>{em}</button>)}</div>}
      <div style={{padding:"12px 20px",display:"flex",alignItems:"center",gap:8}}>
        <button onClick={()=>setShowE(!showE)} style={{background:showE?t.acs:"transparent",border:"none",cursor:"pointer",fontSize:18,padding:5,borderRadius:8,color:showE?t.ac:t.tm}}>😀</button>
        <div style={{flex:1,background:t.bg3,border:`1px solid ${t.bi}`,borderRadius:12,display:"flex",padding:"0 12px"}}><input ref={iref} value={inp} onChange={e=>setInp(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Message #Global Chat..." style={{flex:1,background:"transparent",border:"none",outline:"none",color:t.t1,fontSize:14,padding:"10px 0",fontFamily:"inherit"}}/></div>
        <button onClick={send} disabled={!inp.trim()} style={{background:inp.trim()?t.ac:t.bg3,border:"none",borderRadius:10,color:inp.trim()?"#fff":t.tm,padding:"10px 14px",fontSize:15,cursor:inp.trim()?"pointer":"default"}}>➤</button>
      </div>
    </div>
  </div>);
}

export default function App() {
  const[page,setPage]=useState("chat");
  const[theme,setTheme]=useState("dark");
  const t=theme==="dark"?{bg1:"#0c0c14",bg2:"#111119",bg3:"#1a1a25",bgH:"#1f1f2e",bgA:"#262638",bgM:"rgba(255,255,255,.02)",t1:"#e8e8ed",t2:"#8888a0",tm:"#555570",ac:"#6c5ce7",acs:"rgba(108,92,231,.12)",bd:"rgba(255,255,255,.06)",bi:"rgba(255,255,255,.1)",red:"#ef4444"}:{bg1:"#fff",bg2:"#f7f7fa",bg3:"#eeeef3",bgH:"#e8e8ed",bgA:"#dddde5",bgM:"rgba(0,0,0,.02)",t1:"#1a1a2e",t2:"#6b6b80",tm:"#9999aa",ac:"#6c5ce7",acs:"rgba(108,92,231,.1)",bd:"rgba(0,0,0,.07)",bi:"rgba(0,0,0,.12)",red:"#ef4444"};

  return(<div style={{display:"flex",height:"100vh",background:t.bg1,color:t.t1,fontFamily:"'DM Sans',-apple-system,sans-serif",fontSize:14,overflow:"hidden"}}>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet"/>
    {/* SIDEBAR */}
    <div style={{width:260,background:t.bg2,borderRight:`1px solid ${t.bd}`,display:"flex",flexDirection:"column",flexShrink:0}}>
      <div style={{padding:"16px 16px 12px",borderBottom:`1px solid ${t.bd}`}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:30,height:30,borderRadius:10,background:"linear-gradient(135deg,#6c5ce7,#a855f7)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:800,color:"#fff"}}>C</div><span style={{fontWeight:700,fontSize:16,letterSpacing:"-.3px"}}>Comment Live</span></div>
          <button onClick={()=>setTheme(theme==="dark"?"light":"dark")} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:16}}>{theme==="dark"?"☀️":"🌙"}</button>
        </div>
        <div style={{background:t.bg3,borderRadius:10,padding:"8px 12px",display:"flex",alignItems:"center",gap:8}}><span style={{color:t.tm,fontSize:13}}>🔍</span><input placeholder="Rechercher..." style={{background:"transparent",border:"none",outline:"none",color:t.t1,fontSize:13,width:"100%",fontFamily:"inherit"}}/></div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:8}}>
        {PAGES.map(p=>{const a=page===p.id;return(<button key={p.id} onClick={()=>setPage(p.id)} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:10,borderRadius:10,border:"none",cursor:"pointer",textAlign:"left",marginBottom:2,background:a?t.bgA:"transparent",color:t.t1,fontFamily:"inherit",transition:"background .15s"}} onMouseEnter={e=>{if(!a)e.currentTarget.style.background=t.bgH}} onMouseLeave={e=>{if(!a)e.currentTarget.style.background="transparent"}}>
          <div style={{width:36,height:36,borderRadius:10,background:p.grad,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{p.emoji}</div>
          <span style={{fontSize:13,fontWeight:a?600:500,flex:1}}>{p.name}</span>
          {p.unread&&p.unread>0&&<div style={{background:t.red,color:"#fff",fontSize:10,fontWeight:700,borderRadius:10,padding:"2px 6px",minWidth:18,textAlign:"center"}}>{p.unread}</div>}
        </button>);})}
      </div>
      <div style={{padding:"12px 16px",borderTop:`1px solid ${t.bd}`,display:"flex",alignItems:"center",gap:10}}><Av name="DINO" color={AC[0]} size={32}/><div style={{flex:1}}><div style={{fontSize:13,fontWeight:600}}>DINO</div><div style={{fontSize:11,color:t.tm}}>@dino</div></div><button style={{background:"transparent",border:"none",cursor:"pointer",color:t.tm,fontSize:14}}>⚙️</button></div>
    </div>
    {/* CONTENT */}
    <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
      {page==="chat"&&<GlobalChat t={t}/>}
      {page==="dm"&&<PrivateMessages t={t}/>}
      {page==="otaku"&&<Otaku t={t}/>}
      {page==="loup-garou"&&<LoupGarou t={t}/>}
    </div>
    <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}@keyframes bounceIn{0%{transform:scale(.3);opacity:0}50%{transform:scale(1.05)}100%{transform:scale(1);opacity:1}}@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}@keyframes glow{0%,100%{box-shadow:0 0 10px rgba(108,92,231,.3)}50%{box-shadow:0 0 25px rgba(108,92,231,.6)}}@keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-3px)}75%{transform:translateX(3px)}}*{scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.08) transparent}`}</style>
  </div>);
}
