/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { CommandPalette } from './components/CommandPalette';
import { ExecutiveDashboard } from './screens/ExecutiveDashboard';
import { GraphStudio } from './screens/GraphStudio';
import { RAGChat } from './screens/RAGChat';
import { DatasetIngestion } from './screens/DatasetIngestion';
import { DataExplorer } from './screens/DataExplorer';
import { AlertsNotifications } from './screens/AlertsNotifications';
import { ReportsLibrary } from './screens/ReportsLibrary';
import { DataSources } from './screens/DataSources';
import { UserManagement } from './screens/UserManagement';
import { SystemSettings } from './screens/SystemSettings';
import { EnterpriseSignIn, UserContext } from './screens/EnterpriseSignIn';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<UserContext | null>(null);
  const [activePath, setActivePath] = useState<string>('executive-dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');

    if (!token) {
      setIsAuthenticated(false);
      setCurrentUser(null);
      return;
    }

    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Not authenticated');
      })
      .then((user: UserContext) => {
        if (user && (user.user_id || user.email)) {
          setCurrentUser(user);
          setIsAuthenticated(true);
        } else {
          throw new Error('Invalid user context');
        }
      })
      .catch(() => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        setIsAuthenticated(false);
        setCurrentUser(null);
      });
  }, []);

  const [customGraphPrompt, setCustomGraphPrompt] = useState<string>(
    'Show monthly Net Revenue and Gross Margin comparison across 2024 and 2025 as a dual-axis trendline with milestone annotations'
  );

  const handleNavigate = (path: string) => {
    setActivePath(path);
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogout = () => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {});
    }
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setIsAuthenticated(false);
    setCurrentUser(null);
    setActivePath('enterprise-signin');
    setSidebarOpen(false);
  };

  const handleSelectQueryFromPalette = (query: string) => {
    setCustomGraphPrompt(query);
  };

  const isAuthPage = !isAuthenticated || activePath === 'enterprise-signin' || activePath === 'enterprisesignin';
  const isChat = activePath === 'ai-dashboards-rag-chat';

  if (isAuthPage) {
    return (
      <EnterpriseSignIn
        onSignInSuccess={(user) => {
          setIsAuthenticated(true);
          if (user) {
            setCurrentUser(user);
          }
          handleNavigate('executive-dashboard');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen min-h-dvh bg-[#F8FAFC] text-[#0F172A] font-body-md antialiased select-auto w-full overflow-x-hidden flex flex-col">
      {/* Global Responsive Header */}
      <Header
        activePath={activePath}
        onNavigate={handleNavigate}
        onToggleSidebar={() => setSidebarOpen(prev => !prev)}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        onLogout={handleLogout}
        user={currentUser}
      />

      {/* Global Sidebar Navigation (Drawer on mobile/tablet/foldable, Fixed 260px on desktop) */}
      <Sidebar
        activePath={activePath}
        onNavigate={handleNavigate}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area - Fluidly & Automatically Determined for Every Screen & Aspect Ratio */}
      <div className="pl-0 lg:pl-[260px] w-full flex-1 transition-all duration-300">
        <main
          className={`w-full pt-[60px] sm:pt-[72px] bg-[#F8FAFC] ${isChat
              ? 'h-[100dvh] overflow-hidden pb-14 sm:pb-16 lg:pb-0 flex flex-col'
              : 'min-h-screen min-h-dvh pb-24 lg:pb-12'
            }`}
        >
          {/* RAG Chat container maintained client-side to preserve active session state across page navigation */}
          <div className={`flex-1 w-full max-w-[1600px] mx-auto p-2 sm:p-3 lg:p-4 overflow-hidden flex-col ${isChat ? 'flex' : 'hidden'}`}>
            <RAGChat onNavigate={handleNavigate} />
          </div>

          {!isChat && (
            <div className="max-w-[1440px] mx-auto p-margin">
              {activePath === 'executive-dashboard' && (
                <ExecutiveDashboard onNavigate={handleNavigate} />
              )}

              {activePath === 'build-your-kpi-graph-studio' && (
                <GraphStudio
                  initialPrompt={customGraphPrompt}
                  onNavigate={handleNavigate}
                />
              )}

              {activePath === 'upload-dataset' && (
                <DatasetIngestion onNavigate={handleNavigate} />
              )}

              {activePath === 'data-explorer' && (
                <DataExplorer onNavigate={handleNavigate} />
              )}

              {activePath === 'alerts-notifications' && (
                <AlertsNotifications onNavigate={handleNavigate} />
              )}

              {activePath === 'reports-library' && (
                <ReportsLibrary onNavigate={handleNavigate} />
              )}

              {activePath === 'data-sources' && (
                <DataSources onNavigate={handleNavigate} />
              )}

              {activePath === 'user-management' && (
                <UserManagement onNavigate={handleNavigate} />
              )}

              {activePath === 'system-settings' && (
                <SystemSettings onNavigate={handleNavigate} />
              )}
            </div>
          )}
        </main>
      </div>

      {/* Mobile / Tablet Bottom Ergonomic Navigation Bar (Hidden on desktop) */}
      <MobileBottomNav
        activePath={activePath}
        onNavigate={handleNavigate}
        onOpenDrawer={() => setSidebarOpen(true)}
      />

      {/* Global Quick Jump Command Palette (Cmd+K) */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigate={handleNavigate}
        onSelectQuery={handleSelectQueryFromPalette}
      />
    </div>
  );
}
