import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import LoginPage from './pages/Login';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';
import { isAuthenticated, isAdmin } from './services/api';

// Root component to handle initial redirect
const Root: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/login");
  }, [navigate]);

  return null;
};

const App: React.FC = () => {
  // Protected route component
  const ProtectedRoute = ({ 
    element, 
    requireAdmin = false 
  }: { 
    element: React.ReactNode, 
    requireAdmin?: boolean 
  }) => {
    // Check if user is authenticated
    if (!isAuthenticated()) {
      return <Navigate to="/login" replace />;
    }
    
    // Check if route requires admin access
    if (requireAdmin && !isAdmin()) {
      return <Navigate to="/user-dashboard" replace />;
    }
    
    return <>{element}</>;
  };

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        <Route 
          path="/user-dashboard" 
          element={<ProtectedRoute element={<UserDashboard />} />} 
        />
        
        <Route 
          path="/admin-dashboard" 
          element={<ProtectedRoute element={<AdminDashboard />} requireAdmin={true} />} 
        />
        
        {/* Redirect root to login */}
        <Route path="/" element={<Root />} />
        
        {/* Catch all other routes and redirect to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
};

export default App;