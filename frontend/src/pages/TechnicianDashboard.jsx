import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { StatusBadge } from '../components/TechCard.jsx';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext.jsx';

const NEXT_STATUS = { pending: 'accepted', accepted: 'en_route', en_route: 'arrived', arrived: 'completed' };

export default function TechnicianDashboard() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState({});
  const [newJobAlert, setNewJobAlert] = useState(false);

  const fetchJobs = async () => {
    try {
      const res = await axios.get('/api/technicians/dashboard');
      setJobs(res.data.data || []);
    } catch {
      // Silently ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 60000); // Poll every 1m as backup
    return () => clearInterval(interval);
  }, []);

  // Real-time new job notifications targeted to THIS technician
  useEffect(() => {
    const socket = io('http://localhost:3000');
    
    socket.on('booking:new', (data) => {
      // Only refresh and alert if the booking is assigned to THIS technician
      if (data.technicianId === user?._id || data.technicianId === user?.id) {
        fetchJobs();
        setNewJobAlert(true);
        // Play notification sound if possible
        try { new Audio('/notification.mp3').play(); } catch(e) {}
        // Hide alert after 10 seconds
        setTimeout(() => setNewJobAlert(false), 10000);
      }
    });

    return () => socket.disconnect();
  }, [user]);

  const updateStatus = async (bookingId, newStatus, note = '') => {
    setUpdating(prev => ({ ...prev, [bookingId]: true }));
    try {
      await axios.patch(`/api/bookings/${bookingId}/status`, { status: newStatus, note });
      setJobs(prev => prev.map(j => j._id === bookingId ? { ...j, status: newStatus } : j));
    } catch (err) {
      alert(err.response?.data?.message || 'Update failed');
    } finally {
      setUpdating(prev => ({ ...prev, [bookingId]: false }));
    }
  };

  const cancelJob = async (bookingId) => {
    if (!confirm('Cancel this booking?')) return;
    updateStatus(bookingId, 'cancelled');
  };

  // Simulate live location sharing
  useEffect(() => {
    const socket = io('http://localhost:3000');
    const activeJob = jobs.find(j => j.status === 'en_route');
    if (activeJob) {
      const watchId = navigator.geolocation?.watchPosition(pos => {
        socket.emit('technician:location_update', {
          bookingId: activeJob._id,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      });
      return () => {
        navigator.geolocation.clearWatch(watchId);
        socket.disconnect();
      };
    }
    return () => socket.disconnect();
  }, [jobs]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 animate-fade-in relative">
      {/* New Job Alert Toast */}
      {newJobAlert && (
        <div className="fixed top-20 right-4 z-50 animate-bounce">
          <div className="bg-brand-orange text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border-2 border-white/20">
            <span className="text-2xl">🚨</span>
            <div>
              <p className="font-bold">New Booking Received!</p>
              <p className="text-xs opacity-90">A customer has requested your service.</p>
            </div>
            <button onClick={() => setNewJobAlert(false)} className="ml-2 hover:scale-110 transition-transform">✕</button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Technician Portal</h1>
          <p className="text-gray-400 text-sm mt-1">Manage your active service requests</p>
        </div>
        <button onClick={fetchJobs} className="btn-secondary text-sm flex items-center gap-2">
          <span>🔄</span> Refresh Jobs
        </button>
      </div>

      {loading && (
        <div className="space-y-4">
          {[1, 2].map(i => <div key={i} className="card h-40 animate-pulse bg-brand-navy/50" />)}
        </div>
      )}

      {!loading && jobs.length === 0 && (
        <div className="card text-center py-20 border-dashed border-2 border-brand-border">
          <div className="w-20 h-20 bg-brand-navy rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
            📡
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Waiting for new jobs...</h3>
          <p className="text-gray-400 max-w-sm mx-auto">You are currently visible to customers within 50km. New requests will appear here instantly.</p>
          <div className="mt-8 flex items-center justify-center gap-3 text-green-400 text-sm font-medium bg-green-500/5 py-3 px-6 rounded-full w-fit mx-auto border border-green-500/20">
            <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-ping" />
            System Online & Monitoring
          </div>
        </div>
      )}

      <div className="space-y-5">
        {jobs.map(job => (
          <div key={job._id} className="card hover:border-brand-orange/40 transition-all duration-300 relative overflow-hidden group">
            {/* Status accent bar */}
            <div className={`absolute top-0 left-0 w-1.5 h-full ${job.status === 'pending' ? 'bg-yellow-500' : 'bg-brand-orange'}`} />
            
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">
                    {job.serviceType === 'plumber' ? '🔧' : job.serviceType === 'electrician' ? '⚡' : '❄️'}
                  </span>
                  <h3 className="text-lg font-bold text-white capitalize">{job.serviceType?.replace('_', ' ')}</h3>
                  <StatusBadge status={job.status} />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 text-sm">
                  <p className="text-gray-400">👤 Customer: <span className="text-white font-medium">{job.userId?.name}</span></p>
                  <p className="text-gray-400">📍 Distance: <span className="text-white font-medium">{job.distanceKm} km</span></p>
                  <p className="text-gray-400">📅 Date: <span className="text-white font-medium">{new Date(job.createdAt).toLocaleDateString()}</span></p>
                  <p className="text-gray-400">🕒 Time: <span className="text-white font-medium">{new Date(job.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></p>
                </div>
              </div>

              <div className="bg-brand-navy p-4 rounded-2xl border border-brand-border text-center min-w-[140px]">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Est. Arrival</p>
                <p className="text-2xl font-black text-brand-orange">~{job.eta} <span className="text-xs font-normal">min</span></p>
              </div>
            </div>

            {job.description && (
              <div className="bg-brand-dark/50 rounded-xl px-5 py-4 mb-6 text-sm text-gray-300 border border-brand-border/50 italic leading-relaxed">
                "{job.description}"
              </div>
            )}

            {/* Industrial Safety Checklist */}
            {['accepted', 'en_route', 'arrived'].includes(job.status) && (
              <div className="mb-6 p-4 bg-brand-navy/30 border border-brand-border rounded-2xl">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  ⚠️ Safety Checklist (Required)
                </h4>
                <div className="space-y-2">
                  {['Check PPE', 'Site Inspection', 'Power Isolated'].map(item => (
                    <label key={item} className="flex items-center gap-3 cursor-pointer group">
                      <input type="checkbox" className="form-checkbox h-4 w-4 text-brand-orange border-brand-border bg-brand-dark rounded" defaultChecked={job.status !== 'accepted'} />
                      <span className="text-sm text-gray-400 group-hover:text-white transition-colors">{item}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Work Note Input */}
            {NEXT_STATUS[job.status] && (
              <div className="mb-4">
                <textarea 
                  placeholder="Add a work log or update note (required for industrial audit)..."
                  className="input text-xs h-20 resize-none"
                  id={`note-${job._id}`}
                />
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              {NEXT_STATUS[job.status] && (
                <button
                  onClick={() => {
                    const note = document.getElementById(`note-${job._id}`)?.value;
                    updateStatus(job._id, NEXT_STATUS[job.status], note);
                    if (document.getElementById(`note-${job._id}`)) document.getElementById(`note-${job._id}`).value = '';
                  }}
                  disabled={updating[job._id]}
                  className="btn-primary flex-1 py-3.5 text-sm font-bold shadow-lg shadow-brand-orange/20"
                >
                  {updating[job._id] ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Updating...
                    </span>
                  ) : (
                    `Mark as ${NEXT_STATUS[job.status].replace('_', ' ').toUpperCase()}`
                  )}
                </button>
              )}
              
              {['pending', 'accepted'].includes(job.status) && (
                <button 
                  onClick={() => cancelJob(job._id)} 
                  className="px-6 py-3.5 rounded-xl border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/10 transition-colors"
                >
                  Cancel Booking
                </button>
              )}

              {job.status === 'completed' && (
                <div className="flex-1 bg-green-500/10 border border-green-500/20 text-center py-3.5 text-green-400 font-bold rounded-xl flex items-center justify-center gap-2">
                  <span>✅</span> Job Successfully Completed
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
