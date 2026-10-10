import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './index.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ConfirmProvider } from './context/ConfirmContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import About from './pages/About';
import HowToClaim from './pages/HowToClaim';
import RequestDetail from './pages/RequestDetail';
import StudentDashboard from './pages/student/Dashboard';
import NewRequest from './pages/student/NewRequest';
import AdminDashboard from './pages/admin/Dashboard';
import AdminRequests from './pages/admin/Requests';
import DocumentTypes from './pages/admin/DocumentTypes';
import SiteSettings from './pages/admin/SiteSettings';
import Students from './pages/admin/Students';

function Home() {
  const { user } = useAuth();
  return user.role === 'admin' ? <AdminDashboard /> : <StudentDashboard />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <ConfirmProvider>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<Layout />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/how-to-claim" element={<HowToClaim />} />
                  <Route path="/requests/:id" element={<RequestDetail />} />
                  <Route element={<ProtectedRoute roles={['student']} />}>
                    <Route path="/new" element={<NewRequest />} />
                  </Route>
                  <Route element={<ProtectedRoute roles={['admin']} />}>
                    <Route path="/requests" element={<AdminRequests />} />
                    <Route path="/students" element={<Students />} />
                    <Route path="/document-types" element={<DocumentTypes />} />
                    <Route path="/settings" element={<SiteSettings />} />
                  </Route>
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AuthProvider>
        </ConfirmProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>
);
