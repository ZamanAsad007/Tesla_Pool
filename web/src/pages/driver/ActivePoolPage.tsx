import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Car,
  Users,
  MapPin,
  CheckCircle2,
  Navigation,
  Flag,
  UserPlus,
  LogOut,
  Coins,
  ArrowLeft,
  XCircle,
  Plus,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { formatBdt } from '../../utils/format';
import {
  StatusBadge,
  SeatMeter,
  LoadingSpinner,
  ErrorBanner,
} from '../../components/Common';

interface Area {
  id: number;
  name: string;
  corridor: string;
}

interface PaymentRecord {
  id: string;
  amountPaisa: number;
  method: 'CASH' | 'TESLAPAY';
  status: 'PENDING' | 'SETTLED';
  settledAt: string | null;
}

interface PoolMember {
  id: string;
  rideRequestId: string;
  passengerId: string;
  seatCount: number;
  farePaisa: number;
  leftAt: string | null;
  passenger: {
    id: string;
    name: string;
  };
  rideRequest: {
    id: string;
    pickupArea: Area;
    dropoffArea: Area;
    seats: number;
  };
  payments: PaymentRecord[];
}

interface PoolEvent {
  id: string;
  event: string;
  at: string;
  meta: any;
}

interface PoolDetail {
  id: string;
  driverId: string;
  teslaId: string;
  status: 'MATCHED' | 'ARRIVED' | 'STARTED' | 'COMPLETED' | 'CANCELLED';
  occupiedSeats: number;
  capacitySnapshot: number;
  createdAt: string;
  tesla: {
    id: string;
    name: string;
    capacity: number;
  };
  driver: {
    id: string;
    name: string;
    email: string;
  };
  memberships: PoolMember[];
  events: PoolEvent[];
}

interface CandidateRequest {
  id: string;
  passengerId: string;
  pickupAreaId: number;
  dropoffAreaId: number;
  seats: number;
  passenger: {
    id: string;
    name: string;
  };
  pickupArea: Area;
  dropoffArea: Area;
  fareSnapshots: Array<{ totalPaisa: number }>;
}

