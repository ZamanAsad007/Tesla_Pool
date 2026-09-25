import { ReactNode } from 'react';
import { CheckCircle2, Clock, XCircle, AlertCircle, Users, Zap, Car } from 'lucide-react';
import { formatBdt } from '../utils/format';

export type RideStatus = 'REQUESTED' | 'MATCHED' | 'ARRIVED' | 'STARTED' | 'COMPLETED' | 'CANCELLED';

export function StatusBadge({ status }: { status: RideStatus | string }) {
  switch (status) {
    case 'REQUESTED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <Clock className="w-3.5 h-3.5" />
          Requested
        </span>
      );
    case 'MATCHED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <Car className="w-3.5 h-3.5" />
          Matched
        </span>
      );
    case 'ARRIVED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
          <Zap className="w-3.5 h-3.5" />
          Driver Arrived
        </span>
      );
    case 'STARTED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          <Zap className="w-3.5 h-3.5 animate-pulse" />
          Trip in Progress
        </span>
      );
    case 'COMPLETED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Completed
        </span>
      );
    case 'CANCELLED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <XCircle className="w-3.5 h-3.5" />
          Cancelled
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-700 text-slate-300">
          {status}
        </span>
      );
  }
}

export function SeatMeter({
  occupied,
  capacity,
}: {
  occupied: number;
  capacity: number;
}) {
  const isFull = occupied >= capacity;
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        {Array.from({ length: capacity }).map((_, idx) => (
          <div
            key={idx}
            className={`w-3.5 h-3.5 rounded-full transition-colors ${
              idx < occupied
                ? isFull
                  ? 'bg-rose-500 shadow-sm shadow-rose-500/50'
                  : 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                : 'bg-slate-700 border border-slate-600'
            }`}
          />
        ))}
      </div>
      <span className="text-xs font-medium text-slate-400">
        {occupied}/{capacity} seats {isFull ? '(Full)' : 'occupied'}
      </span>
    </div>
  );
}

export function Timeline({ currentStatus }: { currentStatus: RideStatus }) {
  const steps: RideStatus[] = ['REQUESTED', 'MATCHED', 'ARRIVED', 'STARTED', 'COMPLETED'];
  const isCancelled = currentStatus === 'CANCELLED';
  const currentIndex = steps.indexOf(currentStatus);

  if (isCancelled) {
    return (
      <div className="bg-rose-950/30 border border-rose-800/40 rounded-xl p-4 flex items-center gap-3 text-rose-300">
        <XCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
        <div>
          <h4 className="font-semibold text-sm">Ride Cancelled</h4>
          <p className="text-xs text-rose-400/80">This ride was cancelled and is no longer active.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-4 w-full">
      <div className="relative flex items-center justify-between">
        {/* Background connector line */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-800 -z-0" />
        
        {steps.map((step, idx) => {
          const isDone = idx <= currentIndex;
          const isCurrent = idx === currentIndex;

          return (
            <div key={step} className="relative z-10 flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                  isCurrent
                    ? 'bg-emerald-500 text-slate-950 ring-4 ring-emerald-500/20 shadow-lg shadow-emerald-500/30'
                    : isDone
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 border border-slate-700 text-slate-400'
                }`}
              >
                {isDone ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
              </div>
              <span
                className={`text-[10px] mt-1.5 uppercase font-medium tracking-wider text-center ${
                  isCurrent ? 'text-emerald-400 font-bold' : isDone ? 'text-slate-300' : 'text-slate-500'
                }`}
              >
                {step.toLowerCase()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function FareDisplay({
  paisa,
  isPooled = false,
  originalPaisa,
}: {
  paisa: number;
  isPooled?: boolean;
  originalPaisa?: number;
}) {
  return (
    <div className="inline-flex items-baseline gap-2">
      <span className="text-2xl font-extrabold text-emerald-400 tracking-tight">
        {formatBdt(paisa)}
      </span>
      {isPooled && originalPaisa && originalPaisa > paisa && (
        <span className="text-sm text-slate-500 line-through">
          {formatBdt(originalPaisa)}
        </span>
      )}
      {isPooled && (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium">
          20% Pool Savings
        </span>
      )}
    </div>
  );
}

export function LoadingSpinner({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
      <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-8 text-center flex flex-col items-center justify-center">
      <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 mb-3">
        <Users className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-white mb-1">{title}</h3>
      <p className="text-sm text-slate-400 max-w-sm mb-4">{description}</p>
      {action}
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="bg-rose-950/40 border border-rose-800/60 rounded-xl p-4 flex items-start gap-3 text-rose-200 mb-4">
      <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
      <span className="text-sm">{message}</span>
    </div>
  );
}
