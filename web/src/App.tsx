import { Zap, Users, ShieldCheck, MapPin } from 'lucide-react';

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-emerald-950 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-700/60 bg-slate-900/50 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500 text-slate-900 p-2 rounded-xl font-bold flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Zap className="w-5 h-5 fill-slate-900" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
              Dhaka Tesla Pool
            </h1>
            <p className="text-xs text-slate-400">Battery Rickshaw (Easy-Bike) Ride Sharing</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            System Online
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto px-6 py-12 flex flex-col justify-center items-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-emerald-400 text-sm mb-6 shadow-inner">
          <Zap className="w-4 h-4" />
          <span>Easy-Bike Economics: ৳10 base + ৳10/km • 20% Pool Discount</span>
        </div>

        <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-4">
          Dhaka&apos;s Smartest <br />
          <span className="text-emerald-400">Battery Rickshaw Pool</span>
        </h2>

        <p className="max-w-2xl text-slate-300 text-lg mb-10">
          Share your ride across Dhaka corridors. Fixed honest pricing in integer paisa,
          real-time matching, and bulletproof concurrency.
        </p>

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
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 px-6 py-4 text-center text-xs text-slate-500">
        Dhaka Tesla Pool &copy; {new Date().getFullYear()} — Battery Rickshaw Urban Mobility
      </footer>
    </div>
  );
}
