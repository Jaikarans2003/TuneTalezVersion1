'use client';

import { useState, useEffect } from 'react';
import { Inter } from 'next/font/google';
import './globals.css';
import Header from '@/components/layout/Header';
import LandingSidebar from '@/components/layout/LandingSidebar';
import { AuthProvider } from '@/context/AuthContext';
import { usePathname } from 'next/navigation';
// Import debug tools
import { initDebugTools } from './debug-init';

const inter = Inter({ subsets: ['latin'] });

// Metadata is handled in a separate metadata.ts file when using 'use client'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  
  // Initialize debug tools
  useEffect(() => {
    // This will trigger the debug tools initialization
    initDebugTools();
  }, []);
  
  // Don't show the global sidebar on the home page since we have a custom one there
  const isHomePage = pathname === '/';
  
  return (
    <html lang="en">
      <body className={`${inter.className} flex flex-col min-h-screen bg-background`}>
        <AuthProvider>
          <div className="min-h-screen flex flex-col">
            {/* Header for all pages */}
            <Header 
              isOpen={sidebarOpen} 
              setIsOpen={setSidebarOpen} 
            />
            
            <div className="flex flex-1">
              {/* Sidebar for all pages */}
              <LandingSidebar isOpen={sidebarOpen} />
              
              {/* Main content */}
              <main className="flex-grow md:ml-20">
                {children}
              </main>
            </div>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
