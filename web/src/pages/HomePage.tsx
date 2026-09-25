import { Link } from 'react-router-dom';
import { Zap, Users, ShieldCheck, MapPin, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function HomePage() {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="flex-1 flex flex-col justify-center items-center text-center px-6 py-12 max-w-4xl mx-auto">
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-emerald-400 text-sm mb-6 shadow-inner">
        <Zap className="w-4 h-4" />
        <span>Easy-Bike Economics: ৳10 base + ৳10/km • 20% Pool Discount</span>
      </div>

      <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-4">
        Dhaka Tesla Pool
      </h1>
      <p className="text-sm font-semibold uppercase tracking-wider text-emerald-400 mb-4">
        Battery Rickshaw (Easy-Bike) Ride Sharing
      </p>

      <p className="max-w-2xl text-slate-300 text-lg mb-8">
        Share your ride across Dhaka corridors. Fixed honest pricing in integer paisa,
        real-time matching, and bulletproof concurrency.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-4 mb-12">
        {isAuthenticated && user ? (
          <Link
            to={user.role === 'DRIVER' ? '/driver/dashboard' : '/passenger/request'}
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm transition shadow-lg shadow-emerald-500/20 flex items-center gap-2"
          >
            <span>Go to {user.role === 'DRIVER' ? 'Driver Dashboard' : 'Ride Request'}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        ) : (
          <>
            <Link
              to="/login"
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm transition shadow-lg shadow-emerald-500/20 flex items-center gap-2"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </>
        )}
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left">
        <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 backdrop-blur hover:border-emerald-500/50 transition">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
            <Users className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-lg text-white mb-2">3-Seat Easy-Bikes</h3>
          <p className="text-sm text-slate-400">
            Strict capacity tracking prevents overbooking. Bullet carries up to 3 passengers.
          </p>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 backdrop-blur hover:border-emerald-500/50 transition">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center mb-4">
            <MapPin className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-lg text-white mb-2">Corridor Matching</h3>
          <p className="text-sm text-slate-400">
            Zone-based corridor routing across North, Center, and South Dhaka hubs.
          </p>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-6 backdrop-blur hover:border-emerald-500/50 transition">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-4">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-lg text-white mb-2">Dual Payments</h3>
          <p className="text-sm text-slate-400">
            Settle rides seamlessly with Cash or instant TeslaPay digital wallet balance.
          </p>
        </div>
      </div>
    </div>
  );
}
