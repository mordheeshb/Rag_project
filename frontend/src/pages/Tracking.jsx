import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { StatusBadge } from '../components/TechCard.jsx';

const STATUS_STEPS = ['pending', 'accepted', 'en_route', 'arrived', 'completed'];
const STATUS_LABELS = { pending: 'Waiting for Technician', accepted: 'Technician Accepted', en_route: 'On the Way', arrived: 'Technician Arrived', completed: 'Job Completed', cancelled: 'Booking Cancelled' };
const STATUS_ICONS  = { pending: '⏳', accepted: '✅', en_route: '🚗', arrived: '🏠', completed: '🎉', cancelled: '❌' };

export default function Tracking() {
  const { bookingId } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [techLocation, setTechLocation] = useState(null);
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const techMarker = useRef(null);

  // Fetch booking details
  useEffect(() => {
    axios.get(`/api/bookings/${bookingId}`).then(res => {
      setBooking(res.data.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [bookingId]);

  // Socket.IO for real-time updates
  useEffect(() => {
    const socket = io('http://localhost:3000');

    socket.on('booking:status_changed', ({ bookingId: id, status }) => {
      if (id === bookingId) {
        setBooking(prev => prev ? { ...prev, status } : prev);
      }
    });

    socket.on('technician:location_update', ({ bookingId: id, lat, lng }) => {
      if (id === bookingId) {
        setTechLocation({ lat, lng });
      }
    });

    return () => socket.disconnect();
  }, [bookingId]);

  // Initialize Leaflet map
  useEffect(() => {
    if (!booking || leafletMap.current || !mapRef.current) return;

    // Dynamic import to avoid SSR issues
    import('leaflet').then(L => {
      const map = L.default.map(mapRef.current).setView(
        [booking.userLocation.lat, booking.userLocation.lng], 14
      );

      L.default.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);

      // User location marker (blue)
      L.default.marker([booking.userLocation.lat, booking.userLocation.lng], {
        icon: L.default.divIcon({
          html: '<div class="w-6 h-6 rounded-full bg-blue-500 border-2 border-white shadow-lg flex items-center justify-center text-xs">🏠</div>',
          className: '',
        }),
      }).addTo(map).bindPopup('Your location');

      // Technician marker (orange) — simulated location
      const initLat = booking.technicianId?.location?.lat || booking.userLocation.lat + 0.01;
      const initLng = booking.technicianId?.location?.lng || booking.userLocation.lng + 0.01;
      techMarker.current = L.default.marker([initLat, initLng], {
        icon: L.default.divIcon({
          html: '<div class="w-8 h-8 rounded-full bg-orange-500 border-2 border-white shadow-lg flex items-center justify-center text-sm animate-bounce">👷</div>',
          className: '',
        }),
      }).addTo(map).bindPopup(`Technician: ${booking.technicianId?.name || 'En route'}`);

      leafletMap.current = map;
    });
  }, [booking]);

  // Update technician marker on location update
  useEffect(() => {
    if (techLocation && techMarker.current) {
      techMarker.current.setLatLng([techLocation.lat, techLocation.lng]);
      leafletMap.current?.panTo([techLocation.lat, techLocation.lng]);
    }
  }, [techLocation]);

  if (loading) return <div className="flex items-center justify-center h-64 text-brand-orange animate-pulse text-2xl">⚙️ Loading tracking...</div>;
  if (!booking) return <div className="text-center py-20 text-gray-400">Booking not found.</div>;

  const currentStep = STATUS_STEPS.indexOf(booking.status);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">Live Tracking</h1>
        <StatusBadge status={booking.status} />
      </div>

      {/* Status stepper */}
      <div className="card mb-6">
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 right-0 top-4 h-0.5 bg-brand-border z-0" />
          {STATUS_STEPS.map((step, i) => (
            <div key={step} className="flex flex-col items-center gap-2 z-10">
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm transition-all duration-500
                ${i < currentStep ? 'bg-green-500 border-green-500 text-white' :
                  i === currentStep ? 'bg-brand-orange border-brand-orange text-white scale-110 shadow-[0_0_15px_rgba(249,115,22,0.5)]' :
                  'bg-brand-navy border-brand-border text-gray-500'}`}>
                {i < currentStep ? '✓' : STATUS_ICONS[step]}
              </div>
              <span className={`text-xs font-medium ${i === currentStep ? 'text-brand-orange' : i < currentStep ? 'text-green-400' : 'text-gray-500'}`}>
                {step.replace('_', ' ')}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-6 text-center">
          <p className="text-lg font-semibold text-white">{STATUS_LABELS[booking.status]}</p>
          {booking.eta && booking.status !== 'completed' && booking.status !== 'arrived' && (
            <p className="text-brand-orange text-sm mt-1">⏱ ETA: ~{booking.eta} minutes</p>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="card mb-6 p-0 overflow-hidden h-80">
        <div ref={mapRef} className="w-full h-full" />
      </div>

      {/* Booking details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card md:col-span-1">
          <h3 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wide">Technician</h3>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-brand-orange/10 flex items-center justify-center text-xl">👷</div>
            <div>
              <p className="font-semibold text-white leading-none">{booking.technicianId?.name}</p>
              <p className="text-brand-amber text-xs mt-1">★ {booking.technicianId?.rating?.toFixed(1)} (Verified)</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary flex-1 py-2 text-xs" onClick={() => alert('Simulating call to technician...')}>📞 Call</button>
            <button className="btn-secondary flex-1 py-2 text-xs" onClick={() => alert('Opening chat...')}>💬 Chat</button>
          </div>
        </div>
        
        <div className="card md:col-span-2">
          <h3 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wide">Service Details</h3>
          <div className="grid grid-cols-2 gap-y-4 text-sm">
            <div>
              <p className="text-gray-500 text-xs">Service Type</p>
              <p className="text-white font-medium capitalize">{booking.serviceType?.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Booking ID</p>
              <p className="text-white font-mono text-xs">{booking._id}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Distance</p>
              <p className="text-white font-medium">{booking.distanceKm} km</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Base Charge</p>
              <p className="text-brand-orange font-bold">₹150</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
