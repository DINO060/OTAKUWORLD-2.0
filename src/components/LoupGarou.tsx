import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { ArrowLeft, Send, RotateCcw, X, ChevronDown, ChevronUp, BookOpen, Trophy, Clock, MessageCircle, Home, Share2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

// ─── Types ───────────────────────────────────────────────────────────
type GameView = 'lobby' | 'waitingRoom' | 'reveal' | 'game' | 'nightResults' | 'end' | 'roles' | 'profile' | 'leaderboard' | 'hunterShot';
type Phase = 'night' | 'day-discussion' | 'day-vote';
type GameMode = 'normal' | 'chaos' | 'anarchie';
type Camp = 'wolf' | 'village' | 'solo' | 'variable' | 'cult';

interface Role {
  id: string;
  name: string;
  camp: Camp;
  icon: string;
  description: string;
  power: string;
  nightAction?: string;
  dayAction?: string;
  tips?: string;
}

interface Player {
  id: string;
  username: string;
  avatar: string;
  isBot: boolean;
  role?: Role;
  originalRole?: Role; // for transformations (Maudit, Traître, etc.)
  isAlive: boolean;
  isMayor: boolean;
  isLover: boolean;
  isProtected: boolean;
  isCharmed: boolean;
  isCursed: boolean; // Maudit — becomes wolf when attacked
  isInfected: boolean; // Médecin Peste infection
  isDoused: boolean; // Pyromane — arrosé d'essence
  isCultist: boolean; // converti par le Culte
  isDrunk: boolean; // Ivrogne — loups ivres next turn
  isCorrupted: boolean; // Corrupteur — corrompu
  cannotVote: boolean; // Loup Cauchemar — ne peut pas voter
  foxPowerLost: boolean; // Renard — pouvoir perdu
  roleModel?: string; // player id for Enfant Sauvage
  loverTarget?: string; // Beauté — amoureux forcé
  doppelTarget?: string; // Doppelgänger — copie target
  executionerTarget?: string; // Bourreau — cible à lynch
  votes: number;
  votedFor?: string;
}

interface KillEvent {
  playerId: string;
  playerName: string;
  role?: string;
  cause: string;
  icon: string;
}

interface GameState {
  phase: Phase;
  day: number;
  timeLeft: number;
  maxTime: number;
  players: Player[];
  killFeed: KillEvent[];
  nightKills: KillEvent[];
  wolfTarget: string | null;
  seerResult: { playerId: string; camp: Camp } | null;
  witchSaveUsed: boolean;
  witchKillUsed: boolean;
  guardTarget: string | null;
  blacksmithUsed: boolean; // Forgeron — block wolves 1×
  sandmanUsed: boolean; // Sandman — block all actions 1×
  pacifistUsed: boolean; // Pacifiste — block lynch 1×
  wolfDrunk: boolean; // loups ivres (Ivrogne effect)
  martyrTarget: string | null; // Martyr protégé
  martyrAlive: boolean; // Martyr still has sacrifice
  noWolfKillNights: number; // consecutive nights wolves didn't kill
  lastGuardTarget: string | null; // Garde — last protected player (can't repeat)
  nightmareUsed: boolean; // Loup Cauchemar — used 1x
  nightmareTarget: string | null; // Loup Cauchemar — target who can't vote
  priestUsed: boolean; // Prêtre — used 1x
  elderLynchedPowersLost: boolean; // Ancien lynché → village perd pouvoirs
  winner: Camp | 'lovers' | 'anarchie' | null;
}

// ─── Roles Database ───────────────────────────────────────────────
const ALL_ROLES: Role[] = [
  // ── LOUPS (7) ──
  { id: 'werewolf', name: 'Loup-Garou', camp: 'wolf', icon: '🐺', description: 'Chaque nuit, les loups se réveillent ensemble et choisissent une victime à dévorer.', power: 'Kill nocturne collectif', nightAction: 'vote_kill', tips: 'Coordonnez-vous avec les autres loups. Bluffez en journée.' },
  { id: 'alpha-wolf', name: 'Loup Alpha', camp: 'wolf', icon: '🐺👑', description: 'Chef de la meute. 1× par partie : convertir la victime au lieu de la tuer (20% auto).', power: 'Conversion (1×)', nightAction: 'vote_kill', tips: 'Convertissez un Villageois pour renforcer la meute.' },
  { id: 'mystic-wolf', name: 'Loup Mystique', camp: 'wolf', icon: '🐺🔮', description: 'En plus du vote loup, peut examiner 1 joueur chaque jour pour voir son rôle.', power: 'Vision diurne', nightAction: 'vote_kill', dayAction: 'mystic_examine', tips: 'Identifiez les rôles dangereux.' },
  { id: 'wolf-cub', name: 'Louveteau', camp: 'wolf', icon: '🐺🍼', description: 'Si tué (par n\'importe qui), les loups ont 2 kills la nuit suivante (Wolf Rage).', power: 'Rage de la meute', nightAction: 'vote_kill', tips: 'Restez en vie le plus longtemps possible.' },
  { id: 'big-bad-wolf', name: 'Grand Méchant Loup', camp: 'wolf', icon: '🐺💀', description: 'Tant qu\'aucun loup n\'est mort, dévore une 2ème victime chaque nuit.', power: 'Double kill conditionnel', nightAction: 'vote_kill', tips: 'Profitez de votre avantage tant que la meute est intacte.' },
  { id: 'trickster-wolf', name: 'Trickster Wolf', camp: 'wolf', icon: '🐺🎭', description: '1× par partie : se "révéler" publiquement comme un faux rôle village. Le message est identique à un vrai reveal.', power: 'Faux reveal (1×)', dayAction: 'fake_reveal', tips: 'Imitez un rôle crédible pour tromper le village.' },
  // ── VILLAGE (25) ──
  { id: 'villager', name: 'Villageois', camp: 'village', icon: '👤', description: 'Un simple villageois sans pouvoir spécial. Doit utiliser la déduction et le vote.', power: 'Vote de jour', tips: 'Observez les comportements suspects.' },
  { id: 'seer', name: 'Voyante', camp: 'village', icon: '🔮', description: 'Chaque nuit, examine 1 joueur pour connaître son vrai rôle. Ne détecte pas les infectés.', power: 'Vision nocturne', nightAction: 'examine', tips: 'Ne révélez pas votre rôle trop tôt.' },
  { id: 'witch', name: 'Sorcière', camp: 'village', icon: '🧪', description: '2 potions uniques : vie (sauve la cible des loups) et mort (tue n\'importe qui, ignore le Garde).', power: '2 potions (vie + mort)', nightAction: 'potions', tips: 'Gardez vos potions pour les moments critiques.' },
  { id: 'hunter', name: 'Chasseur', camp: 'village', icon: '🏹', description: 'En mourant (nuit ou jour), tire sur 1 joueur de son choix et le tue.', power: 'Tir mortel', tips: 'Identifiez un loup avant de mourir.' },
  { id: 'cupid', name: 'Cupidon', camp: 'village', icon: '💘', description: 'Nuit 1 : lie 2 joueurs en amoureux. Si l\'un meurt, l\'autre meurt. Derniers vivants = victoire Amoureux.', power: 'Lien d\'amour (nuit 1)', nightAction: 'link_lovers', tips: 'Évitez de lier un loup et un villageois.' },
  { id: 'guard', name: 'Garde', camp: 'village', icon: '🛡️', description: 'Protège 1 joueur/nuit des loups. Pas le même 2 nuits de suite. Ne protège pas contre SK/Sorcière/Ninja.', power: 'Protection nocturne', nightAction: 'protect', tips: 'Protégez les rôles importants.' },
  { id: 'elder', name: 'Ancien', camp: 'village', icon: '👴', description: 'Survit à la 1ère attaque des loups. Si tué par le village → tous les villageois perdent leurs pouvoirs.', power: 'Résistance (1×)', tips: 'Ne vous faites pas lyncher !' },
  { id: 'little-girl', name: 'Petite Fille', camp: 'village', icon: '👧', description: 'Voit les messages du chat loup la nuit (anonymisés). Ne peut pas écrire.', power: 'Espionnage nocturne', tips: 'Soyez discrète dans vos accusations.' },
  { id: 'idiot', name: 'Idiot du Village', camp: 'village', icon: '🤪', description: 'Survit au 1er lynch mais perd son droit de vote. 2ème lynch = mort.', power: 'Survie au lynch (1×)', tips: 'Votre rôle sera révélé, utilisez-le.' },
  { id: 'bear-tamer', name: 'Montreur d\'Ours', camp: 'village', icon: '🐻', description: 'Chaque matin, si un loup est voisin direct dans la liste, l\'ours grogne.', power: 'Détection de proximité', tips: 'L\'info est automatique chaque matin.' },
  { id: 'knight', name: 'Chevalier', camp: 'village', icon: '⚔️', description: 'Si les loups l\'attaquent, il tue 1 loup aléatoire ET meurt. Le Garde peut le protéger.', power: 'Contre-attaque mortelle', tips: 'Faites-vous passer pour une cible facile.' },
  { id: 'fox', name: 'Renard', camp: 'village', icon: '🦊', description: 'Examine un groupe de 3 voisins. Positif = au moins 1 loup. Négatif = perd son pouvoir.', power: 'Détection groupée', nightAction: 'detect_group', tips: 'Réduisez les suspects par élimination.' },
  { id: 'gunner', name: 'Gunner', camp: 'village', icon: '🔫', description: '2 balles en argent. Tire le jour = kill instantané. Tout le monde voit qui a tiré.', power: '2 tirs en journée', dayAction: 'shoot', tips: 'Gardez vos balles pour des cibles sûres.' },
  { id: 'detective', name: 'Détective', camp: 'village', icon: '🕵️', description: 'Compare 2 joueurs : "même camp" ou "camps différents". 40% chance d\'être exposé.', power: 'Comparaison de camps', dayAction: 'investigate', tips: 'Attention au risque d\'exposition !' },
  { id: 'shaman', name: 'Chamane', camp: 'village', icon: '🪬', description: 'Chaque nuit, communique avec les morts. Les loups morts peuvent mentir !', power: 'Communication avec les morts', nightAction: 'speak_dead', tips: 'Les morts connaissent les rôles révélés.' },
  { id: 'scapegoat', name: 'Bouc Émissaire', camp: 'village', icon: '🐐', description: 'En cas d\'égalité au vote → meurt à la place. Choisit qui pourra voter le lendemain.', power: 'Sacrifice sur égalité', tips: 'Évitez les votes serrés.' },
  { id: 'devoted-servant', name: 'Servante Dévouée', camp: 'village', icon: '🎭', description: 'Quand un joueur est lynché, peut prendre son rôle (sans le dévoiler au village).', power: 'Vol de rôle au lynch', tips: 'Attendez un rôle puissant.' },
  { id: 'augur', name: 'Augure', camp: 'village', icon: '🦅', description: 'Chaque matin, apprend 1 rôle qui N\'EST PAS dans la partie actuelle.', power: 'Exclusion de rôle', tips: 'Par élimination, réduisez les possibilités.' },
  { id: 'pacifist', name: 'Pacifiste', camp: 'village', icon: '☮️', description: '1× par partie : empêche tout lynch ce jour. Annonce publique.', power: 'Anti-lynch (1×)', dayAction: 'prevent_lynch', tips: 'Sauvez un innocent sur le point d\'être lynché.' },
  { id: 'blacksmith', name: 'Forgeron', camp: 'village', icon: '⚒', description: '1× par partie : bloque TOUS les kills nocturnes des loups cette nuit.', power: 'Shield anti-loup (1×)', nightAction: 'block_wolves', tips: 'Utilisez-le quand un rôle clé est en danger.' },
  { id: 'sandman', name: 'Sandman', camp: 'village', icon: '💤', description: '1× par partie : TOUTES les actions nocturnes sont annulées. Personne ne peut agir.', power: 'Sommeil total (1×)', nightAction: 'sleep_all', tips: 'Reset complet — peut sauver d\'une nuit catastrophique.' },
  { id: 'martyr', name: 'Martyr', camp: 'village', icon: '🔰', description: 'Nuit 1 : choisit un protégé. Si le protégé meurt → le Martyr meurt à sa place (auto, 1×).', power: 'Sacrifice automatique', nightAction: 'choose_protege', tips: 'Choisissez un joueur important.' },
  { id: 'beauty', name: 'Beauté', camp: 'village', icon: '💅', description: '1er visiteur de chaque nuit tombe amoureux (lien mortel). Max 2 liens total. Si elle meurt → les amoureux meurent 1 jour après.', power: 'Séduction (1/nuit, 2 max)', tips: 'Piège mortel pour les visiteurs nocturnes.' },
  { id: 'oracle', name: 'Oracle', camp: 'village', icon: '🌀', description: 'Chaque nuit, choisit 1 joueur → apprend un rôle qu\'il N\'EST PAS (parmi les vivants).', power: 'Vision inversée', nightAction: 'divine_not', tips: 'Complémentaire à la Voyante.' },
  { id: 'harlot', name: 'Courtisane', camp: 'village', icon: '💋', description: 'Visite 1 joueur/nuit. Si c\'est un loup → elle meurt. Si les loups l\'attaquent chez elle → elle n\'est pas là.', power: 'Visite risquée', nightAction: 'visit', tips: 'Si vous survivez, le joueur visité n\'est pas loup.' },
  { id: 'mayor', name: 'Maire', camp: 'village', icon: '🎖', description: 'Peut se révéler publiquement → son vote compte double. À sa mort, désigne un successeur.', power: 'Vote double', dayAction: 'reveal_mayor', tips: 'Attendez le bon moment pour vous révéler.' },
  { id: 'sheriff', name: 'Shérif', camp: 'village', icon: '🤠', description: '2× par partie en journée : élimine 1 joueur directement sans vote. Si il tire sur un Villageois → perd son badge.', power: 'Tir direct (2×)', dayAction: 'sheriff_shoot', tips: 'Tirez seulement sur des cibles sûres — erreur = perte du badge.' },
  { id: 'clumsy', name: 'Maladroit', camp: 'village', icon: '🤕', description: '50% de chance de voter pour quelqu\'un d\'AUTRE que sa cible. Ne sait pas si son vote a été redirigé.', power: 'Vote aléatoire', tips: 'Priez pour que votre vote soit bon.' },
  { id: 'alchemist', name: 'Alchimiste', camp: 'village', icon: '🍵', description: 'Fabrique une potion (délai = floor(joueurs/10)+1 nuits). Sur un loup → redevient villageois. Sur un villageois → il meurt.', power: 'Potion de cure/poison', nightAction: 'brew', tips: 'Ciblez bien — erreur = mort d\'un allié.' },
  { id: 'cult-hunter', name: 'Chasseur de Culte', camp: 'village', icon: '💂', description: 'Chaque nuit, choisit 1 joueur. Si cultiste → il meurt. Si le Culte l\'attaque → le dernier converti meurt.', power: 'Contre-culte', nightAction: 'hunt_cult', tips: 'Counter direct au Culte.' },
  // ── SOLO (7) ──
  { id: 'sk', name: 'Serial Killer', camp: 'solo', icon: '🔪', description: 'Tue 1 joueur/nuit. Immunisé aux loups (tue 1 loup en retour s\'ils l\'attaquent). Gagne seul.', power: 'Kill nocturne solo', nightAction: 'solo_kill', tips: 'Restez sous le radar.' },
  { id: 'fool', name: 'Fou', camp: 'solo', icon: '🤡', description: 'Gagne uniquement s\'il se fait lyncher. Tout le monde perd sauf lui.', power: 'Victoire par lynch', tips: 'Soyez suspect sans être évident.' },
  { id: 'arsonist', name: 'Pyromane', camp: 'solo', icon: '🔥', description: 'Chaque nuit : arrose 1 joueur d\'essence OU déclenche l\'explosion (tous les arrosés meurent). Immunisé au SK.', power: 'Incinération de masse', nightAction: 'douse', tips: 'Patientez avant d\'allumer le feu.' },
  { id: 'executioner', name: 'Bourreau', camp: 'solo', icon: '🎯', description: 'Cible assignée au début. Gagne si sa cible est lynchée. Si elle meurt autrement → devient Fou.', power: 'Cible à lynch', tips: 'Accusez votre cible de manière convaincante.' },
  { id: 'plague-doctor', name: 'Médecin Peste', camp: 'solo', icon: '🦠', description: 'Infecte 1 joueur/nuit (invisible). S\'il meurt → tous les infectés meurent aussi (épidémie).', power: 'Infection + Épidémie', nightAction: 'infect', tips: 'Infectez discrètement, ne mourez pas trop tôt.' },
  { id: 'ninja', name: 'Ninja', camp: 'solo', icon: '🥷', description: '1× par partie : assassinat silencieux la nuit. Ignore TOUTES les protections. Solo neutre — gagne s\'il est en vie à la fin.', power: 'Kill silencieux (1×)', nightAction: 'silent_kill', tips: 'Survivez. Votre kill est votre seul outil.' },
  { id: 'piper', name: 'Joueur de Flûte', camp: 'solo', icon: '🪈', description: 'Charme 2 joueurs/nuit. Les charmés se reconnaissent. Gagne quand tous les vivants sont charmés.', power: 'Charme nocturne (2/nuit)', nightAction: 'charm', tips: 'Charmez discrètement.' },
  // ── VARIABLE (5) ──
  { id: 'doppelganger', name: 'Doppelgänger', camp: 'variable', icon: '🎭', description: 'Nuit 1 : choisit 1 joueur. Quand ce joueur meurt → copie son rôle exact et change de camp.', power: 'Copie de rôle', nightAction: 'choose_target', tips: 'Attendez que votre cible meure pour agir.' },
  { id: 'cursed', name: 'Maudit', camp: 'variable', icon: '😾', description: 'Villageois normal JUSQU\'À ce que les loups l\'attaquent → survit et rejoint les loups. Vu comme "Villageois" par la Voyante.', power: 'Conversion passive', tips: 'Jouez normalement — les loups ne vous connaissent pas.' },
  { id: 'wild-child', name: 'Enfant Sauvage', camp: 'variable', icon: '🧒🌿', description: 'Nuit 1 : choisit un modèle. Tant qu\'il vit = Village. Si le modèle meurt = rejoint les Loups.', power: 'Bascule conditionnelle', nightAction: 'choose_model', tips: 'Protégez votre modèle... ou pas.' },
  { id: 'traitor', name: 'Traître', camp: 'variable', icon: '🖕', description: 'Villageois normal JUSQU\'À ce que TOUS les loups meurent → il devient le dernier loup. Surprise !', power: 'Transformation tardive', tips: 'Le village croit avoir gagné... twist.' },
  { id: 'thief', name: 'Voleur', camp: 'variable', icon: '😈', description: 'Nuit 1 : vole le rôle d\'un joueur. Le joueur volé devient Villageois. Change de camp si nécessaire.', power: 'Vol de rôle (nuit 1)', nightAction: 'steal_role', tips: 'Volez un rôle puissant pour maximiser votre impact.' },
  // ── CULTE (2) ──
  { id: 'cult-leader', name: 'Chef du Culte', camp: 'cult', icon: '🕯️', description: 'Chaque nuit, tente de convertir 1 joueur. Si le Chef meurt → le Disciple hérite du pouvoir. Victoire si tous les vivants sont cultistes.', power: 'Conversion nocturne', nightAction: 'convert', tips: 'Ne convertissez pas les loups (immunisés).' },
  { id: 'disciple', name: 'Disciple', camp: 'cult', icon: '🕯️🙏', description: 'Connaît le Chef du Culte dès le début. Si le Chef meurt → hérite du pouvoir de conversion. Voit les convertis.', power: 'Héritier du Culte', tips: 'Protégez le Chef. Vous êtes le plan B.' },
  { id: 'prowler', name: 'Rôdeur', camp: 'wolf', icon: '🦉', description: 'Observe 1 joueur/nuit. Sait s\'il est "éveillé" (a une action nocturne) ou "endormi".', power: 'Observation nocturne', nightAction: 'watch', tips: 'Repérez la Voyante, le SK, le Garde.' },
  { id: 'fallen-angel', name: 'Ange Déchu', camp: 'wolf', icon: '👼🐺', description: 'Chaque nuit : protège 1 loup OU tue 1 villageois. N\'est PAS un loup (ne vote pas avec eux).', power: 'Support loup', nightAction: 'angel_action', tips: 'Protégez les loups clés ou éliminez les menaces.' },
  { id: 'drunk', name: 'Ivrogne', camp: 'village', icon: '🍻', description: 'Si les loups le tuent, ils deviennent "ivres" et ne peuvent pas tuer la nuit suivante.', power: 'Ivresse des loups', tips: 'Votre mort handicape les loups.' },
  // ── NOUVEAUX RÔLES ──
  // Loups
  { id: 'sorcerer', name: 'Sorcier Noir', camp: 'wolf', icon: '🐺🧙', description: 'Allié des loups. Chaque nuit, scanne 1 joueur : apprend s\'il est Voyante, Renard ou Oracle.', power: 'Détection des voyants', nightAction: 'scan_seer', tips: 'Trouvez et éliminez la Voyante.' },
  { id: 'nightmare-wolf', name: 'Loup Cauchemar', camp: 'wolf', icon: '🐺😱', description: '1× par partie : provoque un cauchemar — la cible ne peut pas voter le jour suivant.', power: 'Cauchemar (1×)', nightAction: 'vote_kill', dayAction: 'nightmare', tips: 'Neutralisez un joueur influent au moment critique.' },
  // Village
  { id: 'twin-sister-1', name: 'Sœur Jumelle', camp: 'village', icon: '👩‍👩', description: 'Les 2 Sœurs se connaissent dès le début. Si l\'une meurt, l\'autre le sait immédiatement.', power: 'Reconnaissance mutuelle', tips: 'Partagez vos infos discrètement.' },
  { id: 'twin-sister-2', name: 'Sœur Jumelle', camp: 'village', icon: '👩‍👩', description: 'Les 2 Sœurs se connaissent dès le début. Si l\'une meurt, l\'autre le sait immédiatement.', power: 'Reconnaissance mutuelle', tips: 'Partagez vos infos discrètement.' },
  { id: 'brother-1', name: 'Frère', camp: 'village', icon: '👬', description: 'Les 3 Frères se connaissent dès le début. Coordination secrète.', power: 'Reconnaissance mutuelle', tips: 'Fiez-vous les uns aux autres.' },
  { id: 'brother-2', name: 'Frère', camp: 'village', icon: '👬', description: 'Les 3 Frères se connaissent dès le début. Coordination secrète.', power: 'Reconnaissance mutuelle', tips: 'Fiez-vous les uns aux autres.' },
  { id: 'brother-3', name: 'Frère', camp: 'village', icon: '👬', description: 'Les 3 Frères se connaissent dès le début. Coordination secrète.', power: 'Reconnaissance mutuelle', tips: 'Fiez-vous les uns aux autres.' },
  { id: 'medium', name: 'Médium', camp: 'village', icon: '👻', description: 'Chaque nuit, apprend le rôle du dernier joueur mort.', power: 'Lecture des morts', nightAction: 'read_dead', tips: 'Combinez vos infos avec les accusations du village.' },
  { id: 'priest', name: 'Prêtre', camp: 'village', icon: '⛪', description: '1× par partie : bénit un joueur — s\'il est loup, il est immédiatement révélé au village.', power: 'Bénédiction (1×)', nightAction: 'bless', tips: 'Ciblez le joueur le plus suspect.' },
  { id: 'gravedigger', name: 'Fossoyeur', camp: 'village', icon: '⚰️', description: 'Chaque nuit, choisit 1 joueur mort → apprend son camp (pas son rôle exact).', power: 'Fouille de tombe', nightAction: 'dig_grave', tips: 'Vérifiez si les lynchés étaient vraiment loups.' },
  { id: 'comedian', name: 'Comédien', camp: 'village', icon: '🎪', description: 'Choisit 3 rôles au début. Peut utiliser le pouvoir de chaque rôle 1 seule fois (1 par nuit).', power: 'Imitation (3 rôles)', nightAction: 'mimic', tips: 'Gardez vos imitations pour les moments décisifs.' },
  // Solo
  { id: 'angel', name: 'Ange', camp: 'solo', icon: '😇', description: 'Gagne s\'il meurt au 1er tour (lynch OU nuit). S\'il survit → devient Villageois normal.', power: 'Mort souhaitée (tour 1)', tips: 'Soyez ultra suspect dès le début.' },
  { id: 'corruptor', name: 'Corrupteur', camp: 'solo', icon: '💀', description: 'Chaque nuit, corrompt 1 joueur. Le corrompu ne le sait pas. Gagne quand la majorité des vivants sont corrompus.', power: 'Corruption silencieuse', nightAction: 'corrupt', tips: 'Corrompez rapidement sans attirer l\'attention.' },
  { id: 'lone-wolf', name: 'Loup Solitaire', camp: 'solo', icon: '🐺🌙', description: 'Vote avec les loups la nuit, mais gagne SEULEMENT s\'il est le DERNIER loup en vie à la fin.', power: 'Victoire solitaire', nightAction: 'vote_kill', tips: 'Aidez le village à éliminer les autres loups discrètement.' },
];

// ─── Helpers ──────────────────────────────────────────────────────
const RANKS = [
  { name: 'Louveteau', icon: '🟢', min: 0, max: 500, color: '#22c55e' },
  { name: 'Chasseur', icon: '🔵', min: 500, max: 2000, color: '#4facfe' },
  { name: 'Voyante', icon: '🟣', min: 2000, max: 5000, color: '#a855f7' },
  { name: 'Alpha', icon: '🟡', min: 5000, max: 10000, color: '#f59e0b' },
  { name: 'Légende', icon: '🔴', min: 10000, max: 99999, color: '#ef4444' },
];

function getRank(pts: number) {
  return RANKS.find(r => pts >= r.min && pts < r.max) || RANKS[RANKS.length - 1];
}

const BOT_NAMES = ['Alex', 'Marie', 'Sophie', 'Jean', 'Lucas', 'Emma', 'Thomas', 'Léa', 'Hugo', 'Chloé', 'Nathan', 'Julie', 'Louis', 'Camille', 'Enzo', 'Manon', 'Raphaël', 'Inès', 'Arthur', 'Jade', 'Théo', 'Lina', 'Noah', 'Léna', 'Adam', 'Sarah', 'Gabriel', 'Lou', 'Ethan', 'Eva', 'Paul', 'Alice', 'Gabin', 'Zoé'];
const BOT_AVATARS = ['🟢', '🔵', '🟡', '🟠', '🔴', '⚪', '🟤', '🩵', '🩷', '🩶', '💛', '💜', '💚', '🧡', '❤️', '💙', '🤍', '🖤', '💗', '🤎', '💝', '💖', '💘', '💕', '💞', '💓', '💟', '❣️', '💔', '💌', '🫀', '🫶', '🩷', '🩶'];

const MEDALS = [
  { name: 'Diamant', emoji: '💎', min: 1, max: 3, color: '#b9f2ff' },
  { name: 'Émeraude', emoji: '💚', min: 4, max: 10, color: '#50c878' },
  { name: 'Or', emoji: '🥇', min: 11, max: 25, color: '#ffd700' },
  { name: 'Argent', emoji: '🥈', min: 26, max: 50, color: '#c0c0c0' },
  { name: 'Bronze', emoji: '🥉', min: 51, max: 100, color: '#cd7f32' },
];

function getMedal(position: number) {
  return MEDALS.find(m => position >= m.min && position <= m.max) || null;
}


// ─── Styles ─────────────────────────────────────────────────────
const bg1 = '#0c0c14';
const bg2 = '#111119';
const bg3 = '#1a1a25';
const t1 = '#e8e8ed';
const t2 = '#8888a0';
const t3 = '#555570';
const accent = '#6c5ce7';
const accentSoft = 'rgba(108,92,231,0.12)';
const border = 'rgba(255,255,255,0.06)';
const wolfRed = '#ef4444';
const villageGreen = '#22c55e';
const soloPurple = '#a855f7';
const soloGold = '#f59e0b';

const cultPink = '#e879f9';
const variablePurple = '#a855f7';

const campColor = (camp: Camp) => camp === 'wolf' ? wolfRed : camp === 'village' ? villageGreen : camp === 'cult' ? cultPink : camp === 'variable' ? variablePurple : soloGold;
const campBg = (camp: Camp) => camp === 'wolf' ? 'rgba(239,68,68,0.12)' : camp === 'village' ? 'rgba(34,197,94,0.12)' : camp === 'cult' ? 'rgba(232,121,249,0.12)' : camp === 'variable' ? 'rgba(168,85,247,0.12)' : 'rgba(245,158,11,0.12)';
const campLabel = (camp: Camp) => camp === 'wolf' ? '🐺 LOUP' : camp === 'village' ? '🏡 VILLAGE' : camp === 'cult' ? '🕯️ CULTE' : camp === 'variable' ? '🎭 VARIABLE' : '⚡ SOLO';

// ─── Notification Templates Cache ─────────────────────────────────
interface NotifTemplate {
  notification_key: string;
  default_message: string;
  custom_message: string | null;
  icon: string;
  media_type: string;
  media_url: string | null;
  is_active: boolean;
}

let notifTemplatesCache: NotifTemplate[] | null = null;

async function loadNotifTemplates(): Promise<NotifTemplate[]> {
  if (notifTemplatesCache) return notifTemplatesCache;
  const { data } = await supabase.from('game_notification_templates').select('notification_key, default_message, custom_message, icon, media_type, media_url, is_active');
  notifTemplatesCache = (data as NotifTemplate[]) || [];
  return notifTemplatesCache;
}

function getNotifMessage(key: string, fallback: string, vars?: Record<string, string>): string {
  if (!notifTemplatesCache) return fallback;
  const tmpl = notifTemplatesCache.find(t => t.notification_key === key);
  if (!tmpl || !tmpl.is_active) return fallback;
  let msg = tmpl.custom_message || tmpl.default_message || fallback;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      msg = msg.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v);
    }
  }
  return msg;
}

function getNotifMedia(key: string): { type: string; url: string } | null {
  if (!notifTemplatesCache) return null;
  const tmpl = notifTemplatesCache.find(t => t.notification_key === key);
  if (!tmpl || tmpl.media_type === 'none' || !tmpl.media_url) return null;
  return { type: tmpl.media_type, url: tmpl.media_url };
}

