import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user', skills: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const SKILLS = ['plumber', 'electrician', 'ac_repair', 'carpenter', 'painter', 'appliance_repair', 'mason', 'cleaner'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload = mode === 'login'
        ? { email: form.email, password: form.password }
        : form;
      const res = await axios.post(endpoint, payload);
      login(res.data.user, res.data.token);
      navigate(res.data.user.role === 'technician' ? '/technician' : '/');
    } catch (err) {
      setError(err.response?.data?.message || (err.response?.data?.errors?.[0]?.message) || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const toggleSkill = (s) => {
    setForm(prev => ({
      ...prev,
      skills: prev.skills.includes(s) ? prev.skills.filter(x => x !== s) : [...prev.skills, s],
    }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex w-16 h-16 bg-brand-orange/10 border border-brand-orange/30 rounded-2xl items-center justify-center text-3xl mb-4">⚡</div>
          <h1 className="text-2xl font-bold text-white">Instant<span className="text-brand-orange">Tech</span></h1>
          <p className="text-gray-400 text-sm mt-1">Book skilled professionals instantly</p>
        </div>

        <div className="card glow-orange border-brand-orange/20">
          {/* Tab toggle */}
          <div className="flex gap-1 p-1 bg-brand-dark rounded-xl mb-6">
            {['login', 'register'].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${mode === m ? 'bg-brand-orange text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}>
                {m === 'login' ? 'Login' : 'Register'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <input className="input" placeholder="Full Name" value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
            )}
            <input className="input" type="email" placeholder="Email address" value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
            <input className="input" type="password" placeholder="Password (min 6 chars)" value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required />

            {mode === 'register' && (
              <>
                {/* Role toggle */}
                <div className="flex gap-2">
                  {['user', 'technician'].map(r => (
                    <button key={r} type="button" onClick={() => setForm(p => ({ ...p, role: r }))}
                      className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all ${form.role === r ? 'bg-brand-orange border-brand-orange text-white' : 'bg-brand-navy border-brand-border text-gray-400 hover:border-brand-orange/50'}`}>
                      {r === 'user' ? '👤 Customer' : '🔧 Technician'}
                    </button>
                  ))}
                </div>

                {form.role === 'technician' && (
                  <div>
                    <p className="text-sm text-gray-400 mb-2">Select your skills:</p>
                    <div className="flex flex-wrap gap-2">
                      {SKILLS.map(s => (
                        <button key={s} type="button" onClick={() => toggleSkill(s)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all capitalize ${form.skills.includes(s) ? 'bg-brand-orange/20 border-brand-orange/50 text-brand-orange' : 'bg-brand-navy border-brand-border text-gray-400 hover:border-brand-orange/30'}`}>
                          {s.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {error && <p className="text-red-400 text-sm text-center bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">{error}</p>}

            <button type="submit" className={`btn-primary w-full py-3.5 text-base ${loading ? 'opacity-60 cursor-not-allowed' : ''}`} disabled={loading}>
              {loading ? '⏳ Please wait...' : mode === 'login' ? '→ Login' : '→ Create Account'}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-500 text-sm mt-4">
          Demo: use seeded technician emails (e.g. rajan@itb.dev) with password <span className="text-gray-300 font-mono">Tech@1234</span>
        </p>
      </div>
    </div>
  );
}
