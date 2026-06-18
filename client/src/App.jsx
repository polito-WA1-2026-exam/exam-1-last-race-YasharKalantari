import { Routes, Route, Navigate } from 'react-router-dom';
import { Container, Spinner } from 'react-bootstrap';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import NavHeader from './components/NavHeader.jsx';
import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import GamePage from './pages/GamePage.jsx';
import RankingPage from './pages/RankingPage.jsx';

// AppLayout is a separate component because it needs useAuth(), which only works
// INSIDE the AuthProvider. App provides the context; AppLayout consumes it.
function AppLayout() {
  const { loading } = useAuth();

  return (
    <>
      <NavHeader />
      <Container className="mt-3">
        {loading ? (
          <div className="text-center mt-5">
            <Spinner animation="border" />
          </div>
        ) : (
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/game" element={<GamePage />} />
            <Route path="/ranking" element={<RankingPage />} />
            {/* anything else: send the user home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </Container>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppLayout />
    </AuthProvider>
  );
}

export default App;
