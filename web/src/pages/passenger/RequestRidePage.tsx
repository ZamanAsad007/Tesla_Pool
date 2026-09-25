import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MapPin, Users, Zap, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { apiClient } from '../../api/client';
import { calculateDistanceKm, estimateFarePaisa } from '../../utils/distance';
import { formatBdt } from '../../utils/format';
import { LoadingSpinner, ErrorBanner } from '../../components/Common';

interface Area {
  id: number;
  name: string;
  corridor: string;
}

interface CreateRideResponse {
  request: {
    id: string;
    status: string;
    pickupAreaId: number;
    dropoffAreaId: number;
    seats: number;
  };
  fareQuote: {
    totalPaisa: number;
  };
}

export function RequestRidePage() {
  const navigate = useNavigate();

  const [areas, setAreas] = useState<Area[]>([]);
  const [loadingAreas, setLoadingAreas] = useState(true);
  const [pickupAreaId, setPickupAreaId] = useState<number | ''>('');
  const [dropoffAreaId, setDropoffAreaId] = useState<number | ''>('');
  const [seats, setSeats] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openRequestId, setOpenRequestId] = useState<string | null>(null);

  useEffect(() => {
    async function loadAreas() {
      try {
        const res = await apiClient.get<any>('/areas');
        const data: Area[] = Array.isArray(res) ? res : (res?.areas || []);
        setAreas(data);
        if (data.length >= 2) {
          // Default to Banani -> Uttara or first two
          const banani = data.find((a) => a.name === 'Banani') || data[0];
          const uttara = data.find((a) => a.name === 'Uttara') || data[1];
          setPickupAreaId(banani.id);
          setDropoffAreaId(uttara.id);
        } else if (data.length === 1) {
          setPickupAreaId(data[0].id);
        } else {
          setError('No service areas currently loaded in the system.');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load service areas');
      } finally {
        setLoadingAreas(false);
      }
    }
    loadAreas();
  }, []);

  const selectedPickup = areas.find((a) => a.id === Number(pickupAreaId));
  const selectedDropoff = areas.find((a) => a.id === Number(dropoffAreaId));

  const distanceKm =
    selectedPickup && selectedDropoff
      ? calculateDistanceKm(selectedPickup.name, selectedDropoff.name)
      : 0;

  const fareEstimate = estimateFarePaisa(distanceKm, seats);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setOpenRequestId(null);

    if (!pickupAreaId || !dropoffAreaId) {
      setError('Please select both pickup and dropoff areas.');
      return;
    }

    if (pickupAreaId === dropoffAreaId) {
      setError('Pickup and dropoff areas must be different.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiClient.post<CreateRideResponse>('/ride-requests', {
        pickupAreaId: Number(pickupAreaId),
        dropoffAreaId: Number(dropoffAreaId),
        seats: Number(seats),
      });

      navigate(`/passenger/ride/${res.request.id}`);
    } catch (err: any) {
      if (err.code === 'OPEN_REQUEST_EXISTS') {
        setError('You already have an active ride request in progress.');
        // Try fetching active ride to link to it
        try {
          const myRidesRes = await apiClient.get<any>('/ride-requests/mine');
          const myRides: any[] = Array.isArray(myRidesRes) ? myRidesRes : (myRidesRes?.requests || []);
          const active = myRides.find((r) =>
            ['REQUESTED', 'MATCHED', 'ARRIVED', 'STARTED'].includes(r.status)
          );
          if (active) {
            setOpenRequestId(active.id);
          }
        } catch {
          // ignore secondary fetch error
        }
      } else {
        setError(err.message || 'Failed to submit ride request.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingAreas) {
    return <LoadingSpinner message="Loading Dhaka service areas..." />;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-6 sm:p-8 backdrop-blur shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Request an Easy-Bike</h1>
            <p className="text-xs text-slate-400 mt-1">
              Affordable electric rickshaw pooling across Dhaka corridors
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <Zap className="w-5 h-5" />
          </div>
        </div>

        {error && <ErrorBanner message={error} />}

        {openRequestId && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-950/40 border border-emerald-700/50 flex items-center justify-between">
            <div className="text-xs text-emerald-300">
              <span className="font-semibold block">Active Ride Found</span>
              You have a ride currently active or pending match.
            </div>
            <Link
              to={`/passenger/ride/${openRequestId}`}
              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition"
            >
              View Active Ride
            </Link>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pickup */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                Pickup Location
              </label>
              <select
                value={pickupAreaId}
                onChange={(e) => setPickupAreaId(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="" disabled>
                  Select pickup location
                </option>
                {areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name} ({area.corridor})
                  </option>
                ))}
              </select>
            </div>

            {/* Dropoff */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-teal-400" />
                Dropoff Destination
              </label>
              <select
                value={dropoffAreaId}
                onChange={(e) => setDropoffAreaId(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="" disabled>
                  Select dropoff destination
                </option>
                {areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name} ({area.corridor})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Seats Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              Seats Needed (Bullet Capacity: 3)
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setSeats(num)}
                  className={`py-2.5 rounded-xl border text-sm font-semibold transition flex items-center justify-center gap-2 ${
                    seats === num
                      ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300 ring-2 ring-emerald-500/20'
                      : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>{num} {num === 1 ? 'Seat' : 'Seats'}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Real-time Fare Quote Card */}
          <div className="bg-slate-800/70 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>Estimated Corridor Distance</span>
              <span className="font-semibold text-white">{distanceKm} km</span>
            </div>

            <div className="flex items-center justify-between border-t border-slate-700/60 pt-3">
              <div>
                <span className="text-xs text-slate-400 block">Solo Quote (Base)</span>
                <span className="text-xl font-bold text-white">
                  {formatBdt(fareEstimate.soloPaisa)}
                </span>
              </div>

              <div className="text-right">
                <span className="text-xs text-emerald-400 font-medium flex items-center justify-end gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Pool Price (20% Off)
                </span>
                <span className="text-xl font-extrabold text-emerald-400">
                  {formatBdt(fareEstimate.pooledPaisa)}
                </span>
              </div>
            </div>

            <div className="mt-3 pt-2 text-[11px] text-slate-400 flex items-center gap-1.5 border-t border-slate-700/40">
              <AlertCircle className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
              <span>
                Standard fare: ৳10 base + ৳10/km. If matched with co-riders, 20% discount is locked automatically.
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || !pickupAreaId || !dropoffAreaId || pickupAreaId === dropoffAreaId}
            className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold rounded-xl text-sm transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <span className="inline-block w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Request Easy-Bike Pool</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
