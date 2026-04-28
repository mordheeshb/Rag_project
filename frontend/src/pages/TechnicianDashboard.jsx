import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { StatusBadge } from '../components/TechCard.jsx';
import { io } from 'socket.io-client';

const NEXT_STATUS = { pending: 'accepted', accepted: 'en_route', en_route: 'arrived', arrived: 'completed' };

export default function TechnicianDashboard() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState({});

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
    const interval = setInterval(fetchJobs, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  // Real-time new job notifications
  useEffect(() => {
    const socket = io('http://localhost:3000');
    socket.on('booking:new', () => fetchJobs()); // Refresh on new job
    return () => socket.disconnect();
  }, []);

  const updateStatus = async (bookingId, newStatus) => {
    setUpdating(prev => ({ ...prev, [bookingId]: true }));
    try {
      await axios.patch(`/api/bookings/${bookingId}/status`, { status: newStatus });
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
    let interval;
    const activeJob = jobs.find(j => j.status === 'en_route');
    if (activeJob) {
      navigator.geolocation?.watchPosition(pos => {
        socket.emit('technician:location_update', {
          bookingId: activeJob._id,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      });
    }
    return () => { clearInterval(interval); socket.disconnect(); };
  }, [jobs]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">My Jobs</h1>
          <p className="text-gray-400 text-sm mt-1">Active job requests assigned to you</p>
        </div>
        <button onClick={fetchJobs} className="btn-secondary text-sm">🔄 Refresh</button>
      </div>

      {loading && (
        <div className="space-y-4">
          {[1, 2].map(i => <div key={i} className="card h-32 animate-pulse bg-brand-navy" />)}
        </div>
      )}

      {!loading && jobs.length === 0 && (
        <div className="card text-center py-16">
          <p className="text-5xl mb-4">🎯</p>
          <h3 className="text-xl font-semibold text-white mb-2">No active jobs</h3>
          <p className="text-gray-400">New job requests will appear here in real-time.</p>
          <div className="mt-4 flex items-center justify-center gap-2 text-green-400 text-sm">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Listening for new bookings...
          </div>
        </div>
      )}

      <div className="space-y-4">
        {jobs.map(job => (
          <div key={job._id} className="card hover:border-brand-orange/30 transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-white capitalize">{job.serviceType?.replace('_', ' ')}</h3>
                  <StatusBadge status={job.status} />
                </div>
                <p className="text-sm text-gray-400">Customer: <span className="text-white">{job.userId?.name}</span></p>
                <p className="text-xs text-gray-500 mt-0.5">ID: {job._id?.slice(-8)}</p>
              </div>
              <div className="text-right text-sm text-gray-400">
                <p>📍 {job.distanceKm} km away</p>
                <p>⏱ ETA: ~{job.eta} min</p>
                <p className="text-xs mt-1">{new Date(job.createdAt).toLocaleTimeString()}</p>
              </div>
            </div>

            {job.description && (
              <div className="bg-brand-navy rounded-xl px-4 py-3 mb-4 text-sm text-gray-300 border border-brand-border">
                💬 "{job.description}"
              </div>
            )}

            <div className="flex gap-3">
              {NEXT_STATUS[job.status] && (
                <button
                  onClick={() => updateStatus(job._id, NEXT_STATUS[job.status])}
                  disabled={updating[job._id]}
                  className="btn-primary flex-1 py-2.5 text-sm"
                >
                  {updating[job._id] ? '⏳' : `→ Mark as ${NEXT_STATUS[job.status].replace('_', ' ')}`}
                </button>
              )}
              {['pending', 'accepted'].includes(job.status) && (
                <button onClick={() => cancelJob(job._id)} className="btn-secondary text-sm text-red-400 hover:text-red-300 border-red-500/20 hover:border-red-400/30">
                  Cancel
                </button>
              )}
              {job.status === 'completed' && (
                <div className="flex-1 text-center py-2.5 text-green-400 font-semibold text-sm">🎉 Job Completed!</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
