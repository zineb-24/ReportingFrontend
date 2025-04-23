// App.tsx
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import LoginPage from './pages/Login';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';
import { isAuthenticated, isAdmin } from './services/api';
import AddUserForm from './components/AddUserForm';
import AddGymForm from './components/AddGymForm';
import UserSettings from './components/UserSettings';
import GymSettings from './components/GymSettings';

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
        
        {/* Main user dashboard */}
        <Route 
          path="/user-dashboard" 
          element={<ProtectedRoute element={<UserDashboard />} />} 
        />
        
        {/* User dashboard tabs as separate routes */}
        <Route 
          path="/user-dashboard/users" 
          element={<ProtectedRoute element={<UserDashboard />} />} 
        />
        
        <Route 
          path="/user-dashboard/links" 
          element={<ProtectedRoute element={<UserDashboard />} />} 
        />
        
        <Route 
          path="/user-dashboard/reports" 
          element={<ProtectedRoute element={<UserDashboard />} />} 
        />
        
        {/* Main admin dashboard */}
        <Route 
          path="/admin-dashboard" 
          element={<ProtectedRoute element={<AdminDashboard />} requireAdmin={true} />} 
        />
        
        {/* Admin dashboard tabs as separate routes */}
        <Route 
          path="/admin-dashboard/users" 
          element={<ProtectedRoute element={<AdminDashboard />} requireAdmin={true} />} 
        />
        
        <Route 
          path="/admin-dashboard/gyms" 
          element={<ProtectedRoute element={<AdminDashboard />} requireAdmin={true} />} 
        />
        
        <Route 
          path="/admin-dashboard/links" 
          element={<ProtectedRoute element={<AdminDashboard />} requireAdmin={true} />} 
        />

        {/* Add user form */}
        <Route 
          path="/admin-dashboard/add-user" 
          element={<ProtectedRoute element={<AddUserForm />} requireAdmin={true} />} 
        />

        {/* Add gym form */}
        <Route 
          path="/admin-dashboard/add-gym" 
          element={<ProtectedRoute element={<AddGymForm />} requireAdmin={true} />} 
        />

        {/* User Settings*/}
        <Route 
          path="/admin-dashboard/users/:userId" 
          element={<ProtectedRoute element={<UserSettings />} requireAdmin={true} />} 
        />

        {/* Gym Settings*/}
        <Route 
          path="/admin-dashboard/gyms/:gymId" 
          element={<ProtectedRoute element={<GymSettings />} requireAdmin={true} />} 
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