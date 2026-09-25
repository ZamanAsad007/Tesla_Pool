import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';

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
                  path="/passenger/*"
                  element={
                    <ProtectedRoute allowedRoles={['PASSENGER']}>
                      <div className="p-8 text-center text-slate-400">Passenger Portal</div>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/driver/*"
                  element={
                    <ProtectedRoute allowedRoles={['DRIVER']}>
                      <div className="p-8 text-center text-slate-400">Driver Portal</div>
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
