import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Plus,
  Trash2,
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MoreVertical,
} from 'lucide-react';
import type { ChatSession } from '../../services/chatbot';

interface ChatSessionSidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  loading: boolean;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
  onDeleteSession: (sessionId: string) => void;
}

export const ChatSessionSidebar: React.FC<ChatSessionSidebarProps> = ({
  sessions,
  activeSessionId,
  loading,
  onSelectSession,
  onNewChat,
  onDeleteSession,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // ── Click-outside handler to close the dropdown ───────────────────────────
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    };

    if (menuOpenId) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpenId]);

  const toggleMenu = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    setMenuOpenId((prev) => (prev === sessionId ? null : sessionId));
  };

  const handleDelete = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    setMenuOpenId(null);
    setDeletingId(sessionId);
    onDeleteSession(sessionId);
    // Reset visual deleting state after a brief delay
    setTimeout(() => setDeletingId(null), 1000);
  };

  const formatTime = (isoStr: string) => {
    try {
      if (!isoStr) return '';
      // Ensure UTC timezone specifier if missing
      let safeIso = isoStr.trim();
      if (!safeIso.endsWith('Z') && !safeIso.includes('+') && !safeIso.includes('-', 11)) {
        safeIso = safeIso.replace(' ', 'T') + 'Z';
      }
      const d = new Date(safeIso);
      if (isNaN(d.getTime())) return '';

      const now = new Date();
      const diffMs = Math.max(0, now.getTime() - d.getTime());
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-2 py-3 px-1.5 bg-white border-r border-slate-200 w-12 shrink-0">
        <button
          onClick={() => setCollapsed(false)}
          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
          title="Expand sidebar"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={onNewChat}
          className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-all"
          title="New Chat"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-64 shrink-0 bg-white border-r border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-indigo-600" />
          <span className="text-sm font-semibold text-slate-800 tracking-tight">
            Chat History
          </span>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
          title="Collapse sidebar"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* New Chat Button */}
      <div className="px-3 py-2.5">
        <button
          onClick={onNewChat}
          className="flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 rounded-lg shadow-sm shadow-indigo-500/20 transition-all active:scale-[0.98]"
        >
          <Plus className="w-3.5 h-3.5" />
          New Chat
        </button>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
            <span className="ml-2 text-xs text-slate-400">Loading sessions...</span>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 px-3">
            <MessageSquare className="w-8 h-8 text-slate-200 mx-auto mb-2" />
            <p className="text-xs text-slate-400">No chat history yet.</p>
            <p className="text-[10px] text-slate-300 mt-1">Start a new conversation!</p>
          </div>
        ) : (
          sessions.map((session) => {
            const isActive = session.SESSION_ID === activeSessionId;
            const isDeleting = session.SESSION_ID === deletingId;
            const isMenuOpen = session.SESSION_ID === menuOpenId;

            return (
              <button
                key={session.SESSION_ID}
                onClick={() => onSelectSession(session.SESSION_ID)}
                disabled={isDeleting}
                className={`
                  group w-full text-left px-2.5 py-2 rounded-lg transition-all relative
                  ${isActive
                    ? 'bg-indigo-50 border border-indigo-200 shadow-sm'
                    : 'hover:bg-slate-50 border border-transparent'
                  }
                  ${isDeleting ? 'opacity-40 pointer-events-none' : ''}
                `}
              >
                <div className="flex items-start justify-between gap-1.5">
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-xs font-medium truncate ${
                        isActive ? 'text-indigo-700' : 'text-slate-700'
                      }`}
                    >
                      {session.SUBJECT || 'Untitled Chat'}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Clock className="w-2.5 h-2.5 text-slate-300" />
                      <span className="text-[10px] text-slate-400">
                        {formatTime(session.UPDATED_AT)}
                      </span>
                    </div>
                  </div>

                  {/* Three-dots menu button — visible on hover */}
                  <div className="relative shrink-0" ref={isMenuOpen ? menuRef : null}>
                    <button
                      onClick={(e) => toggleMenu(e, session.SESSION_ID)}
                      className={`
                        p-1 rounded-md transition-all
                        ${isMenuOpen
                          ? 'opacity-100 text-slate-600 bg-slate-100'
                          : 'opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                        }
                      `}
                      title="Session options"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>

                    {/* Dropdown Context Menu */}
                    {isMenuOpen && (
                      <div
                        className="absolute right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-lg shadow-lg shadow-slate-200/50 py-1 min-w-[140px] animate-in fade-in slide-in-from-top-1 duration-150"
                      >
                        <button
                          onClick={(e) => handleDelete(e, session.SESSION_ID)}
                          className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="font-medium">Delete Session</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
