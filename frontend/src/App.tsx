import React, { useState } from 'react';
import { Layout } from './components/Layout/Layout';
import { DashboardPage } from './pages/Dashboard';
import { ChatbotPage } from './pages/Chatbot';
import { CustomGraphPage } from './components/Graph/CustomGraphPage';
import { NotFoundPage } from './pages/NotFound';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage onNavigate={setActiveTab} />;
      case 'graph':
        return <CustomGraphPage />;
      case 'chat':
        return <ChatbotPage onNavigate={setActiveTab} />;
      default:
        return <NotFoundPage />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>
  );
};

export default App;
