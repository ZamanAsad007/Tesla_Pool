import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MapPin,
  Users,
  Car,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Wallet,
  Coins,
  ArrowLeft,
  XCircle,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { formatBdt } from '../../utils/format';
import {
  StatusBadge,
  Timeline,
  SeatMeter,
  FareDisplay,
  LoadingSpinner,
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

interface RideRequestDetail {
  id: string;
  passengerId: string;
  pickupAreaId: number;
  dropoffAreaId: number;
  seats: number;
  status: RideStatus;
  createdAt: string;
  pickupArea: Area;
  dropoffArea: Area;
  poolId: string | null;
  latestFare: FareSnapshot | null;
}

interface PoolMembership {
  id: string;
  rideRequestId: string;
  passengerId: string;
  seatCount: number;
  farePaisa: number;
  payments: Array<{
    id: string;
    amountPaisa: number;
    method: 'CASH' | 'TESLAPAY';
    status: 'PENDING' | 'SETTLED';
    settledAt: string | null;
  }>;
}

interface PoolDetail {
  id: string;
  driverId: string;
  status: string;
  occupiedSeats: number;
  capacitySnapshot: number;
  tesla: {
    model: string;
    plate: string;
    capacity: number;
  };
  driver: {
    id: string;
    name: string;
    email: string;
  };
  memberships: PoolMembership[];
}

export function ActiveRidePage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [actionError, setActionError] = useState<string | null>(null);

  // Poll ride request every 5s
  const {
    data: ride,
    isLoading: isLoadingRide,
    error: rideError,
  } = useQuery<RideRequestDetail>({
    queryKey: ['ride-request', id],
    queryFn: async () => {
      const res = await apiClient.get<any>(`/ride-requests/${id}`);
      return (res?.request ?? res) as RideRequestDetail;
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'COMPLETED' || status === 'CANCELLED' ? false : 5000;
    },
    enabled: !!id,
  });

  // Poll pool details if ride is attached to a pool
  const { data: pool } = useQuery<PoolDetail>({
    queryKey: ['pool', ride?.poolId],
    queryFn: async () => {
      const res = await apiClient.get<any>(`/pools/${ride?.poolId}`);
      return (res?.pool ?? res) as PoolDetail;
    },
    refetchInterval: 5000,
    enabled: !!ride?.poolId,
  });

  // Cancel ride mutation
  const cancelMutation = useMutation({
    mutationFn: () => apiClient.post(`/ride-requests/${id}/cancel`),
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ['ride-request', id] });
    },
    onError: (err: any) => {
      setActionError(err.message || 'Failed to cancel ride');
    },
  });

  // Pay mutation
  const payMutation = useMutation({
    mutationFn: ({ paymentId, method }: { paymentId: string; method: 'TESLAPAY' | 'CASH' }) =>
      apiClient.post(`/payments/${paymentId}/pay`, { method }),
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ['ride-request', id] });
      queryClient.invalidateQueries({ queryKey: ['pool', ride?.poolId] });
    },
    onError: (err: any) => {
      setActionError(err.message || 'Payment processing failed');
    },
  });

  if (isLoadingRide) {
    return <LoadingSpinner message="Fetching live ride status..." />;
  }

  if (rideError || !ride) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <ErrorBanner message={(rideError as any)?.message || 'Ride request not found.'} />
        <Link
          to="/passenger/request"
          className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Request a Ride
        </Link>
      </div>
    );
  }

  const isCancelable = ['REQUESTED', 'MATCHED', 'ARRIVED'].includes(ride.status);
  const myMembership = pool?.memberships?.find((m) => m.rideRequestId === ride.id);
  const myPayment = myMembership?.payments?.[0];
  const isPooled = (ride.latestFare?.discountPaisa || 0) > 0 || (pool?.memberships?.length || 0) > 1;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Back button and title */}
      <div className="flex items-center justify-between mb-6">
        <Link
          to="/passenger/history"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-emerald-400 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Ride History
        </Link>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-mono">
            ID: {ride.id.slice(0, 8)}
          </span>
          <StatusBadge status={ride.status} />
        </div>
      </div>

      {actionError && <ErrorBanner message={actionError} />}

      {/* Main Status Panel */}
      <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-6 backdrop-blur shadow-xl space-y-6">
        {/* Timeline */}
        <div className="pb-2 border-b border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Trip Progress
            </h2>
            <span className="text-xs text-slate-500">Live 5s Polling</span>
          </div>
          <Timeline currentStatus={ride.status} />
        </div>

        {/* Route Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-800/50 p-4 rounded-xl border border-slate-700/60">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Pickup</span>
              <p className="text-sm font-semibold text-white">{ride.pickupArea.name}</p>
              <span className="text-xs text-slate-400">{ride.pickupArea.corridor} Corridor</span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center flex-shrink-0 mt-0.5">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Destination</span>
              <p className="text-sm font-semibold text-white">{ride.dropoffArea.name}</p>
              <span className="text-xs text-slate-400">{ride.dropoffArea.corridor} Corridor</span>
            </div>
          </div>
        </div>

        {/* Vehicle & Driver (When Matched) */}
        {pool && (
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-white uppercase tracking-wider">
                  Assigned Electric Rickshaw
                </span>
              </div>
              <SeatMeter
                occupied={pool.occupiedSeats}
                capacity={pool.capacitySnapshot || pool.tesla.capacity || 3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block">Vehicle Model</span>
                <span className="text-white font-medium">{pool.tesla.model} ({pool.tesla.plate})</span>
              </div>
              <div>
                <span className="text-slate-400 block">Driver</span>
                <span className="text-white font-medium">{pool.driver.name}</span>
              </div>
            </div>
          </div>
        )}

        {/* Fare Card */}
        <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block mb-0.5">
              {isPooled ? 'Locked Pooled Fare' : 'Estimated Solo Fare'}
            </span>
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-300">
                {ride.seats} {ride.seats === 1 ? 'seat' : 'seats'}
              </span>
            </div>
          </div>

          <div className="text-right">
            {ride.latestFare ? (
              <FareDisplay
                paisa={ride.latestFare.totalPaisa}
                isPooled={isPooled}
                originalPaisa={ride.latestFare.basePaisa + ride.latestFare.distancePaisa}
              />
            ) : myMembership ? (
              <FareDisplay paisa={myMembership.farePaisa} isPooled={true} />
            ) : (
              <span className="text-sm text-slate-400">Calculating...</span>
            )}
          </div>
        </div>

        {/* Settlement section when completed */}
        {ride.status === 'COMPLETED' && myPayment && (
          <div className="bg-emerald-950/30 border border-emerald-700/50 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Ride Completed!</h3>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Fare: {formatBdt(myPayment.amountPaisa)}
              </span>
            </div>

            {myPayment.status === 'SETTLED' ? (
              <div className="flex items-center gap-2 text-xs text-emerald-300 bg-emerald-900/30 p-2.5 rounded-lg border border-emerald-700/40">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>
                  Settled successfully via{' '}
                  <strong className="text-white">{myPayment.method}</strong> on{' '}
                  {new Date(myPayment.settledAt || '').toLocaleTimeString()}
                </span>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-300">
                  Please choose your payment method to settle your trip fare of{' '}
                  <strong>{formatBdt(myPayment.amountPaisa)}</strong>:
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() =>
                      payMutation.mutate({ paymentId: myPayment.id, method: 'TESLAPAY' })
                    }
                    disabled={payMutation.isPending || (user?.walletBalancePaisa || 0) < myPayment.amountPaisa}
                    className="p-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition flex flex-col items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Wallet className="w-4 h-4" />
                    <span>Pay with TeslaPay</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      Balance: {formatBdt(user?.walletBalancePaisa || 0)}
                    </span>
                  </button>

                  <button
                    onClick={() =>
                      payMutation.mutate({ paymentId: myPayment.id, method: 'CASH' })
                    }
                    disabled={payMutation.isPending}
                    className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white text-xs font-bold transition flex flex-col items-center justify-center gap-1.5"
                  >
                    <Coins className="w-4 h-4 text-amber-400" />
                    <span>Pay with Cash</span>
                    <span className="text-[10px] text-slate-400 font-normal">Hand cash to driver</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Cancel button if cancelable */}
        {isCancelable && (
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              You can cancel freely before the trip starts.
            </span>

            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to cancel this ride request?')) {
                  cancelMutation.mutate();
                }
              }}
              disabled={cancelMutation.isPending}
              className="px-3.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>{cancelMutation.isPending ? 'Cancelling...' : 'Cancel Ride'}</span>
            </button>
          </div>
        )}

        {/* Ride Finished Options */}
        {(ride.status === 'COMPLETED' || ride.status === 'CANCELLED') && (
          <div className="pt-4 border-t border-slate-800 text-center">
            <Link
              to="/passenger/request"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-md shadow-emerald-500/20"
            >
              <Zap className="w-3.5 h-3.5" />
              Request Another Ride
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
