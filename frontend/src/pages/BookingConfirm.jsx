import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const SKILL_ICONS = { plumber:'🔧', electrician:'⚡', ac_repair:'❄️', carpenter:'🪚', painter:'🖌️', appliance_repair:'🔌', mason:'🧱', cleaner:'🧹' };

export default function BookingConfirm() {
  const { techId } = useParams();
  const navigate = useNavigate();
  const [tech, setTech] = useState(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [description, setDescription] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [userLocation, setUserLocation] = useState({ lat: 13.0827, lng: 80.2707 });

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      p => setUserLocation({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => {}
    );
    axios.get(`/api/technicians/${techId}`).then(res => {
      setTech(res.data.data);
      setSelectedService(res.data.data.skills?.[0] || '');
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [techId]);

  const handleConfirm = async () => {
    setBooking(true);
    try {
      const res = await axios.post('/api/bookings', {
        technicianId: techId,
        serviceType: selectedService,
        userLat: userLocation.lat,
        userLng: userLocation.lng,
        description,
      });
      navigate(`/tracking/${res.data.data._id}`);
    } catch (err) {
      alert(err.response?.data?.message || 'Booking failed. Please try again.');
      setBooking(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-brand-orange text-2xl animate-spin">⚙️</div>;
  if (!tech) return <div className="text-center py-20 text-gray-400">Technician not found.</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 animate-slide-up">
      <button onClick={() => window.history.back()} className="text-gray-400 hover:text-white text-sm mb-6 block">← Back to results</button>

      <h1 className="text-3xl font-bold text-white mb-8">Confirm Your Booking</h1>

      {/* Technician Card */}
      <div className="card mb-6 border-brand-orange/30">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-orange/30 to-brand-orange/10 border border-brand-orange/20 flex items-center justify-center text-3xl">
            {SKILL_ICONS[tech.skills?.[0]] || '👷'}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{tech.name}</h2>
            <div className="flex items-center gap-1 text-brand-amber text-sm">
              ★ {tech.rating?.toFixed(1)} · {tech.totalReviews} reviews
            </div>
          </div>
          <div className={`ml-auto px-3 py-1.5 rounded-full text-xs font-semibold border ${tech.isAvailable ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
            {tech.isAvailable ? '● Available' : '● Busy'}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {tech.skills?.map(s => (
            <span key={s} className="badge bg-brand-orange/10 text-brand-orange border border-brand-orange/20">
              {SKILL_ICONS[s]} {s.replace('_', ' ')}
            </span>
          ))}
        </div>
      </div>

      {/* Service Selector */}
      <div className="card mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-3">Select Service</label>
        <div className="flex flex-wrap gap-3">
          {tech.skills?.map(s => (
            <button key={s} onClick={() => setSelectedService(s)}
              className={`px-4 py-2 rounded-xl border text-sm font-medium transition-all ${selectedService === s ? 'bg-brand-orange border-brand-orange text-white' : 'bg-brand-navy border-brand-border text-gray-300 hover:border-brand-orange/50'}`}>
              {SKILL_ICONS[s]} {s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div className="card mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-3">Describe the Problem</label>
        <textarea
          className="input resize-none"
          rows={4}
          placeholder="e.g. Kitchen tap is leaking, need urgent fix..."
          value={description}
          onChange={e => setDescription(e.target.value)}
          maxLength={500}
        />
        <p className="text-xs text-gray-600 mt-1 text-right">{description.length}/500</p>
      </div>

      {/* Summary */}
      <div className="card mb-8 bg-brand-navy">
        <h3 className="font-semibold text-white mb-3">Booking Summary</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-400">Technician</span><span className="text-white font-medium">{tech.name}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">Service</span><span className="text-brand-orange font-medium capitalize">{selectedService.replace('_', ' ')}</span></div>
          <div className="flex justify-between"><span className="text-gray-400">Base Visit Charge</span><span className="text-white font-medium">₹150</span></div>
          <div className="flex justify-between text-xs text-gray-500 border-t border-brand-border pt-2">
            <span>Additional charges as per work done</span>
          </div>
        </div>
      </div>

      <button
        className={`btn-primary w-full py-4 text-base ${!selectedService || booking ? 'opacity-60 cursor-not-allowed' : ''}`}
        onClick={handleConfirm}
        disabled={!selectedService || booking}
      >
        {booking ? '⏳ Confirming...' : '✅ Confirm Booking'}
      </button>
    </div>
  );
}
