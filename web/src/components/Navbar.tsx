import { Link, useNavigate } from 'react-router-dom';
import { Zap, LogOut, Wallet, User as UserIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatBdt } from '../utils/format';

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="border-b border-slate-700/60 bg-slate-900/70 backdrop-blur-md sticky top-0 z-50 px-6 py-3.5 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="bg-emerald-500 text-slate-950 p-1.5 rounded-xl font-bold flex items-center justify-center shadow-md shadow-emerald-500/20 group-hover:scale-105 transition">
            <Zap className="w-5 h-5 fill-slate-950" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
              Dhaka Tesla Pool
            </span>
            <span className="hidden sm:inline-block ml-2 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
              Easy-Bike
            </span>
          </div>
        </Link>

        {isAuthenticated && user && (
          <nav className="hidden md:flex items-center gap-2">
            {user.role === 'PASSENGER' ? (
              <>
                <Link
                  to="/passenger/request"
                  className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition"
                >
                  Request Ride
                </Link>
                <Link
                  to="/passenger/history"
                  className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition"
                >
                  Ride History
                </Link>
              </>
            ) : (
              <Link
                to="/driver/dashboard"
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition"
              >
                Driver Dashboard
              </Link>
            )}
          </nav>
        )}
      </div>

      <div className="flex items-center gap-3">
        {isAuthenticated && user ? (
          <>
            {user.role === 'PASSENGER' && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs font-semibold text-emerald-300">
                <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                <span>TeslaPay: {formatBdt(user.walletBalancePaisa)}</span>
              </div>
            )}

            <div className="flex items-center gap-2 pl-2 border-l border-slate-700">
              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                  <UserIcon className="w-3.5 h-3.5" />
                </div>
                <div className="hidden sm:block text-left">
                  <p className="font-semibold text-white leading-none">{user.name}</p>
                  <p className="text-[10px] text-slate-400 leading-tight">{user.role}</p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition ml-2"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <Link
            to="/login"
            className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm transition shadow-md shadow-emerald-500/20"
          >
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
}
