import { useState, useEffect, useRef, useCallback } from 'react';

const ROLES = {
  loup: { name: 'Loup-Garou', emoji: '🐺', team: 'loups', desc: 'Éliminez les villageois la nuit.', color: '#ef4444' },
  villageois: { name: 'Villageois', emoji: '🧑‍🌾', team: 'village', desc: 'Trouvez les loups-garous.', color: '#22c55e' },
  voyante: { name: 'Voyante', emoji: '🔮', team: 'village', desc: 'Découvrez le rôle d\'un joueur chaque nuit.', color: '#a855f7' },
  sorciere: { name: 'Sorcière', emoji: '🧪', team: 'village', desc: 'Potion de vie + potion de mort.', color: '#06b6d4' },
  chasseur: { name: 'Chasseur', emoji: '🏹', team: 'village', desc: 'En mourant, éliminez quelqu\'un.', color: '#f59e0b' },
};

const BOTS = ['Luna', 'Fenrir', 'Artemis', 'Shadow', 'Raven', 'Storm', 'Blaze', 'Mystic', 'Sage', 'Ghost', 'Viper', 'Phoenix'];
const COLORS = ['linear-gradient(135deg,#6c5ce7,#a855f7)', 'linear-gradient(135deg,#f093fb,#f5576c)', 'linear-gradient(135deg,#4facfe,#00f2fe)', 'linear-gradient(135deg,#43e97b,#38f9d7)', 'linear-gradient(135deg,#fa709a,#fee140)', 'linear-gradient(135deg,#a18cd1,#fbc2eb)', 'linear-gradient(135deg,#fccb90,#d57eeb)', 'linear-gradient(135deg,#ff9a9e,#fecfef)', 'linear-gradient(135deg,#a1c4fd,#c2e9fb)', 'linear-gradient(135deg,#d4fc79,#96e6a1)', 'linear-gradient(135deg,#84fab0,#8fd3f4)', 'linear-gradient(135deg,#ffecd2,#fcb69f)'];
const TIMERS = { 'role-reveal': 8, night: 15, 'night-result': 6, day: 30, vote: 20, 'vote-result': 5 };

const shuffle = a => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

function assignRoles(players) {
  const n = players.length, roles = [];
  const lc = n <= 6 ? 1 : n <= 9 ? 2 : 3;
  for (let i = 0; i < lc; i++) roles.push('loup');
  if (n >= 5) roles.push('voyante');
  if (n >= 6) roles.push('sorciere');
  if (n >= 8) roles.push('chasseur');
  while (roles.length < n) roles.push('villageois');
  const s = shuffle(roles);
  return players.map((p, i) => ({ ...p, role: s[i], team: ROLES[s[i]].team }));
}

function checkWin(players) {
  const a = players.filter(p => p.alive);
  const l = a.filter(p => p.team === 'loups').length;
  const v = a.filter(p => p.team === 'village').length;
  if (!l) return 'village';
  if (l >= v) return 'loups';
  return null;
}

const Av = ({ name, color, size = 30, alive = true, emoji }) => (
  <div style={{ position: 'relative', flexShrink: 0 }}>
    <div style={{ width: size, height: size, borderRadius: 10, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: emoji ? size * .45 : size * .4, fontWeight: 700, color: '#fff', opacity: alive ? 1 : .3, filter: alive ? 'none' : 'grayscale(1)' }}>
      {emoji || name[0].toUpperCase()}
    </div>
    {!alive && <div style={{ position: 'absolute', top: -2, right: -2, fontSize: size * .3 }}>💀</div>}
  </div>
);

