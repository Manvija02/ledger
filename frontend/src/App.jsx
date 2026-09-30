import { Routes, Route, Navigate } from 'react-router-dom';
import { useUser } from './UserContext';
import Login from './pages/Login';
import Layout from './components/Layout';
import ClientHome from './pages/ClientHome';
import CPADashboard from './pages/CPADashboard';
import AllReturns from './pages/AllReturns';
import DocumentsIndex from './pages/DocumentsIndex';
import MessagesIndex from './pages/MessagesIndex';
import Team from './pages/Team';
import ReturnDetailLayout from './pages/ReturnDetailLayout';
import OverviewTab from './pages/tabs/OverviewTab';
import ReviewTab from './pages/tabs/ReviewTab';
import DocumentsTabRoute from './pages/tabs/DocumentsTabRoute';
import MessagesTabRoute from './pages/tabs/MessagesTabRoute';
import AITab from './pages/tabs/AITab';

function RootRedirect() {
  const { user } = useUser();
  return <Navigate to={user.role === 'client' ? '/home' : '/dashboard'} replace />;
}

export default function App() {
  const { user, loading } = useUser();

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-40)', fontSize: 13 }}>Loading…</div>;
  }
  if (!user) {
    return <Login />;
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/home" element={<ClientHome />} />
        <Route path="/dashboard" element={<CPADashboard />} />
        <Route path="/returns" element={<AllReturns />} />
        <Route path="/documents" element={<DocumentsIndex />} />
        <Route path="/messages" element={<MessagesIndex />} />
        <Route path="/team" element={<Team />} />
        <Route path="/returns/:id" element={<ReturnDetailLayout />}>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<OverviewTab />} />
          <Route path="review" element={<ReviewTab />} />
          <Route path="documents" element={<DocumentsTabRoute />} />
          <Route path="messages" element={<MessagesTabRoute />} />
          <Route path="ai" element={<AITab />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
