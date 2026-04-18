import React, { useState } from 'react';
import { Plus, Search, Menu, Compass, Users, User } from 'lucide-react';
import { ConversationCard } from './ConversationCard';
import { PrivateChatPage } from './PrivateChatPage';
import { GroupDetailPage } from './GroupDetailPage';
import { GroupCard } from './GroupCard';
import { CreateGroupModal } from './CreateGroupModal';
import type { Conversation, Group } from './types';

type ChatCategory = 'discover' | 'groups' | 'personal';

export function PrivateMessagesPage() {
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<ChatCategory>('discover');
  const [joinedGroups, setJoinedGroups] = useState<string[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [customGroups, setCustomGroups] = useState<Group[]>([]);

  // Mock data
  const conversations: Conversation[] = [
    {
      id: '1',
      user: {
        id: '1',
        name: 'Alex',
        username: 'alex_manga',
        avatar: '🟣',
        isOnline: true,
      },
      lastMessage: 'T\'as vu le dernier chapitre? 🔥',
      timestamp: '14:30',
      unreadCount: 3,
    },
    {
      id: '2',
      user: {
        id: '2',
        name: 'Marie',
        username: 'marie_ht',
        avatar: '🟢',
        isOnline: true,
      },
      lastMessage: 'On fait le quiz ensemble?',
      timestamp: '13:15',
      unreadCount: 0,
    },
    {
      id: '3',
      user: {
        id: '3',
        name: 'Sophie',
        username: 'sophie_dev',
        avatar: '🔵',
        isOnline: false,
      },
      lastMessage: 'Merci pour le conseil!',
      timestamp: 'Hier',
      unreadCount: 0,
    },
    {
      id: '4',
      user: {
        id: '4',
        name: 'Jean',
        username: 'jean_otaku',
        avatar: '🟡',
        isOnline: false,
      },
      lastMessage: 'Photo envoyée',
      timestamp: '2j',
      unreadCount: 1,
    },
  ];

  // Mock groups - TOUS les groupes disponibles
  const baseGroups: Group[] = [
    {
      id: '1',
      name: 'One Piece Fans',
      icon: '🏴‍☠️',
      membersCount: 2400,
      onlineCount: 45,
      description: 'Le groupe #1 des fans de OP!',
      coverImage: 'https://images.unsplash.com/photo-1768268768362-00b5c53bd273?w=400&h=200&fit=crop',
      isPublic: true,
    },
    {
      id: '2',
      name: 'JJK Theory Crafters',
      icon: '👹',
      membersCount: 890,
      onlineCount: 12,
      description: 'Théories et discussions JJK',
      isPublic: true,
    },
    {
      id: '3',
      name: 'Manga Artists',
      icon: '🎨',
      membersCount: 456,
      onlineCount: 8,
      description: 'Partagez vos créations!',
      coverImage: 'https://images.unsplash.com/photo-1770116119330-2c80bc762d0b?w=400&h=200&fit=crop',
      isPublic: true,
    },
    {
      id: '4',
      name: 'Attack on Titan',
      icon: '⚔️',
      membersCount: 1800,
      onlineCount: 23,
      description: 'Discussions sur SNK/AOT',
      isPublic: true,
    },
    {
      id: '5',
      name: 'Demon Slayer',
      icon: '⚡',
      membersCount: 1500,
      onlineCount: 18,
      description: 'Fans de Kimetsu no Yaiba',
      isPublic: true,
    },
  ];

  // Combine base groups with custom created groups
  const allGroups = [...baseGroups, ...customGroups];

  const filteredConversations = conversations.filter((conv) =>
    conv.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAllGroups = allGroups.filter((group) =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Groupes rejoints
  const myJoinedGroups = allGroups.filter((g) => joinedGroups.includes(g.id));

  // Calculate counts
  const discoverCount = allGroups.length;
  const myGroupsCount = joinedGroups.length;
  const personalCount = conversations.length;

  const categories = [
    { id: 'discover' as const, label: 'Découvrir', icon: Compass, count: discoverCount },
    { id: 'groups' as const, label: 'Mes Groupes', icon: Users, count: myGroupsCount },
    { id: 'personal' as const, label: 'Personal', icon: User, count: personalCount },
  ];

  const handleJoinGroup = (groupId: string) => {
    if (!joinedGroups.includes(groupId)) {
      setJoinedGroups([...joinedGroups, groupId]);
    }
  };

  const handleCreateGroup = (groupData: {
    name: string;
    description: string;
    icon: string;
    isPublic: boolean;
    defaultChannels: string[];
  }) => {
    // Create new group
    const newGroup: Group = {
      id: `custom-${Date.now()}`,
      name: groupData.name,
      description: groupData.description,
      icon: groupData.icon,
      membersCount: 1, // Creator is the first member
      onlineCount: 1, // Creator is online
      isPublic: groupData.isPublic,
    };

    // Add to custom groups
    setCustomGroups([newGroup, ...customGroups]);

    // Auto-join the creator to the group
    setJoinedGroups([...joinedGroups, newGroup.id]);

    // Switch to "Mes Groupes" tab
    setActiveCategory('groups');

    // Close modal
    setShowCreateGroupModal(false);
  };

  if (selectedConversation) {
    return (
      <PrivateChatPage
        conversation={selectedConversation}
        onBack={() => setSelectedConversation(null)}
      />
    );
  }

  if (selectedGroup) {
    return (
      <GroupDetailPage
        group={selectedGroup}
        onBack={() => setSelectedGroup(null)}
      />
    );
  }

  return (
    <div className="h-full flex" style={{ background: '#0c0c14' }}>
      {/* Sidebar Navigation */}
      <div
        className="border-r flex flex-col items-center py-4 gap-4 transition-all duration-300"
        style={{
          background: '#111119',
          borderColor: 'rgba(255,255,255,0.06)',
          width: isSidebarOpen ? '80px' : '0px',
          overflow: 'hidden',
          opacity: isSidebarOpen ? 1 : 0,
        }}
      >
        {/* Menu Icon */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-3 rounded-lg hover:bg-[#1f1f2e] transition-colors"
        >
          <Menu size={20} style={{ color: '#8888a0' }} />
        </button>

        {/* Categories */}
        {categories.map((category) => {
          const Icon = category.icon;
          const isActive = activeCategory === category.id;
          return (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className="flex flex-col items-center gap-1 p-2 rounded-lg transition-colors relative w-16"
              style={{
                background: isActive ? 'rgba(108,92,231,0.12)' : 'transparent',
              }}
            >
              {/* Icon with badge */}
              <div className="relative">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{
                    background: isActive ? '#6c5ce7' : '#1a1a25',
                  }}
                >
                  <Icon size={18} style={{ color: isActive ? '#ffffff' : '#8888a0' }} />
                </div>
                {category.count > 0 && (
                  <div
                    className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full"
                    style={{
                      background: '#6c5ce7',
                      fontSize: '9px',
                      fontWeight: 700,
                      color: '#ffffff',
                      minWidth: '18px',
                      textAlign: 'center',
                    }}
                  >
                    {category.count}
                  </div>
                )}
              </div>
              {/* Label */}
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  color: isActive ? '#e8e8ed' : '#8888a0',
                  textAlign: 'center',
                }}
              >
                {category.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{
            background: '#111119',
            borderColor: 'rgba(255,255,255,0.06)',
          }}
        >
          <div className="flex items-center gap-3">
            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 rounded-lg hover:bg-[#1f1f2e] transition-colors"
              >
                <Menu size={18} style={{ color: '#8888a0' }} />
              </button>
            )}
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#e8e8ed' }}>
              {categories.find((c) => c.id === activeCategory)?.label}
            </h2>
          </div>
          <button
            onClick={() => {
              if (activeCategory === 'personal') {
                // TODO: Open new message modal
                console.log('Open new message modal');
              } else {
                // Open create group modal
                setShowCreateGroupModal(true);
              }
            }}
            className="p-2 rounded-lg transition-colors hover:opacity-80"
            style={{
              background: '#6c5ce7',
            }}
          >
            <Plus size={18} style={{ color: '#ffffff' }} />
          </button>
        </div>

        {/* Search */}
        <div
          className="px-4 py-3 border-b"
          style={{
            background: '#111119',
            borderColor: 'rgba(255,255,255,0.06)',
          }}
        >
          <div className="relative">
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#8888a0',
              }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeCategory === 'discover'
                  ? 'Rechercher un groupe...'
                  : activeCategory === 'personal'
                  ? 'Rechercher une conversation...'
                  : 'Rechercher...'
              }
              className="w-full pl-10 pr-4 py-2 rounded-xl border outline-none focus:border-[#6c5ce7] transition-colors"
              style={{
                background: '#1a1a25',
                borderColor: 'rgba(255,255,255,0.06)',
                fontSize: '13px',
                color: '#e8e8ed',
              }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* DÉCOUVRIR - Tous les groupes */}
          {activeCategory === 'discover' && (
            <div className="px-4 py-4 space-y-3">
              {filteredAllGroups.length === 0 ? (
                <div className="text-center py-12">
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔍</div>
                  <p style={{ fontSize: '13px', color: '#8888a0' }}>
                    Aucun groupe trouvé
                  </p>
                </div>
              ) : (
                filteredAllGroups.map((group) => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    isJoined={joinedGroups.includes(group.id)}
                    onJoin={() => handleJoinGroup(group.id)}
                    onClick={() => setSelectedGroup(group)}
                  />
                ))
              )}
            </div>
          )}

          {/* MES GROUPES - Groupes rejoints */}
          {activeCategory === 'groups' && (
            <>
              {myJoinedGroups.length === 0 ? (
                <div className="text-center py-12">
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>💬</div>
                  <p style={{ fontSize: '13px', color: '#8888a0' }}>
                    Tu n'as rejoint aucun groupe
                  </p>
                </div>
              ) : (
                <>
                  <div
                    className="px-4 py-2 border-b"
                    style={{
                      background: '#111119',
                      borderColor: 'rgba(255,255,255,0.06)',
                    }}
                  >
                    <p style={{ fontSize: '11px', fontWeight: 700, color: '#8888a0', textTransform: 'uppercase' }}>
                      Mes Groupes
                    </p>
                  </div>
                  {myJoinedGroups.map((group) => (
                    <button
                      key={group.id}
                      onClick={() => setSelectedGroup(group)}
                      className="w-full flex items-center gap-3 px-4 py-3 border-b hover:bg-[#1f1f2e] transition-colors"
                      style={{
                        background: 'transparent',
                        borderColor: 'rgba(255,255,255,0.06)',
                      }}
                    >
                      {/* Group Icon */}
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{
                          background: '#1a1a25',
                        }}
                      >
                        <span style={{ fontSize: '24px' }}>{group.icon}</span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center justify-between mb-1">
                          <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#e8e8ed' }}>
                            {group.name}
                          </h4>
                          <span style={{ fontSize: '11px', color: '#8888a0' }}>
                            {group.onlineCount} en ligne
                          </span>
                        </div>
                        <p
                          className="truncate"
                          style={{
                            fontSize: '12px',
                            color: '#8888a0',
                          }}
                        >
                          {group.description}
                        </p>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </>
          )}

          {/* PERSONAL - Messages privés */}
          {activeCategory === 'personal' && (
            <>
              {filteredConversations.length === 0 ? (
                <div className="text-center py-12">
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>💬</div>
                  <p style={{ fontSize: '13px', color: '#8888a0' }}>
                    Aucune conversation
                  </p>
                </div>
              ) : (
                <>
                  <div
                    className="px-4 py-2 border-b"
                    style={{
                      background: '#111119',
                      borderColor: 'rgba(255,255,255,0.06)',
                    }}
                  >
                    <p style={{ fontSize: '11px', fontWeight: 700, color: '#8888a0', textTransform: 'uppercase' }}>
                      Messages Privés
                    </p>
                  </div>
                  {filteredConversations.map((conversation) => (
                    <ConversationCard
                      key={conversation.id}
                      conversation={conversation}
                      onClick={() => setSelectedConversation(conversation)}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Create Group Modal */}
      {showCreateGroupModal && (
        <CreateGroupModal
          onClose={() => setShowCreateGroupModal(false)}
          onCreate={handleCreateGroup}
        />
      )}
    </div>
  );
}