export default function LoupGarou({ t }) {
  const PID = 'me', PNAME = 'DINO';

  const init = () => ({
    phase: 'lobby', round: 0,
    players: [{ id: PID, name: PNAME, color: COLORS[0], alive: true, bot: false }],
    msgs: [{ id: 's0', content: '🐺 Bienvenue! En attente...', type: 'system', time: Date.now() }],
    timer: 0, maxT: 0,
    nightTarget: null, voteTarget: null, voyanteTarget: null,
    healUsed: false, killUsed: false, healTarget: null, killTarget: null,
    winner: null,
  });

  const [g, setG] = useState(init);
  const [inp, setInp] = useState('');
  const [count, setCount] = useState(6);
  const [vResult, setVResult] = useState(null);
  const [hunting, setHunting] = useState(false);
  const tRef = useRef(null);
  const cRef = useRef(null);
  const me = g.players.find(p => p.id === PID);

  useEffect(() => { cRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [g.msgs]);

  useEffect(() => {
    if (g.timer > 0 && g.phase !== 'lobby') {
      tRef.current = setTimeout(() => setG(p => ({ ...p, timer: p.timer - 1 })), 1000);
    } else if (g.timer === 0 && g.phase !== 'lobby' && g.phase !== 'end') {
      phaseEnd();
    }
    return () => clearTimeout(tRef.current);
  }, [g.timer, g.phase]);

  const msg = useCallback((content, type = 'system', sender = null, sName = null) => {
    setG(p => ({ ...p, msgs: [...p.msgs, { id: `m${Date.now()}${Math.random()}`, content, type, sender, sName, time: Date.now() }] }));
  }, []);

  const start = () => {
    const names = shuffle(BOTS);
    const bots = Array.from({ length: count - 1 }, (_, i) => ({ id: `b${i}`, name: names[i], color: COLORS[(i + 1) % COLORS.length], alive: true, bot: true }));
    const all = assignRoles([g.players[0], ...bots]);
    setG(p => ({ ...p, players: all, phase: 'role-reveal', round: 1, timer: TIMERS['role-reveal'], maxT: TIMERS['role-reveal'] }));
  };

  const goNight = () => {
    setVResult(null);
    msg(`🌙 Nuit ${g.round}...`);
    setG(p => ({ ...p, phase: 'night', timer: TIMERS.night, maxT: TIMERS.night, nightTarget: null, voyanteTarget: null, healTarget: null, killTarget: null }));
  };

  const nightResult = () => {
    const alive = g.players.filter(p => p.alive);
    const vill = alive.filter(p => p.team === 'village');
    let wolf = g.nightTarget || (vill.length ? vill[Math.floor(Math.random() * vill.length)].id : null);
    let killed = wolf ? [wolf] : [];

    if (me?.role === 'voyante' && me.alive && g.voyanteTarget) {
      const tgt = g.players.find(p => p.id === g.voyanteTarget);
      if (tgt) setVResult({ name: tgt.name, role: tgt.role });
    }

    const sorc = g.players.find(p => p.role === 'sorciere' && p.alive);
    if (sorc?.bot) {
      if (!g.healUsed && wolf && Math.random() > .5) killed = killed.filter(id => id !== wolf);
      if (!g.killUsed && Math.random() > .7) { const t2 = alive.filter(p => p.team !== 'loups' && p.role !== 'sorciere'); if (t2.length) killed.push(t2[Math.floor(Math.random() * t2.length)].id); }
    } else if (sorc && !sorc.bot) {
      if (g.healTarget && wolf) killed = killed.filter(id => id !== wolf);
      if (g.killTarget) killed.push(g.killTarget);
    }

    killed = [...new Set(killed)];
    const kp = g.players.filter(p => killed.includes(p.id));

    setG(p => ({ ...p, phase: 'night-result', timer: TIMERS['night-result'], maxT: TIMERS['night-result'], players: p.players.map(pl => killed.includes(pl.id) ? { ...pl, alive: false } : pl) }));
    if (!kp.length) msg('☀️ Personne n\'a été tué cette nuit!');
    else kp.forEach(p => msg(`💀 ${p.name} a été dévoré(e)... ${ROLES[p.role].emoji} ${ROLES[p.role].name}`, 'kill'));
  };

  const goVote = () => {
    msg('🗳️ Votez pour éliminer un suspect!');
    setG(p => ({ ...p, phase: 'vote', timer: TIMERS.vote, maxT: TIMERS.vote, voteTarget: null }));
  };

  const voteResult = () => {
    const alive = g.players.filter(p => p.alive);
    const votes = {};
    alive.forEach(p => {
      if (p.bot) {
        const others = alive.filter(v => v.id !== p.id);
        const w = others.flatMap(v => v.team === 'loups' ? [v, v] : [v]);
        const tgt = p.team === 'loups' ? alive.filter(v => v.team === 'village')[Math.floor(Math.random() * alive.filter(v => v.team === 'village').length)]?.id : w[Math.floor(Math.random() * w.length)]?.id;
        if (tgt) votes[tgt] = (votes[tgt] || 0) + 1;
      }
    });
    if (g.voteTarget && me?.alive) votes[g.voteTarget] = (votes[g.voteTarget] || 0) + 1;

    let max = 0, elim = null;
    Object.entries(votes).forEach(([id, c]) => { if (c > max) { max = c; elim = id; } });

    if (elim) {
      const p = g.players.find(pl => pl.id === elim);
      msg(`⚖️ ${p.name} éliminé(e) (${max} votes)!`, 'vote');
      msg(`${ROLES[p.role].emoji} ${p.name} était ${ROLES[p.role].name}`, 'reveal');
      setG(prev => ({ ...prev, phase: 'vote-result', timer: TIMERS['vote-result'], maxT: TIMERS['vote-result'], players: prev.players.map(pl => pl.id === elim ? { ...pl, alive: false } : pl) }));
      if (p.role === 'chasseur') { if (p.id === PID) setHunting(true); else { const tgts = g.players.filter(pl => pl.alive && pl.id !== elim); if (tgts.length) { const shot = tgts[Math.floor(Math.random() * tgts.length)]; msg(`🏹 ${p.name} tire sur ${shot.name}!`, 'kill'); setG(prev => ({ ...prev, players: prev.players.map(pl => pl.id === shot.id ? { ...pl, alive: false } : pl) })); } } }
    }
  };

  const end = w => { msg(`${w === 'loups' ? '🐺 Les Loups' : '🏡 Le Village'} ont gagné! 🎉`); setG(p => ({ ...p, phase: 'end', winner: w, timer: 0 })); };

  const phaseEnd = () => {
    switch (g.phase) {
      case 'role-reveal': goNight(); break;
      case 'night': nightResult(); break;
      case 'night-result': { const w = checkWin(g.players); if (w) end(w); else { msg('☀️ Discutez!'); setG(p => ({ ...p, phase: 'day', timer: TIMERS.day, maxT: TIMERS.day })); } break; }
      case 'day': goVote(); break;
      case 'vote': voteResult(); break;
      case 'vote-result': { const w = checkWin(g.players); if (w) end(w); else { setG(p => ({ ...p, round: p.round + 1 })); setTimeout(goNight, 500); } break; }
    }
  };

  const chat = () => {
    if (!inp.trim() || !me?.alive) return;
    if (g.phase === 'night' && me.team !== 'loups') return;
    msg(inp, 'chat', PID, PNAME); setInp('');
    if (Math.random() > .6) { const bot = g.players.filter(p => p.bot && p.alive)[0]; if (bot) { const r = ['Hmm... 🤔', 'D\'accord 👍', 'Louche 😒', 'Qui a pas parlé? 👀', 'Je fais confiance à personne']; setTimeout(() => msg(r[Math.floor(Math.random() * r.length)], 'chat', bot.id, bot.name), 1500); } }
  };

  const alive = g.players.filter(p => p.alive), dead = g.players.filter(p => !p.alive);
  const isLoup = me?.team === 'loups', isVoy = me?.role === 'voyante', isSorc = me?.role === 'sorciere';
  const isNight = g.phase === 'night';

  const click = p => {
    if (g.phase === 'vote' && p.id !== PID && me?.alive) setG(prev => ({ ...prev, voteTarget: p.id }));
    if (isNight && isLoup && me?.alive && p.team !== 'loups') setG(prev => ({ ...prev, nightTarget: p.id }));
    if (isNight && isVoy && me?.alive && p.id !== PID) setG(prev => ({ ...prev, voyanteTarget: p.id }));
    if (hunting && p.id !== PID && p.alive) { msg(`🏹 ${PNAME} tire sur ${p.name}!`, 'kill'); setG(prev => ({ ...prev, players: prev.players.map(pl => pl.id === p.id ? { ...pl, alive: false } : pl) })); setHunting(false); }
  };

  const phaseLabel = { lobby: '🏠 Lobby', 'role-reveal': '🎭 Votre rôle', night: `🌙 Nuit ${g.round}`, 'night-result': '🌅 Aube', day: `☀️ Jour ${g.round}`, vote: '🗳️ Vote', 'vote-result': '⚖️ Résultat', end: '🏆 Fin' };
  const phaseBg = { lobby: '#667eea', 'role-reveal': '#f5576c', night: '#302b63', 'night-result': '#f5af19', day: '#f5af19', vote: '#eb3349', 'vote-result': '#4b6cb7', end: '#f7971e' };

  return (
    <div style={{ flex: 1, display: 'flex', background: isNight ? 'linear-gradient(180deg,#0a0a1a,#10101f)' : t.bg1, transition: 'background 1s' }}>
      {/* Players */}
      <div style={{ width: 200, background: t.bg2, borderRight: `1px solid ${t.bd}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: 12, borderBottom: `1px solid ${t.bd}` }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>🐺 Joueurs</div>
          {g.phase !== 'lobby' && <div style={{ fontSize: 11, color: t.t2, marginTop: 2 }}>R{g.round} • {alive.length} en vie</div>}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 6 }}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', color: t.tm, padding: '6px 6px 2px' }}>En vie — {alive.length}</div>
          {alive.map(p => {
            const sel = (g.phase === 'vote' && g.voteTarget === p.id) || (isNight && g.nightTarget === p.id);
            const canClick = (g.phase === 'vote' && p.id !== PID && me?.alive) || (isNight && isLoup && p.team !== 'loups' && me?.alive) || (isNight && isVoy && me?.alive && p.id !== PID) || hunting;
            return (
              <div key={p.id} onClick={() => click(p)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px', borderRadius: 8, background: sel ? 'rgba(239,68,68,.12)' : 'transparent', cursor: canClick ? 'pointer' : 'default', transition: 'background .15s' }}>
                <Av name={p.name} color={p.color} size={28} emoji={(p.id === PID || g.phase === 'end' || (isLoup && p.team === 'loups')) && p.role ? ROLES[p.role].emoji : null} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: p.id === PID ? 700 : 500, color: p.id === PID ? t.ac : t.t1, display: 'flex', alignItems: 'center', gap: 3 }}>
                    {p.name} {p.id === PID && <span style={{ fontSize: 8, background: t.acs, padding: '1px 4px', borderRadius: 3, color: t.ac }}>TOI</span>}
                  </div>
                  {(p.id === PID || g.phase === 'end') && p.role && <div style={{ fontSize: 10, color: ROLES[p.role].color }}>{ROLES[p.role].name}</div>}
                </div>
              </div>
            );
          })}
          {dead.length > 0 && <>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', color: t.tm, padding: '8px 6px 2px' }}>Éliminés — {dead.length}</div>
            {dead.map(p => <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', opacity: .4 }}><Av name={p.name} color={p.color} size={24} alive={false} emoji={p.role ? ROLES[p.role].emoji : null} /><span style={{ fontSize: 11, textDecoration: 'line-through', color: t.t2 }}>{p.name}</span></div>)}
          </>}
        </div>
      </div>

      {/* Game */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Phase bar */}
        <div style={{ padding: '10px 20px', borderBottom: `1px solid ${t.bd}`, background: t.bg2, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ background: phaseBg[g.phase], padding: '8px 14px', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 13 }}>{phaseLabel[g.phase]}</div>
          <div style={{ flex: 1 }} />
          {g.timer > 0 && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Space Grotesk',monospace", color: g.timer <= 5 ? t.red : t.t1, animation: g.timer <= 5 ? 'pulse .5s infinite' : 'none' }}>{g.timer}s</span>
            <div style={{ width: 60, height: 4, background: 'rgba(255,255,255,.08)', borderRadius: 2, overflow: 'hidden' }}><div style={{ width: `${(g.timer / g.maxT) * 100}%`, height: '100%', background: g.timer <= 5 ? t.red : '#6c5ce7', transition: 'width 1s linear', borderRadius: 2 }} /></div>
          </div>}
          {g.phase === 'end' && <button onClick={() => { setG(init()); setVResult(null); setHunting(false); }} style={{ background: t.ac, border: 'none', borderRadius: 8, color: '#fff', padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>🔄 Rejouer</button>}
        </div>

        {/* Lobby */}
        {g.phase === 'lobby' && <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20, animation: 'fadeIn .5s' }}>
          <div style={{ fontSize: 50, animation: 'float 3s ease-in-out infinite' }}>🐺</div>
          <div style={{ textAlign: 'center' }}><div style={{ fontSize: 22, fontWeight: 800 }}>Loup-Garou</div><div style={{ color: t.t2, fontSize: 13 }}>Trouvez les loups!</div></div>
          <div style={{ background: t.bg3, borderRadius: 14, padding: 20, width: '100%', maxWidth: 300, border: `1px solid ${t.bd}` }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Joueurs</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <input type="range" min={4} max={12} value={count} onChange={e => setCount(+e.target.value)} style={{ flex: 1, accentColor: t.ac }} />
              <span style={{ fontSize: 20, fontWeight: 800, fontFamily: "'Space Grotesk',monospace", color: t.ac }}>{count}</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 14 }}>
              {(() => { const r = [], lc = count <= 6 ? 1 : count <= 9 ? 2 : 3; r.push({ r: 'loup', c: lc }); if (count >= 5) r.push({ r: 'voyante', c: 1 }); if (count >= 6) r.push({ r: 'sorciere', c: 1 }); if (count >= 8) r.push({ r: 'chasseur', c: 1 }); r.push({ r: 'villageois', c: count - r.reduce((s, x) => s + x.c, 0) }); return r.map(x => <span key={x.r} style={{ background: `${ROLES[x.r].color}20`, color: ROLES[x.r].color, padding: '3px 8px', borderRadius: 14, fontSize: 10, fontWeight: 600 }}>{ROLES[x.r].emoji} ×{x.c}</span>); })()}
            </div>
            <button onClick={start} style={{ width: '100%', padding: 12, background: 'linear-gradient(135deg,#6c5ce7,#a855f7)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(108,92,231,.4)' }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>🎮 Jouer</button>
          </div>
        </div>}

        {/* Role reveal */}
        {g.phase === 'role-reveal' && me?.role && <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'bounceIn .6s' }}>
          <div style={{ background: `linear-gradient(135deg,${ROLES[me.role].color}18,${t.bg3})`, border: `2px solid ${ROLES[me.role].color}40`, borderRadius: 20, padding: '30px 36px', textAlign: 'center', maxWidth: 320, animation: 'glow 2s infinite' }}>
            <div style={{ fontSize: 56, marginBottom: 10 }}>{ROLES[me.role].emoji}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: ROLES[me.role].color, marginBottom: 6 }}>{ROLES[me.role].name}</div>
            <div style={{ fontSize: 13, color: t.t2, lineHeight: 1.5, marginBottom: 10 }}>{ROLES[me.role].desc}</div>
            <span style={{ background: me.team === 'loups' ? 'rgba(239,68,68,.12)' : 'rgba(34,197,94,.12)', color: me.team === 'loups' ? '#ef4444' : '#22c55e', padding: '4px 12px', borderRadius: 14, fontSize: 11, fontWeight: 700 }}>{me.team === 'loups' ? '🐺 Loups' : '🏡 Village'}</span>
          </div>
        </div>}

        {/* Active game */}
        {!['lobby', 'role-reveal'].includes(g.phase) && <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Action bar */}
          {isNight && me?.alive && <div style={{ padding: '8px 20px', background: 'rgba(108,92,231,.06)', borderBottom: `1px solid ${t.bd}`, fontSize: 12, animation: 'slideDown .3s' }}>
            {isLoup && <span style={{ color: '#ef4444', fontWeight: 600 }}>🐺 Choisissez une victime {g.nightTarget ? `→ ${g.players.find(p => p.id === g.nightTarget)?.name}` : ''}</span>}
            {isVoy && <span style={{ color: '#a855f7', fontWeight: 600 }}>🔮 Inspectez un joueur {vResult ? `→ ${vResult.name} = ${ROLES[vResult.role].emoji}` : ''}</span>}
            {isSorc && <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>🧪
              {!g.healUsed && <button onClick={() => setG(p => ({ ...p, healTarget: 'auto' }))} style={{ background: 'rgba(34,197,94,.12)', border: '1px solid rgba(34,197,94,.3)', borderRadius: 6, padding: '3px 10px', color: '#22c55e', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>💚 Sauver</button>}
              {!g.killUsed && <button onClick={() => { const tgts = alive.filter(p => p.id !== PID); const r = tgts[Math.floor(Math.random() * tgts.length)]; if (r) setG(p => ({ ...p, killTarget: r.id })); }} style={{ background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 6, padding: '3px 10px', color: '#ef4444', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>☠️ Poison</button>}
            </div>}
            {!isLoup && !isVoy && !isSorc && <span style={{ color: t.t2 }}>😴 Vous dormez...</span>}
          </div>}
          {g.phase === 'vote' && me?.alive && <div style={{ padding: '8px 20px', background: 'rgba(239,68,68,.06)', borderBottom: `1px solid ${t.bd}`, fontSize: 12, color: t.red, fontWeight: 600, animation: 'slideDown .3s' }}>🗳️ Cliquez sur un joueur! {g.voteTarget ? `→ ${g.players.find(p => p.id === g.voteTarget)?.name}` : ''}</div>}
          {hunting && <div style={{ padding: '8px 20px', background: 'rgba(245,158,11,.08)', borderBottom: `1px solid ${t.bd}`, fontSize: 12, color: '#f59e0b', fontWeight: 600, animation: 'shake .5s' }}>🏹 Tirez sur quelqu'un!</div>}
          {g.phase === 'end' && g.winner && <div style={{ padding: '16px 20px', background: g.winner === 'loups' ? 'rgba(239,68,68,.08)' : 'rgba(34,197,94,.08)', textAlign: 'center', animation: 'bounceIn .6s' }}>
            <div style={{ fontSize: 32 }}>{g.winner === 'loups' ? '🐺' : '🏡'}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: g.winner === 'loups' ? '#ef4444' : '#22c55e' }}>{g.winner === 'loups' ? 'Les Loups ont gagné!' : 'Le Village a gagné!'}</div>
            <div style={{ fontSize: 12, color: t.t2 }}>{me?.team === g.winner ? '🎉 Victoire!' : '😔 Défaite...'}</div>
          </div>}

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 20px', display: 'flex', flexDirection: 'column', gap: 3 }}>
            {g.msgs.map(m => <div key={m.id} style={{ animation: 'fadeIn .2s' }}>
              {m.type === 'system' && <div style={{ fontSize: 12, color: t.t2, padding: '4px 10px', background: t.bg3, borderRadius: 6, textAlign: 'center' }}>{m.content}</div>}
              {m.type === 'kill' && <div style={{ fontSize: 12, color: '#ef4444', padding: '4px 10px', background: 'rgba(239,68,68,.06)', borderRadius: 6, borderLeft: '3px solid #ef4444' }}>{m.content}</div>}
              {m.type === 'vote' && <div style={{ fontSize: 12, color: '#f59e0b', padding: '4px 10px', background: 'rgba(245,158,11,.06)', borderRadius: 6, borderLeft: '3px solid #f59e0b' }}>{m.content}</div>}
              {m.type === 'reveal' && <div style={{ fontSize: 12, color: '#a855f7', padding: '4px 10px', background: 'rgba(168,85,247,.06)', borderRadius: 6, borderLeft: '3px solid #a855f7' }}>{m.content}</div>}
              {m.type === 'chat' && <div style={{ display: 'flex', gap: 6, fontSize: 13 }}><span style={{ fontWeight: 700, color: m.sender === PID ? t.ac : t.t1, flexShrink: 0 }}>{m.sName}:</span><span>{m.content}</span></div>}
            </div>)}
            <div ref={cRef} />
          </div>

          {/* Input */}
          {!['lobby', 'end'].includes(g.phase) && <div style={{ padding: '10px 20px', borderTop: `1px solid ${t.bd}`, background: t.bg2, display: 'flex', gap: 8 }}>
            <input value={inp} onChange={e => setInp(e.target.value)} onKeyDown={e => e.key === 'Enter' && chat()}
              placeholder={!me?.alive ? '💀 Mort(e)...' : isNight && !isLoup ? '😴 Zzz...' : isNight ? '🐺 Loups...' : 'Message...'}
              disabled={!me?.alive || (isNight && !isLoup)}
              style={{ flex: 1, background: t.bg3, border: `1px solid ${t.bd}`, borderRadius: 10, padding: '9px 12px', color: t.t1, fontSize: 13, outline: 'none', fontFamily: 'inherit', opacity: (!me?.alive || (isNight && !isLoup)) ? .4 : 1 }} />
            <button onClick={chat} disabled={!inp.trim()} style={{ background: inp.trim() ? t.ac : t.bg3, border: 'none', borderRadius: 10, color: inp.trim() ? '#fff' : t.tm, padding: '9px 14px', fontSize: 14, cursor: inp.trim() ? 'pointer' : 'default' }}>➤</button>
          </div>}
        </div>}
      </div>
    </div>
  );
}
