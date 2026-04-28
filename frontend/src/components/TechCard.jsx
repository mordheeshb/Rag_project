import React from 'react';
import { useNavigate } from 'react-router-dom';

const STATUS_COLORS = {
  pending:   'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  accepted:  'bg-blue-500/20 text-blue-400 border-blue-500/30',
  en_route:  'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  arrived:   'bg-purple-500/20 text-purple-400 border-purple-500/30',
  completed: 'bg-green-500/20 text-green-400 border-green-500/30',
  cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const SKILL_ICONS = {
  plumber:          '🔧',
  electrician:      '⚡',
  ac_repair:        '❄️',
  carpenter:        '🪚',
  painter:          '🖌️',
  appliance_repair: '🔌',
  mason:            '🧱',
  cleaner:          '🧹',
};

function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} className={`w-3.5 h-3.5 ${i <= Math.round(rating) ? 'text-brand-amber' : 'text-gray-600'}`}
          fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="text-xs text-gray-400 ml-1">{rating.toFixed(1)}</span>
    </div>
  );
}

export default function TechCard({ tech, onBook }) {
  const navigate = useNavigate();

  const handleBook = () => {
    if (onBook) { onBook(tech); return; }
    navigate(`/booking/${tech._id || tech.id}`);
  };

  return (
    <div className="card hover:border-brand-orange/40 transition-all duration-300 hover:shadow-[0_0_25px_rgba(249,115,22,0.1)] animate-fade-in group cursor-pointer"
      onClick={handleBook}>
      <div className="flex items-start justify-between mb-4">
        {/* Avatar + Name */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-orange/30 to-brand-orange/10 border border-brand-orange/20 flex items-center justify-center text-xl">
            {SKILL_ICONS[tech.skills?.[0]] || '👷'}
          </div>
          <div>
            <h3 className="font-semibold text-white">{tech.name}</h3>
            <StarRating rating={tech.rating || 4} />
          </div>
        </div>
        {/* Availability dot */}
        <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${tech.isAvailable ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-gray-500/10 text-gray-400 border-gray-500/30'}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${tech.isAvailable ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
          {tech.isAvailable ? 'Available' : 'Busy'}
        </div>
      </div>

      {/* Skills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {tech.skills?.map(skill => (
          <span key={skill} className="badge bg-brand-orange/10 text-brand-orange border border-brand-orange/20">
            {SKILL_ICONS[skill]} {skill.replace('_', ' ')}
          </span>
        ))}
      </div>

      {/* Distance + ETA */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-gray-400">
          {tech.distanceKm !== undefined && (
            <span className="flex items-center gap-1">
              📍 <span className="text-white font-medium">{tech.distanceKm} km</span>
            </span>
          )}
          {tech.etaMinutes !== undefined && (
            <span className="flex items-center gap-1">
              ⏱ <span className="text-white font-medium">~{tech.etaMinutes} min</span>
            </span>
          )}
        </div>
        <button className="btn-primary py-2 px-4 text-sm opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => { e.stopPropagation(); handleBook(); }}>
          Book Now →
        </button>
      </div>
    </div>
  );
}

export { StatusBadge };

function StatusBadge({ status }) {
  return (
    <span className={`badge border ${STATUS_COLORS[status] || 'bg-gray-500/20 text-gray-400'}`}>
      {status?.replace('_', ' ').toUpperCase()}
    </span>
  );
}
