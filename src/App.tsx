import { Sidebar } from './components/Layout/Sidebar';
import { Header } from './components/Layout/Header';
import { UploadPage } from './components/Upload/UploadPage';
import { DashboardPage } from './components/Dashboard/DashboardPage';
import { InsightsPage } from './components/Insights/InsightsPage';
import { ChatPage } from './components/Chat/ChatPage';
import { ReportPage } from './components/Report/ReportPage';
import { useStore } from './store/useStore';

function AppContent() {
  const { state } = useStore();

  const renderPage = () => {
    switch (state.currentPage) {
      case 'upload': return <UploadPage />;
      case 'dashboard': return <DashboardPage />;
      case 'insights': return <InsightsPage />;
      case 'chat': return <ChatPage />;
      case 'report': return <ReportPage />;
      default: return <UploadPage />;
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Header />
        <div className="page-content">
          {renderPage()}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return <AppContent />;
}
