import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, UserRole } from '../context/AuthContext';
import { LoadingSpinner } from './Common';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingSpinner message="Checking authentication..." />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If passenger trying to access driver route, send to passenger request
    if (user.role === 'PASSENGER') {
      return <Navigate to="/passenger/request" replace />;
    }
    // If driver trying to access passenger route, send to driver dashboard
    return <Navigate to="/driver/dashboard" replace />;
  }

  return <>{children}</>;
}
