import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Users, Calendar, ArrowRight, Zap, RefreshCw } from 'lucide-react';
import { apiClient } from '../../api/client';
import { formatBdt } from '../../utils/format';
import {
  StatusBadge,
  LoadingSpinner,
  EmptyState,
  ErrorBanner,
  RideStatus,
} from '../../components/Common';

interface Area {
  id: number;
  name: string;
  corridor: string;
}

interface FareSnapshot {
  id: string;
  totalPaisa: number;
  basePaisa: number;
  distancePaisa: number;
  discountPaisa: number;
  fareType: string;
  quotedAt: string;
}

interface RideRequestItem {
  id: string;
  passengerId: string;
  pickupAreaId: number;
  dropoffAreaId: number;
  seats: number;
  status: RideStatus;
  createdAt: string;
  pickupArea: Area;
  dropoffArea: Area;
  fareSnapshots: FareSnapshot[];
  memberships: Array<{
    id: string;
    poolId: string;
  }>;
}

export function RideHistoryPage() {
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'>('ALL');

  const {
    data: rides,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery<RideRequestItem[]>({
    queryKey: ['my-rides'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/ride-requests/mine');
      return (Array.isArray(res) ? res : res?.requests || []) as RideRequestItem[];
    },
  });

  if (isLoading) {
    return <LoadingSpinner message="Loading your ride history..." />;
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <ErrorBanner message={(error as any)?.message || 'Failed to load ride history.'} />
      </div>
    );
  }

  const allRides = rides || [];

  const filteredRides = allRides.filter((ride) => {
    if (filter === 'ALL') return true;
    if (filter === 'ACTIVE') {
      return ['REQUESTED', 'MATCHED', 'ARRIVED', 'STARTED'].includes(ride.status);
    }
    return ride.status === filter;
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Your Ride History</h1>
          <p className="text-xs text-slate-400 mt-1">
            Track and view previous Easy-Bike pooling trips and active rides
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Refresh history"
          >
            <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
          </button>
          <Link
            to="/passenger/request"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-md shadow-emerald-500/20"
          >
            <Zap className="w-4 h-4" />
            Request New Ride
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex bg-slate-900/80 p-1 rounded-xl mb-6 border border-slate-800 w-full sm:w-fit">
        {(['ALL', 'ACTIVE', 'COMPLETED', 'CANCELLED'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
              filter === tab
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.toLowerCase()}
          </button>
        ))}
      </div>

      {/* Ride List */}
      {filteredRides.length === 0 ? (
        <EmptyState
          title="No rides found"
          description={
            filter === 'ALL'
              ? 'You have not taken any rides yet. Request your first Easy-Bike ride today!'
              : `No rides found matching the "${filter.toLowerCase()}" filter.`
          }
          action={
            <Link
              to="/passenger/request"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition"
            >
              <Zap className="w-4 h-4" />
              Request a Ride
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredRides.map((ride) => {
            const fare = ride.fareSnapshots?.[0];
            const dateStr = new Date(ride.createdAt).toLocaleString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <Link
                key={ride.id}
                to={`/passenger/ride/${ride.id}`}
                className="group block bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-5 transition shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left: Route & Metadata */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <StatusBadge status={ride.status} />
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {dateStr}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">
                        #{ride.id.slice(0, 8)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-emerald-400" />
                        <span>{ride.pickupArea.name}</span>
                      </div>
                      <span className="text-slate-500">➔</span>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-teal-400" />
                        <span>{ride.dropoffArea.name}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {ride.seats} {ride.seats === 1 ? 'seat' : 'seats'}
                      </span>
                      <span>•</span>
                      <span>{ride.pickupArea.corridor} corridor</span>
                    </div>
                  </div>

                  {/* Right: Fare & Arrow */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-800">
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Fare
                      </span>
                      <span className="text-lg font-extrabold text-emerald-400">
                        {fare ? formatBdt(fare.totalPaisa) : '—'}
                      </span>
                    </div>

                    <div className="w-8 h-8 rounded-full bg-slate-800 group-hover:bg-emerald-500/20 group-hover:text-emerald-400 text-slate-400 flex items-center justify-center transition">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
