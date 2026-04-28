import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const SERVICES = [
  { id: 'plumber',          label: 'Plumber',          icon: '🔧', desc: 'Pipes, taps, drainage' },
  { id: 'electrician',      label: 'Electrician',      icon: '⚡', desc: 'Wiring, switches, fans' },
  { id: 'ac_repair',        label: 'AC Repair',        icon: '❄️', desc: 'Cooling, servicing' },
  { id: 'carpenter',        label: 'Carpenter',        icon: '🪚', desc: 'Furniture, doors, shelves' },
  { id: 'painter',          label: 'Painter',          icon: '🖌️', desc: 'Wall painting, touch-ups' },
  { id: 'appliance_repair', label: 'Appliance Repair', icon: '🔌', desc: 'Fridge, washing machine' },
  { id: 'mason',            label: 'Mason',            icon: '🧱', desc: 'Tiles, concrete, plaster' },
  { id: 'cleaner',          label: 'Cleaner',          icon: '🧹', desc: 'Home & office cleaning' },
];

export default function Home() {
  const [selected, setSelected] = useState(null);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [aiStatus, setAiStatus] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const navigate = useNavigate();

  const getLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported. Defaulting to Chennai.');
      setLocation({ lat: 13.0827, lng: 80.2707 });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {
        setLocationError('Location access denied. Using Chennai as default.');
        setLocation({ lat: 13.0827, lng: 80.2707 });
      }
    );
  };

  useEffect(() => { getLocation(); }, []);

  const handleFindTechs = async () => {
    if (!selected) return;
    setLoading(true);
    const loc = location || { lat: 13.0827, lng: 80.2707 };
    navigate(`/technicians?skill=${selected}&lat=${loc.lat}&lng=${loc.lng}`);
  };

  const handleAiBook = async () => {
    if (!aiMessage.trim()) return;
    setAiLoading(true);
    setAiStatus('Analyzing your request...');
    try {
      const loc = location || { lat: 13.0827, lng: 80.2707 };
      const stored = JSON.parse(localStorage.getItem('itb_auth') || '{}');
      
      // Simulate progressive status
      setTimeout(() => setAiStatus('Finding best technician nearby...'), 1200);
      setTimeout(() => setAiStatus('Checking availability...'), 2400);
      setTimeout(() => setAiStatus('Finalizing booking...'), 3600);

      const res = await axios.post('/api/agent/book', {
        message: aiMessage,
        userLat: loc.lat,
        userLng: loc.lng,
        userId: stored.user?.id,
        authToken: stored.token,
      });
      
      if (res.data.success) {
        setAiStatus('Success! Redirecting...');
        setTimeout(() => navigate(`/tracking/${res.data.data.booking.bookingId}`), 800);
      }
    } catch (err) {
      setAiStatus('');
      alert(err.response?.data?.message || 'AI booking failed. Please try manually.');
    } finally {
      if (!aiStatus.includes('Success')) setAiLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 animate-fade-in">
      {/* Hero */}
      <div className="text-center mb-12">
        <div className="inline-block bg-brand-orange/10 border border-brand-orange/20 text-brand-orange text-sm font-medium px-4 py-1.5 rounded-full mb-4">
          ⚡ Instant Home Services
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 leading-tight">
          Book a Technician<br />
          <span className="text-brand-orange">Near You — Instantly</span>
        </h1>
        <p className="text-gray-400 text-lg max-w-xl mx-auto">
          Find skilled plumbers, electricians, AC technicians and more. Real-time tracking, verified professionals.
        </p>

        {locationError && (
          <p className="mt-3 text-yellow-400 text-sm">⚠️ {locationError}</p>
        )}
        {location && !locationError && (
          <p className="mt-3 text-green-400 text-sm">✅ Location detected ({location.lat.toFixed(4)}, {location.lng.toFixed(4)})</p>
        )}
      </div>

      {/* AI Chat Booking */}
      <div className="card glow-orange mb-10 border-brand-orange/30">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">🤖</span>
          <h2 className="font-bold text-white">AI Booking Assistant</h2>
          <span className="badge bg-brand-orange/10 text-brand-orange border border-brand-orange/20 text-xs">Powered by AI agents</span>
        </div>
        <p className="text-gray-400 text-sm mb-4">Describe your problem in plain English — our AI will find and book the best technician for you automatically.</p>
        <div className="flex gap-3">
          <input
            className="input flex-1"
            placeholder='e.g. "my kitchen tap is leaking badly" or "AC is not cooling"'
            value={aiMessage}
            onChange={e => setAiMessage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAiBook()}
            disabled={aiLoading}
          />
          <button className="btn-primary whitespace-nowrap min-w-[140px]" onClick={handleAiBook} disabled={aiLoading || !aiMessage.trim()}>
            {aiLoading ? '⏳ processing...' : '🚀 Book Now'}
          </button>
        </div>
        {aiLoading && (
          <div className="mt-4 flex items-center gap-3 text-brand-orange animate-pulse">
            <div className="w-2 h-2 rounded-full bg-brand-orange animate-ping" />
            <span className="text-sm font-medium">{aiStatus}</span>
          </div>
        )}
      </div>

      {/* Service Categories */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-white mb-2">Or choose a service</h2>
        <p className="text-gray-500 text-sm mb-6">Select a category and we'll show you the best technicians near you.</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {SERVICES.map(svc => (
            <button
              key={svc.id}
              onClick={() => setSelected(svc.id === selected ? null : svc.id)}
              className={`card text-left transition-all duration-200 hover:border-brand-orange/50 hover:-translate-y-1 
                ${selected === svc.id ? 'border-brand-orange glow-orange bg-brand-orange/5' : ''}`}
            >
              <div className="text-3xl mb-2">{svc.icon}</div>
              <div className="font-semibold text-white text-sm">{svc.label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{svc.desc}</div>
              {selected === svc.id && (
                <div className="absolute top-3 right-3 w-5 h-5 bg-brand-orange rounded-full flex items-center justify-center text-white text-xs">✓</div>
              )}
            </button>
          ))}
        </div>

        <button
          className={`btn-primary w-full py-4 text-base ${!selected ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={handleFindTechs}
          disabled={!selected || loading}
        >
          {loading ? '🔍 Finding technicians...' : `🔍 Find ${selected ? SERVICES.find(s=>s.id===selected)?.label+'s' : 'Technicians'} Near Me`}
        </button>
      </div>
    </div>
  );
}
