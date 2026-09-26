import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Car,
  Power,
  Users,
  MapPin,
  Zap,
  Filter,
  RefreshCw,
  ArrowRight,
  UserPlus,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { formatBdt } from '../../utils/format';
import { LoadingSpinner, EmptyState, ErrorBanner, StatusBadge } from '../../components/Common';

interface TeslaVehicle {
  id: string;
  name: string;
  capacity: number;
  online: boolean;
}

interface Area {
  id: number;
  name: string;
  corridor: string;
}

interface ActivePoolInfo {
  id: string;
  driverId: string;
  teslaId: string;
  status: 'MATCHED' | 'ARRIVED' | 'STARTED' | 'COMPLETED' | 'CANCELLED';
  occupiedSeats: number;
  capacitySnapshot: number;
  tesla: {
    id: string;
    name: string;
    capacity: number;
  };
  memberships: Array<{
    id: string;
    passengerId: string;
    seatCount: number;
    passenger: {
      id: string;
      name: string;
    };
    rideRequest: {
      pickupArea: Area;
      dropoffArea: Area;
    };
  }>;
}

interface OpenRideRequest {
  id: string;
  passengerId: string;
  pickupAreaId: number;
  dropoffAreaId: number;
  seats: number;
  status: string;
  createdAt: string;
  passenger: {
    id: string;
    name: string;
    email: string;
  };
  pickupArea: Area;
  dropoffArea: Area;
  fareSnapshots: Array<{
    totalPaisa: number;
    basePaisa: number;
    distancePaisa: number;
    discountPaisa: number;
  }>;
}

