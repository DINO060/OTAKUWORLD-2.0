import { useState } from 'react';

const AC = ["linear-gradient(135deg,#6c5ce7,#a855f7)","linear-gradient(135deg,#f093fb,#f5576c)","linear-gradient(135deg,#4facfe,#00f2fe)","linear-gradient(135deg,#43e97b,#38f9d7)","linear-gradient(135deg,#fa709a,#fee140)","linear-gradient(135deg,#a18cd1,#fbc2eb)","linear-gradient(135deg,#fccb90,#d57eeb)","linear-gradient(135deg,#ff9a9e,#fecfef)","linear-gradient(135deg,#a1c4fd,#c2e9fb)","linear-gradient(135deg,#d4fc79,#96e6a1)"];

const TABS = [
  { id: "manga", label: "Manga", emoji: "📖" },
  { id: "anime", label: "Anime", emoji: "🎬" },
  { id: "webtoon", label: "Webtoon", emoji: "📱" },
  { id: "lightnovel", label: "Light Novel", emoji: "📚" },
];

const DATA = {
  manga: [
    { title: "Solo Leveling", icon: "⚔️", ch: 201, status: "Terminé", rating: 4.8, genre: "Action" },
    { title: "Jujutsu Kaisen", icon: "👹", ch: 271, status: "Terminé", rating: 4.7, genre: "Shonen" },
    { title: "One Piece", icon: "🏴‍☠️", ch: 1120, status: "En cours", rating: 4.9, genre: "Aventure" },
    { title: "Chainsaw Man", icon: "🪚", ch: 180, status: "En cours", rating: 4.6, genre: "Dark Fantasy" },
    { title: "Spy x Family", icon: "🕵️", ch: 103, status: "En cours", rating: 4.7, genre: "Comédie" },
    { title: "Blue Lock", icon: "⚽", ch: 275, status: "En cours", rating: 4.5, genre: "Sport" },
    { title: "Kaiju No. 8", icon: "🦎", ch: 113, status: "En cours", rating: 4.5, genre: "Action" },
    { title: "Dandadan", icon: "👻", ch: 170, status: "En cours", rating: 4.6, genre: "Action" },
  ],
  anime: [
    { title: "Demon Slayer S4", icon: "🔥", ch: 12, status: "En cours", rating: 4.8, genre: "Action" },
    { title: "Attack on Titan", icon: "🗡️", ch: 87, status: "Terminé", rating: 4.9, genre: "Dark Fantasy" },
    { title: "Dandadan", icon: "👻", ch: 24, status: "En cours", rating: 4.6, genre: "Action" },
    { title: "Frieren", icon: "🧝", ch: 28, status: "En cours", rating: 4.9, genre: "Fantasy" },
    { title: "Vinland Saga S2", icon: "⚔️", ch: 24, status: "Terminé", rating: 4.8, genre: "Aventure" },
    { title: "Oshi no Ko S2", icon: "⭐", ch: 13, status: "Terminé", rating: 4.5, genre: "Drame" },
  ],
  webtoon: [
    { title: "Tower of God", icon: "🗼", ch: 600, status: "En cours", rating: 4.7, genre: "Fantasy" },
    { title: "Omniscient Reader", icon: "📖", ch: 180, status: "En cours", rating: 4.8, genre: "Fantasy" },
    { title: "The Beginning After The End", icon: "👑", ch: 200, status: "En cours", rating: 4.6, genre: "Fantasy" },
    { title: "Eleceed", icon: "⚡", ch: 300, status: "En cours", rating: 4.7, genre: "Action" },
    { title: "Lookism", icon: "👤", ch: 490, status: "En cours", rating: 4.5, genre: "Action" },
  ],
  lightnovel: [
    { title: "Mushoku Tensei", icon: "🌍", ch: 26, status: "Terminé", rating: 4.7, genre: "Isekai" },
    { title: "Re:Zero", icon: "🔄", ch: 37, status: "En cours", rating: 4.6, genre: "Fantasy" },
    { title: "Sword Art Online", icon: "⚔️", ch: 27, status: "Terminé", rating: 4.3, genre: "Sci-Fi" },
    { title: "Overlord", icon: "💀", ch: 16, status: "En cours", rating: 4.5, genre: "Fantasy" },
  ],
};

export default function Otaku({ t }) {
  const [tab, setTab] = useState("manga");
  const [search, setSearch] = useState("");
  const items = DATA[tab].filter(i => i.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "14px 20px", borderBottom: `1px solid ${t.bd}`, background: t.bg2 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 20 }}>🎌</span> Otaku
          </div>
          <div style={{ background: t.bg3, borderRadius: 10, padding: "6px 12px", display: "flex", alignItems: "center", gap: 6, width: 200 }}>
            <span style={{ fontSize: 12 }}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
              style={{ background: "transparent", border: "none", outline: "none", color: t.t1, fontSize: 12, width: "100%", fontFamily: "inherit" }} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {TABS.map(tb => (
            <button key={tb.id} onClick={() => setTab(tb.id)} style={{
              padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer",
              fontSize: 12, fontWeight: 600, fontFamily: "inherit",
              background: tab === tb.id ? t.ac : t.bg3, color: tab === tb.id ? "#fff" : t.t2,
              transition: "all .15s",
            }}>{tb.emoji} {tb.label}</button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        {items.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: t.t2 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
            <div>Aucun résultat pour "{search}"</div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 14 }}>
            {items.map((item, i) => (
              <div key={i} style={{
                background: t.bg3, borderRadius: 14, overflow: "hidden",
                border: `1px solid ${t.bd}`, cursor: "pointer",
                transition: "transform .2s, box-shadow .2s",
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,.3)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
                <div style={{
                  height: 150, background: AC[i % AC.length],
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44,
                }}>{item.icon}</div>
                <div style={{ padding: "10px 12px" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.title}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: t.t2 }}>
                    <span>⭐ {item.rating}</span><span>•</span><span>{item.ch} ch.</span>
                  </div>
                  <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                    <span style={{
                      fontSize: 10, padding: "2px 8px", borderRadius: 10, fontWeight: 600,
                      background: item.status === "En cours" ? "rgba(34,197,94,.12)" : "rgba(108,92,231,.12)",
                      color: item.status === "En cours" ? "#22c55e" : "#a855f7",
                    }}>{item.status}</span>
                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: t.bgH || t.bg3, color: t.t2 }}>{item.genre}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