// Map cause strings → notification_key for media lookup
const CAUSE_TO_KEY: Record<string, string> = {
  'Dévoré par les loups': 'wolf_kill',
  'Dévorée par les loups': 'wolf_kill',
  'Poignardé par le Serial Killer': 'sk_kill',
  'Empoisonné par la Sorcière': 'witch_poison',
  'Abattu par le Chasseur': 'hunter_shot',
  'Abattu par le Gunner': 'gunner_shot',
  'Assassiné par le Ninja': 'ninja_kill',
  'Brûlé par le Pyromane': 'arsonist_ignite',
  'Épidémie ! Infecté par le Médecin Peste': 'plague_epidemic',
  'Chassé par le Chasseur de Culte': 'cult_hunter_kill',
  'Tué par le Chevalier': 'knight_counter',
  'Tué par le Serial Killer (contre-attaque)': 'sk_counter',
  'Tué par le SK (contre-attaque)': 'sk_counter',
  'Dévoré par le Grand Méchant Loup': 'big_bad_wolf_kill',
  'Tué par l\'Ange Déchu': 'angel_kill',
  'Empoisonné par l\'Alchimiste': 'alchemist_kill',
  'Tué par la rage du Louveteau': 'wolf_cub_rage',
  'Tuée en visitant un loup (Courtisane)': 'harlot_death',
  'Dernier converti éliminé par le Chasseur de Culte': 'cult_hunter_counter',
  'Tué par le Chasseur de Culte': 'cult_hunter_counter',
  'Lynché par le village': 'lynch',
  'Sacrifié (égalité au vote)': 'scapegoat_death',
  'Mort de chagrin (Amoureux)': 'lover_death',
};

function getKillDisplay(cause: string, playerName?: string): { message: string; media: { type: string; url: string } | null } {
  const key = CAUSE_TO_KEY[cause];
  if (!key) return { message: cause, media: null };
  const msg = getNotifMessage(key, cause, playerName ? { player: playerName } : undefined);
  const media = getNotifMedia(key);
  return { message: msg, media };
}

// ─── Main Component ───────────────────────────────────────────────
interface LoupGarouProps { onBack: () => void; initialRoomCode?: string; }

