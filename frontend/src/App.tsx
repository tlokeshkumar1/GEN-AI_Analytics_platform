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
        return <DashboardPage />;
      case 'chat':
        return <ChatbotPage />;
      case 'graph':
        return <CustomGraphPage />;
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
