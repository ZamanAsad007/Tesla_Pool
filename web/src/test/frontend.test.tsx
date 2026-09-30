import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '../context/AuthContext';
import {
  StatusBadge,
  SeatMeter,
  Timeline,
  FareDisplay,
  EmptyState,
  ErrorBanner,
} from '../components/Common';
import { Navbar } from '../components/Navbar';
import { formatBdt } from '../utils/format';
import { calculateDistanceKm, estimateFarePaisa } from '../utils/distance';
import { LoginPage } from '../pages/LoginPage';
import { RequestRidePage } from '../pages/passenger/RequestRidePage';
import { ActiveRidePage } from '../pages/passenger/ActiveRidePage';
import { DriverDashboardPage } from '../pages/driver/DriverDashboardPage';
import { apiClient } from '../api/client';

function renderWithProviders(ui: React.ReactElement, initialRoute: string = '/') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MemoryRouter initialEntries={[initialRoute]}>{ui}</MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

describe('Frontend Component & Flow Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Currency & Distance Utilities', () => {
    it('formats integer paisa to BDT correctly', () => {
      expect(formatBdt(0)).toBe('৳0');
      expect(formatBdt(1000)).toBe('৳10');
      expect(formatBdt(4000)).toBe('৳40');
      expect(formatBdt(10500)).toBe('৳105');
    });

    it('calculates deterministic inter-area distance', () => {
      expect(calculateDistanceKm('Mohakhali', 'Mohakhali')).toBe(0);
      expect(calculateDistanceKm('Mohakhali', 'Banani')).toBe(4);
      expect(calculateDistanceKm('Banani', 'Gulshan 2')).toBe(2);
      expect(calculateDistanceKm('Banani', 'Uttara')).toBe(9);
    });

    it('estimates solo fare and 20% pooled discount', () => {
      // 4km solo: (1000 + 4*1000) = 5000 paisa (৳50)
      // 20% discount = 1000 paisa, pooled = 4000 paisa (৳40)
      const estimate = estimateFarePaisa(4, 1);
      expect(estimate.soloPaisa).toBe(5000);
      expect(estimate.pooledPaisa).toBe(4000);
    });
  });

  describe('Common UI Components', () => {
    it('renders StatusBadge for each ride state', () => {
      const { rerender } = render(<StatusBadge status="REQUESTED" />);
      expect(screen.getByText(/Requested/i)).toBeInTheDocument();

      rerender(<StatusBadge status="MATCHED" />);
      expect(screen.getByText(/Matched/i)).toBeInTheDocument();

      rerender(<StatusBadge status="ARRIVED" />);
      expect(screen.getByText(/Driver Arrived/i)).toBeInTheDocument();

      rerender(<StatusBadge status="STARTED" />);
      expect(screen.getByText(/Trip in Progress/i)).toBeInTheDocument();

      rerender(<StatusBadge status="COMPLETED" />);
      expect(screen.getByText(/Completed/i)).toBeInTheDocument();

      rerender(<StatusBadge status="CANCELLED" />);
      expect(screen.getByText(/Cancelled/i)).toBeInTheDocument();
    });

    it('renders SeatMeter with occupied vs capacity indicator', () => {
      const { rerender } = render(<SeatMeter occupied={2} capacity={3} />);
      expect(screen.getByText(/2\/3 seats occupied/i)).toBeInTheDocument();

      rerender(<SeatMeter occupied={3} capacity={3} />);
      expect(screen.getByText(/3\/3 seats \(Full\)/i)).toBeInTheDocument();
    });

    it('renders Timeline highlighting the active lifecycle stage', () => {
      const { rerender } = render(<Timeline currentStatus="REQUESTED" />);
      expect(screen.getByText(/requested/i)).toBeInTheDocument();
      expect(screen.getByText(/completed/i)).toBeInTheDocument();

      rerender(<Timeline currentStatus="CANCELLED" />);
      expect(screen.getByText(/Ride Cancelled/i)).toBeInTheDocument();
    });

    it('renders FareDisplay with optional pooled discount badge', () => {
      const { rerender } = render(<FareDisplay paisa={4000} isPooled={false} />);
      expect(screen.getByText('৳40')).toBeInTheDocument();

      rerender(<FareDisplay paisa={4000} isPooled={true} originalPaisa={5000} />);
      expect(screen.getByText('৳40')).toBeInTheDocument();
      expect(screen.getByText('৳50')).toBeInTheDocument();
      expect(screen.getByText(/20% Pool Savings/i)).toBeInTheDocument();
    });

    it('renders ErrorBanner and EmptyState correctly', () => {
      render(<ErrorBanner message="Test error message occurred" />);
      expect(screen.getByText(/Test error message occurred/i)).toBeInTheDocument();

      render(
        <EmptyState
          title="No items found"
          description="Empty description text"
          action={<button>Action Button</button>}
        />
      );
      expect(screen.getByText('No items found')).toBeInTheDocument();
      expect(screen.getByText('Empty description text')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Action Button/i })).toBeInTheDocument();
    });
  });

  describe('Login & Authentication Flow', () => {
    it('renders sign in form with inputs and quick personas', () => {
      renderWithProviders(<LoginPage />);

      expect(screen.getByRole('heading', { level: 2, name: /Welcome Back/i })).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/nusrat@passenger.test/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/••••••••/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Sign In to Account/i })).toBeInTheDocument();
      expect(screen.getByText(/Jashim \(Driver\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Nusrat \(Rider\)/i)).toBeInTheDocument();
    });

    it('switches between Sign In and Register tabs', () => {
      renderWithProviders(<LoginPage />);

      fireEvent.click(screen.getByRole('button', { name: /^Register$/i }));
      expect(screen.getByRole('heading', { level: 2, name: /Create an Account/i })).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Nusrat Jahan/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Passenger$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Driver$/i })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /^Sign In$/i }));
      expect(screen.getByRole('heading', { level: 2, name: /Welcome Back/i })).toBeInTheDocument();
    });

    it('displays error banner when login fails', async () => {
      vi.spyOn(apiClient, 'post').mockRejectedValueOnce(new Error('Invalid email or password'));

      renderWithProviders(<LoginPage />);

      fireEvent.change(screen.getByPlaceholderText(/nusrat@passenger.test/i), {
        target: { value: 'bad@user.com' },
      });
      fireEvent.change(screen.getByPlaceholderText(/••••••••/i), {
        target: { value: 'wrongpass' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Sign In to Account/i }));

      await waitFor(() => {
        expect(screen.getByText(/Invalid email or password/i)).toBeInTheDocument();
      });
    });

    it('supports quick persona login button', async () => {
      const mockPost = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
        token: 'test-token',
        user: {
          id: 'user-1',
          name: 'Nusrat',
          email: 'nusrat@passenger.test',
          role: 'PASSENGER',
          walletBalancePaisa: 50000,
        },
      });

      renderWithProviders(<LoginPage />);

      fireEvent.click(screen.getByText(/Nusrat \(Rider\)/i));

      await waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith('/auth/login', {
          email: 'nusrat@passenger.test',
          password: 'password123',
        });
      });
    });
  });

  describe('Passenger Request Flow', () => {
    it('loads areas and calculates real-time fare estimates', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValueOnce([
        { id: 1, name: 'Mohakhali', corridor: 'Center' },
        { id: 2, name: 'Banani', corridor: 'North' },
        { id: 3, name: 'Uttara', corridor: 'North' },
      ]);

      renderWithProviders(<RequestRidePage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1, name: /Request an Easy-Bike/i })).toBeInTheDocument();
      });

      expect(screen.getByText(/Solo Quote \(Base\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Pool Price \(20% Off\)/i)).toBeInTheDocument();
    });

    it('allows seat selection from 1 to 3', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValueOnce([
        { id: 1, name: 'Mohakhali', corridor: 'Center' },
        { id: 2, name: 'Banani', corridor: 'North' },
      ]);

      renderWithProviders(<RequestRidePage />);

      await waitFor(() => {
        expect(screen.getByText('1 Seat')).toBeInTheDocument();
      });

      const twoSeatsBtn = screen.getByText('2 Seats');
      fireEvent.click(twoSeatsBtn);

      expect(twoSeatsBtn.closest('button')).toHaveClass('border-emerald-500');
    });

    it('handles backend envelope { areas: [...] } correctly', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
        areas: [
          { id: 10, name: 'Banani', corridor: 'NORTH' },
          { id: 20, name: 'Uttara', corridor: 'OUTER' },
        ],
      });

      renderWithProviders(<RequestRidePage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1, name: /Request an Easy-Bike/i })).toBeInTheDocument();
      });

      expect(screen.getByDisplayValue(/Banani/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue(/Uttara/i)).toBeInTheDocument();
    });
  });

  describe('Driver Dashboard Matching Feed (§12)', () => {
    it('badges matching requests, sorts compatible first, and enforces appropriate button states', async () => {
      vi.spyOn(apiClient, 'get').mockImplementation(async (url: string) => {
        if (url === '/teslas/mine') {
          return {
            tesla: {
              id: 'tesla-bullet',
              name: 'Bullet',
              capacity: 3,
              online: true,
            },
          };
        }
        if (url === '/driver/active-pool') {
          return {
            pool: {
              id: 'pool-active-1',
              status: 'MATCHED',
              occupiedSeats: 1,
              capacitySnapshot: 3,
              tesla: { id: 'tesla-bullet', name: 'Bullet', capacity: 3 },
              memberships: [
                {
                  id: 'm-nusrat',
                  passengerId: 'p-nusrat',
                  seatCount: 1,
                  passenger: { id: 'p-nusrat', name: 'Nusrat' },
                  rideRequest: {
                    pickupArea: { id: 1, name: 'Banani', corridor: 'NORTH' },
                    dropoffArea: { id: 2, name: 'Mohakhali', corridor: 'NORTH' },
                  },
                },
              ],
            },
          };
        }
        if (url === '/areas') {
          return [
            { id: 1, name: 'Banani', corridor: 'NORTH' },
            { id: 2, name: 'Mohakhali', corridor: 'NORTH' },
            { id: 5, name: 'Dhanmondi', corridor: 'CENTER' },
          ];
        }
        if (url.startsWith('/driver/requests')) {
          return {
            requests: [
              // In raw API response, Dhanmondi is first in the array
              {
                id: 'req-dhanmondi',
                passengerId: 'p-shirin',
                pickupAreaId: 5,
                dropoffAreaId: 2,
                seats: 1,
                status: 'REQUESTED',
                createdAt: '2026-09-27T10:00:00Z',
                passenger: { id: 'p-shirin', name: 'Shirin', email: 'shirin@passenger.test' },
                pickupArea: { id: 5, name: 'Dhanmondi', corridor: 'CENTER' },
                dropoffArea: { id: 2, name: 'Mohakhali', corridor: 'NORTH' },
                fareSnapshots: [{ totalPaisa: 3500 }],
                matchesActivePool: false,
              },
              // Rafiq is second in the raw array, but matches active pool
              {
                id: 'req-rafiq',
                passengerId: 'p-rafiq',
                pickupAreaId: 1,
                dropoffAreaId: 2,
                seats: 1,
                status: 'REQUESTED',
                createdAt: '2026-09-27T10:05:00Z',
                passenger: { id: 'p-rafiq', name: 'Rafiq', email: 'rafiq@passenger.test' },
                pickupArea: { id: 1, name: 'Banani', corridor: 'NORTH' },
                dropoffArea: { id: 2, name: 'Mohakhali', corridor: 'NORTH' },
                fareSnapshots: [{ totalPaisa: 3200 }],
                matchesActivePool: true,
              },
            ],
          };
        }
        return {};
      });

      renderWithProviders(<DriverDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText('Rafiq')).toBeInTheDocument();
        expect(screen.getByText('Shirin')).toBeInTheDocument();
      });

      // Badging asserts (§12)
      expect(screen.getByText(/Compatible Match/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Incompatible Route/i).length).toBeGreaterThanOrEqual(1);

      // Action button asserts
      expect(screen.getByRole('button', { name: /Add to Active Pool/i })).toBeEnabled();
      expect(screen.getByRole('button', { name: /Incompatible Route/i })).toBeDisabled();

      // Sorting assert: Rafiq (compatible match) should be rendered before Shirin (incompatible)
      const passengerNames = screen.getAllByRole('heading', { level: 4 }).map((h) => h.textContent);
      expect(passengerNames).toEqual(['Rafiq', 'Shirin']);
    });
  });

  describe('TeslaPay Wallet Balance & Profile Synchronization', () => {
    it('refreshUser fetches /auth/me and updates wallet balance and localStorage', async () => {
      localStorage.setItem('tp_token', 'test-token');
      localStorage.setItem(
        'tp_user',
        JSON.stringify({
          id: 'user-1',
          name: 'Nusrat',
          email: 'nusrat@passenger.test',
          role: 'PASSENGER',
          walletBalancePaisa: 50000,
        })
      );

      vi.spyOn(apiClient, 'get').mockResolvedValueOnce({
        user: {
          id: 'user-1',
          name: 'Nusrat',
          email: 'nusrat@passenger.test',
          role: 'PASSENGER',
          walletBalancePaisa: 46000,
        },
      });

      function TestConsumer() {
        const { user, refreshUser } = useAuth();
        return (
          <div>
            <span>Balance: {user?.walletBalancePaisa}</span>
            <button onClick={() => refreshUser()}>Refresh</button>
          </div>
        );
      }

      renderWithProviders(<TestConsumer />);

      expect(screen.getByText('Balance: 50000')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /Refresh/i }));

      await waitFor(() => {
        expect(screen.getByText('Balance: 46000')).toBeInTheDocument();
      });

      const stored = JSON.parse(localStorage.getItem('tp_user') || '{}');
      expect(stored.walletBalancePaisa).toBe(46000);
    });

    it('updateUser immediately updates user in memory and localStorage', async () => {
      localStorage.setItem('tp_token', 'test-token');
      localStorage.setItem(
        'tp_user',
        JSON.stringify({
          id: 'user-1',
          name: 'Nusrat',
          email: 'nusrat@passenger.test',
          role: 'PASSENGER',
          walletBalancePaisa: 50000,
        })
      );

      function TestConsumer() {
        const { user, updateUser } = useAuth();
        return (
          <div>
            <span>Balance: {user?.walletBalancePaisa}</span>
            <button onClick={() => updateUser({ walletBalancePaisa: 40000 })}>Update</button>
          </div>
        );
      }

      renderWithProviders(<TestConsumer />);

      expect(screen.getByText('Balance: 50000')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /Update/i }));

      expect(screen.getByText('Balance: 40000')).toBeInTheDocument();
      const stored = JSON.parse(localStorage.getItem('tp_user') || '{}');
      expect(stored.walletBalancePaisa).toBe(40000);
    });

    it('ActiveRidePage TeslaPay payment updates wallet balance and Navbar immediately', async () => {
      localStorage.setItem('tp_token', 'test-token');
      localStorage.setItem(
        'tp_user',
        JSON.stringify({
          id: 'p-nusrat',
          name: 'Nusrat',
          email: 'nusrat@passenger.test',
          role: 'PASSENGER',
          walletBalancePaisa: 50000,
        })
      );

      let currentBalance = 50000;

      vi.spyOn(apiClient, 'get').mockImplementation(async (url: string) => {
        if (url === '/ride-requests/ride-1') {
          return {
            request: {
              id: 'ride-1',
              status: 'COMPLETED',
              passengerId: 'p-nusrat',
              pickupArea: { id: 1, name: 'Banani', corridor: 'NORTH' },
              dropoffArea: { id: 2, name: 'Mohakhali', corridor: 'NORTH' },
              poolId: 'pool-1',
              memberships: [],
            },
          };
        }
        if (url === '/pools/pool-1') {
          return {
            pool: {
              id: 'pool-1',
              status: 'COMPLETED',
              occupiedSeats: 1,
              capacitySnapshot: 3,
              tesla: { model: 'Bullet', plate: 'DHK-01', capacity: 3 },
              driver: { id: 'd-1', name: 'Jashim', email: 'jashim@driver.test' },
              memberships: [
                {
                  id: 'mem-1',
                  poolId: 'pool-1',
                  rideRequestId: 'ride-1',
                  passengerId: 'p-nusrat',
                  payments: [
                    {
                      id: 'pay-1',
                      amountPaisa: 4000,
                      status: 'PENDING',
                      method: null,
                    },
                  ],
                },
              ],
            },
          };
        }
        if (url === '/auth/me') {
          return {
            user: {
              id: 'p-nusrat',
              name: 'Nusrat',
              email: 'nusrat@passenger.test',
              role: 'PASSENGER',
              walletBalancePaisa: currentBalance,
            },
          };
        }
        return {};
      });

      const mockPost = vi.spyOn(apiClient, 'post').mockImplementation(async (url: string) => {
        if (url === '/payments/pay-1/pay') {
          currentBalance = 46000;
          return {
            payment: {
              id: 'pay-1',
              amountPaisa: 4000,
              status: 'SETTLED',
              method: 'TESLAPAY',
            },
            walletBalancePaisa: 46000,
          };
        }
        return {};
      });

      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

      render(
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <MemoryRouter initialEntries={['/rides/ride-1']}>
              <Navbar />
              <Routes>
                <Route path="/rides/:id" element={<ActiveRidePage />} />
              </Routes>
            </MemoryRouter>
          </AuthProvider>
        </QueryClientProvider>
      );

      // Verify initial balance in Navbar and button
      await waitFor(() => {
        expect(screen.getByText(/Pay with TeslaPay/i)).toBeInTheDocument();
      });
      expect(screen.getByText('TeslaPay: ৳500')).toBeInTheDocument();
      expect(screen.getByText('Balance: ৳500')).toBeInTheDocument();

      // Click Pay with TeslaPay
      fireEvent.click(screen.getByRole('button', { name: /Pay with TeslaPay/i }));

      await waitFor(() => {
        expect(mockPost).toHaveBeenCalledWith('/payments/pay-1/pay', { method: 'TESLAPAY' });
      });

      // Wallet balance in Navbar should reflect ৳460
      await waitFor(() => {
        expect(screen.getByText('TeslaPay: ৳460')).toBeInTheDocument();
      });
    });
  });
});
