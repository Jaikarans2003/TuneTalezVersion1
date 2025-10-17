'use client';

import AdminProtectedRoute from '@/components/auth/AdminProtectedRoute';
import { useState } from 'react';
import AdminDashboard from '@/components/admin/AdminDashboard';
import { useAdminAuth } from '@/context/AdminAuthContext';

export default function AdminPage() {
  const { logout } = useAdminAuth();
  
  return (
    <AdminProtectedRoute>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          <button 
            onClick={logout}
            className="px-4 py-2 bg-[#FF0000] text-white rounded-md hover:bg-[#CC0000] transition-colors"
          >
            Logout
          </button>
        </div>
        <AdminDashboard />
      </div>
    </AdminProtectedRoute>
  );
}
