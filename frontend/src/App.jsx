import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Home from './pages/Home.jsx';
import TechnicianList from './pages/TechnicianList.jsx';
import BookingConfirm from './pages/BookingConfirm.jsx';
import Tracking from './pages/Tracking.jsx';
import TechnicianDashboard from './pages/TechnicianDashboard.jsx';
import Login from './pages/Login.jsx';
import { useAuth } from './context/AuthContext.jsx';

function ProtectedRoute({ children }) {
  const { isLoggedIn, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen text-brand-orange">Loading...</div>;
  return isLoggedIn ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <div className="min-h-screen bg-brand-dark">
      <Navbar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/technicians" element={<ProtectedRoute><TechnicianList /></ProtectedRoute>} />
        <Route path="/booking/:techId" element={<ProtectedRoute><BookingConfirm /></ProtectedRoute>} />
        <Route path="/tracking/:bookingId" element={<ProtectedRoute><Tracking /></ProtectedRoute>} />
        <Route path="/technician" element={<ProtectedRoute><TechnicianDashboard /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
