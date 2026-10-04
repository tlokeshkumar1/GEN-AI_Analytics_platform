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
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [usesRouterSession, setUsesRouterSession] = useState(false);
  const [activePath, setActivePath] = useState<string>('executive-dashboard');
  const [hasOpenedChat, setHasOpenedChat] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');

    // AppRouter forwards its SAP access token using the HttpOnly session cookie.
    // Check that session before considering a token from a local sign-in.
    let cancelled = false;
    let routerSession = true;
    fetch('/api/auth/me', { credentials: 'same-origin' })
      .then((res) => {
        if ((res.status === 401 || res.status === 403) && token) {
          routerSession = false;
          return fetch('/api/auth/me', {
            credentials: 'same-origin',
            headers: { Authorization: `Bearer ${token}` }
          });
        }
        return res;
      })
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Not authenticated');
      })
      .then((user: UserContext) => {
        if (cancelled) return;
        if (user && (user.user_id || user.email)) {
          if (routerSession) {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('sap_ias_sso_token');
          }
          localStorage.setItem('auth_user', JSON.stringify(user));
          setUsesRouterSession(routerSession);
          setCurrentUser(user);
          setIsAuthenticated(true);
        } else {
          throw new Error('Invalid user context');
        }
      })
      .catch(() => {
        if (cancelled) return;
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        setIsAuthenticated(false);
        setCurrentUser(null);
      })
      .finally(() => {
        if (!cancelled) setIsCheckingSession(false);
      });
    return () => { cancelled = true; };
  }, []);

  const [customGraphPrompt, setCustomGraphPrompt] = useState<string>(
    'Show monthly Net Revenue and Gross Margin comparison across 2024 and 2025 as a dual-axis trendline with milestone annotations'
  );

  const handleNavigate = (path: string) => {
    if (path === 'ai-dashboards-rag-chat') setHasOpenedChat(true);
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
    setHasOpenedChat(false);
    setActivePath('enterprise-signin');
    setSidebarOpen(false);
    if (usesRouterSession) {
      window.location.assign('/logout');
    }
  };

  const handleSelectQueryFromPalette = (query: string) => {
    setCustomGraphPrompt(query);
  };

  const isAuthPage = !isAuthenticated || activePath === 'enterprise-signin' || activePath === 'enterprisesignin';
  const isChat = activePath === 'ai-dashboards-rag-chat';

  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] text-[#0F172A]" role="status" aria-live="polite">
        Signing in with SAP Universal ID / BTP IAS…
      </div>
    );
  }

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
            {hasOpenedChat && <RAGChat key={currentUser?.user_id || currentUser?.email} onNavigate={handleNavigate} isActive={isChat} />}
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
