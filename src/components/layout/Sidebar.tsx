'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { usePathname } from 'next/navigation';
import { FaHome, FaHeart, FaBookmark, FaUpload, FaBook, FaFileAlt, FaUser, FaCog, FaSignOutAlt } from 'react-icons/fa';
import Logo from './Logo';

interface SidebarProps {
  isOpen: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen }) => {
  const { user, profile, isAdmin, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  
  const toggleCollapse = () => {
    setCollapsed(!collapsed);
  };
  
  const isActive = (path: string) => {
    return pathname === path;
  };
  
  return (
    <>
      <aside className={`bg-gradient-to-b from-[#1A1A1A] to-[#212121] text-white ${collapsed ? 'w-20' : 'w-64'} fixed left-0 top-16 bottom-0 overflow-y-auto z-40 shadow-xl border-r border-gray-800 ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} transition-all duration-300`} style={{height: 'calc(100vh - 4rem)'}}>

      <div className="flex flex-col h-full">
        {/* Toggle button - positioned at the top of sidebar */}
        <div className="flex justify-end py-3 px-4 border-b border-gray-800/50">
          <button 
            onClick={toggleCollapse} 
            className="p-2 rounded-lg bg-gray-800/70 hover:bg-primary/20 text-gray-400 hover:text-primary transition-all duration-300"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            )}
          </button>
        </div>
        
        {/* Main navigation */}
        <nav className="py-4 px-3">
          <div className={`${!collapsed ? 'mb-3 px-2' : 'mb-3 text-center'}`}>
            {!collapsed ? (
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Navigation</h3>
            ) : (
              <div className="h-1 w-6 mx-auto bg-gray-700/50 rounded-full"></div>
            )}
          </div>
          <ul className="space-y-1">
            <li>
              <Link 
                href="/" 
                className={`flex items-center py-3 px-4 rounded-lg transition-all duration-300 group ${isActive('/') 
                  ? 'bg-primary/10 text-primary font-medium' 
                  : 'text-gray-300 hover:bg-gray-800/60 hover:text-white'}`}
              >
                <div className={`${isActive('/') ? 'bg-primary/20 text-primary' : 'bg-gray-800/50 text-gray-400 group-hover:bg-gray-700/70 group-hover:text-gray-200'} p-2 rounded-lg mr-3 transition-all duration-300 flex items-center justify-center w-8 h-8`}>
                  <FaHome className="h-4 w-4" />
                </div>
                {!collapsed && (
                  <div className="flex flex-col">
                    <span>Home</span>
                    {isActive('/') && <span className="text-xs text-primary-light">Dashboard</span>}
                  </div>
                )}
                {isActive('/') && <div className="ml-auto w-1.5 h-8 bg-primary rounded-full"></div>}
              </Link>
            </li>
            <li>
              <Link 
                href="/liked" 
                className={`flex items-center py-3 px-4 rounded-lg transition-all duration-300 group ${isActive('/liked') 
                  ? 'bg-primary/10 text-primary font-medium' 
                  : 'text-gray-300 hover:bg-gray-800/60 hover:text-white'}`}
              >
                <div className={`${isActive('/liked') ? 'bg-primary/20 text-primary' : 'bg-gray-800/50 text-gray-400 group-hover:bg-gray-700/70 group-hover:text-gray-200'} p-2 rounded-lg mr-3 transition-all duration-300 flex items-center justify-center w-8 h-8`}>
                  <FaHeart className="h-4 w-4" />
                </div>
                {!collapsed && (
                  <div className="flex flex-col">
                    <span>Liked</span>
                    {isActive('/liked') && <span className="text-xs text-primary-light">Favorite content</span>}
                  </div>
                )}
                {isActive('/liked') && <div className="ml-auto w-1.5 h-8 bg-primary rounded-full"></div>}
              </Link>
            </li>
            <li>
              <Link 
                href="/saved" 
                className={`flex items-center py-3 px-4 rounded-lg transition-all duration-300 group ${isActive('/saved') 
                  ? 'bg-primary/10 text-primary font-medium' 
                  : 'text-gray-300 hover:bg-gray-800/60 hover:text-white'}`}
              >
                <div className={`${isActive('/saved') ? 'bg-primary/20 text-primary' : 'bg-gray-800/50 text-gray-400 group-hover:bg-gray-700/70 group-hover:text-gray-200'} p-2 rounded-lg mr-3 transition-all duration-300 flex items-center justify-center w-8 h-8`}>
                  <FaBookmark className="h-4 w-4" />
                </div>
                {!collapsed && (
                  <div className="flex flex-col">
                    <span>Saved</span>
                    {isActive('/saved') && <span className="text-xs text-primary-light">Bookmarked items</span>}
                  </div>
                )}
                {isActive('/saved') && <div className="ml-auto w-1.5 h-8 bg-primary rounded-full"></div>}
              </Link>
            </li>
            <li>
              <Link 
                href="/upload" 
                className={`flex items-center py-3 px-4 rounded-lg transition-all duration-300 group ${isActive('/upload') 
                  ? 'bg-primary/10 text-primary font-medium' 
                  : 'text-gray-300 hover:bg-gray-800/60 hover:text-white'}`}
              >
                <div className={`${isActive('/upload') ? 'bg-primary/20 text-primary' : 'bg-gray-800/50 text-gray-400 group-hover:bg-gray-700/70 group-hover:text-gray-200'} p-2 rounded-lg mr-3 transition-all duration-300 flex items-center justify-center w-8 h-8`}>
                  <FaUpload className="h-4 w-4" />
                </div>
                {!collapsed && (
                  <div className="flex flex-col">
                    <span>Upload</span>
                    {isActive('/upload') && <span className="text-xs text-primary-light">Share your content</span>}
                  </div>
                )}
                {isActive('/upload') && <div className="ml-auto w-1.5 h-8 bg-primary rounded-full"></div>}
              </Link>
            </li>
          </ul>
          
          
        </nav>
        
        {/* Spacer to push footer to bottom */}
        <div className="flex-grow"></div>
        
        {/* Footer - simplified */}
        <div className="mt-auto border-t border-gray-800/50 py-4 px-4">
          {!collapsed ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Logo url="/logos/5.png" size={52} />
                <span className="text-sm text-gray-400 ml-2">TuneTalez</span>
              </div>
              <span className="text-xs text-gray-500">&copy; {new Date().getFullYear()}</span>
            </div>
          ) : (
            <div className="flex justify-center">
               <Link href="/" className="flex items-center">
                <Logo url="/logos/5.png" size={52} />
               </Link>
            </div>
          )}
        </div>
      </div>
      </aside>
      
      {/* Overlay for mobile sidebar */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden backdrop-blur-sm" 
          onClick={() => setCollapsed(false)}
          aria-label="Close menu"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Escape' || e.key === 'Enter') {
              setCollapsed(false);
            }
          }}
        />
      )}
    </>
  );
};

export default Sidebar;