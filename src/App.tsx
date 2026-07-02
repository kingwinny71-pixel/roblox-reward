/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { testConnection } from './firebase';
import PlayerPortal from './components/PlayerPortal';
import AdminDashboard from './components/AdminDashboard';
import { 
  Gamepad2, 
  ShieldCheck, 
  Coins, 
  HelpCircle, 
  Sparkles, 
  Bell, 
  X,
  Laptop
} from 'lucide-react';

interface NotificationToast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'player' | 'admin'>('player');
  const [notifications, setNotifications] = useState<NotificationToast[]>([]);
  const [devMode, setDevMode] = useState(true); // default to true in preview for easier evaluation
  const [showAdminTab, setShowAdminTab] = useState(false);

  // Verify connection to Firestore on boot and check admin parameter
  useEffect(() => {
    testConnection();

    // Check URL query parameters or localStorage to automatically reveal admin controls
    const urlParams = new URLSearchParams(window.location.search);
    const hasAdminParam = urlParams.get('admin') === 'true';
    const isUnlocked = localStorage.getItem('isAdminTabUnlocked') === 'true';

    if (hasAdminParam || isUnlocked) {
      setShowAdminTab(true);
      if (hasAdminParam) {
        setActiveTab('admin');
        localStorage.setItem('isAdminTabUnlocked', 'true');
      }
    }
  }, []);

  // When activeTab changes to admin, unlock it persistently
  useEffect(() => {
    if (activeTab === 'admin') {
      setShowAdminTab(true);
      localStorage.setItem('isAdminTabUnlocked', 'true');
    }
  }, [activeTab]);

  const addNotification = (message: string, type: 'success' | 'error' | 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications((prev) => [...prev, { id, message, type }]);
    
    // Automatically dismiss after 5 seconds
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* Decorative ambient background elements */}
      <div className="absolute top-0 inset-x-0 h-80 bg-gradient-to-b from-indigo-500/10 via-transparent to-transparent pointer-events-none"></div>
      <div className="absolute top-20 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full filter blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full filter blur-3xl pointer-events-none"></div>

      {/* Main Top Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo Brand */}
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 bg-gradient-to-tr from-amber-500 to-orange-500 rounded-xl flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/10">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                <span>Robux Earn Station</span>
                <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md">
                  FREE R$
                </span>
              </h1>
              <p className="text-[10px] text-slate-400 font-sans hidden sm:block">Watch Ads & Redeem Payouts</p>
            </div>
          </div>

          {/* Mode Switcher Nav - Only shown if Admin view is unlocked */}
          {showAdminTab && (
            <div className="flex items-center space-x-1 sm:space-x-2 bg-slate-900 border border-slate-800/80 p-1 rounded-xl">
              <button
                id="switch-player-view"
                onClick={() => setActiveTab('player')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                  activeTab === 'player'
                    ? 'bg-slate-800 text-white shadow-sm border border-slate-750'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Gamepad2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Player Area</span>
              </button>

              <button
                id="switch-admin-view"
                onClick={() => setActiveTab('admin')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-slate-800 text-white shadow-sm border border-slate-750'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span>Admin Dashboard</span>
              </button>
            </div>
          )}

        </div>
      </header>

      {/* Main Container Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        
        {/* Welcome introductory banner (Collapsible or dismissible if needed, let's make it a clean header) */}
        <div className="text-center max-w-xl mx-auto mb-8 space-y-2">
          <span className="text-[10px] font-mono font-bold tracking-widest text-amber-500 uppercase flex items-center justify-center space-x-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>100% Legit Group Payout System</span>
          </span>
          <h2 className="text-3xl font-display font-bold text-white tracking-tight">
            {activeTab === 'player' ? 'Earn Coins, Claim Robux' : 'Authorized Administration'}
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            {activeTab === 'player' 
              ? 'Complete sponsoring surveys, watch trailers, or answer Roblox trivia questions. Claim payouts with absolute ease.' 
              : 'Approve pending player payouts, adjust user coin balances, and configure game codes.'}
          </p>
        </div>

        {/* Display Active Portal View */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === 'player' ? (
              <PlayerPortal onNotify={addNotification} devMode={devMode} />
            ) : (
              <AdminDashboard onNotify={addNotification} devMode={devMode} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer copyright */}
      <footer className="border-t border-slate-900 py-6 bg-slate-950/60 mt-12 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>
            © 2026 Robux Earn Station. Powered by Roblox Group Transfers.{' '}
            <button
              onClick={() => {
                setActiveTab('admin');
                window.scrollTo({ top: 0, behavior: 'smooth' });
                addNotification('Admin interface loaded. Please log in.', 'info');
              }}
              className="text-slate-600 hover:text-indigo-400 transition-colors cursor-pointer font-bold underline decoration-dotted ml-2"
            >
              Admin Portal
            </button>
          </p>
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1">
              <Laptop className="w-3.5 h-3.5 text-slate-600" />
              <span>Host Node: active</span>
            </span>
            <span className="text-slate-700">|</span>
            <span className="text-amber-500/80 font-bold">100 coins = 10 Robux</span>
          </div>
        </div>
      </footer>

      {/* Slide-in Top-Right Notifications Toast System */}
      <div className="fixed bottom-5 right-5 z-50 space-y-2 max-w-sm w-full">
        <AnimatePresence>
          {notifications.map((notif) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`p-4 rounded-xl shadow-xl flex items-start space-x-3 border ${
                notif.type === 'success'
                  ? 'bg-emerald-950/95 border-emerald-500/30 text-emerald-300'
                  : notif.type === 'error'
                  ? 'bg-rose-950/95 border-rose-500/30 text-rose-300'
                  : 'bg-slate-900/95 border-slate-800 text-slate-300'
              }`}
            >
              <div className="p-1 shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div className="flex-1 text-xs font-medium font-sans leading-relaxed">
                {notif.message}
              </div>
              <button
                onClick={() => removeNotification(notif.id)}
                className="text-slate-400 hover:text-white shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

    </div>
  );
}
