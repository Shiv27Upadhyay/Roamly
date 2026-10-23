import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import AuthModal from './components/auth/AuthModal';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import InitialLoader from './components/common/InitialLoader';
import RouteTransition from './components/common/RouteTransition';
import CursorTrail from './components/common/CursorTrail';

// Pages
import HomePage from './pages/HomePage';
import DestinationsPage from './pages/DestinationsPage';
import DestinationDetailPage from './pages/DestinationDetailPage';
import TripsPage from './pages/TripsPage';
import TripDetailPage from './pages/TripDetailPage';
import CreateEditTripPage from './pages/CreateEditTripPage';
import ProfilePage from './pages/ProfilePage';

// 404 NotFound
function NotFoundPage() {
  return (
    <div className="container" style={{ paddingTop: 'var(--space-20)', paddingBottom: 'var(--space-20)', textAlign: 'center' }}>
      <div style={{ maxWidth: '520px', margin: '0 auto' }}>
        <span style={{ fontSize: '4rem', fontFamily: 'var(--font-serif)', color: 'var(--color-terracotta)', display: 'block', marginBottom: '8px' }}>
          404
        </span>
        <h1 style={{ fontSize: '2.2rem', marginBottom: '16px' }}>Off the Beaten Path</h1>
        <p style={{ color: 'var(--color-ink-muted)', fontSize: '1.1rem', marginBottom: '28px' }}>
          The page or travel journal you are searching for does not exist or has been relocated.
        </p>
        <Link to="/" className="btn btn-primary">
          Return to Roamly Home
        </Link>
      </div>
    </div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();

  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <Routes location={location}>
      <Route path="/" element={<HomePage />} />
      <Route path="/destinations" element={<DestinationsPage />} />
      <Route path="/destinations/:id" element={<DestinationDetailPage />} />
      <Route path="/trips" element={<TripsPage />} />
      <Route path="/trips/new" element={<CreateEditTripPage />} />
      <Route path="/trips/:id" element={<TripDetailPage />} />
      <Route path="/trips/:id/edit" element={<CreateEditTripPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <InitialLoader />
        <Router>
          <CursorTrail />
          <RouteTransition />
          <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Navbar />
            <main className="main-content" style={{ flex: 1 }}>
              <AnimatedRoutes />
            </main>
            <Footer />
          </div>
          <AuthModal />
        </Router>
      </AuthProvider>
    </ToastProvider>
  );
}
