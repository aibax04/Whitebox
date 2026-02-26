import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Search, MessageSquare, Calendar, Edit2, Check, X, Trash2 } from 'lucide-react';
import { BackendChatSession } from '../types';

interface ChatSidebarProps {
  chatSessions: BackendChatSession[];
  currentSessionId: string | null;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filteredSessions: BackendChatSession[];
  editingTitle: string | null;
  editingTitleValue: string;
  setEditingTitleValue: (value: string) => void;
  createNewChat: () => void;
  loadChatSession: (sessionId: string) => void;
  deleteChatSession: (sessionId: string, e: React.MouseEvent) => void;
  handleStartRename: (sessionId: string, currentTitle: string) => void;
  handleCancelRename: () => void;
  handleSaveRename: (sessionId: string) => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  chatSessions,
  currentSessionId,
  searchTerm,
  setSearchTerm,
  filteredSessions,
  editingTitle,
  editingTitleValue,
  setEditingTitleValue,
  createNewChat,
  loadChatSession,
  deleteChatSession,
  handleStartRename,
  handleCancelRename,
  handleSaveRename
}) => {
  return (
    <div className="w-80 bg-[#0D1117] border-r border-squadrun-primary/20 flex flex-col">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-transparent">
        <Button
          onClick={createNewChat}
          className="w-full rounded-full bg-[#4F52B2] hover:bg-[#4F52B2]/80 text-white flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Start New Chat
        </Button>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-transparent">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-squadrun-gray" />
          <input
            type="text"
            placeholder="Search for chats"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#181D23] border border-none rounded-full text-white placeholder-squadrun-gray focus:outline-none focus:border-squadrun-primary"
          />
        </div>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-hidden">
        <div className="p-4">
          <h3 className="text-sm font-medium text-squadrun-gray mb-4">All Chats</h3>
        </div>
        <ScrollArea className="flex-1 px-4">
          <div className="space-y-2">
            {filteredSessions.map((session) => {
              // Use the title from MongoDB - if it's null/undefined, show 'New Chat' only for new sessions
              const title = session.title || 'New Chat';
              
              const isEditing = editingTitle === session.sessionId;
              
              return (
                <div
                  key={session.sessionId}
                  className={`group flex items-center justify-between p-3 rounded-2xl transition-colors ${
                    currentSessionId === session.sessionId
                    ? 'bg-squadrun-primary/20 text-[#C9D1D9]'
                    : 'text-squadrun-gray hover:bg-squadrun-primary/10 hover:text-white'
                }`}
                >
                  <div 
                    className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                    onClick={() => !isEditing && loadChatSession(session.sessionId)}
                  >

                    <div className="min-w-0 flex-1">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editingTitleValue}
                            onChange={(e) => setEditingTitleValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveRename(session.sessionId);
                              } else if (e.key === 'Escape') {
                                handleCancelRename();
                              }
                            }}
                            className="text-sm font-medium bg-transparent border border-squadrun-primary/30 rounded px-2 py-1 text-white focus:outline-none focus:border-squadrun-primary"
                            autoFocus
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSaveRename(session.sessionId)}
                            className="h-6 w-6 p-0 text-green-400 hover:text-green-300"
                          >
                            <Check className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCancelRename}
                            className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="text-sm font-medium truncate">
                          {title}
                        </div>
                      )}
                      <div className="text-xs opacity-60 flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {session.messages.length} message(s)
                      </div>
                      <div className="text-xs opacity-60 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(session.updatedAt).toLocaleDateString()}
                        <span className="text-xs opacity-60">•</span>
                        {new Date(session.updatedAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  {!isEditing && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartRename(session.sessionId, title);
                        }}
                        className="h-6 w-6 p-0 text-squadrun-gray hover:text-white"
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => deleteChatSession(session.sessionId, e)}
                        className="h-6 w-6 p-0 text-squadrun-gray hover:text-red-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};
