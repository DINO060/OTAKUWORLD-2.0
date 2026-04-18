import { useState, useEffect, useRef } from 'react';

const AC = ["linear-gradient(135deg,#6c5ce7,#a855f7)","linear-gradient(135deg,#f093fb,#f5576c)","linear-gradient(135deg,#4facfe,#00f2fe)","linear-gradient(135deg,#43e97b,#38f9d7)","linear-gradient(135deg,#fa709a,#fee140)"];

const CONVOS = [
  { id: "dm1", name: "Alex", color: AC[1], status: "online", last: "T'as vu le nouveau chapitre?", unread: 2 },
  { id: "dm2", name: "Sophie", color: AC[2], status: "online", last: "Le bug est fixé 🎉", unread: 0 },
  { id: "dm3", name: "Jean", color: AC[3], status: "away", last: "Ki lè ou disponib?", unread: 3 },
  { id: "dm4", name: "Marie", color: AC[4], status: "offline", last: "Merci pour l'aide!", unread: 0 },
];

const INIT_MSGS = {
  dm1: [
    { s: "other", c: "Yo! T'as vu le dernier chapitre de JJK?", t: "14:30" },
    { s: "me", c: "Ouiii c'était fou! Le combat 🔥", t: "14:32" },
    { s: "other", c: "Le twist à la fin j'étais choqué", t: "14:33" },
    { s: "me", c: "Pareil! Vivement la suite", t: "14:35" },
  ],
  dm2: [
    { s: "other", c: "Hey! Le bug sur le chat est fixé", t: "16:10" },
    { s: "me", c: "Nice! Merci d'avoir regardé 🙏", t: "16:12" },
    { s: "other", c: "De rien! C'était un problème de state 🎉", t: "16:13" },
  ],
  dm3: [
    { s: "other", c: "Salut DINO!", t: "10:00" },
    { s: "other", c: "Ki lè ou disponib pou travay sou pwojè a?", t: "10:01" },
    { s: "me", c: "Demain après-midi sa bon", t: "10:15" },
  ],
  dm4: [
    { s: "me", c: "Regarde ce tuto pour React", t: "09:00" },
    { s: "other", c: "Merci pour l'aide! Trop utile 💯", t: "09:30" },
  ],
};

const Av = ({ name, color, size = 36 }) => (
  <div style={{ width: size, height: size, borderRadius: size > 30 ? 12 : 10, background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * .4, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
    {name[0].toUpperCase()}
  </div>
);

export default function PrivateMessages({ t }) {
  const [active, setActive] = useState(null);
  const [inp, setInp] = useState("");
  const [allMsgs, setAllMsgs] = useState(INIT_MSGS);
  const ref = useRef(null);
  const conv = CONVOS.find(c => c.id === active);
  const msgs = active ? (allMsgs[active] || []) : [];

  useEffect(() => { ref.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, active]);

  const send = () => {
    if (!inp.trim() || !active) return;
    setAllMsgs(p => ({ ...p, [active]: [...(p[active] || []), { s: "me", c: inp, t: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }] }));
    setInp("");
    // Bot reply
    setTimeout(() => {
      const replies = ["Ok 👍", "Ahh je vois", "Trop bien!", "On en reparle demain", "😂😂", "💯", "Pas mal!", "Intéressant..."];
      setAllMsgs(p => ({ ...p, [active]: [...(p[active] || []), { s: "other", c: replies[Math.floor(Math.random() * replies.length)], t: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }] }));
    }, 1500 + Math.random() * 2000);
  };

  const statusColor = { online: "#22c55e", away: "#eab308", offline: "#555570" };

  return (
    <div style={{ flex: 1, display: "flex" }}>
      {/* List */}
      <div style={{ width: 280, borderRight: `1px solid ${t.bd}`, background: t.bg2, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "14px 16px", borderBottom: `1px solid ${t.bd}` }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>💬 Messages Privés</div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
          {CONVOS.map(c => (
            <button key={c.id} onClick={() => setActive(c.id)} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10, padding: 10,
              borderRadius: 10, border: "none", cursor: "pointer", textAlign: "left", marginBottom: 2,
              background: active === c.id ? t.bgA : "transparent", color: t.t1, fontFamily: "inherit",
              transition: "background .15s",
            }}
              onMouseEnter={e => { if (active !== c.id) e.currentTarget.style.background = t.bgH; }}
              onMouseLeave={e => { if (active !== c.id) e.currentTarget.style.background = "transparent"; }}>
              <div style={{ position: "relative" }}>
                <Av name={c.name} color={c.color} size={36} />
                <div style={{ position: "absolute", bottom: -1, right: -1, width: 10, height: 10, borderRadius: "50%", background: statusColor[c.status], border: `2px solid ${t.bg2}` }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: c.unread > 0 ? 700 : 500 }}>{c.name}</div>
                <div style={{ fontSize: 11, color: t.tm, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.last}</div>
              </div>
              {c.unread > 0 && <div style={{ background: t.red, color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 10, padding: "2px 6px", minWidth: 18, textAlign: "center" }}>{c.unread}</div>}
            </button>
          ))}
        </div>
      </div>

      {/* Chat */}
      {conv ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "14px 20px", borderBottom: `1px solid ${t.bd}`, background: t.bg2, display: "flex", alignItems: "center", gap: 10 }}>
            <Av name={conv.name} color={conv.color} size={32} />
            <div><div style={{ fontWeight: 600, fontSize: 14 }}>{conv.name}</div><div style={{ fontSize: 11, color: t.tm, display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 6, height: 6, borderRadius: "50%", background: statusColor[conv.status] }} />{conv.status}</div></div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.s === "me" ? "flex-end" : "flex-start", animation: "fadeIn .2s" }}>
                <div style={{
                  maxWidth: "70%", padding: "10px 14px", borderRadius: 16, fontSize: 13, lineHeight: 1.5,
                  background: m.s === "me" ? t.ac : t.bg3, color: m.s === "me" ? "#fff" : t.t1,
                  borderBottomRightRadius: m.s === "me" ? 4 : 16, borderBottomLeftRadius: m.s === "me" ? 16 : 4,
                }}>
                  {m.c}
                  <div style={{ fontSize: 10, opacity: .6, marginTop: 4, textAlign: "right" }}>{m.t}</div>
                </div>
              </div>
            ))}
            <div ref={ref} />
          </div>
          <div style={{ padding: "12px 20px", borderTop: `1px solid ${t.bd}`, background: t.bg2, display: "flex", gap: 8 }}>
            <div style={{ flex: 1, background: t.bg3, border: `1px solid ${t.bi}`, borderRadius: 12, display: "flex", padding: "0 12px" }}>
              <input value={inp} onChange={e => setInp(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
                placeholder={`Message @${conv.name}...`}
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: t.t1, fontSize: 13, padding: "10px 0", fontFamily: "inherit" }} />
            </div>
            <button onClick={send} disabled={!inp.trim()} style={{ background: inp.trim() ? t.ac : t.bg3, border: "none", borderRadius: 10, color: inp.trim() ? "#fff" : t.tm, padding: "10px 14px", fontSize: 15, cursor: inp.trim() ? "pointer" : "default" }}>➤</button>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8 }}>
          <span style={{ fontSize: 40 }}>💬</span>
          <span style={{ color: t.t2, fontSize: 14 }}>Sélectionnez une conversation</span>
        </div>
      )}
    </div>
  );
}