export default function LoupGarou({ onBack, initialRoomCode }: LoupGarouProps) {
  const { profile, user } = useAuth();
  const [view, setView] = useState<GameView>('lobby');
  const [gameMode, setGameMode] = useState<GameMode>('normal');
  const [playerCount, setPlayerCount] = useState(8);
  const [myRole, setMyRole] = useState<Role | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [nightTimer, setNightTimer] = useState(30);
  const [discussionTimer, setDiscussionTimer] = useState(60);
  const [voteTimer, setVoteTimer] = useState(30);
  const [revealFlipped, setRevealFlipped] = useState(false);
  const [revealProgress, setRevealProgress] = useState(100);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<{ player: string; message: string; time: string; color: string; mediaUrl?: string; mediaType?: string }[]>([]);
  const [roleFilter, setRoleFilter] = useState<'all' | Camp | 'wolf' | 'village' | 'solo' | 'variable' | 'cult'>('all');
  const [showRoleDetail, setShowRoleDetail] = useState<Role | null>(null);
  const [witchAction, setWitchAction] = useState<'save' | 'kill' | null>(null);
  const [actionDone, setActionDone] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [multiplayerMode, setMultiplayerMode] = useState<'none' | 'create' | 'join'>('none');
  const [roomCode, setRoomCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [waitingPlayers, setWaitingPlayers] = useState<{ id: string; name: string; color: string; isHost: boolean }[]>([]);
  const [profileTab, setProfileTab] = useState<'public' | 'stats' | 'roles' | 'history'>('public');
  const [leaderboardTab, setLeaderboardTab] = useState<'week' | 'month' | 'alltime'>('week');
  const [cupidSelections, setCupidSelections] = useState<string[]>([]);
  const [piperSelections, setPiperSelections] = useState<string[]>([]);
  const [hunterTarget, setHunterTarget] = useState<string | null>(null);
  const [unreadChat, setUnreadChat] = useState(0);
  const [chatTab, setChatTab] = useState<'village' | 'loups'>('village');
  const [hoveredDead, setHoveredDead] = useState<string | null>(null);
  const [playerSearch, setPlayerSearch] = useState('');
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [dbRoomId, setDbRoomId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [joiningRoom, setJoiningRoom] = useState(false);
  const [availableRooms, setAvailableRooms] = useState<{ id: string; code: string; host_username: string; player_count: number; max_players: number; mode: string }[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const gameChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pendingRemoteActions = useRef<{ playerId: string; targetId: string; actionType: string }[]>([]);

  // Multiplayer: my player ID (UUID in multiplayer, 'me' in solo)
  const myPlayerId = dbRoomId ? (user?.id || 'me') : 'me';
  const isMe = useCallback((pid: string) => pid === myPlayerId, [myPlayerId]);

  // ─── DB: Create room ─────────────────────────────────────────────
  const createRoomInDB = useCallback(async (code: string) => {
    if (!user) return null;
    const { data, error } = await supabase.from('game_rooms').insert({
      code,
      host_id: user.id,
      mode: gameMode,
      max_players: playerCount,
      status: 'waiting',
      current_phase: 'lobby',
    }).select('id').single();
    if (error) { console.error('Create room error:', error); return null; }
    // Host joins as player
    await supabase.from('game_players').insert({ room_id: data.id, user_id: user.id });
    return data.id;
  }, [user, gameMode, playerCount]);

  // ─── DB: Join room by code ───────────────────────────────────────
  const joinRoomByCode = useCallback(async (code: string) => {
    if (!user) return null;
    setJoiningRoom(true);
    // Find room
    const { data: room, error: roomErr } = await supabase
      .from('game_rooms')
      .select('id, host_id, mode, max_players, status')
      .eq('code', code)
      .eq('status', 'waiting')
      .single();
    if (roomErr || !room) { setJoiningRoom(false); return null; }
    // Check if already joined
    const { data: existing } = await supabase
      .from('game_players')
      .select('id')
      .eq('room_id', room.id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!existing) {
      // Check player count
      const { count } = await supabase
        .from('game_players')
        .select('id', { count: 'exact', head: true })
        .eq('room_id', room.id);
      if ((count || 0) >= room.max_players) { setJoiningRoom(false); return null; }
      await supabase.from('game_players').insert({ room_id: room.id, user_id: user.id });
    }
    setGameMode(room.mode as GameMode);
    setIsHost(room.host_id === user.id);
    setJoiningRoom(false);
    return room.id;
  }, [user]);

  // ─── DB: Fetch available rooms ───────────────────────────────────
  const fetchAvailableRooms = useCallback(async () => {
    // Only show rooms created in the last 2 hours
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { data: rooms } = await supabase
      .from('game_rooms')
      .select('id, code, host_id, max_players, mode, created_at')
      .eq('status', 'waiting')
      .gt('created_at', twoHoursAgo)
      .order('created_at', { ascending: false })
      .limit(20);
    if (!rooms || rooms.length === 0) { setAvailableRooms([]); return; }
    // Get host usernames + player counts
    const roomList = await Promise.all(rooms.map(async (r) => {
      const { data: hostProfile } = await supabase.from('profiles').select('username').eq('id', r.host_id).single();
      const { count } = await supabase.from('game_players').select('id', { count: 'exact', head: true }).eq('room_id', r.id);
      return {
        id: r.id,
        code: r.code,
        host_username: hostProfile?.username || '???',
        player_count: count || 0,
        max_players: r.max_players,
        mode: r.mode,
      };
    }));
    setAvailableRooms(roomList);
  }, []);

  // ─── Realtime: Subscribe to lobby players ────────────────────────
  useEffect(() => {
    if (!dbRoomId || view !== 'waitingRoom') return;
    // Fetch current players immediately
    const fetchPlayers = async () => {
      const { data } = await supabase
        .from('game_players')
        .select('user_id, joined_at')
        .eq('room_id', dbRoomId)
        .order('joined_at', { ascending: true });
      if (!data) return;
      // Fetch profiles for all players
      const userIds = data.map(p => p.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', userIds);
      // Get room to know host
      const { data: room } = await supabase
        .from('game_rooms')
        .select('host_id')
        .eq('id', dbRoomId)
        .single();
      const hostId = room?.host_id;
      const profileMap = new Map((profiles || []).map(p => [p.id, p.username]));
      setWaitingPlayers(data.map((p, i) => ({
        id: p.user_id,
        name: profileMap.get(p.user_id) || `Player${i}`,
        color: BOT_AVATARS[i % BOT_AVATARS.length],
        isHost: p.user_id === hostId,
      })));
    };
    fetchPlayers();

    // Subscribe to changes
    const channel = supabase
      .channel(`lobby_${dbRoomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_players', filter: `room_id=eq.${dbRoomId}` }, () => {
        fetchPlayers();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [dbRoomId, view]);

  // ─── Auto-join from feed (initialRoomCode) ───────────────────────
  useEffect(() => {
    if (!initialRoomCode || !user) return;
    (async () => {
      const roomId = await joinRoomByCode(initialRoomCode);
      if (roomId) {
        setDbRoomId(roomId);
        setRoomCode(initialRoomCode);
        setMultiplayerMode('join');
        setView('waitingRoom');
      } else {
        setJoinError('Salle introuvable ou déjà en cours.');
      }
    })();
  }, [initialRoomCode, user, joinRoomByCode]);

  // ─── Multiplayer: Broadcast channel for game sync ────────────────
  useEffect(() => {
    if (!dbRoomId) return;
    const channel = supabase.channel(`game_bc_${dbRoomId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'game_start' }, async ({ payload }) => {
        if (isHost) return;
        // Non-host: game started by host, fetch my role from DB
        const { data } = await supabase
          .from('game_players')
          .select('role')
          .eq('room_id', dbRoomId)
          .eq('user_id', user!.id)
          .single();
        if (data?.role) {
          const role = ALL_ROLES.find(r => r.id === data.role);
          setMyRole(role || null);
        }
        // Set initial players list from payload
        if (payload.players) {
          const myUid = user!.id;
          setGameState(prev => ({
            ...prev,
            phase: 'night', day: 1, timeLeft: payload.nightTimer || 30, maxTime: payload.nightTimer || 30,
            players: payload.players.map((p: any) => ({
              ...p,
              role: p.id === myUid ? ALL_ROLES.find(r => r.id === p.roleId) : (p.isAlive ? undefined : ALL_ROLES.find(r => r.id === p.roleId)),
            })),
            killFeed: [], nightKills: [], wolfTarget: null, seerResult: null,
            witchSaveUsed: false, witchKillUsed: false, guardTarget: null,
            blacksmithUsed: false, sandmanUsed: false, pacifistUsed: false,
            wolfDrunk: false, martyrTarget: null, martyrAlive: true, noWolfKillNights: 0,
            winner: null,
          }));
        }
        setRevealFlipped(false);
        setRevealProgress(100);
        setView('reveal');
      })
      .on('broadcast', { event: 'phase_update' }, ({ payload }) => {
        if (isHost) return;
        setGameState(prev => ({
          ...prev,
          phase: payload.phase,
          day: payload.day,
          timeLeft: payload.timeLeft,
          maxTime: payload.maxTime,
          players: payload.players.map((p: any) => {
            const existing = prev.players.find(ep => ep.id === p.id);
            const myUid = user!.id;
            return {
              ...(existing || p),
              isAlive: p.isAlive,
              votes: p.votes || 0,
              votedFor: p.votedFor,
              isMayor: p.isMayor,
              isLover: p.isLover,
              // Only reveal role for dead players or self
              role: p.id === myUid ? (existing?.role || ALL_ROLES.find(r => r.id === p.roleId)) : (!p.isAlive ? ALL_ROLES.find(r => r.id === p.roleId) : existing?.role),
            };
          }),
          killFeed: payload.killFeed || prev.killFeed,
          nightKills: payload.nightKills || prev.nightKills,
          winner: payload.winner,
        }));
        if (payload.chatMessages) setChatMessages(payload.chatMessages);
        if (payload.winner) setView('end');
      })
      .on('broadcast', { event: 'player_action' }, ({ payload }) => {
        if (!isHost) return;
        // Host receives action from remote player
        pendingRemoteActions.current.push({
          playerId: payload.playerId,
          targetId: payload.targetId,
          actionType: payload.actionType,
        });
        // Apply vote immediately for day-vote
        if (payload.actionType === 'vote') {
          setGameState(prev => {
            const updated = { ...prev, players: prev.players.map(p => ({ ...p })) };
            const voter = updated.players.find(p => p.id === payload.playerId);
            const target = updated.players.find(p => p.id === payload.targetId);
            if (voter && target && voter.isAlive && target.isAlive) {
              // Remove old vote
              if (voter.votedFor) {
                const oldTarget = updated.players.find(p => p.id === voter.votedFor);
                if (oldTarget) oldTarget.votes = Math.max(0, oldTarget.votes - (voter.isMayor ? 2 : 1));
              }
              voter.votedFor = payload.targetId;
              target.votes += voter.isMayor ? 2 : 1;
            }
            return updated;
          });
        }
        // Apply wolf target for night
        if (payload.actionType === 'wolf_kill') {
          setGameState(prev => ({ ...prev, wolfTarget: payload.targetId }));
        }
      })
      .on('broadcast', { event: 'chat' }, ({ payload }) => {
        setChatMessages(prev => [...prev, payload.message]);
      })
      .on('broadcast', { event: 'hunter_shot' }, ({ payload }) => {
        if (isHost) return;
        // Show hunter shot result
        setChatMessages(prev => [...prev, {
          player: '🏹 Système', message: payload.message, time: 'maintenant', color: '#ef4444',
        }]);
      })
      .subscribe();

    gameChannelRef.current = channel;
    return () => { supabase.removeChannel(channel); gameChannelRef.current = null; };
  }, [dbRoomId, isHost, user]);

  // ─── Multiplayer: Broadcast state helper ─────────────────────────
  const broadcastState = useCallback((state: GameState, extraChat?: typeof chatMessages) => {
    if (!gameChannelRef.current || !dbRoomId) return;
    gameChannelRef.current.send({
      type: 'broadcast',
      event: 'phase_update',
      payload: {
        phase: state.phase,
        day: state.day,
        timeLeft: state.timeLeft,
        maxTime: state.maxTime,
        players: state.players.map(p => ({
          id: p.id, username: p.username, avatar: p.avatar, isBot: p.isBot,
          isAlive: p.isAlive, votes: p.votes, votedFor: p.votedFor,
          isMayor: p.isMayor, isLover: p.isLover,
          roleId: p.role?.id, // only non-host filter reveals dead roles
        })),
        killFeed: state.killFeed,
        nightKills: state.nightKills,
        winner: state.winner,
        chatMessages: extraChat,
      },
    });
  }, [dbRoomId]);

  // ─── Game Stats from DB ──────────────────────────────────────────
  const [myStats, setMyStats] = useState<{
    total_points: number; games_played: number; games_won: number;
    best_streak: number; total_kills: number; times_saved: number; times_elected_mayor: number;
    wolf_wins: number; village_wins: number; seer_wins: number; sk_wins: number;
    fool_wins: number; lover_wins: number; hunter_kills: number; best_explosion_kills: number;
  } | null>(null);
  const [myHistory, setMyHistory] = useState<{ role_icon: string; role_name: string; won: boolean; points_earned: number; played_at: string }[]>([]);
  const [myHunterKillsThisGame, setMyHunterKillsThisGame] = useState(0);
  const [myExplosionKillsThisGame, setMyExplosionKillsThisGame] = useState(0);

  const computedBadges = useMemo(() => {
    const s = myStats;
    return [
      { id: 'predator',   name: 'Prédateur',        emoji: '🐺', condition: '10 victoires en loup',        unlocked: !!s && s.wolf_wins >= 10,               value: s?.wolf_wins ?? 0,               target: 10 },
      { id: 'hero',       name: 'Héros du Village',  emoji: '🏡', condition: '10 victoires village',        unlocked: !!s && s.village_wins >= 10,            value: s?.village_wins ?? 0,            target: 10 },
      { id: 'visionary',  name: 'Visionnaire',       emoji: '🔮', condition: '5 victoires en Voyante',      unlocked: !!s && s.seer_wins >= 5,                value: s?.seer_wins ?? 0,               target: 5  },
      { id: 'unstoppable',name: 'Inarrêtable',       emoji: '🔪', condition: '1 victoire en SK',            unlocked: !!s && s.sk_wins >= 1,                  value: s?.sk_wins ?? 0,                 target: 1  },
      { id: 'crazy',      name: 'Fou Furieux',       emoji: '🤡', condition: '1 victoire en Fou',           unlocked: !!s && s.fool_wins >= 1,                value: s?.fool_wins ?? 0,               target: 1  },
      { id: 'romantic',   name: 'Romantique',        emoji: '💕', condition: '1 victoire Amoureux',         unlocked: !!s && s.lover_wins >= 1,               value: s?.lover_wins ?? 0,              target: 1  },
      { id: 'politician', name: 'Politicien',        emoji: '👑', condition: 'Élu Maire 5 fois',            unlocked: !!s && s.times_elected_mayor >= 5,      value: s?.times_elected_mayor ?? 0,     target: 5  },
      { id: 'sniper',     name: 'Sniper',            emoji: '🏹', condition: '10 kills Chasseur/Gunner',    unlocked: !!s && s.hunter_kills >= 10,            value: s?.hunter_kills ?? 0,            target: 10 },
      { id: 'pyro',       name: 'Pyromane',          emoji: '🔥', condition: '3+ kills en 1 explosion',     unlocked: !!s && s.best_explosion_kills >= 3,     value: s?.best_explosion_kills ?? 0,    target: 3  },
      { id: 'legend',     name: 'Légende',           emoji: '⭐', condition: 'Atteindre rang Légende',      unlocked: !!s && s.total_points >= 10000,         value: s?.total_points ?? 0,            target: 10000 },
      { id: 'assassin',   name: 'Assassin',          emoji: '🎯', condition: '50 kills totaux',             unlocked: !!s && s.total_kills >= 50,             value: s?.total_kills ?? 0,             target: 50 },
      { id: 'guardian',   name: 'Ange Gardien',      emoji: '🛡️', condition: 'Sauver 20 joueurs',           unlocked: !!s && s.times_saved >= 20,             value: s?.times_saved ?? 0,             target: 20 },
      { id: 'survivor',   name: 'Survivant',         emoji: '💀', condition: 'Survivre 10 parties',         unlocked: !!s && s.games_played >= 10,            value: s?.games_played ?? 0,            target: 10 },
    ];
  }, [myStats]);
  const [leaderboardData, setLeaderboardData] = useState<{ id: string; username: string; avatar_url: string | null; total_points: number; games_played: number; games_won: number }[]>([]);

  const playerPoints = myStats?.total_points ?? 0;
  const rank = getRank(playerPoints);
  const nextRank = RANKS[RANKS.indexOf(rank) + 1];

  // ─── Feedback states (remplace alert) ───────────────────────────
  const [feedShareCopied, setFeedShareCopied] = useState(false);
  const [feedShareError, setFeedShareError] = useState('');
  const [joinError, setJoinError] = useState('');

  const fetchMyStats = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('game_stats').select('*').eq('user_id', user.id).maybeSingle();
    if (data) setMyStats(data);
    const { data: hist } = await supabase
      .from('game_history').select('role_icon, role_name, won, points_earned, played_at')
      .eq('user_id', user.id).order('played_at', { ascending: false }).limit(20);
    if (hist) setMyHistory(hist);
  }, [user]);

  const fetchLeaderboard = useCallback(async () => {
    const { data } = await supabase
      .from('game_stats')
      .select('user_id, total_points, games_played, games_won, profiles!inner(username, avatar_url)')
      .order('total_points', { ascending: false })
      .limit(50);
    if (data) {
      setLeaderboardData(data.map((r: any) => ({
        id: r.user_id,
        username: r.profiles?.username || '???',
        avatar_url: r.profiles?.avatar_url || null,
        total_points: r.total_points,
        games_played: r.games_played,
        games_won: r.games_won,
      })));
    }
  }, []);

  useEffect(() => { fetchMyStats(); fetchLeaderboard(); }, [fetchMyStats, fetchLeaderboard]);

  // ─── Save game result to DB ──────────────────────────────────────
  const saveGameResult = useCallback(async (
    won: boolean, points: number, roleId: string, roleName: string, roleIcon: string,
    isLover: boolean = false, hunterKillsEarned: number = 0, maxExplosionKills: number = 0
  ) => {
    if (!user) return;
    const roleData = ALL_ROLES.find(r => r.id === roleId);
    const camp = isLover ? 'lovers' : (roleData?.camp || 'village');
    // Upsert stats
    const { data: existing } = await supabase.from('game_stats').select('*').eq('user_id', user.id).maybeSingle();
    if (existing) {
      const newStreak = won ? existing.current_streak + 1 : 0;
      await supabase.from('game_stats').update({
        total_points: existing.total_points + points,
        games_played: existing.games_played + 1,
        games_won: existing.games_won + (won ? 1 : 0),
        best_streak: Math.max(existing.best_streak, newStreak),
        current_streak: newStreak,
        wolf_wins: existing.wolf_wins + (won && camp === 'wolf' ? 1 : 0),
        village_wins: existing.village_wins + (won && camp === 'village' ? 1 : 0),
        seer_wins: existing.seer_wins + (won && roleId === 'seer' ? 1 : 0),
        sk_wins: existing.sk_wins + (won && roleId === 'sk' ? 1 : 0),
        fool_wins: existing.fool_wins + (won && roleId === 'fool' ? 1 : 0),
        lover_wins: existing.lover_wins + (won && isLover ? 1 : 0),
        hunter_kills: existing.hunter_kills + hunterKillsEarned,
        best_explosion_kills: Math.max(existing.best_explosion_kills, maxExplosionKills),
        updated_at: new Date().toISOString(),
      }).eq('user_id', user.id);
    } else {
      await supabase.from('game_stats').insert({
        user_id: user.id,
        total_points: points,
        games_played: 1,
        games_won: won ? 1 : 0,
        best_streak: won ? 1 : 0,
        current_streak: won ? 1 : 0,
        wolf_wins: won && camp === 'wolf' ? 1 : 0,
        village_wins: won && camp === 'village' ? 1 : 0,
        seer_wins: won && roleId === 'seer' ? 1 : 0,
        sk_wins: won && roleId === 'sk' ? 1 : 0,
        fool_wins: won && roleId === 'fool' ? 1 : 0,
        lover_wins: won && isLover ? 1 : 0,
        hunter_kills: hunterKillsEarned,
        best_explosion_kills: maxExplosionKills,
      });
    }
    // Insert history
    await supabase.from('game_history').insert({
      user_id: user.id,
      room_id: dbRoomId || null,
      role_id: roleId,
      role_name: roleName,
      role_icon: roleIcon,
      won,
      points_earned: points,
      game_mode: gameMode,
    });
    // Refresh local stats
    fetchMyStats();
    fetchLeaderboard();
  }, [user, dbRoomId, gameMode, fetchMyStats, fetchLeaderboard]);

  const [gameState, setGameState] = useState<GameState>({
    phase: 'night', day: 1, timeLeft: 30, maxTime: 30,
    players: [], killFeed: [], nightKills: [],
    wolfTarget: null, seerResult: null,
    witchSaveUsed: false, witchKillUsed: false,
    guardTarget: null, blacksmithUsed: false, sandmanUsed: false, pacifistUsed: false,
    wolfDrunk: false, martyrTarget: null, martyrAlive: true, noWolfKillNights: 0,
    lastGuardTarget: null, nightmareUsed: false, nightmareTarget: null,
    priestUsed: false, elderLynchedPowersLost: false,
    winner: null,
  });

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  // Load notification templates on mount
  const [notifLoaded, setNotifLoaded] = useState(false);
  useEffect(() => { loadNotifTemplates().then(() => setNotifLoaded(true)).catch(() => setNotifLoaded(true)); }, []);

  // ─── Role Distribution ─────────────────────────────────────────
  const distributeRoles = useCallback((count: number, mode: GameMode): Role[] => {
    const pick = (pool: Role[], id: string) => pool.find(r => r.id === id);
    const shuffle = <T,>(arr: T[]): T[] => {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
      return a;
    };
    const randPick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

    // ── Camp counts ──
    // Wolves: 4-5→1, 6-10→2, 11-14→3, 15-18→4, 19-22→5, 23-26→6, 27-30→7, 31-35→8, 36-40→9
    const wolfCount = count <= 5 ? 1 : count <= 10 ? 2 : count <= 14 ? 3 : count <= 18 ? 4 : count <= 22 ? 5 : count <= 26 ? 6 : count <= 30 ? 7 : count <= 35 ? 8 : 9;
    // Solo: 0 under 8, 1 at 8-14, 2 at 15-25, 3 at 26-34, 4 at 35+
    const soloCount = count < 8 ? 0 : count <= 14 ? 1 : count <= 25 ? 2 : count <= 34 ? 3 : 4;
    // Cult: 20+ = Chef + Disciple (2 slots)
    const cultSlots = count >= 20 ? 2 : 0;
    // Variable: 10+ players, max 5 at 35+
    const variableCount = count < 10 ? 0 : count <= 16 ? 1 : count <= 22 ? 2 : count <= 28 ? 3 : count <= 34 ? 4 : 5;
    const villageCount = count - wolfCount - soloCount - cultSlots - variableCount;

    const wolfPool = ALL_ROLES.filter(r => r.camp === 'wolf');
    const villagePool = ALL_ROLES.filter(r => r.camp === 'village');
    const soloPool = ALL_ROLES.filter(r => r.camp === 'solo');
    const variablePool = ALL_ROLES.filter(r => r.camp === 'variable');

    // ══════════════════════════════════════════════════════════════
    // INCOMPATIBILITY RULES
    // ══════════════════════════════════════════════════════════════
    // Max 1 wolf spy (Mystique OR Rôdeur OR Sorcier Noir)
    const wolfSpies = ['mystic-wolf', 'prowler', 'sorcerer'];
    // Max 1 contaminator active based on size
    // Chef du Culte → 20+, Joueur de Flûte → 30+, Corrupteur → 35 only
    // Never Flûte + Corrupteur together
    // Max 3 investigation roles at once
    const investigationRoles = ['seer', 'fox', 'detective', 'medium', 'gravedigger', 'shaman', 'augur', 'oracle'];
    // Sandman + Forgeron → max 1
    // Médium + Fossoyeur → max 1

    if (mode === 'chaos') {
      // ── CHAOS MODE: random everything ──
      const wolves: Role[] = [];
      for (let i = 0; i < wolfCount; i++) wolves.push(i === 0 ? wolfPool[0] : randPick(wolfPool));
      const village: Role[] = [];
      for (let i = 0; i < villageCount; i++) village.push(randPick(villagePool));
      const solos: Role[] = [];
      const usedSolo: string[] = [];
      for (let i = 0; i < soloCount; i++) {
        const avail = soloPool.filter(r => !usedSolo.includes(r.id));
        const p = avail.length > 0 ? randPick(avail) : randPick(soloPool);
        solos.push(p); usedSolo.push(p.id);
      }
      const variables: Role[] = [];
      for (let i = 0; i < variableCount; i++) variables.push(randPick(variablePool));
      const cultRoles: Role[] = [];
      if (cultSlots > 0) {
        const cl = pick(ALL_ROLES, 'cult-leader'); if (cl) cultRoles.push(cl);
        const disc = pick(ALL_ROLES, 'disciple'); if (disc) cultRoles.push(disc);
      }
      return shuffle([...wolves, ...village, ...solos, ...variables, ...cultRoles]);
    }

    if (mode === 'anarchie') {
      // ══════════════════════════════════════════════════════════════
      // ANARCHIE MODE — Last Man Standing, no camps, structured chaos
      // ══════════════════════════════════════════════════════════════
      // Rules:
      // 1. No duplicates
      // 2. Sisters/Brothers always come as complete groups
      // 3. Max 2 investigation roles
      // 4. At least 1 night-kill role
      // 5. No Villageois Simple — only roles with active powers
      // Priority: ALL solos → ALL variables → Cult → Wolves with skills → Village with kills → fill

      const used: Set<string> = new Set();
      const result: Role[] = [];
      const addRole = (r: Role) => { if (!used.has(r.id)) { result.push(r); used.add(r.id); } };

      // 1. ALL solo roles (up to available slots)
      for (const r of soloPool) addRole(r);

      // 2. ALL variable roles
      for (const r of variablePool) addRole(r);

      // 3. Cult (Chef + Disciple)
      const cl = pick(ALL_ROLES, 'cult-leader');
      const disc = pick(ALL_ROLES, 'disciple');
      if (cl) addRole(cl);
      if (disc) addRole(disc);

      // 4. Wolves with special skills only (no basic werewolf)
      const specialWolves = wolfPool.filter(r => r.id !== 'werewolf');
      for (const r of shuffle(specialWolves)) {
        if (result.length >= count) break;
        addRole(r);
      }

      // 5. Village roles with kill potential or strong active powers
      const killVillage = ['hunter', 'witch', 'gunner', 'sheriff', 'guard', 'knight', 'blacksmith', 'alchemist'];
      for (const id of killVillage) {
        if (result.length >= count) break;
        const r = pick(villagePool, id);
        if (r) addRole(r);
      }

      // 6. Active village roles (no villager simple)
      const activeVillage = villagePool.filter(r => r.id !== 'villager' && !killVillage.includes(r.id));
      let investigationCount = 0;
      for (const r of shuffle(activeVillage)) {
        if (result.length >= count) break;
        // Max 2 investigation roles
        if (investigationRoles.includes(r.id)) {
          if (investigationCount >= 2) continue;
          investigationCount++;
        }
        // Sisters/Brothers: add as groups
        if (r.id === 'twin-sister-1') {
          const s2 = pick(villagePool, 'twin-sister-2');
          if (s2 && result.length + 2 <= count) { addRole(r); addRole(s2); }
          continue;
        }
        if (r.id === 'twin-sister-2') continue; // handled above
        if (r.id === 'brother-1') {
          const b2 = pick(villagePool, 'brother-2');
          const b3 = pick(villagePool, 'brother-3');
          if (b2 && b3 && result.length + 3 <= count) { addRole(r); addRole(b2); addRole(b3); }
          continue;
        }
        if (r.id === 'brother-2' || r.id === 'brother-3') continue;
        addRole(r);
      }

      // 7. If still need more, add remaining wolves (including basic werewolf)
      while (result.length < count) {
        const remaining = wolfPool.filter(r => !used.has(r.id));
        if (remaining.length > 0) {
          addRole(randPick(remaining));
        } else {
          // Absolute fallback: werewolf duplicates
          result.push(wolfPool[0]);
          break;
        }
      }

      // Ensure at least 1 night-kill role
      const hasNightKill = result.some(r => r.nightAction === 'solo_kill' || r.nightAction === 'vote_kill' || r.nightAction === 'douse' || r.nightAction === 'infect');
      if (!hasNightKill) {
        const sk = pick(ALL_ROLES, 'sk');
        if (sk && result.length > 0) { result[result.length - 1] = sk; }
      }

      return shuffle(result.slice(0, count));
    }

    // ══════════════════════════════════════════════════════════════
    // NORMAL MODE — Tier-based distribution with incompatibilities
    // ══════════════════════════════════════════════════════════════

    // ── WOLVES (tiered, max 1 spy) ──
    const wolves: Role[] = [];
    // Tier 1 (4+): werewolf, wolf-cub
    // Tier 2 (16+): + alpha-wolf, trickster-wolf
    // Tier 3 (26+): + 1 spy (mystic OR prowler OR sorcerer), fallen-angel
    // Tier 4 (36+): + big-bad-wolf, nightmare-wolf
    const spyShuffle = shuffle([...wolfSpies]); // randomize spy order
    const wolfTiers: { minPlayers: number; ids: string[] }[] = [
      { minPlayers: 4, ids: ['werewolf', 'wolf-cub'] },
      { minPlayers: 16, ids: ['alpha-wolf', 'trickster-wolf'] },
      { minPlayers: 26, ids: [spyShuffle[0], 'fallen-angel'] },
      { minPlayers: 30, ids: ['big-bad-wolf', 'nightmare-wolf'] },
      { minPlayers: 36, ids: [spyShuffle[1]] }, // 2nd spy at 36+
    ];
    const availableWolfIds: string[] = [];
    for (const tier of wolfTiers) {
      if (count >= tier.minPlayers) availableWolfIds.push(...tier.ids);
    }
    // Fill wolves from priority, then pad with werewolf
    for (let i = 0; i < wolfCount; i++) {
      if (i < availableWolfIds.length) {
        const r = pick(wolfPool, availableWolfIds[i]);
        wolves.push(r || wolfPool[0]);
      } else {
        wolves.push(wolfPool[0]); // extra werewolf
      }
    }

    // ── VILLAGE (tiered with incompatibility enforcement) ──
    // Build available village roles by tier
    const villageTiers: { minPlayers: number; ids: string[] }[] = [
      { minPlayers: 4, ids: ['seer', 'witch', 'hunter', 'guard', 'cupid'] },
      { minPlayers: 10, ids: ['little-girl', 'elder', 'fox', 'bear-tamer', 'idiot', 'mayor'] },
      { minPlayers: 16, ids: ['knight', 'scapegoat', 'detective', 'gunner', 'sheriff', 'twin-sister-1', 'twin-sister-2'] },
      { minPlayers: 20, ids: ['devoted-servant', 'pacifist', 'blacksmith', 'priest'] },
      { minPlayers: 26, ids: ['martyr', 'beauty', 'harlot', 'brother-1', 'brother-2', 'brother-3', 'medium', 'comedian'] },
      { minPlayers: 30, ids: ['sandman', 'oracle', 'augur', 'clumsy', 'alchemist', 'drunk', 'gravedigger'] },
    ];
    // Add cult-hunter if cult is present
    if (cultSlots > 0) villageTiers[3].ids.push('cult-hunter');

    let availableVillageIds: string[] = [];
    for (const tier of villageTiers) {
      if (count >= tier.minPlayers) availableVillageIds.push(...tier.ids);
    }

    // ── Apply village incompatibilities ──
    // Sandman + Forgeron → keep only 1
    if (availableVillageIds.includes('sandman') && availableVillageIds.includes('blacksmith')) {
      const remove = Math.random() < 0.5 ? 'sandman' : 'blacksmith';
      availableVillageIds = availableVillageIds.filter(id => id !== remove);
    }
    // Médium + Fossoyeur → keep only 1
    if (availableVillageIds.includes('medium') && availableVillageIds.includes('gravedigger')) {
      const remove = Math.random() < 0.5 ? 'medium' : 'gravedigger';
      availableVillageIds = availableVillageIds.filter(id => id !== remove);
    }
    // Augure + Oracle → keep only 1
    if (availableVillageIds.includes('augur') && availableVillageIds.includes('oracle')) {
      const remove = Math.random() < 0.5 ? 'augur' : 'oracle';
      availableVillageIds = availableVillageIds.filter(id => id !== remove);
    }
    // Max 3 investigation roles
    const activeInvestigation = availableVillageIds.filter(id => investigationRoles.includes(id));
    if (activeInvestigation.length > 3) {
      const keep = shuffle(activeInvestigation).slice(0, 3);
      availableVillageIds = availableVillageIds.filter(id => !investigationRoles.includes(id) || keep.includes(id));
    }

    const village: Role[] = [];
    for (let i = 0; i < villageCount; i++) {
      if (i < availableVillageIds.length) {
        const r = pick(villagePool, availableVillageIds[i]);
        village.push(r || villagePool[0]);
      } else {
        village.push(villagePool[0]); // pad with Villageois
      }
    }

    // ── SOLO (tiered, no duplicates, contamination rules) ──
    // SK available at 8+, Fou at 10+, Ange/Bourreau at 16+,
    // Pyromane/Médecin Peste/Ninja at 26+, Joueur de Flûte at 30+,
    // Corrupteur at 35 only, Loup Solitaire at 26+
    const soloTiers: { minPlayers: number; ids: string[] }[] = [
      { minPlayers: 8, ids: ['sk'] },
      { minPlayers: 10, ids: ['fool'] },
      { minPlayers: 16, ids: ['angel', 'executioner'] },
      { minPlayers: 26, ids: ['arsonist', 'plague-doctor', 'ninja', 'lone-wolf'] },
      { minPlayers: 30, ids: ['piper'] },
      { minPlayers: 35, ids: ['corruptor'] },
    ];
    let availableSoloIds: string[] = [];
    for (const tier of soloTiers) {
      if (count >= tier.minPlayers) availableSoloIds.push(...tier.ids);
    }
    // Never Piper + Corruptor together
    if (availableSoloIds.includes('piper') && availableSoloIds.includes('corruptor')) {
      const remove = Math.random() < 0.5 ? 'piper' : 'corruptor';
      availableSoloIds = availableSoloIds.filter(id => id !== remove);
    }
    // If cult is active, also exclude whichever contaminator is left (max 1 contamination mechanic)
    if (cultSlots > 0) {
      availableSoloIds = availableSoloIds.filter(id => id !== 'piper' && id !== 'corruptor');
    }

    const solos: Role[] = [];
    const shuffledSoloIds = shuffle(availableSoloIds);
    for (let i = 0; i < soloCount && i < shuffledSoloIds.length; i++) {
      const r = pick(soloPool, shuffledSoloIds[i]);
      if (r) solos.push(r);
    }
    // Fill remaining solo slots if needed
    while (solos.length < soloCount) {
      const fallback = soloPool.find(r => !solos.some(s => s.id === r.id));
      if (fallback) solos.push(fallback); else break;
    }

    // ── VARIABLE (tiered) ──
    const varTiers: { minPlayers: number; ids: string[] }[] = [
      { minPlayers: 10, ids: ['cursed'] },
      { minPlayers: 14, ids: ['wild-child'] },
      { minPlayers: 18, ids: ['traitor'] },
      { minPlayers: 22, ids: ['doppelganger'] },
      { minPlayers: 26, ids: ['thief'] },
    ];
    const availableVarIds: string[] = [];
    for (const tier of varTiers) {
      if (count >= tier.minPlayers) availableVarIds.push(...tier.ids);
    }
    const variables: Role[] = [];
    for (let i = 0; i < variableCount && i < availableVarIds.length; i++) {
      const r = pick(variablePool, availableVarIds[i]);
      if (r) variables.push(r);
    }
    while (variables.length < variableCount) {
      variables.push(variablePool[0]); // pad with Maudit
    }

    // ── CULT (20+: Chef + Disciple) ──
    const cultRoles: Role[] = [];
    if (cultSlots > 0) {
      const cl = pick(ALL_ROLES, 'cult-leader');
      const disc = pick(ALL_ROLES, 'disciple');
      if (cl) cultRoles.push(cl);
      if (disc) cultRoles.push(disc);
    }

    return shuffle([...wolves, ...village, ...solos, ...variables, ...cultRoles]);
  }, []);

  // ─── Start Game ─────────────────────────────────────────────────
  const startGame = useCallback(async () => {
    const isMultiplayer = !!dbRoomId && waitingPlayers.length > 0;
    const count = isMultiplayer ? waitingPlayers.length : playerCount;
    const assignedRoles = distributeRoles(count, gameMode);
    const newPlayers: Player[] = [];

    if (isMultiplayer) {
      // Multiplayer: real players from lobby
      for (let i = 0; i < waitingPlayers.length; i++) {
        const wp = waitingPlayers[i];
        newPlayers.push({
          id: wp.id,
          username: wp.name,
          avatar: wp.color,
          isBot: false, role: assignedRoles[i],
          isAlive: true, isMayor: false, isLover: false, isProtected: false, isCharmed: false,
          isCursed: assignedRoles[i]?.id === 'cursed', isInfected: false, isDoused: false,
          isCultist: assignedRoles[i]?.id === 'cult-leader' || assignedRoles[i]?.id === 'disciple', isDrunk: false, isCorrupted: false, cannotVote: false, foxPowerLost: false, votes: 0,
        });
      }
      // Save roles to DB
      for (const p of newPlayers) {
        supabase.from('game_players')
          .update({ role: p.role?.id || 'villager' })
          .eq('room_id', dbRoomId)
          .eq('user_id', p.id)
          .then(() => {});
      }
      // Update room status
      supabase.from('game_rooms').update({
        status: 'in_progress', current_phase: 'night', day_number: 1,
        phase_end_at: new Date(Date.now() + nightTimer * 1000).toISOString(),
      }).eq('id', dbRoomId).then(() => {});
      // Broadcast game start to all non-host players
      gameChannelRef.current?.send({
        type: 'broadcast', event: 'game_start',
        payload: {
          nightTimer,
          players: newPlayers.map(p => ({
            id: p.id, username: p.username, avatar: p.avatar, isBot: p.isBot,
            roleId: p.role?.id, isAlive: true, isMayor: false, isLover: false,
            isCursed: p.isCursed, isCultist: p.isCultist, votes: 0,
          })),
        },
      });
    } else {
      // Solo: original bot-based game
      for (let i = 0; i < playerCount; i++) {
        newPlayers.push({
          id: i === 0 ? 'me' : `bot${i}`,
          username: i === 0 ? (profile?.username || 'Vous') : (BOT_NAMES[i - 1] || `Bot ${i}`),
          avatar: i === 0 ? '🟣' : (BOT_AVATARS[i - 1] || '⚪'),
          isBot: i !== 0, role: assignedRoles[i],
          isAlive: true, isMayor: false, isLover: false, isProtected: false, isCharmed: false,
          isCursed: assignedRoles[i]?.id === 'cursed', isInfected: false, isDoused: false,
          isCultist: assignedRoles[i]?.id === 'cult-leader' || assignedRoles[i]?.id === 'disciple', isDrunk: false, isCorrupted: false, cannotVote: false, foxPowerLost: false, votes: 0,
        });
      }
    }

    // Executioner: assign a random village target
    newPlayers.forEach(p => {
      if (p.role?.id === 'executioner') {
        const villagers = newPlayers.filter(v => v.id !== p.id && v.role?.camp === 'village');
        if (villagers.length > 0) {
          p.executionerTarget = villagers[Math.floor(Math.random() * villagers.length)].id;
        }
      }
    });

    // Find my role
    const mePlayer = isMultiplayer
      ? newPlayers.find(p => p.id === user?.id)
      : newPlayers[0];
    setMyRole(mePlayer?.role || assignedRoles[0]);
    setGameState({
      phase: 'night', day: 1, timeLeft: nightTimer, maxTime: nightTimer,
      players: newPlayers, killFeed: [], nightKills: [],
      wolfTarget: null, seerResult: null,
      witchSaveUsed: false, witchKillUsed: false, guardTarget: null,
      blacksmithUsed: false, sandmanUsed: false, pacifistUsed: false,
      wolfDrunk: false, martyrTarget: null, martyrAlive: true, noWolfKillNights: 0,
      lastGuardTarget: null, nightmareUsed: false, nightmareTarget: null,
      priestUsed: false, elderLynchedPowersLost: false,
      winner: null,
    });
    setSelectedPlayer(null);
    setActionDone(false);

    // Sœurs Jumelles recognition
    const sisters = newPlayers.filter(p => p.role?.id === 'twin-sister-1' || p.role?.id === 'twin-sister-2');
    const sisterMsgs: any[] = [];
    if (sisters.length >= 2 && sisters.some(s => s.id === mePlayer?.id)) {
      const otherSister = sisters.find(s => s.id !== mePlayer?.id);
      sisterMsgs.push({ player: '👩‍👩 Sœurs', message: `Votre sœur jumelle est : ${otherSister?.username}`, time: 'maintenant', color: villageGreen });
    }

    // Frères recognition
    const brothers = newPlayers.filter(p => ['brother-1', 'brother-2', 'brother-3'].includes(p.role?.id || ''));
    const brotherMsgs: any[] = [];
    if (brothers.length >= 2 && brothers.some(b => b.id === mePlayer?.id)) {
      const otherBrothers = brothers.filter(b => b.id !== mePlayer?.id);
      brotherMsgs.push({ player: '👬 Frères', message: `Vos frères sont : ${otherBrothers.map(b => b.username).join(', ')}`, time: 'maintenant', color: villageGreen });
    }

    setChatMessages([...sisterMsgs, ...brotherMsgs]);
    setCupidSelections([]);
    setPiperSelections([]);
    setGunnerBullets(2);
    setDetectiveUsed(false);
    setMayorRevealed(false);
    setPacifistUsedLocal(false);
    setTricksterUsed(false);
    setRevealFlipped(false);
    setRevealProgress(100);
    setMyHunterKillsThisGame(0);
    setMyExplosionKillsThisGame(0);
    setView('reveal');
  }, [playerCount, gameMode, nightTimer, distributeRoles, profile?.username, dbRoomId, waitingPlayers, user]);

  // ─── Mark room as finished when game ends ──────────────────────
  useEffect(() => {
    if (view === 'end') {
      if (dbRoomId) {
        supabase.from('game_rooms')
          .update({ status: 'finished', finished_at: new Date().toISOString() })
          .eq('id', dbRoomId)
          .then(() => {});
      }
      // Save stats to DB (only for authenticated users, not pure bots)
      if (user && myRole) {
        const meP = gameState.players.find(p => p.id === (dbRoomId ? user.id : 'me'));
        const isNinjaSurv = myRole?.id === 'ninja' && meP?.isAlive;
        const isLoneWolfWin = myRole?.id === 'lone-wolf' && gameState.winner === 'wolf' && meP?.isAlive &&
          gameState.players.filter(p => p.isAlive && p.role?.camp === 'wolf' && p.role?.id !== 'lone-wolf').length === 0;
        const won = isNinjaSurv || isLoneWolfWin ||
          (gameState.winner === 'lovers' ? meP?.isLover : meP?.role?.camp === gameState.winner || (meP?.isCultist && gameState.winner === 'cult'));
        const isSoloRole = myRole?.camp === 'solo' || myRole?.id === 'lone-wolf';
        const pts = (() => {
          if (gameMode === 'anarchie') {
            const alive = gameState.players.find(p => p.isAlive);
            return alive?.id === (dbRoomId ? user.id : 'me') ? 100 : 10;
          }
          if (won) { if (isSoloRole && meP?.isAlive) return 5; return 5; }
          return 0;
        })();
        const isLover = !!(meP?.isLover);
        saveGameResult(!!won, pts, myRole.id, myRole.name, myRole.icon, isLover, myHunterKillsThisGame, myExplosionKillsThisGame);
      }
    }
  }, [view, dbRoomId, user, myRole, gameState.winner, gameMode, myHunterKillsThisGame, myExplosionKillsThisGame]);

  // ─── Role Reveal Auto-Progress ──────────────────────────────────
  useEffect(() => {
    if (view !== 'reveal') return;
    const flipTimer = setTimeout(() => setRevealFlipped(true), 800);
    const interval = setInterval(() => {
      setRevealProgress(prev => prev <= 0 ? 0 : prev - (100 / 55));
    }, 100);
    const advanceTimer = setTimeout(() => {
      setGameState(prev => ({ ...prev, phase: 'night', timeLeft: nightTimer, maxTime: nightTimer }));
      setView('game');
      setSelectedPlayer(null);
      setActionDone(false);
      setPiperSelections([]);
    }, 6000);
    return () => { clearTimeout(flipTimer); clearInterval(interval); clearTimeout(advanceTimer); };
  }, [view, nightTimer]);

  // ─── Timer + Game Loop ──────────────────────────────────────────
  // Host (or solo) runs the game timer. Non-host gets state via broadcast.
  const isSoloOrHost = !dbRoomId || isHost;
  useEffect(() => {
    if (view !== 'game' || !isSoloOrHost) return;
    timerRef.current = setInterval(() => {
      setGameState(prev => {
        if (prev.timeLeft <= 1) {
          const newState = handlePhaseEnd(prev);
          // Broadcast state change to non-host players
          if (dbRoomId) setTimeout(() => broadcastState(newState, chatMessages), 100);
          return newState;
        }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [view, gameState.phase, isSoloOrHost, dbRoomId, broadcastState, chatMessages]);

  // Non-host: countdown timer locally (sync corrected by broadcast)
  useEffect(() => {
    if (view !== 'game' || isSoloOrHost) return;
    const interval = setInterval(() => {
      setGameState(prev => ({ ...prev, timeLeft: Math.max(0, prev.timeLeft - 1) }));
    }, 1000);
    return () => clearInterval(interval);
  }, [view, isSoloOrHost, gameState.phase]);

  // ─── Bot votes visible during day-vote phase (solo mode only) ─────
  useEffect(() => {
    if (view !== 'game' || gameState.phase !== 'day-vote') return;
    if (dbRoomId) return; // Skip in multiplayer — real players vote via broadcast
    // Simulate bots casting votes over time (staggered for UX)
    const aliveBots = gameState.players.filter(p => p.isAlive && p.isBot && !p.votedFor);
    if (aliveBots.length === 0) return;
    const timers: NodeJS.Timeout[] = [];
    aliveBots.forEach((bot, i) => {
      const timer = setTimeout(() => {
        setGameState(prev => {
          const updated = { ...prev, players: prev.players.map(p => ({ ...p })) };
          const voter = updated.players.find(p => p.id === bot.id);
          if (!voter || voter.votedFor || !voter.isAlive) return prev;
          // Skip if can't vote
          if ((voter.role?.id === 'idiot' && voter.originalRole) || voter.cannotVote) return prev;
          const others = updated.players.filter(o => o.isAlive && o.id !== voter.id);
          if (others.length === 0) return prev;
          const target = others[Math.floor(Math.random() * others.length)];
          voter.votedFor = target.id;
          target.votes += voter.isMayor ? 2 : 1;
          return updated;
        });
      }, 1500 + i * 800 + Math.random() * 1500); // staggered: 1.5s-3s apart
      timers.push(timer);
    });
    return () => timers.forEach(clearTimeout);
  }, [view, gameState.phase]);

  // ─── Track death order for Anarchie mode ─────
  useEffect(() => {
    if (gameMode !== 'anarchie' || view !== 'game') return;
    const dead = gameState.players.filter(p => !p.isAlive).map(p => p.id);
    setDeathOrder(prev => {
      const newDead = dead.filter(id => !prev.includes(id));
      return newDead.length > 0 ? [...prev, ...newDead] : prev;
    });
  }, [gameState.players, gameMode, view]);

  // ─── Bot wolves early target (so Witch can see wolfTarget) ─────
  useEffect(() => {
    if (view !== 'game' || gameState.phase !== 'night') return;
    if (gameState.wolfTarget) return; // already set
    // If player is not a wolf, bot wolves pick a target early
    const playerIsWolf = myRole?.camp === 'wolf' || myRole?.nightAction === 'vote_kill';
    if (playerIsWolf) return; // player wolf sets target manually
    const timer = setTimeout(() => {
      setGameState(prev => {
        if (prev.wolfTarget) return prev; // already set
        const wolves = prev.players.filter(p => p.isAlive && (p.role?.camp === 'wolf' || p.role?.id === 'lone-wolf') && p.isBot);
        const nonWolves = prev.players.filter(p => p.isAlive && p.role?.camp !== 'wolf' && p.role?.id !== 'lone-wolf');
        if (wolves.length > 0 && nonWolves.length > 0) {
          const target = nonWolves[Math.floor(Math.random() * nonWolves.length)];
          setChatMessages(msgs => [...msgs, { player: '🐺 Meute', message: `Les loups ciblent ${target.username}...`, time: 'maintenant', color: wolfRed }]);
          return { ...prev, wolfTarget: target.id };
        }
        return prev;
      });
    }, 2000); // 2s delay to simulate wolves "discussing"
    return () => clearTimeout(timer);
  }, [view, gameState.phase, gameState.wolfTarget, myRole]);

  // ─── Win Condition ──────────────────────────────────────────────
  const checkWinCondition = (players: Player[]): Camp | 'lovers' | 'anarchie' | null => {
    const alive = players.filter(p => p.isAlive);

    // ── ANARCHIE MODE: last man standing ──
    if (gameMode === 'anarchie') {
      if (alive.length <= 1) return 'anarchie' as any;
      return null;
    }

    const wolves = alive.filter(p => p.role?.camp === 'wolf' || p.role?.id === 'lone-wolf' || (p.isCursed && p.role?.camp === 'wolf'));
    const nonWolves = alive.filter(p => p.role?.camp !== 'wolf' && p.role?.id !== 'lone-wolf');
    const sk = alive.find(p => p.role?.id === 'sk');
    const arsonist = alive.find(p => p.role?.id === 'arsonist');
    const piper = alive.find(p => p.role?.id === 'piper');
    const corruptor = alive.find(p => p.role?.id === 'corruptor');
    const cultLeader = alive.find(p => p.role?.id === 'cult-leader' || p.role?.id === 'disciple');

    // Lovers win: 2 lovers are last alive
    const lovers = alive.filter(p => p.isLover);
    if (lovers.length === 2 && alive.length === 2) return 'lovers';

    // Piper wins if all alive (except piper) are charmed
    if (piper && alive.filter(p => p.id !== piper.id).every(p => p.isCharmed)) return 'solo';

    // Corruptor wins if majority of alive are corrupted (using isInfected as flag)
    if (corruptor) {
      const corruptedCount = alive.filter(p => p.id !== corruptor.id && p.isCorrupted).length;
      if (corruptedCount > (alive.length - 1) / 2) return 'solo';
    }

    // Cult wins if all alive are cultists (Chef or Disciple inherits)
    if (cultLeader && alive.every(p => p.isCultist)) return 'cult';

    // Traitor transformation: if all wolves dead and traitor is alive
    const traitor = alive.find(p => p.role?.id === 'traitor' && p.role?.camp === 'variable');
    if (traitor && wolves.length === 0) {
      traitor.role = { ...ALL_ROLES.find(r => r.id === 'werewolf')! };
      traitor.originalRole = ALL_ROLES.find(r => r.id === 'traitor');
      return null; // game continues — traitor just transformed
    }

    // Village wins: no wolves, no dangerous solos
    if (wolves.length === 0 && !sk && !arsonist) return 'village';

    // Wolf wins: wolves outnumber non-wolves (and no SK)
    if (wolves.length > 0 && wolves.length >= nonWolves.length && !sk) return 'wolf';

    // SK/Arsonist wins: last survivor(s)
    if (sk && alive.length <= 2 && wolves.length === 0) return 'solo';
    if (arsonist && alive.length <= 1) return 'solo';

    return null;
  };

  // ─── Phase End Logic ────────────────────────────────────────────
  const handlePhaseEnd = useCallback((state: GameState): GameState => {
    const newState = { ...state };

    if (state.phase === 'night') {
      const kills: KillEvent[] = [];
      const alivePlayers = [...newState.players];

      // ── Sandman check: if active, skip ALL actions ──
      const sandmanActive = alivePlayers.some(p => p.isAlive && p.role?.id === 'sandman' && p.isBot) && !state.sandmanUsed && Math.random() < 0.15;
      if (sandmanActive) {
        newState.sandmanUsed = true;
        setChatMessages(prev => [...prev, { player: '💤 Système', message: 'Une force mystérieuse a endormi tout le village... Nuit paisible.', time: 'maintenant', color: soloPurple }]);
      }

      // ── Blacksmith check: block wolves for 1 night ──
      const blacksmithActive = !sandmanActive && alivePlayers.some(p => p.isAlive && p.role?.id === 'blacksmith' && p.isBot) && !state.blacksmithUsed && Math.random() < 0.2;
      if (blacksmithActive) {
        newState.blacksmithUsed = true;
        setChatMessages(prev => [...prev, { player: '⚒ Système', message: 'Le Forgeron a bloqué les lames des loups cette nuit !', time: 'maintenant', color: villageGreen }]);
      }

      if (!sandmanActive) {
        // ── Wolf kill ──
        const wolvesAreDrunk = state.wolfDrunk;
        if (!wolvesAreDrunk && !blacksmithActive) {
          if (state.wolfTarget) {
            const target = alivePlayers.find(p => p.id === state.wolfTarget);
            if (target && !target.isProtected) {
              // Maudit: survit et rejoint les loups
              if (target.isCursed && target.role?.camp !== 'wolf') {
                target.role = { ...ALL_ROLES.find(r => r.id === 'werewolf')! };
                target.isCursed = false;
                setChatMessages(prev => [...prev, { player: '😾 Système', message: `${target.username} (Maudit) rejoint les loups !`, time: 'maintenant', color: wolfRed }]);
              }
              // Chevalier: tue 1 loup en mourant
              else if (target.role?.id === 'knight') {
                target.isAlive = false;
                kills.push({ playerId: target.id, playerName: target.username, role: target.role?.name, cause: 'Dévoré par les loups', icon: '💀' });
                const aliveWolves = alivePlayers.filter(p => p.isAlive && p.role?.camp === 'wolf');
                if (aliveWolves.length > 0) {
                  const wolfVictim = aliveWolves[Math.floor(Math.random() * aliveWolves.length)];
                  wolfVictim.isAlive = false;
                  kills.push({ playerId: wolfVictim.id, playerName: wolfVictim.username, role: wolfVictim.role?.name, cause: 'Tué par le Chevalier', icon: '⚔️' });
                }
              }
              // Ancien: survit 1ère attaque
              else if (target.role?.id === 'elder' && !target.originalRole) {
                target.originalRole = { ...target.role }; // mark as used
                setChatMessages(prev => [...prev, { player: '👴 Système', message: `${target.username} (Ancien) résiste à l'attaque !`, time: 'maintenant', color: villageGreen }]);
              }
              // SK defense: wolves attack SK → SK survives, kills 1 wolf
              else if (target.role?.id === 'sk') {
                const aliveWolves = alivePlayers.filter(p => p.isAlive && p.role?.camp === 'wolf');
                if (aliveWolves.length > 0) {
                  const wolfVictim = aliveWolves[Math.floor(Math.random() * aliveWolves.length)];
                  wolfVictim.isAlive = false;
                  kills.push({ playerId: wolfVictim.id, playerName: wolfVictim.username, role: wolfVictim.role?.name, cause: 'Tué par le Serial Killer (contre-attaque)', icon: '🔪' });
                  setChatMessages(prev => [...prev, { player: '🔪 Système', message: `Les loups ont attaqué le Serial Killer ! ${wolfVictim.username} est mort en retour !`, time: 'maintenant', color: soloGold }]);
                }
              }
              // Ivrogne: dies but wolves drunk next turn
              else if (target.role?.id === 'drunk') {
                target.isAlive = false;
                kills.push({ playerId: target.id, playerName: target.username, role: target.role?.name, cause: 'Dévoré par les loups', icon: '💀' });
                newState.wolfDrunk = true;
                setChatMessages(prev => [...prev, { player: '🍻 Système', message: 'Les loups sont ivres ! Pas de kill la prochaine nuit.', time: 'maintenant', color: soloGold }]);
              }
              // Beauté: wolf who visits falls in love (death link)
              else if (target.role?.id === 'beauty') {
                target.isAlive = false;
                kills.push({ playerId: target.id, playerName: target.username, role: target.role?.name, cause: 'Dévorée par les loups', icon: '💀' });
                const aliveWolves = alivePlayers.filter(p => p.isAlive && p.role?.camp === 'wolf');
                if (aliveWolves.length > 0) {
                  const loverWolf = aliveWolves[Math.floor(Math.random() * aliveWolves.length)];
                  loverWolf.isLover = true;
                  target.isLover = true;
                  setChatMessages(prev => [...prev, { player: '💅 Système', message: `Un loup est tombé amoureux de ${target.username} (Beauté) ! Lien mortel créé.`, time: 'maintenant', color: '#ec4899' }]);
                }
              }
              // Alpha Wolf 20% conversion
              else if (alivePlayers.some(p => p.isAlive && p.role?.id === 'alpha-wolf') && Math.random() < 0.2) {
                target.role = { ...ALL_ROLES.find(r => r.id === 'werewolf')! };
                target.originalRole = target.role;
                setChatMessages(prev => [...prev, { player: '🐺👑 Système', message: `Le Loup Alpha a mordu ${target.username} ! Il/elle rejoint les loups !`, time: 'maintenant', color: wolfRed }]);
              }
              // Normal kill
              else {
                target.isAlive = false;
                kills.push({ playerId: target.id, playerName: target.username, role: target.role?.name, cause: 'Dévoré par les loups', icon: '💀' });
              }
            }
          } else {
            // Bot wolves auto-target
            const wolves = alivePlayers.filter(p => p.isAlive && p.role?.camp === 'wolf');
            const nonWolves = alivePlayers.filter(p => p.isAlive && p.role?.camp !== 'wolf');
            if (wolves.length > 0 && nonWolves.length > 0) {
              const target = nonWolves[Math.floor(Math.random() * nonWolves.length)];
              if (!target.isProtected) {
                if (target.isCursed && target.role?.camp !== 'wolf') {
                  target.role = { ...ALL_ROLES.find(r => r.id === 'werewolf')! };
                  target.isCursed = false;
                  setChatMessages(prev => [...prev, { player: '😾 Système', message: `${target.username} (Maudit) rejoint les loups !`, time: 'maintenant', color: wolfRed }]);
                } else if (target.role?.id === 'knight') {
                  target.isAlive = false;
                  kills.push({ playerId: target.id, playerName: target.username, role: target.role?.name, cause: 'Dévoré par les loups', icon: '💀' });
                  const aliveW = alivePlayers.filter(p => p.isAlive && p.role?.camp === 'wolf');
                  if (aliveW.length > 0) { const wv = aliveW[Math.floor(Math.random() * aliveW.length)]; wv.isAlive = false; kills.push({ playerId: wv.id, playerName: wv.username, role: wv.role?.name, cause: 'Tué par le Chevalier', icon: '⚔️' }); }
                } else if (target.role?.id === 'sk') {
                  const aliveW2 = alivePlayers.filter(p => p.isAlive && p.role?.camp === 'wolf');
                  if (aliveW2.length > 0) { const wv = aliveW2[Math.floor(Math.random() * aliveW2.length)]; wv.isAlive = false; kills.push({ playerId: wv.id, playerName: wv.username, role: wv.role?.name, cause: 'Tué par le SK (contre-attaque)', icon: '🔪' }); }
                } else if (target.role?.id === 'elder' && !target.originalRole) {
                  target.originalRole = { ...target.role };
                } else if (target.role?.id === 'drunk') {
                  target.isAlive = false; kills.push({ playerId: target.id, playerName: target.username, role: target.role?.name, cause: 'Dévoré par les loups', icon: '💀' }); newState.wolfDrunk = true;
                } else {
                  target.isAlive = false;
                  kills.push({ playerId: target.id, playerName: target.username, role: target.role?.name, cause: 'Dévoré par les loups', icon: '💀' });
                }
              }
            }
          }
        } else if (wolvesAreDrunk) {
          newState.wolfDrunk = false; // reset drunk status
          setChatMessages(prev => [...prev, { player: '🍻 Système', message: 'Les loups dorment leur cuite... Pas de victime cette nuit.', time: 'maintenant', color: villageGreen }]);
        }

        // ── SK kill ──
        const sk = alivePlayers.find(p => p.isAlive && p.role?.id === 'sk' && p.isBot);
        if (sk) {
          const others = alivePlayers.filter(p => p.isAlive && p.id !== sk.id && !kills.some(k => k.playerId === p.id));
          if (others.length > 0) {
            const target = others[Math.floor(Math.random() * others.length)];
            target.isAlive = false;
            kills.push({ playerId: target.id, playerName: target.username, role: target.role?.name, cause: 'Poignardé par le Serial Killer', icon: '🔪' });
          }
        }

        // ── Grand Méchant Loup — extra kill if no wolf dead ──
        if (!blacksmithActive && !wolvesAreDrunk) {
          const bigBad = alivePlayers.find(p => p.isAlive && p.role?.id === 'big-bad-wolf');
          const anyWolfDead = newState.players.some(p => !p.isAlive && p.role?.camp === 'wolf');
          if (bigBad && !anyWolfDead) {
            const bbTargets = alivePlayers.filter(p => p.isAlive && p.role?.camp !== 'wolf' && !kills.some(k => k.playerId === p.id));
            if (bbTargets.length > 0) {
              const target = bbTargets[Math.floor(Math.random() * bbTargets.length)];
              if (!target.isProtected) {
                target.isAlive = false;
                kills.push({ playerId: target.id, playerName: target.username, role: target.role?.name, cause: 'Dévoré par le Grand Méchant Loup', icon: '🐺💀' });
              }
            }
          }
        }

        // ── Cult leader (bot) — convert 1 random non-wolf ──
        const cultLeaderBot = alivePlayers.find(p => p.isAlive && p.role?.id === 'cult-leader' && p.isBot);
        if (cultLeaderBot) {
          const convertible = alivePlayers.filter(p => p.isAlive && !p.isCultist && p.role?.camp !== 'wolf' && p.role?.id !== 'sk' && p.role?.id !== 'arsonist');
          if (convertible.length > 0) {
            const target = convertible[Math.floor(Math.random() * convertible.length)];
            // Cult hunter defense
            if (target.role?.id === 'cult-hunter' && Math.random() < 0.5) {
              // Cult hunter kills latest cultist
              const cultists = alivePlayers.filter(p => p.isCultist && p.id !== cultLeaderBot.id && p.isAlive);
              if (cultists.length > 0) {
                const lastCultist = cultists[cultists.length - 1];
                lastCultist.isAlive = false;
                kills.push({ playerId: lastCultist.id, playerName: lastCultist.username, role: lastCultist.role?.name, cause: 'Tué par le Chasseur de Culte', icon: '💂' });
              }
            } else {
              target.isCultist = true;
              setChatMessages(prev => [...prev, { player: '🕯️ Système', message: `Un joueur a été converti au Culte...`, time: 'maintenant', color: cultPink }]);
            }
          }
        }

        // ── Cult hunter (bot) — hunt 1 cultist ──
        const cultHunterBot = alivePlayers.find(p => p.isAlive && p.role?.id === 'cult-hunter' && p.isBot);
        if (cultHunterBot) {
          const cultists = alivePlayers.filter(p => p.isAlive && p.isCultist && p.id !== cultHunterBot.id);
          if (cultists.length > 0) {
            const target = cultists[Math.floor(Math.random() * cultists.length)];
            target.isAlive = false;
            kills.push({ playerId: target.id, playerName: target.username, role: target.role?.name, cause: 'Chassé par le Chasseur de Culte', icon: '💂' });
          }
        }

        // ── Pyromane (bot) — douse or ignite ──
        const arsonistBot = alivePlayers.find(p => p.isAlive && p.role?.id === 'arsonist' && p.isBot);
        if (arsonistBot) {
          const dousedCount = alivePlayers.filter(p => p.isDoused && p.isAlive).length;
          if (dousedCount >= 3 && Math.random() < 0.4) {
            // Ignite!
            alivePlayers.filter(p => p.isDoused && p.isAlive).forEach(p => {
              p.isAlive = false;
              kills.push({ playerId: p.id, playerName: p.username, role: p.role?.name, cause: 'Brûlé par le Pyromane', icon: '🔥' });
            });
          } else {
            const undoused = alivePlayers.filter(p => p.isAlive && !p.isDoused && p.id !== arsonistBot.id);
            if (undoused.length > 0) {
              const target = undoused[Math.floor(Math.random() * undoused.length)];
              target.isDoused = true;
            }
          }
        }

        // ── Médecin Peste (bot) — infect 1 player ──
        const plagueBot = alivePlayers.find(p => p.isAlive && p.role?.id === 'plague-doctor' && p.isBot);
        if (plagueBot) {
          const uninfected = alivePlayers.filter(p => p.isAlive && !p.isInfected && p.id !== plagueBot.id);
          if (uninfected.length > 0) {
            const target = uninfected[Math.floor(Math.random() * uninfected.length)];
            target.isInfected = true;
          }
        }

        // ── Joueur de Flûte (bot) — charm 2 random ──
        const piperBot = alivePlayers.find(p => p.isAlive && p.role?.id === 'piper' && p.isBot);
        if (piperBot) {
          const uncharm = alivePlayers.filter(p => p.isAlive && !p.isCharmed && p.id !== piperBot.id);
          for (let i = 0; i < Math.min(2, uncharm.length); i++) {
            const idx = Math.floor(Math.random() * uncharm.length);
            uncharm[idx].isCharmed = true;
            uncharm.splice(idx, 1);
          }
        }
        // ── Corrupteur (bot) — corrupt 1 random player ──
        const corruptorBot = alivePlayers.find(p => p.isAlive && p.role?.id === 'corruptor' && p.isBot);
        if (corruptorBot) {
          const uncorrupted = alivePlayers.filter(p => p.isAlive && !p.isCorrupted && p.id !== corruptorBot.id);
          if (uncorrupted.length > 0) {
            const target = uncorrupted[Math.floor(Math.random() * uncorrupted.length)];
            target.isCorrupted = true;
          }
        }

        // ── Ange Déchu (bot) — protect random wolf or kill random villager ──
        const fallenAngelBot = alivePlayers.find(p => p.isAlive && p.role?.id === 'fallen-angel' && p.isBot);
        if (fallenAngelBot) {
          if (Math.random() < 0.4) {
            // Protect a wolf
            const wolves = alivePlayers.filter(p => p.isAlive && p.role?.camp === 'wolf' && p.id !== fallenAngelBot.id);
            if (wolves.length > 0) {
              wolves[Math.floor(Math.random() * wolves.length)].isProtected = true;
            }
          } else {
            // Kill a villager
            const villagers = alivePlayers.filter(p => p.isAlive && p.role?.camp === 'village' && !kills.some(k => k.playerId === p.id));
            if (villagers.length > 0) {
              const target = villagers[Math.floor(Math.random() * villagers.length)];
              if (!target.isProtected) {
                target.isAlive = false;
                kills.push({ playerId: target.id, playerName: target.username, role: target.role?.name, cause: 'Tué par l\'Ange Déchu', icon: '👼🐺' });
              }
            }
          }
        }

        // ── Sorcier Noir (bot) — scan for seer-type roles ──
        // (Bot just gets info, nothing visible to players)

        // ── Ninja (bot) — silent kill 1x ──
        const ninjaBot = alivePlayers.find(p => p.isAlive && p.role?.id === 'ninja' && p.isBot);
        if (ninjaBot && !ninjaBot.originalRole) {
          const targets = alivePlayers.filter(p => p.isAlive && p.id !== ninjaBot.id && !kills.some(k => k.playerId === p.id));
          if (targets.length > 0 && Math.random() < 0.3) {
            const target = targets[Math.floor(Math.random() * targets.length)];
            target.isAlive = false;
            kills.push({ playerId: target.id, playerName: target.username, role: target.role?.name, cause: 'Assassiné par le Ninja', icon: '🥷' });
            ninjaBot.originalRole = { ...ninjaBot.role! }; // mark as used
          }
        }
      } // end sandman check

      // ══════════════════════════════════════════════
      // ── CHAIN OF DEATH SYSTEM ──
      // Order: Martyr → Amoureux → Chasseur → Louveteau → Enfant Sauvage → Doppelgänger → Peste → Culte
      // ══════════════════════════════════════════════

      // ── Martyr sacrifice: if protégé is in kill list, martyr dies instead ──
      if (state.martyrAlive && state.martyrTarget) {
        const martyrPlayer = alivePlayers.find(p => p.isAlive && p.role?.id === 'martyr');
        const killIdx = kills.findIndex(k => k.playerId === state.martyrTarget);
        if (martyrPlayer && killIdx !== -1) {
          // Remove protégé from kills, revive them
          const protegeKill = kills[killIdx];
          const protege = alivePlayers.find(p => p.id === state.martyrTarget);
          if (protege) { protege.isAlive = true; }
          kills.splice(killIdx, 1);
          // Kill martyr instead
          martyrPlayer.isAlive = false;
          kills.push({ playerId: martyrPlayer.id, playerName: martyrPlayer.username, role: martyrPlayer.role?.name, cause: `Sacrifié pour ${protegeKill.playerName} (Martyr)`, icon: '🔰' });
          newState.martyrAlive = false;
          setChatMessages(prev => [...prev, { player: '🔰 Système', message: `Le Martyr s'est sacrifié pour ${protegeKill.playerName} !`, time: 'maintenant', color: villageGreen }]);
        }
      }

      // ── Amoureux death chain: if one lover dies, the other dies too ──
      const deadLoverIds = kills.filter(k => alivePlayers.find(p => p.id === k.playerId)?.isLover).map(k => k.playerId);
      if (deadLoverIds.length > 0) {
        const survivingLovers = alivePlayers.filter(p => p.isLover && p.isAlive && !deadLoverIds.includes(p.id));
        survivingLovers.forEach(lover => {
          lover.isAlive = false;
          kills.push({ playerId: lover.id, playerName: lover.username, role: lover.role?.name, cause: 'Mort de chagrin (Amoureux)', icon: '💔' });
          setChatMessages(prev => [...prev, { player: '💔 Système', message: `${lover.username} meurt de chagrin...`, time: 'maintenant', color: '#ec4899' }]);
        });
      }

      // ── Chasseur death shot: if hunter dies during night, auto-shoot a random ──
      kills.forEach(k => {
        const deadPlayer = alivePlayers.find(p => p.id === k.playerId);
        if (deadPlayer?.role?.id === 'hunter' && deadPlayer.id !== 'me') {
          const targets = alivePlayers.filter(p => p.isAlive && p.id !== deadPlayer.id && !kills.some(kk => kk.playerId === p.id));
          if (targets.length > 0) {
            const shot = targets[Math.floor(Math.random() * targets.length)];
            shot.isAlive = false;
            kills.push({ playerId: shot.id, playerName: shot.username, role: shot.role?.name, cause: `Abattu par le Chasseur (${deadPlayer.username})`, icon: '🏹' });
            setChatMessages(prev => [...prev, { player: '🏹 Système', message: `${deadPlayer.username} tire sur ${shot.username} en mourant !`, time: 'maintenant', color: soloGold }]);
          }
        }
      });

      // ── Louveteau rage: if wolf cub died, wolves get extra kill ──
      const wolfCubDied = kills.some(k => { const p = newState.players.find(pl => pl.id === k.playerId); return p?.role?.id === 'wolf-cub'; });
      if (wolfCubDied && !blacksmithActive) {
        const rageTargets = alivePlayers.filter(p => p.isAlive && p.role?.camp !== 'wolf' && !kills.some(k => k.playerId === p.id));
        if (rageTargets.length > 0) {
          const target = rageTargets[Math.floor(Math.random() * rageTargets.length)];
          target.isAlive = false;
          kills.push({ playerId: target.id, playerName: target.username, role: target.role?.name, cause: 'Tué par la rage du Louveteau', icon: '🐺🍼' });
          setChatMessages(prev => [...prev, { player: '🐺🍼 Système', message: 'La meute enragée tue une victime de plus !', time: 'maintenant', color: wolfRed }]);
        }
      }

      // ── Enfant Sauvage — check if model died ──
      alivePlayers.forEach(p => {
        if (p.isAlive && p.role?.id === 'wild-child' && p.roleModel) {
          const model = alivePlayers.find(m => m.id === p.roleModel);
          if (model && !model.isAlive) {
            p.role = { ...ALL_ROLES.find(r => r.id === 'werewolf')! };
            p.originalRole = ALL_ROLES.find(r => r.id === 'wild-child');
            setChatMessages(prev => [...prev, { player: '🧒 Système', message: `${p.username} (Enfant Sauvage) rejoint les loups !`, time: 'maintenant', color: wolfRed }]);
          }
        }
      });

      // ── Doppelgänger — copy role if target died ──
      alivePlayers.forEach(p => {
        if (p.isAlive && p.role?.id === 'doppelganger' && p.doppelTarget) {
          const target = alivePlayers.find(t => t.id === p.doppelTarget);
          if (target && !target.isAlive && target.role) {
            p.originalRole = { ...p.role };
            p.role = { ...target.role };
            setChatMessages(prev => [...prev, { player: '🎭 Système', message: `${p.username} (Doppelgänger) copie le rôle de ${target.username} : ${target.role.name} !`, time: 'maintenant', color: variablePurple }]);
          }
        }
      });

      // ── Executioner: if target dies at night (not lynch), become Fou ──
      alivePlayers.forEach(p => {
        if (p.isAlive && p.role?.id === 'executioner' && p.executionerTarget) {
          const target = alivePlayers.find(t => t.id === p.executionerTarget);
          if (target && !target.isAlive) {
            p.role = { ...ALL_ROLES.find(r => r.id === 'fool')! };
            p.originalRole = ALL_ROLES.find(r => r.id === 'executioner');
            setChatMessages(prev => [...prev, { player: '🎯 Système', message: `La cible du Bourreau est morte ! ${p.username} devient le Fou.`, time: 'maintenant', color: soloGold }]);
          }
        }
      });

      // ── Médecin Peste death chain ──
      const deadPlague = kills.find(k => alivePlayers.find(p => p.id === k.playerId)?.role?.id === 'plague-doctor');
      if (deadPlague) {
        alivePlayers.filter(p => p.isInfected && p.isAlive).forEach(p => {
          p.isAlive = false;
          kills.push({ playerId: p.id, playerName: p.username, role: p.role?.name, cause: 'Épidémie ! Infecté par le Médecin Peste', icon: '🦠' });
        });
      }

      // ── Cult leader death: Disciple inherits or cult dissolves ──
      const cultLeaderDied = kills.some(k => { const p = newState.players.find(pl => pl.id === k.playerId); return p?.role?.id === 'cult-leader'; });
      if (cultLeaderDied) {
        const disciple = alivePlayers.find(p => p.isAlive && p.role?.id === 'disciple');
        if (disciple) {
          // Disciple inherits: becomes new cult leader
          disciple.role = { ...ALL_ROLES.find(r => r.id === 'cult-leader')! };
          disciple.originalRole = ALL_ROLES.find(r => r.id === 'disciple');
          setChatMessages(prev => [...prev, { player: '🕯️ Système', message: `Le Chef du Culte est mort... mais le Disciple hérite du pouvoir !`, time: 'maintenant', color: cultPink }]);
        } else {
          // No disciple: cult dissolves
          alivePlayers.forEach(p => { p.isCultist = false; });
          setChatMessages(prev => [...prev, { player: '🕯️ Système', message: 'Le Chef du Culte est mort ! Le Culte est dissout.', time: 'maintenant', color: cultPink }]);
        }
      }

      // ── Maire death: successor gets mayor status ──
      kills.forEach(k => {
        const deadMayor = alivePlayers.find(p => p.id === k.playerId && p.isMayor);
        if (deadMayor) {
          const livingPlayers = alivePlayers.filter(p => p.isAlive && p.id !== deadMayor.id);
          if (livingPlayers.length > 0) {
            const successor = livingPlayers[Math.floor(Math.random() * livingPlayers.length)];
            successor.isMayor = true;
            setChatMessages(prev => [...prev, { player: '🎖 Système', message: `Le Maire ${deadMayor.username} est mort ! ${successor.username} est désigné(e) successeur.`, time: 'maintenant', color: soloGold }]);
          }
        }
      });

      alivePlayers.forEach(p => { p.isProtected = false; });
      newState.players = alivePlayers;
      newState.nightKills = kills;
      newState.killFeed = [...state.killFeed, ...kills];
      newState.wolfTarget = null;
      newState.seerResult = null;
      newState.guardTarget = null;

      // Track consecutive nights without wolf kills
      const wolfKilledSomeone = kills.some(k => k.cause.includes('loups') || k.cause.includes('Loup'));
      if (wolfKilledSomeone) {
        newState.noWolfKillNights = 0;
      } else {
        newState.noWolfKillNights = (state.noWolfKillNights || 0) + 1;
      }

      let winner = checkWinCondition(alivePlayers);

      // Stalemate: if wolves haven't killed in 2+ consecutive nights, village wins
      const wolvesAlive = alivePlayers.filter(p => p.isAlive && p.role?.camp === 'wolf');
      if (!winner && newState.noWolfKillNights >= 2 && wolvesAlive.length > 0) {
        // Wolves are too weak — auto-eliminate them, village wins
        wolvesAlive.forEach(w => { w.isAlive = false; });
        winner = 'village';
        setChatMessages(prev => [...prev, { player: '⚖️ Système', message: 'Les loups n\'ont pas tué depuis 2 nuits ! Ils sont éliminés. Victoire du Village !', time: 'maintenant', color: '#22c55e' }]);
      }

      if (winner) newState.winner = winner;

      // Inject night results directly into chat as system messages
      const nightMessages: { player: string; message: string; time: string; color: string }[] = [];
      nightMessages.push({ player: '🌅 Nuit ' + state.day, message: `── Résultat de la nuit ${state.day} ──`, time: 'maintenant', color: soloGold });
      if (kills.length === 0) {
        nightMessages.push({ player: '🌅 Nuit ' + state.day, message: 'Personne n\'a été tué cette nuit ! ✨', time: 'maintenant', color: villageGreen });
      } else {
        kills.forEach(k => {
          const display = getKillDisplay(k.cause, k.playerName);
          const msg: any = { player: k.icon + ' Mort', message: `${k.playerName} — ${display.message}${k.role ? ` (${k.role})` : ''}`, time: 'maintenant', color: wolfRed };
          if (display.media) {
            msg.mediaUrl = display.media.url;
            msg.mediaType = display.media.type;
          }
          nightMessages.push(msg);
        });
      }
      setChatMessages(prev => [...prev, ...nightMessages]);

      if (winner) { setView('end'); }
      // ── Bear Tamer proximity detection (morning) ──
      const bearTamer = newState.players.find(p => p.isAlive && p.role?.id === 'bear-tamer');
      if (bearTamer) {
        const aliveSorted = newState.players.filter(p => p.isAlive);
        const btIdx = aliveSorted.findIndex(p => p.id === bearTamer.id);
        const left = btIdx > 0 ? aliveSorted[btIdx - 1] : aliveSorted[aliveSorted.length - 1];
        const right = btIdx < aliveSorted.length - 1 ? aliveSorted[btIdx + 1] : aliveSorted[0];
        const wolfNearby = (left?.role?.camp === 'wolf') || (right?.role?.camp === 'wolf');
        if (wolfNearby) {
          setChatMessages(prev => [...prev, { player: '🐻 Système', message: 'L\'ours grogne ! Un loup est voisin du Montreur d\'Ours !', time: 'maintenant', color: soloGold }]);
        }
      }

      // ── Augur morning info (tells a role NOT in the game) ──
      const augur = newState.players.find(p => p.isAlive && p.role?.id === 'augur');
      if (augur) {
        const activeRoleIds = new Set(newState.players.map(p => p.role?.id));
        const absentRoles = ALL_ROLES.filter(r => !activeRoleIds.has(r.id));
        if (absentRoles.length > 0) {
          const randomAbsent = absentRoles[Math.floor(Math.random() * absentRoles.length)];
          if (augur.id === 'me') {
            setChatMessages(prev => [...prev, { player: '🦅 Augure', message: `Les oiseaux murmure : "${randomAbsent.name} ${randomAbsent.icon}" n'est PAS dans cette partie.`, time: 'maintenant', color: '#8b5cf6' }]);
          }
        }
      }

      // Ange: if dies during night of day 1, solo win
      if (state.day === 1) {
        const deadAngel = kills.find(k => { const p = newState.players.find(pl => pl.id === k.playerId); return p?.role?.id === 'angel' || p?.originalRole?.id === 'angel'; });
        if (deadAngel) { newState.winner = 'solo'; setView('end'); return newState; }
      }

      // Stay on 'game' view — no nightResults screen
      setSelectedPlayer(null);
      setActionDone(false);
      setPiperSelections([]);
      return { ...newState, phase: 'day-discussion', timeLeft: discussionTimer, maxTime: discussionTimer };
    }

    if (state.phase === 'day-discussion') {
      return { ...newState, phase: 'day-vote', timeLeft: voteTimer, maxTime: voteTimer };
    }

    if (state.phase === 'day-vote') {
      // Pacifist check: if pacifist blocked lynch, skip vote
      if (state.pacifistUsed) {
        newState.pacifistUsed = false; // reset for next day
        setChatMessages(prev => [...prev, { player: '☮️ Système', message: 'Le Pacifiste a empêché le lynch ! Personne n\'est éliminé.', time: 'maintenant', color: villageGreen }]);
        setSelectedPlayer(null);
        setActionDone(false);
        return { ...newState, phase: 'night', day: state.day + 1, timeLeft: nightTimer, maxTime: nightTimer };
      }

      // Use the votes already cast during the phase (stored in p.votedFor / p.votes)
      // For bots that didn't vote yet (e.g. multiplayer), generate votes now
      const voteCounts: Record<string, number> = {};
      newState.players.filter(p => p.isAlive).forEach(p => {
        // Skip players who can't vote
        if ((p.role?.id === 'idiot' && p.originalRole) || p.cannotVote) return;

        let voteTarget = p.votedFor;

        // Bot without a vote yet — generate one
        if (!voteTarget && p.isBot) {
          const others = newState.players.filter(o => o.isAlive && o.id !== p.id);
          if (others.length > 0) {
            voteTarget = others[Math.floor(Math.random() * others.length)].id;
          }
        }

        // Player vote (use selectedPlayer if no votedFor set)
        if (!voteTarget && p.id === myPlayerId && selectedPlayer) {
          voteTarget = selectedPlayer;
        }

        if (!voteTarget) return;

        // Maladroit: 50% chance of voting wrong (applied at resolution, not display)
        if (p.role?.id === 'clumsy' && Math.random() < 0.5) {
          const others = newState.players.filter(o => o.isAlive && o.id !== p.id && o.id !== voteTarget);
          if (others.length > 0) {
            voteTarget = others[Math.floor(Math.random() * others.length)].id;
            if (p.id === myPlayerId) {
              setChatMessages(prev => [...prev, { player: '🤕 Maladroit', message: 'Oups ! Votre vote a été redirigé !', time: 'maintenant', color: soloGold }]);
            }
          }
        }

        // cannotVote check for human player
        if (p.id === myPlayerId && mePlayer?.cannotVote) {
          setChatMessages(prev => [...prev, { player: '😱 Système', message: 'Vous êtes sous l\'effet du cauchemar ! Vous ne pouvez pas voter.', time: 'maintenant', color: wolfRed }]);
          return;
        }

        const voteWeight = p.isMayor ? 2 : 1;
        voteCounts[voteTarget] = (voteCounts[voteTarget] || 0) + voteWeight;
      });

      let maxVotes = 0;
      let lynchTarget: string | null = null;
      let isTie = false;
      Object.entries(voteCounts).forEach(([id, count]) => {
        if (count > maxVotes) { maxVotes = count; lynchTarget = id; isTie = false; }
        else if (count === maxVotes) isTie = true;
      });

      if (lynchTarget && !isTie) {
        const target = newState.players.find(p => p.id === lynchTarget);
        if (target) {
          // Fou wins if lynched
          if (target.role?.id === 'fool') { newState.winner = 'solo'; setView('end'); return newState; }
          // Ange wins if lynched on day 1
          if (target.role?.id === 'angel' && state.day === 1) { newState.winner = 'solo'; setView('end'); return newState; }
          // Bourreau wins if his target is lynched
          const executioner = newState.players.find(p => p.isAlive && p.role?.id === 'executioner' && p.executionerTarget === target.id);
          if (executioner) {
            newState.winner = 'solo'; setView('end'); return newState;
          }
          // Idiot du Village survives first lynch but loses vote
          if (target.role?.id === 'idiot' && !target.originalRole) {
            target.originalRole = { ...target.role }; // mark as used
            setChatMessages(prev => [...prev, { player: '🤪 Système', message: `${target.username} est l'Idiot du Village ! Il survit mais perd son droit de vote.`, time: 'maintenant', color: soloGold }]);
          } else {
            // Servante Dévouée can take the role
            const servant = newState.players.find(p => p.isAlive && p.role?.id === 'devoted-servant');
            if (servant && target.role) {
              if (servant.isBot && Math.random() < 0.5) {
                const wasVillage = servant.role?.camp === 'village';
                servant.role = { ...target.role };
                setChatMessages(prev => [...prev, { player: '🎭 Système', message: `La Servante Dévouée prend secrètement le rôle de ${target.username}...`, time: 'maintenant', color: '#8b5cf6' }]);
                if (wasVillage && servant.role?.camp === 'wolf') {
                  setChatMessages(prev => [...prev, { player: '🐺 Système', message: `${servant.username} a rejoint la meute !`, time: 'maintenant', color: wolfRed }]);
                }
              } else if (!servant.isBot) {
                // Human player Servante — auto-take the role
                const stolenRole = { ...target.role };
                servant.role = stolenRole;
                setMyRole(stolenRole);
                setChatMessages(prev => [...prev, { player: '🎭 Servante', message: `Vous prenez secrètement le rôle de ${target.username} : ${stolenRole.name} ${stolenRole.icon} !`, time: 'maintenant', color: '#8b5cf6' }]);
              }
            }

            target.isAlive = false;
            newState.killFeed = [...newState.killFeed, { playerId: target.id, playerName: target.username, role: target.role?.name, cause: 'Lynché par le village', icon: '⚖️' }];
            const lynchDisplay = getKillDisplay('Lynché par le village', target.username);
            const lynchMsg: any = { player: '⚖️ Système', message: `${target.username} — ${lynchDisplay.message} (${target.role?.name || ''})`, time: 'maintenant', color: wolfRed };
            if (lynchDisplay.media) { lynchMsg.mediaUrl = lynchDisplay.media.url; lynchMsg.mediaType = lynchDisplay.media.type; }
            setChatMessages(prev => [...prev, lynchMsg]);

            // Elder killed by village: all villagers lose powers
            if (target.role?.id === 'elder') {
              newState.elderLynchedPowersLost = true;
              newState.players.forEach(p => {
                if (p.isAlive && p.role?.camp === 'village' && p.role?.nightAction) {
                  p.role = { ...p.role, nightAction: undefined, dayAction: undefined };
                }
              });
              setChatMessages(prev => [...prev, { player: '👴 Système', message: 'L\'Ancien a été lynché ! Tous les villageois perdent leurs pouvoirs !', time: 'maintenant', color: wolfRed }]);
            }

            // Maire successor on lynch
            if (target.isMayor) {
              const livingPlayers = newState.players.filter(p => p.isAlive && p.id !== target.id);
              if (livingPlayers.length > 0) {
                const successor = livingPlayers[Math.floor(Math.random() * livingPlayers.length)];
                successor.isMayor = true;
                setChatMessages(prev => [...prev, { player: '🎖 Système', message: `Le Maire ${target.username} est mort ! ${successor.username} est désigné(e) successeur.`, time: 'maintenant', color: soloGold }]);
              }
            }

            // Lover chain
            if (target.isLover) {
              const otherLover = newState.players.find(p => p.isLover && p.isAlive && p.id !== target.id);
              if (otherLover) {
                otherLover.isAlive = false;
                newState.killFeed = [...newState.killFeed, { playerId: otherLover.id, playerName: otherLover.username, role: otherLover.role?.name, cause: 'Mort de chagrin (Amoureux)', icon: '💔' }];
                setChatMessages(prev => [...prev, { player: '💔 Système', message: `${otherLover.username} meurt de chagrin...`, time: 'maintenant', color: '#ec4899' }]);
              }
            }

            // Hunter death shot
            if (target.role?.id === 'hunter') {
              if (target.id === 'me') { setView('hunterShot'); return newState; }
              else {
                const tgts = newState.players.filter(p => p.isAlive && p.id !== target.id);
                if (tgts.length) {
                  const shot = tgts[Math.floor(Math.random() * tgts.length)];
                  shot.isAlive = false;
                  setChatMessages(prev => [...prev, { player: '🏹 Système', message: `${target.username} tire sur ${shot.username} !`, time: 'maintenant', color: soloGold }]);
                }
              }
            }
          } // end else (not idiot)
        }
      } else {
        // Bouc Émissaire — dies on tie
        const scapegoat = newState.players.find(p => p.isAlive && p.role?.id === 'scapegoat');
        if (scapegoat && isTie) {
          scapegoat.isAlive = false;
          newState.killFeed = [...newState.killFeed, { playerId: scapegoat.id, playerName: scapegoat.username, role: scapegoat.role?.name, cause: 'Sacrifié (égalité au vote)', icon: '🐐' }];
          setChatMessages(prev => [...prev, { player: '🐐 Système', message: `Égalité ! ${scapegoat.username} (Bouc Émissaire) est éliminé à la place !`, time: 'maintenant', color: wolfRed }]);
        } else {
          setChatMessages(prev => [...prev, { player: '⚖️ Système', message: 'Égalité ! Personne n\'est éliminé.', time: 'maintenant', color: soloGold }]);
        }
      }

      newState.players.forEach(p => { p.votes = 0; p.votedFor = undefined; });
      const winner = checkWinCondition(newState.players);
      if (winner) { newState.winner = winner; setView('end'); return newState; }

      // Reset cannotVote from Loup Cauchemar
      newState.players.forEach(p => { p.cannotVote = false; });
      // Apply nightmare target for NEXT day's vote
      if (newState.nightmareTarget) {
        const nightmareVictim = newState.players.find(p => p.id === newState.nightmareTarget);
        if (nightmareVictim) nightmareVictim.cannotVote = true;
        newState.nightmareTarget = null;
      }

      // Ange: if survived day 1, become Villageois
      if (state.day === 1) {
        newState.players.forEach(p => {
          if (p.isAlive && p.role?.id === 'angel') {
            p.originalRole = { ...p.role };
            p.role = { ...ALL_ROLES.find(r => r.id === 'villager')! };
            setChatMessages(prev => [...prev, { player: '😇 Système', message: `${p.username} (Ange) a survécu au jour 1 — il/elle devient Villageois.`, time: 'maintenant', color: villageGreen }]);
          }
        });
      }

      setSelectedPlayer(null);
      setActionDone(false);
      setPiperSelections([]);
      return { ...newState, phase: 'night', day: state.day + 1, timeLeft: nightTimer, maxTime: nightTimer };
    }

    return newState;
  }, [selectedPlayer, nightTimer, discussionTimer, voteTimer]);

  // ─── Player Actions ─────────────────────────────────────────────
  const performNightAction = (targetId: string) => {
    if (!myRole || actionDone) return;
    const targetPlayer = gameState.players.find(p => p.id === targetId);

    // Multiplayer non-host: send action to host via broadcast
    if (dbRoomId && !isHost && gameChannelRef.current) {
      const actionType = myRole.camp === 'wolf' ? 'wolf_kill' : (myRole.nightAction || 'unknown');
      gameChannelRef.current.send({
        type: 'broadcast', event: 'player_action',
        payload: { playerId: user?.id, targetId, actionType },
      });
    }

    // ── Wolf-camp roles with UNIQUE actions (check BEFORE generic wolf vote) ──
    if (myRole.nightAction === 'watch') {
      // Rôdeur — observe if player is "awake" (has night action)
      if (targetPlayer) {
        const isAwake = !!targetPlayer.role?.nightAction;
        setActionDone(true);
        setChatMessages(prev => [...prev, { player: '🦉 Rôdeur', message: `${targetPlayer.username} est ${isAwake ? '👀 ÉVEILLÉ (a une action nocturne)' : '😴 ENDORMI (pas d\'action nocturne)'}`, time: 'maintenant', color: isAwake ? soloGold : t2 }]);
      }
    } else if (myRole.nightAction === 'angel_action') {
      // Ange Déchu — protect a wolf OR kill a villager
      if (targetPlayer) {
        if (targetPlayer.role?.camp === 'wolf') {
          targetPlayer.isProtected = true;
          setChatMessages(prev => [...prev, { player: '👼 Ange Déchu', message: `${targetPlayer.username} est protégé(e) par l'Ange.`, time: 'maintenant', color: wolfRed }]);
        } else {
          targetPlayer.isAlive = false;
          setGameState(prev => ({ ...prev, nightKills: [...prev.nightKills, { playerId: targetPlayer.id, playerName: targetPlayer.username, role: targetPlayer.role?.name, cause: 'Tué par l\'Ange Déchu', icon: '👼🐺' }] }));
          setChatMessages(prev => [...prev, { player: '👼 Ange Déchu', message: `${targetPlayer.username} est éliminé par l'Ange Déchu.`, time: 'maintenant', color: wolfRed }]);
        }
        setActionDone(true);
      }
    } else if (myRole.nightAction === 'scan_seer') {
      // Sorcier Noir — scan if player is Voyante/Renard/Oracle
      if (targetPlayer) {
        const isSeerType = ['seer', 'fox', 'oracle'].includes(targetPlayer.role?.id || '');
        setActionDone(true);
        setChatMessages(prev => [...prev, { player: '🐺🧙 Sorcier Noir', message: isSeerType ? `${targetPlayer.username} est un VOYANT ! (${targetPlayer.role?.name} ${targetPlayer.role?.icon})` : `${targetPlayer.username} n'est pas un voyant.`, time: 'maintenant', color: isSeerType ? wolfRed : t2 }]);
      }
    } else if (myRole.camp === 'wolf' || myRole.nightAction === 'vote_kill') {
      setGameState(prev => ({ ...prev, wolfTarget: targetId }));
      setActionDone(true);
      setChatMessages(prev => [...prev, { player: '🐺 Meute', message: `Cible : ${targetPlayer?.username}`, time: 'maintenant', color: wolfRed }]);
      // Petite Fille: if player IS the Petite Fille, nothing special. But she can see wolf messages (handled below).
    } else if (myRole.nightAction === 'examine') {
      if (targetPlayer?.role) {
        setGameState(prev => ({ ...prev, seerResult: { playerId: targetId, camp: targetPlayer.role!.camp } }));
        setActionDone(true);
        setChatMessages(prev => [...prev, { player: '🔮 Vision', message: `${targetPlayer.username} est ${targetPlayer.role.camp === 'wolf' ? '🐺 LOUP' : targetPlayer.role.camp === 'solo' ? '⚡ SOLO' : '🏡 VILLAGE'}`, time: 'maintenant', color: soloPurple }]);
      }
    } else if (myRole.nightAction === 'protect') {
      if (targetPlayer) {
        // Can't protect same player 2 nights in a row
        if (gameState.lastGuardTarget === targetId) {
          setChatMessages(prev => [...prev, { player: '🛡️ Garde', message: `Vous ne pouvez pas protéger ${targetPlayer.username} deux nuits de suite !`, time: 'maintenant', color: wolfRed }]);
        } else {
          targetPlayer.isProtected = true;
          setGameState(prev => ({ ...prev, guardTarget: targetId, lastGuardTarget: targetId }));
          setActionDone(true);
          setChatMessages(prev => [...prev, { player: '🛡️ Garde', message: `${targetPlayer.username} est protégé(e)`, time: 'maintenant', color: villageGreen }]);
        }
      }
    } else if (myRole.nightAction === 'solo_kill') {
      if (targetPlayer) {
        targetPlayer.isAlive = false;
        setActionDone(true);
        setGameState(prev => ({ ...prev, nightKills: [...prev.nightKills, { playerId: targetPlayer.id, playerName: targetPlayer.username, role: targetPlayer.role?.name, cause: 'Poignardé par le Serial Killer', icon: '🔪' }] }));
      }
    } else if (myRole.nightAction === 'potions') {
      if (witchAction === 'save' && !gameState.witchSaveUsed && gameState.wolfTarget) {
        // Save the wolf target
        const wolfVictim = gameState.players.find(p => p.id === gameState.wolfTarget);
        if (wolfVictim) {
          wolfVictim.isProtected = true;
          setGameState(prev => ({ ...prev, witchSaveUsed: true, wolfTarget: null }));
          setActionDone(true);
          setWitchAction(null);
          setChatMessages(prev => [...prev, { player: '🧪 Sorcière', message: `Potion de vie utilisée ! ${wolfVictim.username} est sauvé(e).`, time: 'maintenant', color: villageGreen }]);
        }
        return;
      }
      if (witchAction === 'kill' && !gameState.witchKillUsed && targetPlayer) {
        targetPlayer.isAlive = false;
        setGameState(prev => ({ ...prev, witchKillUsed: true, nightKills: [...prev.nightKills, { playerId: targetPlayer.id, playerName: targetPlayer.username, role: targetPlayer.role?.name, cause: 'Empoisonné par la Sorcière', icon: '🧪' }] }));
        setActionDone(true);
        setWitchAction(null);
        return;
      }
      if (!gameState.witchKillUsed && targetPlayer && !witchAction) {
        targetPlayer.isAlive = false;
        setGameState(prev => ({ ...prev, witchKillUsed: true, nightKills: [...prev.nightKills, { playerId: targetPlayer.id, playerName: targetPlayer.username, role: targetPlayer.role?.name, cause: 'Empoisonné par la Sorcière', icon: '🧪' }] }));
        setActionDone(true);
      }
    } else if (myRole.nightAction === 'charm') {
      // Joueur de Flûte — charm 2 targets per night
      if (targetPlayer && !targetPlayer.isCharmed) {
        targetPlayer.isCharmed = true;
        setChatMessages(prev => [...prev, { player: '🪈 Flûte', message: `${targetPlayer.username} est charmé(e)... 🎵`, time: 'maintenant', color: soloPurple }]);
        // Check if already charmed 1 this turn (use piperSelections)
        setPiperSelections(prev => {
          const next = [...prev, targetId];
          if (next.length >= 2) {
            setActionDone(true);
          }
          return next;
        });
      }
    } else if (myRole.nightAction === 'choose_model') {
      // Enfant Sauvage — choose role model (first night only)
      if (targetPlayer && gameState.day === 1) {
        setGameState(prev => {
          const me = prev.players.find(p => p.id === myPlayerId);
          if (me) me.roleModel = targetId;
          return { ...prev };
        });
        setActionDone(true);
        setChatMessages(prev => [...prev, { player: '🧒 Enfant Sauvage', message: `Votre modèle est ${targetPlayer.username}. Tant qu'il vit, vous êtes Village.`, time: 'maintenant', color: villageGreen }]);
      }
    } else if (myRole.nightAction === 'link_lovers') {
      // Cupidon — link 2 lovers (night 1 only)
      if (targetPlayer && gameState.day === 1) {
        setCupidSelections(prev => {
          const next = [...prev, targetId];
          if (next.length >= 2) {
            setGameState(prevState => {
              const p1 = prevState.players.find(p => p.id === next[0]);
              const p2 = prevState.players.find(p => p.id === next[1]);
              if (p1) p1.isLover = true;
              if (p2) p2.isLover = true;
              return { ...prevState };
            });
            setActionDone(true);
            const name1 = gameState.players.find(p => p.id === next[0])?.username;
            const name2 = gameState.players.find(p => p.id === next[1])?.username;
            setChatMessages(prev => [...prev, { player: '💘 Cupidon', message: `${name1} et ${name2} sont désormais amoureux ! 💕`, time: 'maintenant', color: '#ec4899' }]);
          }
          return next;
        });
      }
    } else if (myRole.nightAction === 'detect_group') {
      // Renard — detect group of 3 neighbors
      if (targetPlayer) {
        const me = gameState.players.find(p => p.id === myPlayerId);
        if (me?.foxPowerLost) {
          setChatMessages(prev => [...prev, { player: '🦊 Renard', message: 'Vous avez perdu votre pouvoir de détection.', time: 'maintenant', color: t3 }]);
          setActionDone(true);
        } else {
          const allPlayers = gameState.players.filter(p => p.isAlive);
          const idx = allPlayers.findIndex(p => p.id === targetId);
          const neighbors = [allPlayers[idx - 1], allPlayers[idx], allPlayers[idx + 1]].filter(Boolean);
          const hasWolf = neighbors.some(p => p.role?.camp === 'wolf');
          setActionDone(true);
          if (!hasWolf && me) {
            me.foxPowerLost = true;
          }
          setChatMessages(prev => [...prev, { player: '🦊 Renard', message: hasWolf ? `Un loup se cache parmi ${neighbors.map(n => n.username).join(', ')} ! 🐺` : `Aucun loup parmi ${neighbors.map(n => n.username).join(', ')}. Vous perdez votre pouvoir définitivement.`, time: 'maintenant', color: hasWolf ? wolfRed : soloGold }]);
        }
      }
    } else if (myRole.nightAction === 'infect') {
      // Médecin Peste — infect target
      if (targetPlayer && !targetPlayer.isInfected) {
        targetPlayer.isInfected = true;
        setActionDone(true);
        setChatMessages(prev => [...prev, { player: '🦠 Peste', message: `${targetPlayer.username} est infecté(e)...`, time: 'maintenant', color: '#84cc16' }]);
      }
    } else if (myRole.nightAction === 'douse') {
      // Pyromane — douse or ignite
      if (targetId === '__ignite__') {
        // Ignite all doused
        setGameState(prev => {
          const kills: KillEvent[] = [];
          prev.players.forEach(p => {
            if (p.isDoused && p.isAlive) {
              p.isAlive = false;
              kills.push({ playerId: p.id, playerName: p.username, role: p.role?.name, cause: 'Brûlé par le Pyromane', icon: '🔥' });
            }
          });
          if (kills.length > 0) setMyExplosionKillsThisGame(prev => Math.max(prev, kills.length));
          return { ...prev, nightKills: [...prev.nightKills, ...kills], killFeed: [...prev.killFeed, ...kills] };
        });
        setActionDone(true);
        setChatMessages(prev => [...prev, { player: '🔥 Pyromane', message: 'IGNITION ! Tous les arrosés brûlent !', time: 'maintenant', color: '#f97316' }]);
      } else if (targetPlayer && !targetPlayer.isDoused) {
        targetPlayer.isDoused = true;
        setActionDone(true);
        setChatMessages(prev => [...prev, { player: '🔥 Pyromane', message: `${targetPlayer.username} est arrosé(e) d'essence...`, time: 'maintenant', color: '#f97316' }]);
      }
    } else if (myRole.nightAction === 'convert') {
      // Chef du Culte — convert target
      if (targetPlayer && !targetPlayer.isCultist && targetPlayer.role?.camp !== 'wolf') {
        targetPlayer.isCultist = true;
        setActionDone(true);
        setChatMessages(prev => [...prev, { player: '🕯️ Culte', message: `${targetPlayer.username} rejoint le Culte...`, time: 'maintenant', color: cultPink }]);
      }
    } else if (myRole.nightAction === 'hunt_cult') {
      // Chasseur de Culte — kill if cultist
      if (targetPlayer) {
        if (targetPlayer.isCultist) {
          targetPlayer.isAlive = false;
          setGameState(prev => ({ ...prev, nightKills: [...prev.nightKills, { playerId: targetPlayer.id, playerName: targetPlayer.username, role: targetPlayer.role?.name, cause: 'Chassé par le Chasseur de Culte', icon: '💂' }] }));
          setChatMessages(prev => [...prev, { player: '💂 C. Culte', message: `${targetPlayer.username} était cultiste ! Éliminé !`, time: 'maintenant', color: villageGreen }]);
        } else {
          setChatMessages(prev => [...prev, { player: '💂 C. Culte', message: `${targetPlayer.username} n'est pas cultiste.`, time: 'maintenant', color: t2 }]);
        }
        setActionDone(true);
      }
    } else if (myRole.nightAction === 'silent_kill') {
      // Ninja — 1x silent kill ignoring all protections
      if (targetPlayer) {
        targetPlayer.isAlive = false;
        setActionDone(true);
        setGameState(prev => ({ ...prev, nightKills: [...prev.nightKills, { playerId: targetPlayer.id, playerName: targetPlayer.username, role: targetPlayer.role?.name, cause: 'Assassiné par le Ninja', icon: '🥷' }] }));
        setChatMessages(prev => [...prev, { player: '🥷 Ninja', message: `${targetPlayer.username} est assassiné silencieusement...`, time: 'maintenant', color: soloGold }]);
      }
    } else if (myRole.nightAction === 'divine_not') {
      // Oracle — learn one role the target is NOT
      if (targetPlayer && targetPlayer.role) {
        const otherRoles = ALL_ROLES.filter(r => r.id !== targetPlayer.role!.id && r.camp === targetPlayer.role!.camp);
        const fakeRole = otherRoles.length > 0 ? otherRoles[Math.floor(Math.random() * otherRoles.length)] : ALL_ROLES[Math.floor(Math.random() * ALL_ROLES.length)];
        setActionDone(true);
        setChatMessages(prev => [...prev, { player: '🌀 Oracle', message: `${targetPlayer.username} n'est PAS ${fakeRole.name} ${fakeRole.icon}`, time: 'maintenant', color: '#8b5cf6' }]);
      }
    } else if (myRole.nightAction === 'visit') {
      // Courtisane — visit a player (die if wolf)
      if (targetPlayer) {
        if (targetPlayer.role?.camp === 'wolf') {
          const me = gameState.players.find(p => p.id === myPlayerId);
          if (me) me.isAlive = false;
          setGameState(prev => ({ ...prev, nightKills: [...prev.nightKills, { playerId: 'me', playerName: me?.username || 'Vous', role: myRole?.name, cause: 'Tuée en visitant un loup (Courtisane)', icon: '💋' }] }));
          setChatMessages(prev => [...prev, { player: '💋 Courtisane', message: `Vous avez visité un loup... Vous êtes morte !`, time: 'maintenant', color: wolfRed }]);
        } else {
          setChatMessages(prev => [...prev, { player: '💋 Courtisane', message: `${targetPlayer.username} n'est pas loup. Vous êtes en sécurité.`, time: 'maintenant', color: villageGreen }]);
        }
        setActionDone(true);
      }
    } else if (myRole.nightAction === 'choose_protege') {
      // Martyr — choose protégé (night 1)
      if (targetPlayer && gameState.day === 1) {
        setGameState(prev => ({ ...prev, martyrTarget: targetId }));
        setActionDone(true);
        setChatMessages(prev => [...prev, { player: '🔰 Martyr', message: `Vous protégez ${targetPlayer.username}. Si il/elle meurt, vous mourrez à sa place.`, time: 'maintenant', color: villageGreen }]);
      }
    } else if (myRole.nightAction === 'choose_target') {
      // Doppelgänger — choose copy target (night 1)
      if (targetPlayer && gameState.day === 1) {
        setGameState(prev => {
          const me = prev.players.find(p => p.id === myPlayerId);
          if (me) me.doppelTarget = targetId;
          return { ...prev };
        });
        setActionDone(true);
        setChatMessages(prev => [...prev, { player: '🎭 Doppelgänger', message: `Vous copiez ${targetPlayer.username}. Quand il/elle meurt, vous prendrez son rôle.`, time: 'maintenant', color: variablePurple }]);
      }
    } else if (myRole.nightAction === 'steal_role') {
      // Voleur — steal role (night 1)
      if (targetPlayer && gameState.day === 1 && targetPlayer.role) {
        const stolenRole = { ...targetPlayer.role };
        targetPlayer.role = ALL_ROLES.find(r => r.id === 'villager')!;
        setMyRole(stolenRole);
        setGameState(prev => {
          const me = prev.players.find(p => p.id === myPlayerId);
          if (me) me.role = stolenRole;
          return { ...prev };
        });
        setActionDone(true);
        setChatMessages(prev => [...prev, { player: '😈 Voleur', message: `Vous avez volé le rôle de ${targetPlayer.username} : ${stolenRole.name} ${stolenRole.icon} !`, time: 'maintenant', color: variablePurple }]);
      }
    } else if (myRole.nightAction === 'block_wolves') {
      // Forgeron — block wolves (1x)
      if (!gameState.blacksmithUsed) {
        setGameState(prev => ({ ...prev, blacksmithUsed: true }));
        setActionDone(true);
        setChatMessages(prev => [...prev, { player: '⚒ Forgeron', message: 'Les lames des loups sont bloquées cette nuit !', time: 'maintenant', color: villageGreen }]);
      }
    } else if (myRole.nightAction === 'sleep_all') {
      // Sandman — cancel all night actions (1x)
      if (!gameState.sandmanUsed) {
        setGameState(prev => ({ ...prev, sandmanUsed: true }));
        setActionDone(true);
        setChatMessages(prev => [...prev, { player: '💤 Sandman', message: 'Tout le monde s\'endort... Nuit paisible.', time: 'maintenant', color: '#8b5cf6' }]);
      }
    } else if (myRole.nightAction === 'brew') {
      // Alchimiste — brew potion (3 nights then apply)
      if (targetPlayer) {
        // Simplified: direct effect (in a full game, track brew count)
        if (targetPlayer.role?.camp === 'wolf') {
          targetPlayer.role = ALL_ROLES.find(r => r.id === 'villager')!;
          setChatMessages(prev => [...prev, { player: '🍵 Alchimiste', message: `${targetPlayer.username} est guéri ! Il/elle redevient Villageois.`, time: 'maintenant', color: villageGreen }]);
        } else {
          targetPlayer.isAlive = false;
          setGameState(prev => ({ ...prev, nightKills: [...prev.nightKills, { playerId: targetPlayer.id, playerName: targetPlayer.username, role: targetPlayer.role?.name, cause: 'Empoisonné par l\'Alchimiste', icon: '🍵' }] }));
          setChatMessages(prev => [...prev, { player: '🍵 Alchimiste', message: `${targetPlayer.username} est empoisonné ! Mauvaise cible...`, time: 'maintenant', color: wolfRed }]);
        }
        setActionDone(true);
      }
    } else if (myRole.nightAction === 'speak_dead') {
      // Chamane — communicate with dead (info only)
      if (targetPlayer && !targetPlayer.isAlive) {
        const deadRole = targetPlayer.role;
        setActionDone(true);
        setChatMessages(prev => [...prev, { player: '🪬 Chamane', message: `L'esprit de ${targetPlayer.username} murmure : "${deadRole?.camp === 'wolf' ? 'Je regrette mes crimes...' : 'Attention aux loups parmi vous...'}"`, time: 'maintenant', color: '#8b5cf6' }]);
      }
    } else if (myRole.nightAction === 'read_dead') {
      // Médium — learn role of last dead player
      const lastDead = [...gameState.killFeed].reverse().find(k => true);
      if (lastDead) {
        const deadPlayer = gameState.players.find(p => p.id === lastDead.playerId);
        setActionDone(true);
        setChatMessages(prev => [...prev, { player: '👻 Médium', message: `Le dernier mort (${lastDead.playerName}) était : ${deadPlayer?.role?.name || 'inconnu'} ${deadPlayer?.role?.icon || ''}`, time: 'maintenant', color: '#8b5cf6' }]);
      } else {
        setActionDone(true);
        setChatMessages(prev => [...prev, { player: '👻 Médium', message: 'Aucun mort à lire...', time: 'maintenant', color: t2 }]);
      }
    } else if (myRole.nightAction === 'bless') {
      // Prêtre — bless a player (1x). If wolf → revealed
      if (targetPlayer && !gameState.priestUsed) {
        setGameState(prev => ({ ...prev, priestUsed: true }));
        setActionDone(true);
        if (targetPlayer.role?.camp === 'wolf') {
          setChatMessages(prev => [...prev, { player: '⛪ Prêtre', message: `${targetPlayer.username} est un LOUP ! (${targetPlayer.role?.name}) La bénédiction le révèle !`, time: 'maintenant', color: wolfRed }]);
        } else {
          setChatMessages(prev => [...prev, { player: '⛪ Prêtre', message: `${targetPlayer.username} est béni(e). Il/elle n'est pas loup.`, time: 'maintenant', color: villageGreen }]);
        }
      }
    } else if (myRole.nightAction === 'dig_grave') {
      // Fossoyeur — check camp of a dead player
      if (targetPlayer && !targetPlayer.isAlive) {
        setActionDone(true);
        setChatMessages(prev => [...prev, { player: '⚰️ Fossoyeur', message: `${targetPlayer.username} était du camp ${targetPlayer.role?.camp === 'wolf' ? '🐺 LOUP' : targetPlayer.role?.camp === 'solo' ? '⚡ SOLO' : targetPlayer.role?.camp === 'cult' ? '🕯️ CULTE' : '🏡 VILLAGE'}`, time: 'maintenant', color: '#8b5cf6' }]);
      }
    } else if (myRole.nightAction === 'mimic') {
      // Comédien — 3 powers (Voyante, Garde, Sorcière kill), each usable 1× total
      // comedianMode is set by the UI buttons before calling performNightAction
      if (targetPlayer && comedianMode) {
        if (comedianMode === 'seer' && !comedianPowers.seer) {
          setComedianPowers(prev => ({ ...prev, seer: true }));
          setActionDone(true);
          setChatMessages(prev => [...prev, { player: '🎪 Comédien', message: `[Imitation Voyante] ${targetPlayer.username} est ${targetPlayer.role?.camp === 'wolf' ? '🐺 LOUP' : targetPlayer.role?.camp === 'solo' ? '⚡ SOLO' : '🏡 VILLAGE'}`, time: 'maintenant', color: '#8b5cf6' }]);
        } else if (comedianMode === 'guard' && !comedianPowers.guard) {
          setComedianPowers(prev => ({ ...prev, guard: true }));
          targetPlayer.isProtected = true;
          setActionDone(true);
          setChatMessages(prev => [...prev, { player: '🎪 Comédien', message: `[Imitation Garde] ${targetPlayer.username} est protégé(e) cette nuit.`, time: 'maintenant', color: '#8b5cf6' }]);
        } else if (comedianMode === 'witch' && !comedianPowers.witch) {
          setComedianPowers(prev => ({ ...prev, witch: true }));
          targetPlayer.isAlive = false;
          setActionDone(true);
          setGameState(prev => ({ ...prev, killFeed: [...prev.killFeed, { playerId: targetPlayer.id, playerName: targetPlayer.username, role: targetPlayer.role?.name, cause: 'Empoisonné par le Comédien', icon: '🎪' }] }));
          setChatMessages(prev => [...prev, { player: '🎪 Comédien', message: `[Imitation Sorcière] ${targetPlayer.username} a été empoisonné(e) !`, time: 'maintenant', color: '#8b5cf6' }]);
        }
        setComedianMode(null);
      }
    } else if (myRole.nightAction === 'corrupt') {
      // Corrupteur — corrupt a player silently
      if (targetPlayer && !targetPlayer.isCorrupted) {
        targetPlayer.isCorrupted = true;
        setActionDone(true);
        setChatMessages(prev => [...prev, { player: '💀 Corrupteur', message: `${targetPlayer.username} est corrompu(e)... Il/elle ne le sait pas.`, time: 'maintenant', color: '#9333ea' }]);
      }
    }
    setSelectedPlayer(targetId);
  };

  const performDayVote = (targetId: string) => {
    if (gameState.phase !== 'day-vote') return;
    setSelectedPlayer(targetId);
    if (dbRoomId && gameChannelRef.current) {
      // Multiplayer: broadcast vote — the broadcast handler will update votes for ALL players (including self)
      gameChannelRef.current.send({
        type: 'broadcast', event: 'player_action',
        payload: { playerId: user?.id || myPlayerId, targetId, actionType: 'vote' },
      });
    } else {
      // Solo/bot mode: update votes locally
      setGameState(prev => {
        const updated = { ...prev, players: prev.players.map(p => ({ ...p })) };
        const voter = updated.players.find(p => p.id === myPlayerId);
        const target = updated.players.find(p => p.id === targetId);
        if (voter && target && voter.isAlive && target.isAlive) {
          if (voter.votedFor) {
            const oldTarget = updated.players.find(p => p.id === voter.votedFor);
            if (oldTarget) oldTarget.votes = Math.max(0, oldTarget.votes - (voter.isMayor ? 2 : 1));
          }
          voter.votedFor = targetId;
          target.votes += voter.isMayor ? 2 : 1;
        }
        return updated;
      });
    }
  };

  // ─── Day Actions ──────────────────────────────────────────────
  const [gunnerBullets, setGunnerBullets] = useState(2);
  const [sheriffBullets, setSheriffBullets] = useState(2);
  const [deathOrder, setDeathOrder] = useState<string[]>([]); // track death order for Anarchie mode points
  const [detectiveUsed, setDetectiveUsed] = useState(false);
  const [mayorRevealed, setMayorRevealed] = useState(false);
  const [pacifistUsedLocal, setPacifistUsedLocal] = useState(false);
  const [tricksterUsed, setTricksterUsed] = useState(false);
  const [comedianPowers, setComedianPowers] = useState<{ seer: boolean; guard: boolean; witch: boolean }>({ seer: false, guard: false, witch: false });
  const [comedianMode, setComedianMode] = useState<'seer' | 'guard' | 'witch' | null>(null);

  const performDayAction = (action: string, targetId?: string) => {
    if (gameState.phase !== 'day-discussion' && gameState.phase !== 'day-vote') return;
    if (!mePlayer?.isAlive || !myRole) return;

    if (action === 'shoot' && myRole.dayAction === 'shoot' && gunnerBullets > 0 && targetId) {
      // Gunner — shoot a player (instant kill, public)
      const target = gameState.players.find(p => p.id === targetId);
      if (target && target.isAlive) {
        target.isAlive = false;
        setGunnerBullets(prev => prev - 1);
        setMyHunterKillsThisGame(prev => prev + 1);
        setGameState(prev => ({ ...prev, killFeed: [...prev.killFeed, { playerId: target.id, playerName: target.username, role: target.role?.name, cause: 'Abattu par le Gunner', icon: '🔫' }] }));
        const gunnerDisplay = getKillDisplay('Abattu par le Gunner', target.username);
        const gunnerMsg: any = { player: '🔫 Gunner', message: `${profile?.username || 'Vous'} tire sur ${target.username} ! 💥 — ${gunnerDisplay.message}`, time: 'maintenant', color: wolfRed };
        if (gunnerDisplay.media) { gunnerMsg.mediaUrl = gunnerDisplay.media.url; gunnerMsg.mediaType = gunnerDisplay.media.type; }
        setChatMessages(prev => [...prev, gunnerMsg]);
      }
    } else if (action === 'sheriff_shoot' && myRole.dayAction === 'sheriff_shoot' && sheriffBullets > 0 && targetId) {
      // Shérif — shoot a player (instant kill, public). If target is village camp → loses badge
      const target = gameState.players.find(p => p.id === targetId);
      if (target && target.isAlive) {
        // Idiot du Village survives first kill
        if (target.role?.id === 'idiot' && !target.cannotVote) {
          target.cannotVote = true; // survives but loses vote
          setSheriffBullets(prev => prev - 1);
          setChatMessages(prev => [...prev, { player: '🤠 Shérif', message: `${profile?.username || 'Vous'} tire sur ${target.username} ! Mais c'est l'Idiot du Village — il survit ! 🤪 Shérif perd son badge.`, time: 'maintenant', color: wolfRed }]);
          // Sheriff loses badge → becomes villager
          setMyRole(ALL_ROLES.find(r => r.id === 'villager') || null);
          const me = gameState.players.find(p => p.id === myPlayerId);
          if (me) { me.originalRole = me.role; me.role = ALL_ROLES.find(r => r.id === 'villager'); }
        } else {
          target.isAlive = false;
          setSheriffBullets(prev => prev - 1);
          setGameState(prev => ({ ...prev, killFeed: [...prev.killFeed, { playerId: target.id, playerName: target.username, role: target.role?.name, cause: 'Abattu par le Shérif', icon: '🤠' }] }));
          const isVillageCamp = target.role?.camp === 'village';
          if (isVillageCamp) {
            // Shot a villager → loses badge
            setChatMessages(prev => [...prev, { player: '🤠 Shérif', message: `${profile?.username || 'Vous'} tire sur ${target.username} ! 💥 C'était un ${target.role?.name}... Le Shérif perd son badge ! 😞`, time: 'maintenant', color: wolfRed }]);
            setMyRole(ALL_ROLES.find(r => r.id === 'villager') || null);
            const me = gameState.players.find(p => p.id === myPlayerId);
            if (me) { me.originalRole = me.role; me.role = ALL_ROLES.find(r => r.id === 'villager'); }
            setSheriffBullets(0);
          } else {
            setChatMessages(prev => [...prev, { player: '🤠 Shérif', message: `${profile?.username || 'Vous'} tire sur ${target.username} ! 💥 C'était un ${target.role?.name} — bien joué !`, time: 'maintenant', color: villageGreen }]);
          }
        }
        // Check if 0 bullets → auto-degrade
        if (sheriffBullets - 1 <= 0 && myRole.dayAction === 'sheriff_shoot') {
          setMyRole(ALL_ROLES.find(r => r.id === 'villager') || null);
          const me = gameState.players.find(p => p.id === myPlayerId);
          if (me && !me.originalRole) { me.originalRole = me.role; me.role = ALL_ROLES.find(r => r.id === 'villager'); }
        }
      }
    } else if (action === 'investigate' && myRole.dayAction === 'investigate' && !detectiveUsed && targetId) {
      // Détective — compare 2 players (simplified: check 1 player's camp)
      const target = gameState.players.find(p => p.id === targetId);
      if (target && target.role) {
        setDetectiveUsed(true);
        const exposed = Math.random() < 0.4;
        setChatMessages(prev => [...prev, { player: '🕵️ Détective', message: `${target.username} est du camp ${target.role.camp === 'wolf' ? '🐺 LOUP' : target.role.camp === 'solo' ? '⚡ SOLO' : '🏡 VILLAGE'}${exposed ? ' ⚠️ Vous avez été exposé !' : ''}`, time: 'maintenant', color: exposed ? wolfRed : villageGreen }]);
        if (exposed) {
          setChatMessages(prev => [...prev, { player: '🕵️ Système', message: `${profile?.username || 'Vous'} est le Détective !`, time: 'maintenant', color: soloGold }]);
        }
      }
    } else if (action === 'reveal_mayor' && myRole.dayAction === 'reveal_mayor' && !mayorRevealed) {
      // Maire — reveal publicly, vote counts double
      setMayorRevealed(true);
      setActionDone(true);
      setGameState(prev => {
        const me = prev.players.find(p => p.id === myPlayerId);
        if (me) me.isMayor = true;
        return { ...prev };
      });
      setChatMessages(prev => [...prev, { player: '🎖 Maire', message: `${profile?.username || 'Vous'} se révèle comme Maire ! Son vote compte double.`, time: 'maintenant', color: soloGold }]);
    } else if (action === 'prevent_lynch' && myRole.dayAction === 'prevent_lynch' && !pacifistUsedLocal) {
      // Pacifiste — block lynch this day (1x)
      setPacifistUsedLocal(true);
      setGameState(prev => ({ ...prev, pacifistUsed: true }));
      setChatMessages(prev => [...prev, { player: '☮️ Pacifiste', message: 'Le Pacifiste empêche tout lynch aujourd\'hui ! 🕊️', time: 'maintenant', color: villageGreen }]);
    } else if (action === 'mystic_examine' && myRole.dayAction === 'mystic_examine' && targetId) {
      // Loup Mystique — examine a player's role
      const target = gameState.players.find(p => p.id === targetId);
      if (target && target.role && target.isAlive) {
        setChatMessages(prev => [...prev, { player: '🐺🔮 Mystique', message: `${target.username} est : ${target.role.name} ${target.role.icon} (${campLabel(target.role.camp)})`, time: 'maintenant', color: wolfRed }]);
      }
    } else if (action === 'nightmare' && myRole.dayAction === 'nightmare' && !gameState.nightmareUsed && targetId) {
      // Loup Cauchemar — prevent target from voting next day (1x)
      const target = gameState.players.find(p => p.id === targetId);
      if (target && target.isAlive) {
        setGameState(prev => ({ ...prev, nightmareUsed: true, nightmareTarget: targetId }));
        setChatMessages(prev => [...prev, { player: '🐺😱 Cauchemar', message: `${target.username} fera un cauchemar cette nuit ! Il/elle ne pourra pas voter demain.`, time: 'maintenant', color: wolfRed }]);
      }
    } else if (action === 'fake_reveal' && myRole.dayAction === 'fake_reveal' && !tricksterUsed) {
      // Trickster Wolf — fake reveal as village role
      setTricksterUsed(true);
      const fakeRoles = ALL_ROLES.filter(r => r.camp === 'village' && r.id !== 'villager');
      const fakeRole = fakeRoles[Math.floor(Math.random() * fakeRoles.length)];
      setChatMessages(prev => [...prev, { player: `${fakeRole.icon} Révélation`, message: `${profile?.username || 'Vous'} se révèle comme ${fakeRole.name} !`, time: 'maintenant', color: villageGreen }]);
    }
  };

  // ─── Send Chat ──────────────────────────────────────────────────
  const sendChat = () => {
    if (!chatMessage.trim()) return;
    const msg = { player: profile?.username || 'Vous', message: chatMessage, time: 'maintenant', color: accent };
    setChatMessages(prev => [...prev, msg]);
    setChatMessage('');
    // Multiplayer: broadcast chat to other players
    if (dbRoomId && gameChannelRef.current) {
      gameChannelRef.current.send({ type: 'broadcast', event: 'chat', payload: { message: msg } });
    }
    // Solo/bots: auto-respond
    if (!dbRoomId || gameState.players.some(p => p.isBot)) {
      setTimeout(() => {
        const botResponses = ['Je suis d\'accord 🤔', 'Hmm, sus...', 'C\'est pas moi je jure !', 'On devrait voter pour quelqu\'un d\'autre', 'Qui n\'a rien dit encore ? 👀', 'Trust me bro', '🐺🐺🐺', 'Village power 💪'];
        const aliveBots = gameState.players.filter(p => p.isAlive && p.isBot);
        if (aliveBots.length > 0) {
          const bot = aliveBots[Math.floor(Math.random() * aliveBots.length)];
          const botMsg = { player: bot.username, message: botResponses[Math.floor(Math.random() * botResponses.length)], time: 'maintenant', color: t2 };
          setChatMessages(prev => [...prev, botMsg]);
          if (dbRoomId && gameChannelRef.current) {
            gameChannelRef.current.send({ type: 'broadcast', event: 'chat', payload: { message: botMsg } });
          }
          if (!showChat) setUnreadChat(prev => prev + 1);
        }
      }, 1000 + Math.random() * 2000);
    }
  };

  // ─── Role Preview for Lobby ─────────────────────────────────────
  const getRolePreview = () => {
    const wolfCount = playerCount <= 5 ? 1 : playerCount <= 10 ? 2 : playerCount <= 14 ? 3 : playerCount <= 18 ? 4 : playerCount <= 22 ? 5 : playerCount <= 26 ? 6 : 7;
    const soloCount = playerCount < 8 ? 0 : playerCount <= 14 ? 1 : playerCount <= 22 ? 2 : 3;
    const cultCount = playerCount >= 20 ? 1 : 0;
    const variableCount = playerCount < 10 ? 0 : playerCount <= 16 ? 1 : playerCount <= 22 ? 2 : playerCount <= 26 ? 3 : 4;
    const villageCount = playerCount - wolfCount - soloCount - cultCount - variableCount;
    const roles: { icon: string; name: string; count: number; camp: Camp }[] = [
      { icon: '🐺', name: 'Loups', count: wolfCount, camp: 'wolf' },
    ];
    if (gameMode === 'normal') {
      const specials = ['🔮 Voyante', '🧪 Sorcière', '🏹 Chasseur', '🛡️ Garde', '💘 Cupidon', '👧 Petite Fille', '👴 Ancien', '🦊 Renard', '🐻 M. Ours', '🤪 Idiot', '⚔️ Chevalier', '🐐 Bouc', '🕵️ Détective', '🪬 Chamane', '🔫 Gunner', '🤠 Shérif', '🎭 Servante', '🦅 Augure', '☮️ Pacifiste', '⚒ Forgeron', '💤 Sandman', '🔰 Martyr', '💅 Beauté', '🌀 Oracle', '💋 Courtisane', '🎖 Maire', '🤕 Maladroit', '🍵 Alchimiste', '🍻 Ivrogne'];
      const specialCount = Math.min(villageCount, specials.length);
      for (let i = 0; i < specialCount; i++) {
        const parts = specials[i].split(' ');
        roles.push({ icon: parts[0], name: parts.slice(1).join(' '), count: 1, camp: 'village' });
      }
      const simpleVillage = villageCount - specialCount;
      if (simpleVillage > 0) roles.push({ icon: '👤', name: 'Villageois', count: simpleVillage, camp: 'village' });
    } else if (gameMode === 'anarchie') {
      // Anarchie: show all camps mixed — no Villageois Simple
      return [
        { icon: '⚡', name: 'Solo', count: Math.min(soloCount + 3, playerCount), camp: 'solo' as Camp },
        { icon: '🎭', name: 'Variable', count: variableCount, camp: 'variable' as Camp },
        { icon: '🐺', name: 'Loups (spéciaux)', count: wolfCount, camp: 'wolf' as Camp },
        { icon: '🏡', name: 'Village (actifs)', count: Math.max(0, playerCount - wolfCount - soloCount - variableCount - cultCount), camp: 'village' as Camp },
        ...(cultCount > 0 ? [{ icon: '🕯️', name: 'Culte', count: cultCount, camp: 'cult' as Camp }] : []),
      ].filter(r => r.count > 0);
    } else {
      roles.push({ icon: '🏡', name: 'Village (aléatoire)', count: villageCount, camp: 'village' });
    }
    if (soloCount > 0) roles.push({ icon: '⚡', name: 'Solo', count: soloCount, camp: 'solo' });
    if (variableCount > 0) roles.push({ icon: '🎭', name: 'Variable', count: variableCount, camp: 'variable' });
    if (cultCount > 0) roles.push({ icon: '🕯️', name: 'Culte', count: cultCount, camp: 'cult' });
    return roles;
  };

  const mePlayer = gameState.players.find(p => p.id === myPlayerId);
  const alivePlayers = gameState.players.filter(p => p.isAlive);
  const deadPlayers = gameState.players.filter(p => !p.isAlive);
  const isNight = gameState.phase === 'night';

  // ─── Waiting Room: if no DB room (solo mode), simulate bots ──
  useEffect(() => {
    if (view !== 'waitingRoom' || dbRoomId) return; // Skip if real multiplayer
    const botNames = BOT_NAMES.slice();
    let idx = 0;
    const interval = setInterval(() => {
      if (idx >= 3) { clearInterval(interval); return; }
      const name = botNames[idx];
      const color = BOT_AVATARS[idx + 1] || '🟢';
      setWaitingPlayers(prev => {
        if (prev.length >= 45) return prev;
        return [...prev, { id: `wb${idx}`, name, color, isHost: false }];
      });
      idx++;
    }, 2000 + Math.random() * 3000);
    return () => clearInterval(interval);
  }, [view, dbRoomId]);

  // ═══════════════════════════════════════════════════════════════════
  // ─── ROLE ENCYCLOPEDIA ─────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════
  if (view === 'roles') {
    const filteredRoles = roleFilter === 'all' ? ALL_ROLES : ALL_ROLES.filter(r => r.camp === roleFilter);
    return (
      <div className="h-full flex flex-col" style={{ background: bg1 }}>
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ background: bg2, borderColor: border }}>
          <button onClick={() => setView('lobby')} className="p-2 rounded-lg"><ArrowLeft size={18} style={{ color: t1 }} /></button>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: t1 }}>📖 Encyclopédie des Rôles</h2>
          <div style={{ width: 34 }} />
        </div>
        <div className="flex gap-2 px-4 py-3 overflow-x-auto" style={{ borderBottom: `1px solid ${border}` }}>
          {([{ key: 'all' as const, label: `Tous (${ALL_ROLES.length})` }, { key: 'wolf' as const, label: `🐺 Loups (${ALL_ROLES.filter(r => r.camp === 'wolf').length})` }, { key: 'village' as const, label: `🏡 Village (${ALL_ROLES.filter(r => r.camp === 'village').length})` }, { key: 'solo' as const, label: `⚡ Solo (${ALL_ROLES.filter(r => r.camp === 'solo').length})` }, { key: 'variable' as const, label: `🎭 Variable (${ALL_ROLES.filter(r => r.camp === 'variable').length})` }, { key: 'cult' as const, label: `🕯️ Culte (${ALL_ROLES.filter(r => r.camp === 'cult').length})` }]).map(tab => (
            <button key={tab.key} onClick={() => setRoleFilter(tab.key)} className="px-3 py-1.5 rounded-full whitespace-nowrap" style={{ background: roleFilter === tab.key ? accent : bg3, color: roleFilter === tab.key ? '#fff' : t2, fontSize: '12px', fontWeight: 600, border: `1px solid ${roleFilter === tab.key ? accent : border}` }}>
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredRoles.map(role => (
              <button key={role.id} onClick={() => setShowRoleDetail(role)} className="rounded-xl p-4 text-left" style={{ background: bg2, border: `1px solid ${border}` }}>
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center rounded-xl flex-shrink-0" style={{ width: 52, height: 52, fontSize: 28, background: campBg(role.camp) }}>{role.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span style={{ fontSize: 14, fontWeight: 700, color: t1 }}>{role.name}</span>
                      <span className="px-2 py-0.5 rounded-full" style={{ fontSize: 9, fontWeight: 700, background: campBg(role.camp), color: campColor(role.camp) }}>{campLabel(role.camp)}</span>
                    </div>
                    <p style={{ fontSize: 11, color: t2, lineHeight: 1.5 }} className="line-clamp-2">{role.description}</p>
                    <div className="mt-2 px-2 py-1 rounded-md inline-block" style={{ background: accentSoft }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: accent }}>💫 {role.power}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
        {showRoleDetail && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
            <div className="rounded-2xl p-6 w-full max-w-md relative" style={{ background: bg2, border: `2px solid ${campColor(showRoleDetail.camp)}30` }}>
              <button onClick={() => setShowRoleDetail(null)} className="absolute top-4 right-4 p-1 rounded-lg" style={{ background: bg3 }}><X size={16} style={{ color: t2 }} /></button>
              <div className="text-center mb-4">
                <div className="mx-auto flex items-center justify-center rounded-2xl mb-3" style={{ width: 80, height: 80, fontSize: 44, background: `linear-gradient(135deg, ${campBg(showRoleDetail.camp)}, ${campColor(showRoleDetail.camp)}20)`, border: `2px solid ${campColor(showRoleDetail.camp)}40` }}>{showRoleDetail.icon}</div>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: t1 }}>{showRoleDetail.name}</h3>
                <span className="inline-block px-3 py-1 rounded-full mt-2" style={{ fontSize: 11, fontWeight: 700, background: campBg(showRoleDetail.camp), color: campColor(showRoleDetail.camp) }}>{campLabel(showRoleDetail.camp)}</span>
              </div>
              <p style={{ fontSize: 13, color: t1, lineHeight: 1.6, marginBottom: 12 }}>{showRoleDetail.description}</p>
              <div className="rounded-xl p-3 mb-3" style={{ background: accentSoft, border: `1px solid ${accent}30` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: accent, marginBottom: 4 }}>💫 Pouvoir</div>
                <div style={{ fontSize: 12, color: t1 }}>{showRoleDetail.power}</div>
              </div>
              {showRoleDetail.tips && (
                <div className="rounded-xl p-3" style={{ background: `${soloGold}12`, border: `1px solid ${soloGold}30` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: soloGold, marginBottom: 4 }}>💡 Conseils</div>
                  <div style={{ fontSize: 12, color: t1 }}>{showRoleDetail.tips}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // ─── PROFILE ───────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════
  if (view === 'profile') {
    const winRate = myStats && myStats.games_played > 0 ? Math.round((myStats.games_won / myStats.games_played) * 100) : 0;
    const myLeaderboardPos = leaderboardData.findIndex(p => p.id === user?.id) + 1;
    const medal = myLeaderboardPos > 0 ? getMedal(myLeaderboardPos) : null;

    // Role stats from history
    const roleStatsMap = new Map<string, { icon: string; name: string; played: number; won: number }>();
    myHistory.forEach(h => {
      const key = h.role_name;
      const existing = roleStatsMap.get(key);
      if (existing) { existing.played++; if (h.won) existing.won++; }
      else roleStatsMap.set(key, { icon: h.role_icon, name: h.role_name, played: 1, won: h.won ? 1 : 0 });
    });
    const roleStats = [...roleStatsMap.values()]
      .map(r => ({ ...r, winRate: r.played > 0 ? Math.round((r.won / r.played) * 100) : 0 }))
      .sort((a, b) => b.played - a.played).slice(0, 10);

    return (
      <div className="h-full flex flex-col" style={{ background: bg1 }}>
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ background: bg2, borderColor: border }}>
          <button onClick={() => setView('lobby')} className="p-2 rounded-lg"><ArrowLeft size={18} style={{ color: t1 }} /></button>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: t1 }}>Mon Profil</h2>
          <div style={{ width: 34 }} />
        </div>
        <div className="flex gap-2 px-4 py-3 overflow-x-auto" style={{ borderBottom: `1px solid ${border}` }}>
          {([{ key: 'public' as const, label: '👤 Public' }, { key: 'stats' as const, label: '📊 Stats' }, { key: 'roles' as const, label: '🎭 Rôles' }, { key: 'history' as const, label: '📜 Historique' }]).map(tab => (
            <button key={tab.key} onClick={() => setProfileTab(tab.key)} className="px-3 py-1.5 rounded-full whitespace-nowrap" style={{ background: profileTab === tab.key ? accent : bg3, color: profileTab === tab.key ? '#fff' : t2, fontSize: 12, fontWeight: 600, border: `1px solid ${profileTab === tab.key ? accent : border}` }}>
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {profileTab === 'public' && (
            <>
              <div className="rounded-xl p-5 text-center" style={{ background: bg2, border: `1px solid ${border}` }}>
                <span style={{ fontSize: 48 }}>{rank.icon}</span>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: t1, marginTop: 8 }}>🟣 {profile?.username || 'Vous'}</h3>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span className="px-3 py-1 rounded-full" style={{ fontSize: 12, fontWeight: 700, background: `${rank.color}20`, color: rank.color }}>{rank.icon} {rank.name}</span>
                  {medal && <span className="px-3 py-1 rounded-full" style={{ fontSize: 12, fontWeight: 700, background: `${medal.color}20`, color: medal.color }}>{medal.emoji} {medal.name}</span>}
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, color: accent, marginTop: 12 }}>{playerPoints} pts</div>
                {nextRank && (
                  <>
                    <div style={{ fontSize: 11, color: t2, marginTop: 4, marginBottom: 8 }}>{nextRank.min - playerPoints} pts pour {nextRank.name}</div>
                    <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: bg3 }}>
                      <div className="h-full rounded-full" style={{ width: `${((playerPoints - rank.min) / (nextRank.min - rank.min)) * 100}%`, background: `linear-gradient(90deg, ${rank.color}, ${nextRank.color})` }} />
                    </div>
                  </>
                )}
              </div>
              <div className="rounded-xl p-4" style={{ background: bg2, border: `1px solid ${border}` }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: t1, marginBottom: 12 }}>🎖️ Badges ({computedBadges.filter(b => b.unlocked).length}/{computedBadges.length})</h3>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                  {computedBadges.map(badge => {
                    const pct = Math.min(100, Math.round((badge.value / badge.target) * 100));
                    return (
                      <div key={badge.id} className="rounded-xl p-3 text-center" style={{ background: badge.unlocked ? bg3 : 'transparent', border: `1px solid ${badge.unlocked ? border : 'rgba(255,255,255,0.03)'}`, opacity: badge.unlocked ? 1 : 0.45 }}>
                        <div style={{ fontSize: 24, marginBottom: 4, filter: badge.unlocked ? 'none' : 'grayscale(1)' }}>{badge.unlocked ? badge.emoji : '🔒'}</div>
                        <div style={{ fontSize: 10, fontWeight: 600, color: badge.unlocked ? t1 : t3 }}>{badge.name}</div>
                        {badge.unlocked ? (
                          <div style={{ fontSize: 9, color: '#a855f7', marginTop: 2 }}>✓ Débloqué</div>
                        ) : (
                          <>
                            <div style={{ fontSize: 9, color: t3, marginTop: 2 }}>{badge.value}/{badge.target}</div>
                            <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 4, marginTop: 4, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: '#a855f7', borderRadius: 4, transition: 'width 0.3s' }} />
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
          {profileTab === 'stats' && (
            <div className="rounded-xl p-4" style={{ background: bg2, border: `1px solid ${border}` }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: t1, marginBottom: 12 }}>📊 Statistiques</h3>
              {!myStats ? (
                <p style={{ fontSize: 12, color: t3, textAlign: 'center', padding: '16px 0' }}>Aucune partie jouée encore.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Parties jouées', value: myStats.games_played, color: t1 },
                    { label: 'Parties gagnées', value: myStats.games_won, color: villageGreen },
                    { label: 'Win rate', value: `${winRate}%`, color: accent },
                    { label: 'Kills totaux', value: myStats.total_kills, color: wolfRed },
                    { label: 'Meilleur streak', value: `🔥 ${myStats.best_streak}`, color: soloGold },
                    { label: 'Fois sauvé', value: myStats.times_saved, color: villageGreen },
                    { label: 'Élu Maire', value: `👑 ${myStats.times_elected_mayor}`, color: soloGold },
                  ].map((stat, i) => (
                    <div key={i} className="rounded-lg p-3" style={{ background: bg3, border: `1px solid ${border}` }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: stat.color }}>{stat.value}</div>
                      <div style={{ fontSize: 11, color: t2 }}>{stat.label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {profileTab === 'roles' && (
            <div className="rounded-xl p-4" style={{ background: bg2, border: `1px solid ${border}` }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: t1, marginBottom: 12 }}>🎭 Stats par rôle</h3>
              {roleStats.length === 0 ? (
                <p style={{ fontSize: 12, color: t3, textAlign: 'center', padding: '16px 0' }}>Aucune partie jouée encore.</p>
              ) : (
                <div className="space-y-2">
                  {roleStats.map((rs, i) => (
                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg" style={{ background: bg3 }}>
                      <span style={{ fontSize: 24 }}>{rs.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div style={{ fontSize: 13, fontWeight: 600, color: t1 }}>{rs.name}</div>
                        <div style={{ fontSize: 11, color: t2 }}>{rs.played} jouées · {rs.won} gagnées</div>
                      </div>
                      <div className="text-right">
                        <div style={{ fontSize: 15, fontWeight: 700, color: rs.winRate >= 60 ? villageGreen : rs.winRate >= 40 ? soloGold : wolfRed }}>{rs.winRate}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {profileTab === 'history' && (
            <div className="rounded-xl p-4" style={{ background: bg2, border: `1px solid ${border}` }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: t1, marginBottom: 12 }}>📜 Dernières parties</h3>
              {myHistory.length === 0 ? (
                <p style={{ fontSize: 12, color: t3, textAlign: 'center', padding: '16px 0' }}>Aucune partie jouée encore.</p>
              ) : (
                <div className="space-y-2">
                  {myHistory.map((h, i) => (
                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg" style={{ background: bg3 }}>
                      <span style={{ fontSize: 24 }}>{h.role_icon}</span>
                      <div className="flex-1 min-w-0">
                        <div style={{ fontSize: 13, fontWeight: 600, color: t1 }}>{h.role_name}</div>
                        <div style={{ fontSize: 11, color: t2 }}>{new Date(h.played_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</div>
                      </div>
                      <div className="text-right">
                        <div style={{ fontSize: 12, fontWeight: 700, color: h.won ? villageGreen : wolfRed }}>{h.won ? '✓ Victoire' : '✗ Défaite'}</div>
                        <div style={{ fontSize: 11, color: accent }}>+{h.points_earned} pts</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // ─── LEADERBOARD ───────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════
  if (view === 'leaderboard') {
    // Build from real DB data
    const lbWithPos = leaderboardData.map((p, i) => ({ ...p, position: i + 1, isMe: p.id === user?.id }));
    const top3 = lbWithPos.slice(0, 3);
    const rest = lbWithPos.slice(3);
    // Podium order: #2, #1, #3
    const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3.length === 2 ? [top3[1], top3[0], null] : top3.length === 1 ? [null, top3[0], null] : [null, null, null];
    const podiumBorders = ['#c0c0c0', '#ffd700', '#cd7f32'];
    const podiumHeights = [55, 75, 40];
    const podiumBgs = ['linear-gradient(180deg,#d0d0d0,#a0a0a0)', 'linear-gradient(180deg,#ffd700,#c8a600)', 'linear-gradient(180deg,#cd7f32,#a0622a)'];
    const podiumMedals = ['🥈', '🥇', '🥉'];
    const podiumRadius = ['8px 0 0 0', '8px 8px 0 0', '0 8px 0 0'];
    const podiumNums = ['2', '1', '3'];
    const podiumNumBgs = ['#c0c0c0', '#ffd700', '#cd7f32'];
    const podiumNumColors = ['#fff', '#000', '#fff'];
    const podiumSizes = [40, 48, 40];

    return (
      <div className="h-full flex flex-col" style={{ background: bg1 }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ background: bg2, borderColor: border }}>
          <button onClick={() => setView('lobby')} className="p-2 rounded-lg"><ArrowLeft size={18} style={{ color: t1 }} /></button>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: t1 }}>🏆 Classement</h2>
          <button onClick={fetchLeaderboard} className="p-2 rounded-lg" style={{ background: bg3 }}>
            <RotateCcw size={14} style={{ color: t2 }} />
          </button>
        </div>

        {leaderboardData.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <span style={{ fontSize: 40 }}>🏆</span>
            <p style={{ fontSize: 14, color: t3 }}>Aucun joueur encore. Soyez le premier !</p>
          </div>
        ) : (
          <>
            {/* Podium */}
            <div className="mx-auto pt-5 pb-0 px-4" style={{ maxWidth: 360, width: '100%' }}>
              <div className="flex items-end">
                {podiumOrder.map((p, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center">
                    {idx === 1 && <div style={{ fontSize: 18, marginBottom: -2 }}>👑</div>}
                    {p ? (
                      <>
                        <div className="relative mb-1">
                          <div className={`rounded-full flex items-center justify-center overflow-hidden ${p.isMe ? 'ring-2 ring-purple-400' : ''}`}
                            style={{ width: podiumSizes[idx], height: podiumSizes[idx], background: `${podiumBorders[idx]}25`, border: `2.5px solid ${podiumBorders[idx]}` }}>
                            {p.avatar_url
                              ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                              : <span style={{ fontSize: idx === 1 ? 20 : 16, fontWeight: 700, color: '#fff' }}>{p.username[0]?.toUpperCase()}</span>}
                          </div>
                          <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center font-black"
                            style={{ fontSize: 9, background: podiumNumBgs[idx], color: podiumNumColors[idx], border: `2px solid ${bg1}` }}>{podiumNums[idx]}</div>
                        </div>
                        <div className="truncate w-full text-center" style={{ fontSize: 11, fontWeight: 700, color: p.isMe ? accent : t1 }}>{p.username}</div>
                        <div style={{ fontSize: 10, color: podiumBorders[idx], fontWeight: 600, marginBottom: 4 }}>{p.total_points.toLocaleString()}</div>
                      </>
                    ) : (
                      <div style={{ height: podiumSizes[idx] + 30 }} />
                    )}
                    <div className="w-full flex items-end justify-center" style={{ height: podiumHeights[idx], background: podiumBgs[idx], borderRadius: podiumRadius[idx] }}>
                      <span style={{ fontSize: 16, marginBottom: 5 }}>{podiumMedals[idx]}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Player List */}
            <div className="flex-1 overflow-y-auto">
              <div className="mx-auto" style={{ maxWidth: 480 }}>
                {rest.map(p => (
                  <div key={p.id}
                    className="flex items-center px-5 py-3.5 border-b"
                    style={{
                      borderColor: 'rgba(255,255,255,0.04)',
                      background: p.isMe ? `${accent}15` : 'transparent',
                      borderLeft: p.isMe ? `3px solid ${accent}` : '3px solid transparent',
                    }}>
                    <span style={{ width: 36, fontSize: 14, fontWeight: 700, color: p.isMe ? accent : t3 }}>{p.position}</span>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0" style={{ background: bg3 }}>
                        {p.avatar_url
                          ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                          : <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{p.username[0]?.toUpperCase()}</span>}
                      </div>
                      <span className="truncate" style={{ fontSize: 14, fontWeight: p.isMe ? 700 : 500, color: p.isMe ? accent : t1 }}>{p.username}</span>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: p.isMe ? accent : t2 }}>{p.total_points.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  if (view === 'waitingRoom') {
    const minPlayers = 4;
    const maxPlayers = playerCount;
    const canStart = waitingPlayers.length >= minPlayers;

    return (
      <div className="h-full flex flex-col" style={{ background: bg1 }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ background: bg2, borderColor: border }}>
          <button onClick={async () => {
            // Leave room in DB
            if (dbRoomId && user) {
              await supabase.from('game_players').delete().eq('room_id', dbRoomId).eq('user_id', user.id);
              if (isHost) await supabase.from('game_rooms').delete().eq('id', dbRoomId);
            }
            setView('lobby'); setMultiplayerMode('none'); setRoomCode(''); setWaitingPlayers([]); setDbRoomId(null); setIsHost(false);
          }} className="p-2 rounded-lg" style={{ background: bg3 }}>
            <ArrowLeft size={18} style={{ color: t1 }} />
          </button>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: t1 }}>En attente...</h2>
          <div style={{ width: 34 }} />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-lg mx-auto w-full">
          {/* Room Code Card */}
          <div className="rounded-xl p-5 text-center" style={{ background: bg2, border: `1px solid ${accent}30` }}>
            <div style={{ fontSize: 13, color: t2, marginBottom: 8 }}>En attente de joueurs...</div>
            <div className="inline-block px-6 py-3 rounded-xl mb-4" style={{ background: `${accent}15`, border: `2px solid ${accent}40` }}>
              <span style={{ fontSize: 28, fontWeight: 800, color: accent, letterSpacing: '8px', fontFamily: 'monospace' }}>{roomCode}</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <button onClick={() => navigator.clipboard.writeText(roomCode)} className="px-4 py-2 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-2" style={{ background: bg3, color: t2, border: `1px solid ${border}` }}>
                📋 Copier le code
              </button>
              <button
                onClick={async () => {
                  if (!user) return;
                  const modeLabel = gameMode === 'chaos' ? 'Chaos' : gameMode === 'anarchie' ? 'Anarchie' : 'Normal';
                  const { error } = await supabase.from('feed_posts').insert({
                    user_id: user.id,
                    content: `🐺 Rejoignez ma partie de Loup-Garou ! Code: ${roomCode}`,
                    type: 'game',
                    images: [],
                    embed_type: 'game',
                    embed_title: `🐺 Loup-Garou — ${modeLabel}`,
                    embed_subtitle: `${maxPlayers} joueurs · Code: ${roomCode}`,
                    embed_icon: '🐺',
                  });
                  if (error) {
                    setFeedShareError(error.message);
                    setTimeout(() => setFeedShareError(''), 3000);
                  } else {
                    setFeedShareCopied(true);
                    setTimeout(() => setFeedShareCopied(false), 2500);
                  }
                }}
                className="px-4 py-2 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-2"
                style={{ background: feedShareCopied ? 'rgba(34,197,94,0.15)' : `${accent}20`, color: feedShareCopied ? '#22c55e' : accent, border: `1px solid ${feedShareCopied ? 'rgba(34,197,94,0.4)' : `${accent}40`}` }}
              >
                <Share2 size={14} /> {feedShareCopied ? 'Partagé !' : 'Partager sur le feed'}
              </button>
            </div>
            {feedShareError && <div style={{ fontSize: 11, color: wolfRed, marginTop: 6 }}>⚠ {feedShareError}</div>}
            <div style={{ fontSize: 11, color: accent, marginTop: 8, opacity: 0.7 }}>Partagez ce code avec vos amis</div>
          </div>

          {/* Players List */}
          <div className="rounded-xl" style={{ background: bg2, border: `1px solid ${border}` }}>
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: border }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: t1 }}>Joueurs ({waitingPlayers.length}/{maxPlayers})</span>
              <span className="px-2 py-0.5 rounded-full" style={{ fontSize: 10, fontWeight: 700, background: `${soloGold}20`, color: soloGold }}>min {minPlayers}</span>
            </div>
            <div className="divide-y" style={{ borderColor: border }}>
              {waitingPlayers.map(p => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg" style={{ background: p.isHost ? `linear-gradient(135deg, ${accent}, #8b5cf6)` : bg3 }}>
                    {p.isHost ? '🟣' : p.color}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: p.isHost ? 700 : 500, color: p.isHost ? accent : t1, flex: 1 }}>{p.name}</span>
                  {p.isHost && (
                    <span className="px-2.5 py-1 rounded-lg flex items-center gap-1" style={{ fontSize: 11, fontWeight: 700, background: `${soloGold}20`, color: soloGold }}>
                      👑 Hôte
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Start Button */}
          <div className="rounded-xl p-4 text-center" style={{ background: bg2, border: `1px solid ${border}` }}>
            <button
              onClick={async () => {
                setPlayerCount(waitingPlayers.length);
                startGame();
              }}
              disabled={!canStart || (dbRoomId != null && !isHost)}
              className="w-full py-3.5 rounded-xl font-bold text-sm transition-all inline-flex items-center justify-center gap-2"
              style={{
                background: canStart ? `linear-gradient(135deg, ${accent}, #8b5cf6)` : bg3,
                color: canStart ? '#fff' : t3,
                opacity: canStart ? 1 : 0.6,
                cursor: canStart ? 'pointer' : 'not-allowed',
              }}
            >
              ▶ Démarrer
            </button>
            {!canStart && (
              <div className="flex items-center justify-center gap-1.5 mt-3" style={{ fontSize: 12, color: soloGold }}>
                ⚠ Il faut au moins {minPlayers} joueurs
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // ─── HUNTER SHOT ───────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════
  if (view === 'hunterShot') {
    const targets = gameState.players.filter(p => p.isAlive && p.id !== myPlayerId);
    return (
      <div className="h-full flex flex-col items-center justify-center p-6" style={{ background: bg1 }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🏹</div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: t1, marginBottom: 8 }}>Tir du Chasseur</h2>
        <p style={{ fontSize: 13, color: t2, marginBottom: 24, textAlign: 'center' }}>Vous êtes éliminé ! Choisissez un joueur à emporter avec vous.</p>
        <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
          {targets.map(p => (
            <button key={p.id} onClick={() => {
              const target = gameState.players.find(pl => pl.id === p.id);
              if (target) {
                target.isAlive = false;
                setMyHunterKillsThisGame(prev => prev + 1);
                setChatMessages(prev => [...prev, { player: '🏹 Chasseur', message: `Tire sur ${target.username} !`, time: 'maintenant', color: soloGold }]);
              }
              const winner = checkWinCondition(gameState.players);
              if (winner) { setGameState(prev => ({ ...prev, winner })); setView('end'); }
              else { setView('game'); }
            }} className="rounded-xl p-4 text-center transition-all hover:scale-105" style={{ background: bg2, border: `1px solid ${border}` }}>
              <div className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center" style={{ background: bg3, fontSize: 20 }}>{p.avatar}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: t1 }}>{p.username}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // nightResults view removed — results now appear directly in chat

  // ═══════════════════════════════════════════════════════════════════
  // ─── END SCREEN ────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════
  if (view === 'end') {
    // ── ANARCHIE MODE END SCREEN ──
    if (gameMode === 'anarchie') {
      const survivor = gameState.players.find(p => p.isAlive);
      const isWinner = survivor?.id === myPlayerId;
      const totalPlayers = gameState.players.length;

      // Calculate Anarchie points
      // Last survivor → 100 pts
      // 2nd to last → 50 pts
      // Kills confirmed → +10 pts per kill (from killFeed)
      // Survival → +2 pts per round survived
      // Solo condition met → +20 pts bonus
      const myKills = gameState.killFeed.filter(k => {
        // Attribute kills to player (approximation: gunner/sheriff direct kills, wolf kills for wolves)
        return false; // kills are tracked by cause, hard to attribute — simplified to 0 for bots
      }).length;
      const roundsSurvived = mePlayer?.isAlive ? gameState.day : deathOrder.indexOf(myPlayerId || '') !== -1
        ? Math.max(1, Math.ceil((deathOrder.indexOf(myPlayerId || '') + 1) / 2))
        : gameState.day;
      const isSecondToLast = deathOrder.length > 0 && deathOrder[deathOrder.length - 1] === myPlayerId;
      const soloConditionMet = (() => {
        if (!mePlayer?.role) return false;
        if (mePlayer.role.id === 'fool' && !mePlayer.isAlive) return true; // Lynched = win
        if (mePlayer.role.id === 'angel' && !mePlayer.isAlive && gameState.day <= 1) return true;
        return false;
      })();

      const anarchiePoints = (() => {
        let pts = 0;
        if (isWinner) pts += 100;
        else if (isSecondToLast) pts += 50;
        pts += roundsSurvived * 2;
        if (soloConditionMet) pts += 20;
        return pts;
      })();

      const anarchieColor = '#f97316'; // orange for anarchie

      return (
        <div className="h-full flex flex-col" style={{ background: bg1 }}>
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 text-center" style={{ background: `linear-gradient(180deg, ${anarchieColor}15, transparent)` }}>
              <div style={{ fontSize: 56, marginBottom: 8 }}>{isWinner ? '👑' : '💀'}</div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: anarchieColor }}>
                {isWinner ? `${survivor?.username} est le dernier survivant !` : 'Vous avez été éliminé !'}
              </h2>
              <div style={{ fontSize: 14, color: isWinner ? villageGreen : wolfRed, fontWeight: 600, marginTop: 8 }}>
                {isWinner ? '👑 LAST MAN STANDING !' : `Éliminé au round ${roundsSurvived}`}
              </div>
              <div className="mt-4 inline-block px-4 py-2 rounded-full" style={{ background: `${anarchieColor}20` }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: anarchieColor }}>+{anarchiePoints} pts</span>
              </div>
              {/* Points breakdown */}
              <div className="mt-3 flex flex-col items-center gap-1">
                {isWinner && <div style={{ fontSize: 11, color: villageGreen }}>+100 Dernier survivant</div>}
                {isSecondToLast && <div style={{ fontSize: 11, color: soloGold }}>+50 Avant-dernier</div>}
                <div style={{ fontSize: 11, color: t2 }}>+{roundsSurvived * 2} Survie ({roundsSurvived} rounds)</div>
                {soloConditionMet && <div style={{ fontSize: 11, color: soloPurple }}>+20 Condition solo remplie</div>}
              </div>
            </div>
            {/* Classement Anarchie */}
            <div className="px-4 pb-4">
              <h3 style={{ fontSize: 13, fontWeight: 700, color: t1, marginBottom: 12 }}>🏆 Classement</h3>
              <div className="space-y-2">
                {/* Winner first, then reverse death order (last to die = 2nd place) */}
                {[
                  ...(survivor ? [survivor] : []),
                  ...deathOrder.slice().reverse().map(id => gameState.players.find(p => p.id === id)).filter(Boolean)
                ].map((p, i) => p && (
                  <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-lg" style={{ background: bg2, border: `1px solid ${i === 0 ? anarchieColor : border}` }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: i === 0 ? anarchieColor : i === 1 ? soloGold : t2, width: 24, textAlign: 'center' }}>
                      {i === 0 ? '👑' : i === 1 ? '🥈' : `#${i + 1}`}
                    </div>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: bg3, fontSize: 16 }}>{p.avatar}</div>
                    <div className="min-w-0 flex-1">
                      <div style={{ fontSize: 12, fontWeight: 600, color: p.id === myPlayerId ? accent : t1 }} className="truncate">{p.username}</div>
                      <div style={{ fontSize: 10, color: campColor(p.role?.camp || 'village') }}>{p.role?.name} {p.role?.icon}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-3 p-4 border-t" style={{ borderColor: border }}>
            <button onClick={() => {
              setView('lobby');
              setGameState(prev => ({ ...prev, players: [], winner: null }));
              setDbRoomId(null); setRoomCode(''); setMultiplayerMode('none'); setWaitingPlayers([]); setIsHost(false); setDeathOrder([]);
            }} className="flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2" style={{ background: bg3, color: t1 }}>
              <Home size={16} /> Menu
            </button>
            <button onClick={() => {
              setGameState(prev => ({ ...prev, players: [], winner: null }));
              setDbRoomId(null); setRoomCode(''); setMultiplayerMode('none'); setWaitingPlayers([]); setIsHost(false); setMyRole(null); setDeathOrder([]);
              setView('lobby');
            }} className="flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2" style={{ background: anarchieColor, color: '#fff' }}>
              <RotateCcw size={16} /> Rejouer
            </button>
          </div>
        </div>
      );
    }

    // ── NORMAL / CHAOS END SCREEN ──
    // Solo neutre (Ninja) wins if alive at end regardless of who wins
    const isNinjaSurvivor = mePlayer?.role?.id === 'ninja' && mePlayer?.isAlive;
    // Lone Wolf wins only if last wolf alive when wolves win
    const isLoneWolfWin = mePlayer?.role?.id === 'lone-wolf' && gameState.winner === 'wolf' && mePlayer?.isAlive &&
      gameState.players.filter(p => p.isAlive && p.role?.camp === 'wolf' && p.role?.id !== 'lone-wolf').length === 0;
    const won = isNinjaSurvivor || isLoneWolfWin ||
      (gameState.winner === 'lovers' ? mePlayer?.isLover : mePlayer?.role?.camp === gameState.winner || (mePlayer?.isCultist && gameState.winner === 'cult'));

    // Determine display winner — for solo winners, show the surviving side
    const displayWinner = (() => {
      if (gameState.winner === 'solo') {
        // Check who actually survived
        const alive = gameState.players.filter(p => p.isAlive);
        const wolvesAlive = alive.filter(p => p.role?.camp === 'wolf' || p.role?.id === 'lone-wolf');
        if (wolvesAlive.length > 0) return 'wolf';
        return 'village';
      }
      return gameState.winner;
    })();

    const winColor = displayWinner === 'wolf' ? wolfRed : displayWinner === 'village' ? villageGreen : displayWinner === 'cult' ? cultPink : displayWinner === 'lovers' ? '#ec4899' : soloGold;
    const winKey = displayWinner === 'wolf' ? 'wolf_wins' : displayWinner === 'village' ? 'village_wins' : displayWinner === 'cult' ? 'cult_wins' : displayWinner === 'lovers' ? 'lovers_win' : 'village_wins';
    const winFallback = displayWinner === 'wolf' ? '🐺 Les Loups gagnent !' : displayWinner === 'village' ? '🏡 Le Village gagne !' : displayWinner === 'cult' ? '🕯️ Le Culte gagne !' : displayWinner === 'lovers' ? '💕 Les Amoureux gagnent !' : '🏡 Le Village gagne !';
    const winLabel = getNotifMessage(winKey, winFallback);
    const winMedia = getNotifMedia(winKey);

    // ── Points System ──
    // Base: 5 pts for winners, 0 for losers
    // Solo roles special rules:
    //   - Dead + camp won + didn't use skill = 1 pt
    //   - Dead + camp won + used skill = 2 pts
    //   - Sole survivor (true solo win) = 5 pts
    const isSoloRole = mePlayer?.role?.camp === 'solo' || mePlayer?.role?.id === 'lone-wolf';
    const usedSkill = actionDone || mePlayer?.originalRole; // approximation: actionDone means they used their skill at least once
    const pointsEarned = (() => {
      if (won) {
        if (isSoloRole && mePlayer?.isAlive) return 5; // sole survivor solo
        if (isSoloRole && !mePlayer?.isAlive) return usedSkill ? 2 : 1; // dead solo, camp won
        return 5; // normal winner
      }
      return 0; // loser
    })();

    return (
      <div className="h-full flex flex-col" style={{ background: bg1 }}>
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 text-center" style={{ background: `linear-gradient(180deg, ${winColor}15, transparent)` }}>
            <div style={{ fontSize: 56, marginBottom: 8 }}>{displayWinner === 'wolf' ? '🐺' : displayWinner === 'village' ? '🏡' : displayWinner === 'cult' ? '🕯️' : displayWinner === 'lovers' ? '💕' : '🏡'}</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: winColor }}>{winLabel}</h2>
            {winMedia && (winMedia.type === 'image' || winMedia.type === 'gif') && (
              <img src={winMedia.url} alt="" className="mx-auto mt-3 max-w-[240px] max-h-[140px] rounded-xl object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            )}
            <div style={{ fontSize: 14, color: won ? villageGreen : wolfRed, fontWeight: 600, marginTop: 8 }}>{won ? '🎉 Victoire !' : '😔 Défaite...'}</div>
            <div className="mt-4 inline-block px-4 py-2 rounded-full" style={{ background: accentSoft }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: accent }}>+{pointsEarned} pts</span>
            </div>
          </div>
          <div className="px-4 pb-4">
            <h3 style={{ fontSize: 13, fontWeight: 700, color: t1, marginBottom: 12 }}>🎭 Tous les rôles</h3>
            <div className="grid grid-cols-2 gap-2">
              {gameState.players.map(p => (
                <div key={p.id} className="flex items-center gap-2.5 p-2.5 rounded-lg" style={{ background: bg2, border: `1px solid ${border}`, opacity: p.isAlive ? 1 : 0.5 }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: bg3, fontSize: 16 }}>{p.avatar}</div>
                  <div className="min-w-0">
                    <div style={{ fontSize: 12, fontWeight: 600, color: p.id === myPlayerId ? accent : t1 }} className="truncate">{p.username}</div>
                    <div style={{ fontSize: 10, color: campColor(p.role?.camp || 'village') }}>{p.role?.name}</div>
                  </div>
                  {!p.isAlive && <span style={{ fontSize: 12 }}>💀</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 p-4 border-t" style={{ borderColor: border }}>
          <button onClick={() => {
            setView('lobby');
            setGameState(prev => ({ ...prev, players: [], winner: null }));
            setDbRoomId(null);
            setRoomCode('');
            setMultiplayerMode('none');
            setWaitingPlayers([]);
            setIsHost(false);
          }} className="flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2" style={{ background: bg3, color: t1 }}>
            <Home size={16} /> Menu
          </button>
          <button onClick={() => {
            // Reset state and go back to lobby — players must re-join
            setGameState(prev => ({ ...prev, players: [], winner: null }));
            setDbRoomId(null);
            setRoomCode('');
            setMultiplayerMode('none');
            setWaitingPlayers([]);
            setIsHost(false);
            setMyRole(null);
            setView('lobby');
          }} className="flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2" style={{ background: accent, color: '#fff' }}>
            <RotateCcw size={16} /> Rejouer
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // ─── ROLE REVEAL ───────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════
  if (view === 'reveal' && myRole) {
    const cc = campColor(myRole.camp);
    return (
      <div className="h-full flex flex-col items-center justify-center p-6" style={{ background: `radial-gradient(ellipse at center, ${cc}08 0%, ${bg1} 70%)` }}>
        <div className={`transition-all duration-700 ${revealFlipped ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}>
          <div className="rounded-2xl p-6 text-center w-72" style={{ background: bg2, border: `2px solid ${cc}35`, boxShadow: `0 0 60px ${cc}12` }}>
            {/* Role icon in circle */}
            <div className="mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ background: `${cc}15`, border: `3px solid ${cc}40` }}>
              <span style={{ fontSize: 40 }}>{myRole.icon}</span>
            </div>
            {/* Role name */}
            <h2 style={{ fontSize: 24, fontWeight: 800, color: t1, marginBottom: 8 }}>{myRole.name}</h2>
            {/* Camp badge */}
            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full" style={{ fontSize: 12, fontWeight: 700, background: campBg(myRole.camp), color: cc }}>
              {myRole.camp === 'wolf' ? '🐺' : myRole.camp === 'village' ? '🏠' : '⚡'} {campLabel(myRole.camp)}
            </span>
            {/* Description */}
            <p style={{ fontSize: 13, color: t2, lineHeight: 1.6, margin: '16px 0' }}>{myRole.description}</p>
            {/* Power section */}
            <div className="rounded-xl p-3 text-left" style={{ background: `${accent}10`, border: `1px solid ${accent}20` }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: accent, marginBottom: 2 }}>✨ Pouvoir</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: t1 }}>{myRole.power}</div>
            </div>
          </div>
        </div>
        <div className="w-48 h-1.5 rounded-full mt-6 overflow-hidden" style={{ background: bg3 }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${revealProgress}%`, background: cc }} />
        </div>
        <p style={{ fontSize: 11, color: t3, marginTop: 8 }}>La partie commence bientôt...</p>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // ─── GAME VIEW ─────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════
  if (view === 'game') {
    const phaseIcon = gameState.phase === 'night' ? '🌙' : gameState.phase === 'day-discussion' ? '☀️' : '🗳️';
    const phaseLabel = gameState.phase === 'night' ? `Nuit ${gameState.day} — Nuit` : gameState.phase === 'day-discussion' ? `Jour ${gameState.day} — Discussion` : `Jour ${gameState.day} — Vote`;
    const phaseBg = gameState.phase === 'night' ? 'linear-gradient(180deg, #0a0a1a, #10101f)' : 'linear-gradient(180deg, #0f0f0f, #0c0c14)';
    const canTarget = isNight && mePlayer?.isAlive && !actionDone && myRole?.nightAction;
    const canVote = gameState.phase === 'day-vote' && mePlayer?.isAlive;
    const timerColor = gameState.timeLeft <= 5 ? wolfRed : gameState.phase === 'night' ? '#6366f1' : gameState.phase === 'day-vote' ? wolfRed : villageGreen;
    const chatTitle = isNight && myRole?.camp === 'wolf' ? 'Loups' : 'Village';

    const getActionHint = () => {
      if (!mePlayer?.isAlive) return { text: 'Vous êtes mort(e)...', icon: '⚰️', color: t3 };
      if (mePlayer?.cannotVote && gameState.phase === 'day-vote') return { text: 'Cauchemar ! Vous ne pouvez pas voter.', icon: '😱', color: wolfRed };
      if (gameState.phase === 'day-vote') return { text: selectedPlayer ? `Vote : ${gameState.players.find(p => p.id === selectedPlayer)?.username}` : 'Votez pour éliminer un suspect', icon: '🗳️', color: wolfRed };
      if (gameState.phase === 'day-discussion') return { text: 'Discussion en cours...', icon: '💬', color: villageGreen };
      if (actionDone) return { text: 'Action effectuée', icon: '✅', color: villageGreen };
      // Wolf-camp roles with unique actions — check BEFORE generic wolf hint
      if (myRole?.nightAction === 'watch') return { text: 'Observez un joueur', icon: '🦉', color: soloGold };
      if (myRole?.nightAction === 'angel_action') return { text: 'Protégez un loup OU tuez un villageois', icon: '👼', color: wolfRed };
      if (myRole?.nightAction === 'scan_seer') return { text: 'Scannez un joueur (Voyante/Renard/Oracle ?)', icon: '🐺🧙', color: wolfRed };
      if (myRole?.camp === 'wolf') return { text: 'Choisissez une victime', icon: '🐺', color: wolfRed };
      if (myRole?.nightAction === 'vote_kill' && myRole?.id === 'lone-wolf') return { text: 'Votez avec les loups', icon: '🐺🌙', color: soloGold };
      if (myRole?.nightAction === 'examine') return { text: 'Examinez un joueur', icon: '🔮', color: '#a855f7' };
      if (myRole?.nightAction === 'protect') return { text: 'Protégez un joueur', icon: '🛡️', color: villageGreen };
      if (myRole?.nightAction === 'potions') return { text: 'Utilisez vos potions', icon: '🧪', color: '#a855f7' };
      if (myRole?.nightAction === 'solo_kill') return { text: 'Choisissez votre cible', icon: '🔪', color: soloGold };
      if (myRole?.nightAction === 'charm') return { text: 'Charmez 2 joueurs', icon: '🪈', color: soloGold };
      if (myRole?.nightAction === 'choose_model') return gameState.day === 1 ? { text: 'Choisissez votre modèle', icon: '🧒', color: variablePurple } : { text: 'Vous dormez...', icon: '😴', color: t3 };
      if (myRole?.nightAction === 'link_lovers') return gameState.day === 1 ? { text: 'Liez 2 joueurs en amoureux', icon: '💘', color: '#ec4899' } : { text: 'Vous dormez...', icon: '😴', color: t3 };
      if (myRole?.nightAction === 'infect') return { text: 'Infectez un joueur', icon: '🦠', color: '#84cc16' };
      if (myRole?.nightAction === 'douse') return { text: 'Arrosez ou allumez le feu', icon: '🔥', color: '#f97316' };
      if (myRole?.nightAction === 'convert') return { text: 'Convertissez un joueur', icon: '🕯️', color: cultPink };
      if (myRole?.nightAction === 'hunt_cult') return { text: 'Chassez un cultiste', icon: '💂', color: villageGreen };
      if (myRole?.nightAction === 'silent_kill') return { text: 'Assassinat silencieux (1×)', icon: '🥷', color: soloGold };
      if (myRole?.nightAction === 'divine_not') return { text: 'Voyez ce qu\'un joueur N\'EST PAS', icon: '🌀', color: '#8b5cf6' };
      if (myRole?.nightAction === 'visit') return { text: 'Visitez un joueur (risqué!)', icon: '💋', color: '#ec4899' };
      if (myRole?.nightAction === 'choose_protege') return gameState.day === 1 ? { text: 'Choisissez votre protégé', icon: '🔰', color: villageGreen } : { text: 'Vous dormez...', icon: '😴', color: t3 };
      if (myRole?.nightAction === 'choose_target') return gameState.day === 1 ? { text: 'Choisissez qui copier', icon: '🎭', color: variablePurple } : { text: 'Vous dormez...', icon: '😴', color: t3 };
      if (myRole?.nightAction === 'steal_role') return gameState.day === 1 ? { text: 'Volez le rôle d\'un joueur', icon: '😈', color: variablePurple } : { text: 'Vous dormez...', icon: '😴', color: t3 };
      if (myRole?.nightAction === 'block_wolves') return !gameState.blacksmithUsed ? { text: 'Bloquer les loups (1×)', icon: '⚒', color: villageGreen } : { text: 'Pouvoir utilisé', icon: '⚒', color: t3 };
      if (myRole?.nightAction === 'sleep_all') return !gameState.sandmanUsed ? { text: 'Endormir tout le monde (1×)', icon: '💤', color: '#8b5cf6' } : { text: 'Pouvoir utilisé', icon: '💤', color: t3 };
      if (myRole?.nightAction === 'brew') return { text: 'Appliquez votre potion', icon: '🍵', color: villageGreen };
      if (myRole?.nightAction === 'speak_dead') return { text: 'Communiquez avec un mort', icon: '🪬', color: '#8b5cf6' };
      if (myRole?.nightAction === 'read_dead') return { text: 'Lisez le rôle du dernier mort', icon: '👻', color: '#8b5cf6' };
      if (myRole?.nightAction === 'bless') return !gameState.priestUsed ? { text: 'Bénissez un joueur (1×)', icon: '⛪', color: villageGreen } : { text: 'Pouvoir utilisé', icon: '⛪', color: t3 };
      if (myRole?.nightAction === 'dig_grave') return { text: 'Fouillez la tombe d\'un mort', icon: '⚰️', color: '#8b5cf6' };
      if (myRole?.nightAction === 'mimic') {
        const available = [!comedianPowers.seer && '🔮 Voyante', !comedianPowers.guard && '🛡️ Garde', !comedianPowers.witch && '🧪 Sorcière'].filter(Boolean);
        if (available.length === 0) return { text: 'Tous les pouvoirs utilisés', icon: '🎪', color: t3 };
        return comedianMode ? { text: `Mode ${comedianMode === 'seer' ? 'Voyante' : comedianMode === 'guard' ? 'Garde' : 'Sorcière'} — Choisissez une cible`, icon: '🎪', color: '#8b5cf6' } : { text: 'Choisissez un pouvoir', icon: '🎪', color: '#8b5cf6' };
      }
      if (myRole?.nightAction === 'corrupt') return { text: 'Corrompez un joueur', icon: '💀', color: '#9333ea' };
      if (myRole?.nightAction === 'detect_group') {
        const me = gameState.players.find(p => p.id === myPlayerId);
        if (me?.foxPowerLost) return { text: 'Pouvoir perdu', icon: '🦊', color: t3 };
        return { text: 'Examinez un groupe de 3', icon: '🦊', color: soloGold };
      }
      return { text: 'Vous dormez...', icon: '😴', color: t3 };
    };

    const hint = getActionHint();

    // Death cause from killFeed
    const getDeathInfo = (playerId: string) => {
      const kill = gameState.killFeed.find(k => k.playerId === playerId);
      return kill || null;
    };

    // Action buttons for bottom bar
    const getActionButtons = () => {
      const buttons: { label: string; icon: string; color: string; bgColor: string; onClick: () => void; disabled?: boolean }[] = [];
      // Voir rôle always
      buttons.push({ label: 'Voir rôle', icon: '👁', color: t2, bgColor: bg3, onClick: () => setShowRoleModal(true) });

      if (gameState.phase === 'day-vote' && mePlayer?.isAlive && selectedPlayer) {
        buttons.push({ label: 'Voter', icon: '🗳️', color: '#fff', bgColor: wolfRed, onClick: () => performDayVote(selectedPlayer) });
      }
      if (isNight && myRole?.nightAction === 'potions' && mePlayer?.isAlive && !actionDone) {
        if (!gameState.witchSaveUsed && gameState.wolfTarget) {
          buttons.push({ label: 'Sauver', icon: '❤️', color: '#fff', bgColor: villageGreen, onClick: () => { setWitchAction('save'); performNightAction(gameState.wolfTarget!); } });
        }
        if (!gameState.witchKillUsed) {
          buttons.push({ label: 'Tuer', icon: '☠️', color: '#fff', bgColor: wolfRed, onClick: () => setWitchAction('kill'), disabled: !selectedPlayer });
        }
        buttons.push({ label: 'Passer', icon: '', color: t2, bgColor: 'transparent', onClick: () => setActionDone(true) });
      }
      // ── Comédien power selection buttons ──
      if (isNight && myRole?.nightAction === 'mimic' && mePlayer?.isAlive && !actionDone) {
        if (!comedianMode) {
          // Show power selection buttons
          if (!comedianPowers.seer) buttons.push({ label: 'Voyante', icon: '🔮', color: '#fff', bgColor: '#8b5cf6', onClick: () => setComedianMode('seer') });
          if (!comedianPowers.guard) buttons.push({ label: 'Garde', icon: '🛡️', color: '#fff', bgColor: villageGreen, onClick: () => setComedianMode('guard') });
          if (!comedianPowers.witch) buttons.push({ label: 'Sorcière', icon: '🧪', color: '#fff', bgColor: wolfRed, onClick: () => setComedianMode('witch') });
        } else if (selectedPlayer) {
          buttons.push({ label: 'Confirmer', icon: '✅', color: '#fff', bgColor: '#8b5cf6', onClick: () => performNightAction(selectedPlayer) });
          buttons.push({ label: 'Annuler', icon: '↩️', color: t2, bgColor: bg3, onClick: () => setComedianMode(null) });
        }
        buttons.push({ label: 'Passer', icon: '', color: t2, bgColor: 'transparent', onClick: () => setActionDone(true) });
      }
      // ── Pyromane ignite button ──
      if (isNight && myRole?.nightAction === 'douse' && mePlayer?.isAlive && !actionDone) {
        const dousedCount = gameState.players.filter(p => p.isDoused && p.isAlive).length;
        if (dousedCount > 0) {
          buttons.push({ label: `🔥 Allumer (${dousedCount})`, icon: '🔥', color: '#fff', bgColor: '#f97316', onClick: () => performNightAction('__ignite__') });
        }
      }
      // ── Day action buttons ──
      if (!isNight && mePlayer?.isAlive) {
        // Gunner
        if (myRole?.dayAction === 'shoot' && gunnerBullets > 0 && selectedPlayer) {
          buttons.push({ label: `Tirer (${gunnerBullets})`, icon: '🔫', color: '#fff', bgColor: wolfRed, onClick: () => performDayAction('shoot', selectedPlayer) });
        }
        // Shérif
        if (myRole?.dayAction === 'sheriff_shoot' && sheriffBullets > 0 && selectedPlayer) {
          buttons.push({ label: `Tir Shérif (${sheriffBullets})`, icon: '🤠', color: '#fff', bgColor: '#d97706', onClick: () => performDayAction('sheriff_shoot', selectedPlayer) });
        }
        // Détective
        if (myRole?.dayAction === 'investigate' && !detectiveUsed && selectedPlayer) {
          buttons.push({ label: 'Enquêter', icon: '🕵️', color: '#fff', bgColor: '#8b5cf6', onClick: () => performDayAction('investigate', selectedPlayer) });
        }
        // Maire reveal
        if (myRole?.dayAction === 'reveal_mayor' && !mayorRevealed) {
          buttons.push({ label: 'Se révéler Maire', icon: '🎖', color: '#fff', bgColor: soloGold, onClick: () => performDayAction('reveal_mayor') });
        }
        // Pacifiste
        if (myRole?.dayAction === 'prevent_lynch' && !pacifistUsedLocal && gameState.phase === 'day-vote') {
          buttons.push({ label: 'Bloquer lynch', icon: '☮️', color: '#fff', bgColor: villageGreen, onClick: () => performDayAction('prevent_lynch') });
        }
        // Trickster Wolf fake reveal
        if (myRole?.dayAction === 'fake_reveal' && !tricksterUsed) {
          buttons.push({ label: 'Faux reveal', icon: '🎭', color: '#fff', bgColor: wolfRed, onClick: () => performDayAction('fake_reveal') });
        }
        // Loup Cauchemar nightmare
        if (myRole?.dayAction === 'nightmare' && !gameState.nightmareUsed && selectedPlayer) {
          buttons.push({ label: 'Cauchemar (1×)', icon: '😱', color: '#fff', bgColor: wolfRed, onClick: () => performDayAction('nightmare', selectedPlayer) });
        }
        // Loup Mystique examine
        if (myRole?.dayAction === 'mystic_examine' && selectedPlayer) {
          buttons.push({ label: 'Examiner', icon: '🔮', color: '#fff', bgColor: wolfRed, onClick: () => performDayAction('mystic_examine', selectedPlayer) });
        }
      }
      return buttons;
    };

    return (
      <div className="h-full flex flex-col relative" style={{ background: phaseBg }}>
        {/* ── Lovable-style Immersive Header ── */}
        <div className="relative overflow-hidden" style={{
          background: gameState.phase === 'night'
            ? 'linear-gradient(180deg, #1a0a2e 0%, #0d0d1a 100%)'
            : gameState.phase === 'day-vote'
            ? 'linear-gradient(180deg, #2a0a0a 0%, #0d0d1a 100%)'
            : 'linear-gradient(180deg, #0a1a0a 0%, #0d0d1a 100%)',
        }}>
          {/* Background glow effect */}
          <div className="absolute inset-0" style={{
            background: gameState.phase === 'night'
              ? 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.15) 0%, transparent 70%)'
              : gameState.phase === 'day-vote'
              ? 'radial-gradient(ellipse at 50% 0%, rgba(239,68,68,0.15) 0%, transparent 70%)'
              : 'radial-gradient(ellipse at 50% 0%, rgba(34,197,94,0.12) 0%, transparent 70%)',
          }} />

          {/* Top bar: Back + Timer + Role */}
          <div className="relative flex items-center justify-between px-4 py-2">
            <button onClick={() => { if (timerRef.current) clearInterval(timerRef.current); setView('lobby'); setGameState(prev => ({ ...prev, players: [], winner: null })); }} className="p-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <ArrowLeft size={16} style={{ color: t2 }} />
            </button>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded font-bold font-mono text-xs" style={{ background: `${timerColor}20`, color: timerColor }}>
                {gameState.timeLeft}s
              </span>
              {myRole && (
                <span className="px-2 py-0.5 rounded font-bold text-xs flex items-center gap-1" style={{ background: `${campColor(myRole.camp)}18`, color: campColor(myRole.camp) }}>
                  {myRole.icon} {myRole.name}
                </span>
              )}
            </div>
          </div>

          {/* Phase title — large, glowing */}
          <div className="relative text-center pb-1 px-4">
            <h1 style={{
              fontSize: 26,
              fontWeight: 900,
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: gameState.phase === 'night' ? '#a5b4fc' : gameState.phase === 'day-vote' ? wolfRed : villageGreen,
              textShadow: gameState.phase === 'night'
                ? '0 0 20px rgba(99,102,241,0.5), 0 0 40px rgba(99,102,241,0.2)'
                : gameState.phase === 'day-vote'
                ? '0 0 20px rgba(239,68,68,0.5), 0 0 40px rgba(239,68,68,0.2)'
                : '0 0 20px rgba(34,197,94,0.4), 0 0 40px rgba(34,197,94,0.15)',
              fontFamily: "'DM Sans', sans-serif",
            }}>
              {gameState.phase === 'night' ? `Le Village dort...` : gameState.phase === 'day-vote' ? 'LYNCHAGE' : 'DISCUSSION'}
            </h1>
            <p style={{ fontSize: 13, fontWeight: 600, color: t2, marginTop: 2 }}>
              Jour {gameState.day} {phaseIcon} {alivePlayers.length} / {gameState.players.length} villageois en vie
            </p>
          </div>

          {/* Action hint — skill message for current player */}
          <div className="relative text-center px-4 pb-2 pt-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold" style={{
              background: `${hint.color}15`,
              color: hint.color,
              border: `1px solid ${hint.color}25`,
            }}>
              {hint.icon} {hint.text}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <div className="h-full transition-all duration-1000" style={{ width: `${(gameState.timeLeft / gameState.maxTime) * 100}%`, background: timerColor }} />
          </div>
        </div>

        {/* ── Main Content: Players left + Chat right ── */}
        <div className="flex-1 flex flex-row overflow-hidden" style={{ minHeight: 0 }}>
          {/* Left: Players Grid */}
          <div className={`overflow-y-auto px-3 sm:px-4 py-3 min-w-0 ${showChat ? 'hidden md:block md:w-[35%] md:flex-shrink-0' : 'flex-1'}`}>
            <div className="mx-auto" style={{ maxWidth: 600 }}>
            {/* Searchbar */}
            <div className="rounded-xl mb-3 overflow-hidden" style={{ background: bg2, border: `1px solid ${border}` }}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: t3, fontSize: 13 }}>🔍</span>
                <input
                  type="text"
                  placeholder="Chercher un joueur..."
                  value={playerSearch}
                  onChange={e => setPlayerSearch(e.target.value)}
                  className="w-full focus:outline-none"
                  style={{ background: 'transparent', border: 'none', padding: '8px 12px 8px 32px', color: t1, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}
                />
              </div>
            </div>

            {/* Players Grid — Lovable compact cards */}
            {(() => {
              const filtered = gameState.players.filter(p => !playerSearch || p.username.toLowerCase().includes(playerSearch.toLowerCase()));
              if (filtered.length === 0) return <div className="text-center py-6" style={{ color: t3, fontSize: 13 }}>Aucun joueur trouvé</div>;
              const maxVotesInRound = Math.max(...gameState.players.map(p => p.votes), 0);
              const myVoteTarget = mePlayer?.votedFor;
              return (
                <div className="grid gap-1.5 justify-center mx-auto w-full" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', maxWidth: 600 }}>
                  {filtered.map((p, idx) => {
                    const isDead = !p.isAlive;
                    const isSelected = selectedPlayer === p.id;
                    const isMe = p.id === myPlayerId;
                    const clickable = !isDead && ((canTarget && !isMe && (myRole?.camp === 'wolf' ? p.role?.camp !== 'wolf' : true)) || (canVote && !isMe));
                    const deathInfo = isDead ? getDeathInfo(p.id) : null;
                    const isHovered = hoveredDead === p.id;
                    const initials = p.username.slice(0, 1).toUpperCase();

                    return (
                      <div key={p.id} className="relative">
                        <button
                          onClick={() => { if (isDead) return; if (canTarget && !isMe) performNightAction(p.id); else if (canVote && !isMe) performDayVote(p.id); }}
                          onMouseEnter={() => isDead && setHoveredDead(p.id)}
                          onMouseLeave={() => setHoveredDead(null)}
                          disabled={isDead}
                          className="w-full flex flex-col items-center gap-1 p-2 rounded-lg transition-all focus:outline-none"
                          style={{
                            background: bg2,
                            border: `1.5px solid ${isSelected ? wolfRed : border}`,
                            boxShadow: isSelected ? `0 0 0 2px ${wolfRed}, 0 0 20px ${wolfRed}30` : 'none',
                            opacity: isDead ? 0.35 : 1,
                            filter: isDead ? 'grayscale(0.8)' : 'none',
                            cursor: clickable ? 'pointer' : isDead ? 'default' : 'default',
                            pointerEvents: isDead ? 'auto' : undefined,
                            transform: isSelected ? 'translateY(-2px)' : 'none',
                          }}
                        >
                          {/* Avatar circle with initial */}
                          <div className="flex items-center justify-center rounded-full font-semibold" style={{
                            width: 34, height: 34,
                            background: isSelected ? `${wolfRed}20` : isDead ? bg3 : `${bg3}`,
                            color: isSelected ? wolfRed : isDead ? t3 : t1,
                            fontSize: isDead ? 18 : 14,
                          }}>
                            {isDead ? '💀' : initials}
                          </div>

                          {/* Name */}
                          <span className="w-full truncate text-center" style={{ fontSize: 11, fontWeight: 500, color: t1 }}>
                            {p.username}
                          </span>

                          {/* Dead role */}
                          {isDead && p.role && (
                            <span className="truncate w-full text-center" style={{ fontSize: 9, color: wolfRed, fontWeight: 600, marginTop: -4 }}>{p.role.name}</span>
                          )}

                          {/* Vote progress bar — under name during day-vote */}
                          {gameState.phase === 'day-vote' && !isDead && p.votes > 0 && (
                            <div className="w-full rounded-full overflow-hidden" style={{ height: 3, background: `${wolfRed}20`, marginTop: -2 }}>
                              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${maxVotesInRound > 0 ? (p.votes / maxVotesInRound) * 100 : 0}%`, background: wolfRed }} />
                            </div>
                          )}

                          {/* "Votre vote" indicator */}
                          {gameState.phase === 'day-vote' && myVoteTarget === p.id && (
                            <span style={{ fontSize: 8, fontWeight: 700, color: accent, marginTop: -2 }}>Votre vote</span>
                          )}

                          {/* Vote count badge — top right, red circle */}
                          {p.votes > 0 && (
                            <span className="absolute flex items-center justify-center rounded-full transition-transform" style={{
                              top: -6, right: -6, minWidth: 20, height: 20, padding: '0 4px',
                              background: wolfRed, color: '#fff', fontSize: 10, fontWeight: 700,
                              transform: p.votes === maxVotesInRound && maxVotesInRound > 1 ? 'scale(1.2)' : 'scale(1)',
                              boxShadow: p.votes === maxVotesInRound && maxVotesInRound > 1 ? `0 0 8px ${wolfRed}60` : 'none',
                            }}>{p.votes}</span>
                          )}
                        </button>

                        {/* Death tooltip on hover */}
                        {isDead && isHovered && deathInfo && (() => {
                          const deathDisplay = getKillDisplay(deathInfo.cause, p.username);
                          return (
                            <div className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 rounded-xl p-3 min-w-[140px] shadow-2xl" style={{ background: bg2, border: `1px solid ${border}`, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: t1 }}>{p.username}</div>
                              <div style={{ fontSize: 10, color: wolfRed, marginTop: 2 }}>{deathDisplay.message}</div>
                              {deathDisplay.media && (deathDisplay.media.type === 'image' || deathDisplay.media.type === 'gif') && (
                                <img src={deathDisplay.media.url} alt="" className="mt-2 w-full max-h-14 object-cover rounded-lg" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                              )}
                              {p.role && (
                                <div className="flex items-center gap-1 mt-2 px-2 py-1 rounded-lg" style={{ background: campBg(p.role.camp) }}>
                                  <span style={{ fontSize: 10 }}>{p.role.icon}</span>
                                  <span style={{ fontSize: 9, fontWeight: 600, color: campColor(p.role.camp) }}>{p.role.name}</span>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
            </div>{/* close mx-auto wrapper */}
          </div>

          {/* Right: Chat Panel — full overlay on mobile, side panel on desktop */}
          {showChat && <div className="fixed inset-0 z-30 md:relative md:inset-auto md:z-auto flex-1 min-w-0 md:border-l flex flex-col" style={{ background: bg1, borderColor: border }}>
            {/* Chat Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: border, background: bg2 }}>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ background: villageGreen }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: t1 }}>💬 {chatTitle}</span>
                <span className="px-2 py-0.5 rounded-full" style={{ fontSize: 10, fontWeight: 600, background: `${accent}20`, color: accent }}>{chatMessages.length} msg</span>
              </div>
              <button onClick={() => setShowChat(false)} className="md:hidden p-1.5 rounded-lg" style={{ background: bg3 }}>
                <X size={16} style={{ color: t2 }} />
              </button>
            </div>
            {/* Chat Tabs */}
            <div className="flex gap-1 px-3 py-2 border-b" style={{ borderColor: border }}>
              <button onClick={() => setChatTab('village')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: chatTab === 'village' ? bg3 : 'transparent', color: chatTab === 'village' ? t1 : t3 }}>
                💬 Village
              </button>
              {(myRole?.camp === 'wolf' || myRole?.id === 'little-girl' || myRole?.id === 'lone-wolf') && (
                <button onClick={() => setChatTab('loups')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: chatTab === 'loups' ? bg3 : 'transparent', color: chatTab === 'loups' ? t1 : t3 }}>
                  🐺 {myRole?.id === 'little-girl' ? 'Espionner' : 'Loups'}
                </button>
              )}
            </div>
            {/* Chat Messages - WhatsApp style */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
              {chatMessages.map((m, i) => {
                const isSystem = m.player.includes('Système') || m.player.includes('Vision') || m.player.includes('Meute') || m.player.includes('Garde') || m.player.includes('Chasseur') || m.player.includes('Nuit ') || m.player.includes('Mort');
                const isOwnMsg = m.player === (profile?.username || 'Vous');
                const now = new Date();
                const timeStr = m.time || `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

                // Kill message with media (Telegram-style: image + text overlay)
                if (m.mediaUrl && (m.mediaType === 'image' || m.mediaType === 'gif')) {
                  return (
                    <div key={i} className="flex justify-center px-2">
                      <div className="rounded-2xl overflow-hidden shadow-lg" style={{ border: `1px solid ${border}`, width: 240, maxWidth: '75%' }}>
                        <div style={{ width: '100%', height: 160, overflow: 'hidden', background: bg3 }}>
                          <img src={m.mediaUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        </div>
                        <div className="px-3 py-2" style={{ background: 'rgba(0,0,0,0.85)' }}>
                          <p style={{ fontSize: 11, fontWeight: 600, color: m.color, lineHeight: 1.4 }}>{m.message}</p>
                          <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 2, textAlign: 'right' }}>{timeStr}</p>
                        </div>
                      </div>
                    </div>
                  );
                }

                if (isSystem) {
                  return (
                    <div key={i} className="flex justify-center">
                      <span className="px-3 py-1 rounded-full text-xs" style={{ background: `${m.color}12`, color: m.color, fontWeight: 600 }}>
                        {m.player.includes('Nuit ') || m.player.includes('Mort') ? m.message : `${m.player}: ${m.message}`}
                      </span>
                    </div>
                  );
                }
                return (
                  <div key={i} className={`flex ${isOwnMsg ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[80%] rounded-2xl px-3.5 py-2" style={{ background: isOwnMsg ? accent : bg3, borderBottomRightRadius: isOwnMsg ? 4 : 16, borderBottomLeftRadius: isOwnMsg ? 16 : 4 }}>
                      {!isOwnMsg && <div style={{ fontSize: 11, fontWeight: 700, color: m.color, marginBottom: 2 }}>{m.player}</div>}
                      <div style={{ fontSize: 13, color: isOwnMsg ? '#fff' : t1, lineHeight: 1.4 }}>{m.message}</div>
                      <div style={{ fontSize: 9, color: isOwnMsg ? 'rgba(255,255,255,0.5)' : t3, marginTop: 2, textAlign: 'right' }}>{timeStr}</div>
                    </div>
                  </div>
                );
              })}
              {chatMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full opacity-40">
                  <MessageCircle size={28} style={{ color: t3 }} />
                  <p style={{ fontSize: 11, color: t3, marginTop: 6 }}>Les messages apparaîtront ici</p>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            {/* Chat Input */}
            <div className="px-3 py-2.5 border-t flex gap-2" style={{ borderColor: border, background: bg2 }}>
              <input
                value={chatMessage}
                onChange={e => setChatMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendChat()}
                placeholder={!mePlayer?.isAlive ? '💀 Mort(e)...' : isNight && myRole?.camp !== 'wolf' ? '😴 Zzz...' : 'Message...'}
                disabled={!mePlayer?.isAlive || (isNight && myRole?.camp !== 'wolf')}
                className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
                style={{ background: bg3, color: t1, border: `1px solid ${border}`, opacity: (!mePlayer?.isAlive || (isNight && myRole?.camp !== 'wolf')) ? 0.4 : 1 }}
              />
              <button onClick={sendChat} disabled={!chatMessage.trim()} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: chatMessage.trim() ? accent : bg3 }}>
                <Send size={16} color={chatMessage.trim() ? '#fff' : t3} />
              </button>
            </div>
          </div>}
        </div>

        {/* ── Bottom Action Bar ── */}
        <div className="px-4 py-2.5 border-t flex items-center gap-2 flex-wrap" style={{ background: bg2, borderColor: border }}>
          {/* Role info */}
          {myRole && (
            <div className="flex items-center gap-2 mr-auto">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${campColor(myRole.camp)}18`, border: `1px solid ${campColor(myRole.camp)}30` }}>
                <span style={{ fontSize: 16 }}>{myRole.icon}</span>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: t1 }}>{myRole.name}</div>
                <div className="truncate" style={{ fontSize: 10, color: campColor(myRole.camp), maxWidth: 120 }}>{myRole.power}</div>
              </div>
            </div>
          )}
          {/* Action buttons */}
          {getActionButtons().map((btn, i) => (
            <button key={i} onClick={btn.onClick} disabled={btn.disabled}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: btn.bgColor, color: btn.color, border: btn.bgColor === 'transparent' ? `1px solid ${border}` : 'none', opacity: btn.disabled ? 0.4 : 1 }}
            >
              {btn.icon && <span>{btn.icon}</span>}
              {btn.label}
            </button>
          ))}
        </div>

        {/* ── Floating Chat Bubble ── */}
        <button
          onClick={() => { setShowChat(prev => !prev); setUnreadChat(0); }}
          className={`fixed bottom-20 right-5 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl z-40 transition-all hover:scale-110 active:scale-95 ${showChat ? 'md:flex hidden' : ''}`}
          style={{ background: showChat ? bg3 : accent, boxShadow: `0 4px 20px ${showChat ? 'rgba(0,0,0,0.3)' : accent + '50'}` }}
        >
          {showChat ? <X size={24} color={t1} /> : <MessageCircle size={24} color="#fff" />}
          {!showChat && unreadChat > 0 && (
            <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: wolfRed, color: '#fff', fontSize: 11 }}>
              {unreadChat > 9 ? '9+' : unreadChat}
            </span>
          )}
        </button>

        {/* ── Role Modal ── */}
        {showRoleModal && myRole && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setShowRoleModal(false)}>
            <div className="rounded-2xl p-6 text-center w-72 max-w-full" style={{ background: bg2, border: `2px solid ${campColor(myRole.camp)}35` }} onClick={e => e.stopPropagation()}>
              <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-3" style={{ background: `${campColor(myRole.camp)}15`, border: `2px solid ${campColor(myRole.camp)}30` }}>
                <span style={{ fontSize: 32 }}>{myRole.icon}</span>
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: t1 }}>{myRole.name}</h2>
              <span className="inline-block px-3 py-1 rounded-full mt-2 mb-3" style={{ fontSize: 11, fontWeight: 700, background: campBg(myRole.camp), color: campColor(myRole.camp) }}>{campLabel(myRole.camp)}</span>
              <p style={{ fontSize: 12, color: t2, lineHeight: 1.5 }}>{myRole.description}</p>
              <div className="rounded-xl p-2.5 mt-3 text-left" style={{ background: `${accent}10`, border: `1px solid ${accent}20` }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: accent }}>✨ Pouvoir</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: t1 }}>{myRole.power}</div>
              </div>
              <button onClick={() => setShowRoleModal(false)} className="mt-4 px-6 py-2 rounded-xl text-sm font-bold" style={{ background: bg3, color: t1 }}>Fermer</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // ─── LOBBY ─────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════
  return (
    <div className="h-full flex flex-col" style={{ background: bg1 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ background: bg2, borderColor: border }}>
        <button onClick={onBack} className="p-2 rounded-lg" style={{ background: bg3 }}>
          <ArrowLeft size={18} style={{ color: t1 }} />
        </button>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: t1 }}>🐺 Loup-Garou</h2>
        <div style={{ width: 34 }} />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-md mx-auto p-4 space-y-4">
          {/* Hero */}
          <div className="text-center py-6">
            <div style={{ fontSize: 64, marginBottom: 8 }}>🐺</div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: t1 }}>Loup-Garou</h1>
            <p style={{ fontSize: 13, color: t2 }}>Trouvez les loups avant qu'il ne soit trop tard !</p>
            <div className="flex items-center justify-center gap-2 mt-3">
              <span className="px-3 py-1 rounded-full" style={{ fontSize: 11, fontWeight: 700, background: `${rank.color}20`, color: rank.color }}>{rank.icon} {rank.name}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: accent }}>{playerPoints} pts</span>
            </div>
          </div>

          {/* Game Mode */}
          <div className="rounded-xl p-4" style={{ background: bg2, border: `1px solid ${border}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: t1, marginBottom: 12 }}>🎮 Mode de jeu</div>
            <div className="flex gap-2">
              {([
                { key: 'normal' as const, label: '🎯 Normal', desc: 'Rôles équilibrés' },
                { key: 'chaos' as const, label: '🌪️ Chaos', desc: 'Rôles aléatoires' },
                { key: 'anarchie' as const, label: '🔥 Anarchie', desc: 'Last Man Standing' },
              ]).map(m => (
                <button key={m.key} onClick={() => setGameMode(m.key)} className="flex-1 rounded-xl p-3 text-center transition-all" style={{ background: gameMode === m.key ? accentSoft : bg3, border: `2px solid ${gameMode === m.key ? accent : border}` }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: gameMode === m.key ? accent : t1 }}>{m.label}</div>
                  <div style={{ fontSize: 9, color: t2, marginTop: 2 }}>{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Player Count */}
          <div className="rounded-xl p-4" style={{ background: bg2, border: `1px solid ${border}` }}>
            <div className="flex items-center justify-between mb-3">
              <span style={{ fontSize: 13, fontWeight: 700, color: t1 }}>👥 Joueurs</span>
              <span style={{ fontSize: 22, fontWeight: 800, color: accent }}>{playerCount}</span>
            </div>
            <input type="range" min={4} max={40} value={playerCount} onChange={e => setPlayerCount(+e.target.value)} className="w-full accent-purple-500" />
            <div className="flex flex-wrap gap-1.5 mt-3">
              {getRolePreview().map((r, i) => (
                <span key={i} className="px-2 py-0.5 rounded-full" style={{ fontSize: 10, fontWeight: 600, background: campBg(r.camp), color: campColor(r.camp) }}>
                  {r.icon} {r.name} ×{r.count}
                </span>
              ))}
            </div>
          </div>

          {/* Advanced Config */}
          <button onClick={() => setShowAdvanced(!showAdvanced)} className="w-full flex items-center justify-between px-4 py-3 rounded-xl" style={{ background: bg2, border: `1px solid ${border}` }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: t2 }}>⚙️ Configuration avancée</span>
            {showAdvanced ? <ChevronUp size={16} style={{ color: t2 }} /> : <ChevronDown size={16} style={{ color: t2 }} />}
          </button>
          {showAdvanced && (
            <div className="rounded-xl p-4 space-y-4" style={{ background: bg2, border: `1px solid ${border}` }}>
              {[
                { label: '🌙 Nuit', value: nightTimer, set: setNightTimer, min: 15, max: 60 },
                { label: '💬 Discussion', value: discussionTimer, set: setDiscussionTimer, min: 30, max: 120 },
                { label: '🗳️ Vote', value: voteTimer, set: setVoteTimer, min: 15, max: 60 },
              ].map(t => (
                <div key={t.label}>
                  <div className="flex justify-between mb-1">
                    <span style={{ fontSize: 12, color: t2 }}>{t.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: t1 }}>{t.value}s</span>
                  </div>
                  <input type="range" min={t.min} max={t.max} step={5} value={t.value} onChange={e => t.set(+e.target.value)} className="w-full accent-purple-500" />
                </div>
              ))}
            </div>
          )}

          {/* Multiplayer */}
          <div className="rounded-xl p-4" style={{ background: bg2, border: `1px solid ${border}` }}>
            <div className="flex items-center gap-2 mb-3">
              <span style={{ fontSize: 18 }}>👥</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: t1 }}>Multijoueur</span>
            </div>

            {multiplayerMode === 'none' && (
              <div className="flex gap-3">
                <button onClick={async () => {
                  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
                  setRoomCode(code);
                  setMultiplayerMode('create');
                  setIsHost(true);
                  const roomId = await createRoomInDB(code);
                  if (roomId) setDbRoomId(roomId);
                }} className="flex-1 py-3 rounded-xl font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98]" style={{ background: accent, color: '#fff' }}>
                  Créer une Partie
                </button>
                <button onClick={() => { setMultiplayerMode('join'); fetchAvailableRooms(); }} className="flex-1 py-3 rounded-xl font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98]" style={{ background: 'transparent', color: t1, border: `2px solid ${border}` }}>
                  Rejoindre
                </button>
              </div>
            )}

            {multiplayerMode === 'create' && roomCode && (
              <div className="text-center">
                <div style={{ fontSize: 12, color: t2, marginBottom: 8 }}>Code de salle généré :</div>
                <div className="inline-block px-5 py-3 rounded-xl mb-4" style={{ background: `${accent}15`, border: `2px solid ${accent}40` }}>
                  <span style={{ fontSize: 22, fontWeight: 800, color: accent, letterSpacing: '6px', fontFamily: 'monospace' }}>{roomCode}</span>
                </div>
                <div className="flex gap-2 justify-center">
                  <button onClick={() => {
                    setView('waitingRoom');
                  }} className="px-5 py-2.5 rounded-xl font-bold text-sm" style={{ background: accent, color: '#fff' }}>
                    Continuer →
                  </button>
                  <button onClick={() => { setMultiplayerMode('none'); setRoomCode(''); }} className="px-5 py-2.5 rounded-xl font-bold text-sm" style={{ background: bg3, color: t2, border: `1px solid ${border}` }}>
                    Annuler
                  </button>
                </div>
              </div>
            )}

            {multiplayerMode === 'join' && (
              <div>
                {/* Code input */}
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={joinCode}
                    onChange={e => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="CODE"
                    maxLength={6}
                    className="flex-1 rounded-xl px-3 py-2.5 text-center text-sm font-bold uppercase outline-none"
                    style={{ background: bg3, color: t1, border: `1px solid ${border}`, letterSpacing: '3px', fontFamily: 'monospace' }}
                  />
                  <button disabled={joinCode.length < 4 || joiningRoom} onClick={async () => {
                    setJoinError('');
                    const roomId = await joinRoomByCode(joinCode);
                    if (roomId) {
                      setDbRoomId(roomId);
                      setRoomCode(joinCode);
                      setView('waitingRoom');
                    } else {
                      setJoinError('Salle introuvable, pleine ou déjà en cours.');
                    }
                  }} className="px-4 py-2.5 rounded-xl font-bold text-sm transition-colors" style={{ background: joinCode.length >= 4 ? accent : bg3, color: joinCode.length >= 4 ? '#fff' : t3 }}>
                    {joiningRoom ? '...' : 'Rejoindre'}
                  </button>
                </div>
                {joinError && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl mt-1" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
                    <span style={{ fontSize: 12, color: wolfRed }}>⚠ {joinError}</span>
                  </div>
                )}

                {/* Available rooms browser */}
                <div className="mt-2 mb-2">
                  <div className="flex items-center justify-between mb-2">
                    <span style={{ fontSize: 12, fontWeight: 700, color: t1 }}>🎮 Parties en cours</span>
                    <button onClick={fetchAvailableRooms} className="px-2 py-1 rounded-lg text-xs" style={{ background: bg3, color: accent, border: `1px solid ${border}` }}>
                      Actualiser
                    </button>
                  </div>
                  {availableRooms.length === 0 ? (
                    <div className="text-center py-4">
                      <div style={{ fontSize: 11, color: t3 }}>Aucune partie disponible</div>
                      <button onClick={fetchAvailableRooms} className="mt-2 text-xs font-semibold" style={{ color: accent }}>Rechercher</button>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {availableRooms.map(room => (
                        <button key={room.id} onClick={async () => {
                          setJoinError('');
                          const roomId = await joinRoomByCode(room.code);
                          if (roomId) { setDbRoomId(roomId); setRoomCode(room.code); setView('waitingRoom'); }
                          else setJoinError('Salle pleine ou fermée.');
                        }} className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all hover:scale-[1.01]" style={{ background: bg3, border: `1px solid ${border}` }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: t1 }}>🐺 {room.host_username}</div>
                            <div style={{ fontSize: 10, color: t3 }}>{room.mode === 'chaos' ? '🌪️ Chaos' : room.mode === 'anarchie' ? '🔥 Anarchie' : '🎯 Normal'} · {room.player_count}/{room.max_players}</div>
                          </div>
                          <span className="px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: `${accent}20`, color: accent }}>Rejoindre</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button onClick={() => { setMultiplayerMode('none'); setJoinCode(''); setAvailableRooms([]); }} className="mt-2 text-xs" style={{ color: t3 }}>
                  ← Retour
                </button>
              </div>
            )}
          </div>

          {/* Start Button (Solo vs Bots) */}
          <button onClick={startGame} className="w-full py-4 rounded-xl font-bold text-base transition-all hover:scale-[1.02] active:scale-[0.98]" style={{ background: `linear-gradient(135deg, ${accent}, #8b5cf6)`, color: '#fff', boxShadow: `0 4px 20px ${accent}40` }}>
            🎮 Jouer vs Bots
          </button>

          {/* Quick Links */}
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => setView('roles')} className="rounded-xl p-3 text-center" style={{ background: bg2, border: `1px solid ${border}` }}>
              <BookOpen size={18} style={{ color: accent, margin: '0 auto 4px' }} />
              <div style={{ fontSize: 11, fontWeight: 600, color: t2 }}>Rôles</div>
            </button>
            <button onClick={() => setView('profile')} className="rounded-xl p-3 text-center" style={{ background: bg2, border: `1px solid ${border}` }}>
              <Trophy size={18} style={{ color: soloGold, margin: '0 auto 4px' }} />
              <div style={{ fontSize: 11, fontWeight: 600, color: t2 }}>Profil</div>
            </button>
            <button onClick={() => setView('leaderboard')} className="rounded-xl p-3 text-center" style={{ background: bg2, border: `1px solid ${border}` }}>
              <Trophy size={18} style={{ color: villageGreen, margin: '0 auto 4px' }} />
              <div style={{ fontSize: 11, fontWeight: 600, color: t2 }}>Classement</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