export function ActivePoolPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showAddRiderModal, setShowAddRiderModal] = useState(false);

  // 1. Fetch Pool Details (5s polling while active)
  const {
    data: pool,
    isLoading: isLoadingPool,
    error: poolError,
  } = useQuery<PoolDetail>({
    queryKey: ['driver-pool', id],
    queryFn: () => apiClient.get<PoolDetail>(`/pools/${id}`),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'COMPLETED' || status === 'CANCELLED' ? false : 5000;
    },
    enabled: !!id,
  });

  // 2. Fetch Candidate Open Requests for adding riders
  const { data: candidates = [], isLoading: isLoadingCandidates } = useQuery<CandidateRequest[]>({
    queryKey: ['candidate-requests'],
    queryFn: () => apiClient.get<CandidateRequest[]>('/driver/requests'),
    enabled: showAddRiderModal && !!pool && pool.occupiedSeats < pool.capacitySnapshot,
  });

  // 3. Lifecycle Transitions
  const transitionMutation = useMutation({
    mutationFn: (action: 'arrive' | 'start' | 'complete' | 'cancel') =>
      apiClient.post(`/pools/${id}/${action}`),
    onSuccess: () => {
      setErrorMsg(null);
      queryClient.invalidateQueries({ queryKey: ['driver-pool', id] });
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Transition failed');
    },
  });

  // 4. Join Pool (Add Rider - seat race endpoint)
  const joinMutation = useMutation({
    mutationFn: (rideRequestId: string) =>
      apiClient.post(`/pools/${id}/join`, { rideRequestId }),
    onSuccess: () => {
      setErrorMsg(null);
      setShowAddRiderModal(false);
      queryClient.invalidateQueries({ queryKey: ['driver-pool', id] });
      queryClient.invalidateQueries({ queryKey: ['candidate-requests'] });
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to add rider to pool');
    },
  });

  // 5. Leave Pool (Void rider membership)
  const leaveMutation = useMutation({
    mutationFn: (rideRequestId: string) =>
      apiClient.post(`/pools/${id}/leave`, { rideRequestId }),
    onSuccess: () => {
      setErrorMsg(null);
      queryClient.invalidateQueries({ queryKey: ['driver-pool', id] });
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to remove rider from pool');
    },
  });

  // 6. Settle Cash Payment
  const settleCashMutation = useMutation({
    mutationFn: (paymentId: string) =>
      apiClient.post(`/payments/${paymentId}/pay`, { method: 'CASH' }),
    onSuccess: () => {
      setErrorMsg(null);
      queryClient.invalidateQueries({ queryKey: ['driver-pool', id] });
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to settle cash payment');
    },
  });

  if (isLoadingPool) {
    return <LoadingSpinner message="Loading active ride pool..." />;
  }

  if (poolError || !pool) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <ErrorBanner message={(poolError as any)?.message || 'Pool not found.'} />
        <Link
          to="/driver/dashboard"
          className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const activeMembers = pool.memberships.filter((m) => !m.leftAt);
  const remainingSeats = pool.capacitySnapshot - pool.occupiedSeats;
  const canAddMore =
    remainingSeats > 0 && (pool.status === 'MATCHED' || pool.status === 'ARRIVED');

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          to="/driver/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-emerald-400 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Dashboard
        </Link>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-mono">
            Pool #{pool.id.slice(0, 8)}
          </span>
          <StatusBadge status={pool.status} />
        </div>
      </div>

      {errorMsg && <ErrorBanner message={errorMsg} />}

      {/* Main Pool Status Card */}
      <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-6 backdrop-blur shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">{pool.tesla.name} Pool</h2>
              <span className="text-xs text-slate-400">Easy-Bike Ride Sharing</span>
            </div>
          </div>

          <div className="bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700/80 flex items-center gap-4">
            <span className="text-xs font-semibold text-slate-300">Live Capacity:</span>
            <SeatMeter occupied={pool.occupiedSeats} capacity={pool.capacitySnapshot} />
          </div>
        </div>

        {/* Lifecycle Action Banner */}
        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
              Current Stage
            </span>
            <div className="flex items-center gap-2">
              <strong className="text-base text-white">{pool.status}</strong>
              <span className="text-xs text-slate-400">
                {pool.status === 'MATCHED' && '— Drive to pickup location'}
                {pool.status === 'ARRIVED' && '— Passengers boarding, ready to start'}
                {pool.status === 'STARTED' && '— Trip in progress along corridor'}
                {pool.status === 'COMPLETED' && '— Trip finished, fares settled'}
                {pool.status === 'CANCELLED' && '— Pool was cancelled'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {pool.status === 'MATCHED' && (
              <>
                <button
                  onClick={() => transitionMutation.mutate('arrive')}
                  disabled={transitionMutation.isPending}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs transition shadow-md flex items-center gap-1.5"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Mark Arrived</span>
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('Cancel this pool?')) {
                      transitionMutation.mutate('cancel');
                    }
                  }}
                  disabled={transitionMutation.isPending}
                  className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-semibold rounded-xl text-xs transition"
                >
                  Cancel
                </button>
              </>
            )}

            {pool.status === 'ARRIVED' && (
              <>
                <button
                  onClick={() => transitionMutation.mutate('start')}
                  disabled={transitionMutation.isPending || activeMembers.length === 0}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition shadow-md flex items-center gap-1.5"
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>Start Trip</span>
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('Cancel this pool?')) {
                      transitionMutation.mutate('cancel');
                    }
                  }}
                  disabled={transitionMutation.isPending}
                  className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-semibold rounded-xl text-xs transition"
                >
                  Cancel
                </button>
              </>
            )}

            {pool.status === 'STARTED' && (
              <button
                onClick={() => transitionMutation.mutate('complete')}
                disabled={transitionMutation.isPending}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Complete Trip</span>
              </button>
            )}
          </div>
        </div>

        {/* Pool Members List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              <span>Active Riders ({activeMembers.length})</span>
            </h3>

            {canAddMore && (
              <button
                onClick={() => setShowAddRiderModal(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-semibold transition"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Rider ({remainingSeats} seats left)</span>
              </button>
            )}
          </div>

          <div className="space-y-3">
            {activeMembers.map((member) => {
              const payment = member.payments?.[0];
              const isSettled = payment?.status === 'SETTLED';

              return (
                <div
                  key={member.id}
                  className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <strong className="text-white text-sm">{member.passenger.name}</strong>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 font-semibold">
                        {member.seatCount} {member.seatCount === 1 ? 'seat' : 'seats'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-300">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{member.rideRequest.pickupArea.name}</span>
                      </div>
                      <span className="text-slate-500">➔</span>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-teal-400" />
                        <span>{member.rideRequest.dropoffArea.name}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Locked Fare
                      </span>
                      <span className="text-base font-extrabold text-emerald-400">
                        {formatBdt(member.farePaisa)}
                      </span>
                      <span className="text-[10px] text-emerald-400/80 block">
                        20% Pool Discount
                      </span>
                    </div>

                    {/* Member actions */}
                    <div className="flex items-center gap-2">
                      {pool.status === 'COMPLETED' && payment && (
                        <div>
                          {isSettled ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" />
                              Paid ({payment.method})
                            </span>
                          ) : (
                            <button
                              onClick={() => settleCashMutation.mutate(payment.id)}
                              disabled={settleCashMutation.isPending}
                              className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-bold transition flex items-center gap-1"
                            >
                              <Coins className="w-3.5 h-3.5" />
                              <span>Settle Cash</span>
                            </button>
                          )}
                        </div>
                      )}

                      {(pool.status === 'MATCHED' || pool.status === 'ARRIVED') && (
                        <button
                          onClick={() => {
                            if (window.confirm(`Remove ${member.passenger.name} from this pool?`)) {
                              leaveMutation.mutate(member.rideRequestId);
                            }
                          }}
                          disabled={leaveMutation.isPending}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                          title="Remove rider (frees seat)"
                        >
                          <LogOut className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Audit Trail */}
        {pool.events && pool.events.length > 0 && (
          <div className="pt-4 border-t border-slate-800">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Pool Audit Events
            </h4>
            <div className="space-y-1.5 text-xs text-slate-400 max-h-36 overflow-y-auto pr-2">
              {pool.events.map((evt) => (
                <div key={evt.id} className="flex items-center justify-between py-1 border-b border-slate-800/40">
                  <span className="font-mono text-emerald-400 font-medium">{evt.event}</span>
                  <span className="text-[10px] text-slate-500">
                    {new Date(evt.at).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Rider Modal */}
      {showAddRiderModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">Add Co-Rider to Pool</h3>
              </div>
              <button
                onClick={() => setShowAddRiderModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Matching corridor ride requests. Available seats in vehicle: <strong>{remainingSeats}</strong>.
            </p>

            {isLoadingCandidates ? (
              <LoadingSpinner message="Scanning candidate riders..." />
            ) : candidates.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No open passenger requests matching right now.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {candidates.map((cand) => (
                  <div
                    key={cand.id}
                    className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3.5 flex items-center justify-between gap-3"
                  >
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <strong className="text-white">{cand.passenger.name}</strong>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({cand.seats} {cand.seats === 1 ? 'seat' : 'seats'})
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <span>{cand.pickupArea.name}</span>
                        <span className="text-slate-500">➔</span>
                        <span>{cand.dropoffArea.name}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => joinMutation.mutate(cand.id)}
                      disabled={joinMutation.isPending || cand.seats > remainingSeats}
                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-lg transition flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{joinMutation.isPending ? 'Joining...' : 'Add to Pool'}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
