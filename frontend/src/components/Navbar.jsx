import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, logout, isLoggedIn } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <nav className="sticky top-0 z-50 bg-brand-navy/90 backdrop-blur-md border-b border-brand-border">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-brand-orange rounded-lg flex items-center justify-center text-white font-black text-sm group-hover:scale-110 transition-transform">
            ⚡
          </div>
          <span className="font-bold text-lg tracking-tight">
            <span className="text-white">Instant</span>
            <span className="text-brand-orange">Tech</span>
          </span>
        </Link>

        {/* Links */}
        {isLoggedIn && (
          <div className="flex items-center gap-6">
            {user?.role === 'technician' ? (
              <Link to="/technician" className="text-sm text-gray-300 hover:text-brand-orange transition-colors font-medium">Dashboard</Link>
            ) : (
              <Link to="/" className="text-sm text-gray-300 hover:text-brand-orange transition-colors font-medium">Book a Tech</Link>
            )}
          </div>
        )}

        {/* Auth */}
        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-brand-orange/20 border border-brand-orange/40 flex items-center justify-center text-brand-orange font-semibold text-sm">
                  {user?.name?.[0]?.toUpperCase()}
                </div>
                <span className="text-sm text-gray-300 hidden sm:block">{user?.name}</span>
              </div>
              <button onClick={handleLogout} className="btn-secondary text-sm py-1.5 px-4">Logout</button>
            </div>
          ) : (
            <Link to="/login" className="btn-primary py-2 px-5 text-sm">Login</Link>
          )}
        </div>
      </div>
    </nav>
  );
}
