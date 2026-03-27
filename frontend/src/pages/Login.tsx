import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-lg font-black">D</div>
            <span className="text-2xl font-black tracking-tight text-white">DRISHTI</span>
          </div>
          <p className="text-slate-500 text-sm font-medium uppercase tracking-widest">AI Visual Empowerment</p>
        </div>

        {/* Card */}
        <div className="p-1 rounded-[2rem] bg-gradient-to-br from-indigo-500/20 via-slate-800/50 to-purple-500/20">
          <div className="bg-[#11111a]/95 backdrop-blur-2xl rounded-[1.9rem] p-8">
            <h2 className="text-2xl font-black text-white mb-1">Welcome back</h2>
            <p className="text-slate-500 text-sm mb-8">Sign in to access your scan history and settings.</p>

            {error && (
              <div className="mb-6 px-4 py-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full px-4 py-3.5 bg-black/40 border border-white/10 rounded-xl text-white placeholder:text-slate-600 focus:border-indigo-500/60 focus:outline-none transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-3.5 bg-black/40 border border-white/10 rounded-xl text-white placeholder:text-slate-600 focus:border-indigo-500/60 focus:outline-none transition-all text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <p className="text-center text-slate-500 text-sm mt-6">
              Don't have an account?{' '}
              <Link to="/signup" className="text-indigo-400 font-bold hover:text-indigo-300 transition-colors">
                Create one
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          You can still use Drishti anonymously without an account.{' '}
          <Link to="/" className="text-slate-500 hover:text-slate-400 transition-colors underline">
            Continue without login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
