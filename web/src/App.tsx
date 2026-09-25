import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RequestRidePage } from './pages/passenger/RequestRidePage';
import { ActiveRidePage } from './pages/passenger/ActiveRidePage';
import { RideHistoryPage } from './pages/passenger/RideHistoryPage';
import { DriverDashboardPage } from './pages/driver/DriverDashboardPage';
import { ActivePoolPage } from './pages/driver/ActivePoolPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-emerald-950 text-white flex flex-col">
            <Navbar />
            <main className="flex-1 flex flex-col">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route
                  path="/passenger/request"
                  element={
                    <ProtectedRoute allowedRoles={['PASSENGER']}>
                      <RequestRidePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/passenger/history"
                  element={
                    <ProtectedRoute allowedRoles={['PASSENGER']}>
                      <RideHistoryPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/passenger/ride/:id"
                  element={
                    <ProtectedRoute allowedRoles={['PASSENGER']}>
                      <ActiveRidePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/driver/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={['DRIVER']}>
                      <DriverDashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/driver/pool/:id"
                  element={
                    <ProtectedRoute allowedRoles={['DRIVER']}>
                      <ActivePoolPage />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </main>
            <footer className="border-t border-slate-800 px-6 py-4 text-center text-xs text-slate-500">
              Dhaka Tesla Pool &copy; {new Date().getFullYear()} — Battery Rickshaw Urban Mobility
            </footer>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