export function DriverDashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedAreaId, setSelectedAreaId] = useState<number | ''>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [conflictPoolId, setConflictPoolId] = useState<string | null>(null);

  // 1. Fetch driver's vehicle
  const {
    data: tesla,
    isLoading: isLoadingTesla,
    error: teslaError,
  } = useQuery<TeslaVehicle | null>({
    queryKey: ['my-tesla'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/teslas/mine');
      return (res?.tesla ?? res) as TeslaVehicle | null;
    },
  });

  // 2. Fetch driver's active pool (if currently operating a pool)
  const {
    data: activePool,
  } = useQuery<ActivePoolInfo | null>({
    queryKey: ['driver-active-pool'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/driver/active-pool');
      return (res?.pool ?? null) as ActivePoolInfo | null;
    },
    refetchInterval: 5000,
  });

  // 3. Fetch areas for filter dropdown
  const { data: areas = [] } = useQuery<Area[]>({
    queryKey: ['areas'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/areas');
      return (Array.isArray(res) ? res : res?.areas || []) as Area[];
    },
  });

  // 4. Fetch open requests feed (poll every 5s if online)
  const {
    data: openRequests = [],
    isLoading: isLoadingFeed,
    refetch: refetchFeed,
    isRefetching: isRefetchingFeed,
  } = useQuery<OpenRideRequest[]>({
    queryKey: ['open-requests', selectedAreaId],
    queryFn: async () => {
      const url = selectedAreaId
        ? `/driver/requests?areaId=${selectedAreaId}`
        : '/driver/requests';
      const res = await apiClient.get<any>(url);
      return (Array.isArray(res) ? res : res?.requests || []) as OpenRideRequest[];
    },
    enabled: !!tesla?.online,
    refetchInterval: tesla?.online ? 5000 : false,
  });

  // 5. Toggle online status mutation
  const toggleOnlineMutation = useMutation({
    mutationFn: async (newStatus: boolean) => {
      if (!tesla) throw new Error('No vehicle registered');
      const res = await apiClient.patch<any>(`/teslas/${tesla.id}`, { online: newStatus });
      return (res?.tesla ?? res) as TeslaVehicle;
    },
    onSuccess: (updated) => {
      setErrorMsg(null);
      queryClient.setQueryData(['my-tesla'], updated);
      queryClient.invalidateQueries({ queryKey: ['open-requests'] });
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to update vehicle status');
    },
  });

  // 6. Accept request and create pool mutation
  const createPoolMutation = useMutation({
    mutationFn: async (rideRequestId: string) => {
      const res = await apiClient.post<any>('/pools', { rideRequestId });
      return (res?.pool ?? res) as { id: string };
    },
    onSuccess: (res) => {
      setErrorMsg(null);
      setConflictPoolId(null);
      queryClient.invalidateQueries({ queryKey: ['driver-active-pool'] });
      navigate(`/driver/pool/${res.id}`);
    },
    onError: (err: any) => {
      if (err.code === 'TESLA_BUSY') {
        const poolId = err.details?.poolId || activePool?.id;
        if (poolId) {
          setConflictPoolId(poolId);
        }
        setErrorMsg('Your Tesla already operates an active pool. Complete or cancel it before starting a new one.');
        queryClient.invalidateQueries({ queryKey: ['driver-active-pool'] });
      } else {
        setErrorMsg(err.message || 'Failed to accept ride request');
      }
    },
  });

  // 7. Join request to existing active pool mutation
  const joinPoolMutation = useMutation({
    mutationFn: async ({ poolId, rideRequestId }: { poolId: string; rideRequestId: string }) => {
      const res = await apiClient.post<any>(`/pools/${poolId}/join`, { rideRequestId });
      return res;
    },
    onSuccess: () => {
      setErrorMsg(null);
      queryClient.invalidateQueries({ queryKey: ['driver-active-pool'] });
      queryClient.invalidateQueries({ queryKey: ['open-requests'] });
      if (activePool) {
        navigate(`/driver/pool/${activePool.id}`);
      }
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to add rider to active pool');
    },
  });

  if (isLoadingTesla) {
    return <LoadingSpinner message="Loading driver vehicle profile..." />;
  }

  if (teslaError || !tesla) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center">
        <ErrorBanner
          message={(teslaError as any)?.message || 'No registered Tesla Easy-Bike found for your account.'}
        />
        <p className="text-xs text-slate-400 mt-2">
          Please contact system operations or register a vehicle under your driver account.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Top Header & Vehicle Card */}
      <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-6 backdrop-blur shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                tesla.online
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-800 text-slate-500 border border-slate-700'
              }`}
            >
              <Car className="w-6 h-6" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">{tesla.name}</h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                  Easy-Bike
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                <span>Capacity: <strong>{tesla.capacity} seats</strong></span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      tesla.online ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                    }`}
                  />
                  {tesla.online ? 'Accepting Passenger Pools' : 'Vehicle Offline'}
                </span>
              </div>
            </div>
          </div>

          {/* Toggle Online Button */}
          <div>
            <button
              onClick={() => toggleOnlineMutation.mutate(!tesla.online)}
              disabled={toggleOnlineMutation.isPending}
              className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 shadow-md ${
                tesla.online
                  ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
              }`}
            >
              <Power className="w-4 h-4" />
              <span>
                {toggleOnlineMutation.isPending
                  ? 'Switching...'
                  : tesla.online
                  ? 'Go Offline'
                  : 'Go Online & Accept Rides'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {errorMsg && <ErrorBanner message={errorMsg} />}

      {/* Active Pool Alert Banner if driver currently operates an active pool */}
      {activePool && (
        <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 border border-emerald-500/50 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <h3 className="text-sm font-bold text-white tracking-wide">
                Active Pool #{activePool.id.slice(0, 8)} in Progress
              </h3>
              <StatusBadge status={activePool.status} />
            </div>
            <p className="text-xs text-slate-300">
              Occupying <strong>{activePool.occupiedSeats}</strong> of <strong>{activePool.capacitySnapshot}</strong> seats
              {activePool.memberships && activePool.memberships.length > 0 && (
                <span> • {activePool.memberships.length} active rider{activePool.memberships.length > 1 ? 's' : ''}</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to={`/driver/pool/${activePool.id}`}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
            >
              <span>View Active Pool</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {conflictPoolId && !activePool && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 flex items-center justify-between">
          <div className="text-xs text-amber-200">
            <strong className="block font-semibold">Active Pool In Progress</strong>
            Your vehicle already operates an active pool.
          </div>
          <Link
            to={`/driver/pool/${conflictPoolId}`}
            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition"
          >
            Go to Active Pool
          </Link>
        </div>
      )}

      {/* Requests Feed Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span>Open Passenger Requests</span>
              {tesla.online && (
                <span className="text-xs font-normal text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Live Feed (5s)
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400">
              Passenger ride requests awaiting easy-bike driver pickup
            </p>
          </div>

          {/* Filter & Refresh */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedAreaId}
                onChange={(e) =>
                  setSelectedAreaId(e.target.value === '' ? '' : Number(e.target.value))
                }
                className="bg-transparent text-white focus:outline-none text-xs"
              >
                <option value="" className="bg-slate-800">
                  All Pickup Areas
                </option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id} className="bg-slate-800">
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            {tesla.online && (
              <button
                onClick={() => refetchFeed()}
                disabled={isRefetchingFeed}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                title="Refresh requests"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefetchingFeed ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* If offline */}
        {!tesla.online ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 mb-3">
              <Power className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-white mb-1">You are currently Offline</h3>
            <p className="text-xs text-slate-400 max-w-sm mb-4">
              Toggle your easy-bike online to view live ride requests and accept passengers along your corridor.
            </p>
            <button
              onClick={() => toggleOnlineMutation.mutate(true)}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition shadow-md shadow-emerald-500/20"
            >
              Go Online Now
            </button>
          </div>
        ) : isLoadingFeed ? (
          <LoadingSpinner message="Scanning for passenger requests..." />
        ) : openRequests.length === 0 ? (
          <EmptyState
            title="No open ride requests right now"
            description="Waiting for passengers in Dhaka to submit ride requests. This list refreshes every 5 seconds."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {openRequests.map((req) => {
              const fare = req.fareSnapshots?.[0];
              return (
                <div
                  key={req.id}
                  className="bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-5 backdrop-blur shadow-sm space-y-4 transition"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white">{req.passenger.name}</h4>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Req #{req.id.slice(0, 8)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-xs font-semibold">
                      <Users className="w-3.5 h-3.5 text-cyan-400" />
                      <span>
                        {req.seats} {req.seats === 1 ? 'seat' : 'seats'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <span className="text-slate-400">From:</span>
                      <strong className="text-white">{req.pickupArea.name}</strong>
                      <span className="text-slate-500">({req.pickupArea.corridor})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
                      <span className="text-slate-400">To:</span>
                      <strong className="text-white">{req.dropoffArea.name}</strong>
                      <span className="text-slate-500">({req.dropoffArea.corridor})</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Estimated Fare
                      </span>
                      <span className="text-base font-extrabold text-emerald-400">
                        {fare ? formatBdt(fare.totalPaisa) : '—'}
                      </span>
                    </div>

                    {activePool ? (
                      activePool.status === 'STARTED' ? (
                        <button
                          disabled
                          className="px-3 py-2 bg-slate-800 text-slate-500 font-semibold rounded-xl text-xs cursor-not-allowed flex items-center gap-1"
                          title="Trip is in progress. New riders cannot be added to a started pool."
                        >
                          <span>Trip In Progress</span>
                        </button>
                      ) : activePool.capacitySnapshot - activePool.occupiedSeats < req.seats ? (
                        <button
                          disabled
                          className="px-3 py-2 bg-slate-800 text-slate-500 font-semibold rounded-xl text-xs cursor-not-allowed flex items-center gap-1"
                          title="Not enough remaining seats in current pool"
                        >
                          <span>Pool Full</span>
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            joinPoolMutation.mutate({
                              poolId: activePool.id,
                              rideRequestId: req.id,
                            })
                          }
                          disabled={joinPoolMutation.isPending}
                          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs transition shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>{joinPoolMutation.isPending ? 'Adding...' : 'Add to Active Pool'}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )
                    ) : (
                      <button
                        onClick={() => createPoolMutation.mutate(req.id)}
                        disabled={createPoolMutation.isPending}
                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs transition shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>{createPoolMutation.isPending ? 'Accepting...' : 'Accept & Start Pool'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
