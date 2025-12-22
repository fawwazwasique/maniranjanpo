
import React, { useState } from 'react';
import type { Notification } from '../types';
import { BellIcon, SunIcon, MoonIcon, LogoIcon } from './icons';

interface HeaderProps {
  notifications: Notification[];
  onMarkNotificationsAsRead: () => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

const Header: React.FC<HeaderProps> = ({ notifications, onMarkNotificationsAsRead, theme, setTheme }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleBellClick = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications && unreadCount > 0) {
      onMarkNotificationsAsRead();
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };
  
  return (
    <header className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-lg shadow-sm sticky top-0 z-30 border-b border-slate-200 dark:border-slate-700">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
             <div className="bg-white dark:bg-slate-700 p-1 rounded-lg shadow-sm">
                <LogoIcon className="w-8 h-8" />
             </div>
             <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">MANIRANJAN</h1>
             <span className="hidden sm:block h-6 w-[2px] bg-slate-200 dark:bg-slate-600 mx-2"></span>
             <p className="hidden md:block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">PO Dashboard</p>
          </div>
          <div className="flex items-center space-x-2">
             <button
                onClick={toggleTheme}
                className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-100 dark:focus:ring-offset-slate-800 focus:ring-red-500"
                aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'light' ? <MoonIcon className="w-6 h-6"/> : <SunIcon className="w-6 h-6"/>}
            </button>
            <div className="relative">
              <button
                onClick={handleBellClick}
                className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-100 dark:focus:ring-offset-slate-800 focus:ring-red-500"
                aria-label={`Notifications (${unreadCount} unread)`}
              >
                <BellIcon />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-[#C1272D] text-xs font-medium text-white ring-2 ring-white dark:ring-slate-800">
                    {unreadCount}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-lg shadow-2xl overflow-hidden ring-1 ring-black ring-opacity-5">
                  <div className="p-3 font-semibold text-base text-slate-700 dark:text-slate-200 border-b dark:border-slate-700">Notifications</div>
                  <ul className="max-h-96 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.slice().reverse().map(n => (
                        <li key={n.id} className={`px-4 py-3 border-b dark:border-slate-700/50 text-base transition-colors duration-200 ${!n.read ? 'bg-red-50 dark:bg-red-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}>
                          <p className="font-medium text-slate-800 dark:text-slate-100">{n.message}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">PO: {n.poId} &middot; {new Date(n.createdAt).toLocaleString()}</p>
                        </li>
                      ))
                    ) : (
                      <li className="px-4 py-8 text-base text-slate-500 dark:text-slate-400 text-center">No new notifications</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
