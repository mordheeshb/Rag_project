import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import TechCard from '../components/TechCard.jsx';

export default function TechnicianList() {
  const [params] = useSearchParams();
  const skill = params.get('skill');
  const lat = params.get('lat') || 13.0827;
  const lng = params.get('lng') || 80.2707;

  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`/api/technicians/nearby?lat=${lat}&lng=${lng}&skill=${skill}`);
        setTechnicians(res.data.data || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load technicians.');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [skill, lat, lng]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 animate-fade-in">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => window.history.back()} className="text-gray-400 hover:text-white transition-colors text-sm">← Back</button>
          <span className="text-gray-600">|</span>
          <span className="text-gray-400 text-sm capitalize">{skill?.replace('_', ' ')} technicians near you</span>
        </div>
        <h1 className="text-3xl font-bold text-white">
          Available <span className="text-brand-orange capitalize">{skill?.replace('_', ' ')}</span>
          <span className="text-gray-400 text-lg font-normal ml-3">({technicians.length} found)</span>
        </h1>
      </div>

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card animate-pulse">
              <div className="flex gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-brand-border" />
                <div className="flex-1">
                  <div className="h-4 bg-brand-border rounded w-32 mb-2" />
                  <div className="h-3 bg-brand-border rounded w-24" />
                </div>
              </div>
              <div className="h-3 bg-brand-border rounded w-full mb-2" />
              <div className="h-3 bg-brand-border rounded w-3/4" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="card border-red-500/30 bg-red-500/5 text-red-400 text-center py-8">
          <p className="text-xl mb-2">⚠️</p>
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && technicians.length === 0 && (
        <div className="card text-center py-16">
          <p className="text-5xl mb-4">😕</p>
          <h3 className="text-xl font-semibold text-white mb-2">No technicians found</h3>
          <p className="text-gray-400">No {skill?.replace('_', ' ')} technicians are available within 50km of your location.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {technicians.map(tech => (
          <TechCard key={tech._id} tech={tech} />
        ))}
      </div>
    </div>
  );
}
