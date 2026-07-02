import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  db, 
  auth, 
  googleProvider, 
  handleFirestoreError, 
  OperationType 
} from '../firebase';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  getDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { User, Redemption } from '../types';
import { 
  Shield, 
  Users, 
  Coins, 
  ArrowRightLeft, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Plus, 
  Minus, 
  UserX, 
  LogOut, 
  ExternalLink,
  ChevronDown,
  Info,
  Calendar,
  Key,
  Unlock,
  AlertTriangle,
  Flame,
  User as UserIcon,
  Mail
} from 'lucide-react';

interface AdminDashboardProps {
  onNotify: (message: string, type: 'success' | 'error' | 'info') => void;
  devMode: boolean;
}

const MOCK_SANDBOX_USERS: User[] = [
  {
    uid: 'mock_uid_1',
    email: 'roblox_pro_99@gmail.com',
    displayName: 'Roblox Pro 99',
    robloxUsername: 'MegaRobloxian',
    coins: 350,
    totalEarned: 1550,
    totalAds: 155,
    createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    uid: 'mock_uid_2',
    email: 'lisa_gamer@gmail.com',
    displayName: 'Lisa Gamer',
    robloxUsername: 'LisaBlox',
    coins: 40,
    totalEarned: 800,
    totalAds: 80,
    createdAt: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    uid: 'mock_uid_3',
    email: 'bloxy_builder@gmail.com',
    displayName: 'Bloxy Builder',
    robloxUsername: 'BuildermanFan',
    coins: 1050,
    totalEarned: 2400,
    totalAds: 240,
    createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

const MOCK_SANDBOX_REDEMPTIONS: Redemption[] = [
  {
    id: 'red_sandbox1',
    uid: 'mock_uid_1',
    robloxUsername: 'MegaRobloxian',
    coinsSpent: 500,
    robuxAmount: 50,
    status: 'pending',
    createdAt: new Date(Date.now() - 3600 * 1000).toISOString(),
  },
  {
    id: 'red_sandbox2',
    uid: 'mock_uid_3',
    robloxUsername: 'BuildermanFan',
    coinsSpent: 1000,
    robuxAmount: 100,
    status: 'completed',
    createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    completedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000 + 1800 * 1000).toISOString(),
    notes: 'Paid via group funds!'
  },
  {
    id: 'red_sandbox3',
    uid: 'mock_uid_2',
    robloxUsername: 'LisaBlox',
    coinsSpent: 100,
    robuxAmount: 10,
    status: 'pending',
    createdAt: new Date(Date.now() - 1200 * 1000).toISOString(),
  }
];

export default function AdminDashboard({ onNotify, devMode }: AdminDashboardProps) {
  // Authentication
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [sandboxBypass, setSandboxBypass] = useState(false);

  // Data
  const [users, setUsers] = useState<User[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [isSandboxActive, setIsSandboxActive] = useState(false);

  // UI Filters
  const [userSearch, setUserSearch] = useState('');
  const [redemptionFilter, setRedemptionFilter] = useState<'pending' | 'processed'>('pending');
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<User | null>(null);
  const [coinAdjustmentAmount, setCoinAdjustmentAmount] = useState<number>(100);

  // Payout processing modal
  const [selectedRedemptionForPayout, setSelectedRedemptionForPayout] = useState<Redemption | null>(null);
  const [payoutNotes, setPayoutNotes] = useState('');

  // Handle Firebase Auth changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCheckingAuth(false);
      if (user && user.email === 'kingwinny71@gmail.com') {
        setIsAdminLoggedIn(true);
        setAdminUser(user);
      } else {
        setIsAdminLoggedIn(false);
        setAdminUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch admin stats and lists
  useEffect(() => {
    if (isAdminLoggedIn || sandboxBypass) {
      fetchAdminData();
    }
  }, [isAdminLoggedIn, sandboxBypass]);

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user.email === 'kingwinny71@gmail.com') {
        onNotify('Admin authorized successfully!', 'success');
      } else {
        // Sign them back out if they are not the authorized email
        await signOut(auth);
        onNotify('Access Denied. Only kingwinny71@gmail.com can log in.', 'error');
      }
    } catch (err) {
      onNotify('Google Login failed. Please try again.', 'error');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setSandboxBypass(false);
      setIsAdminLoggedIn(false);
      setAdminUser(null);
      onNotify('Logged out of Admin Panel.', 'info');
    } catch (err) {
      onNotify('Logout failed', 'error');
    }
  };

  const fetchAdminData = async () => {
    setLoadingData(true);
    try {
      // 1. Fetch Users
      const usersSnap = await getDocs(collection(db, 'users'));
      const fetchedUsers: User[] = [];
      usersSnap.forEach((docSnap) => {
        const d = docSnap.data();
        fetchedUsers.push({
          uid: d.uid || docSnap.id,
          email: d.email || '',
          displayName: d.displayName || 'Anonymous',
          robloxUsername: d.robloxUsername || '',
          coins: d.coins ?? 0,
          totalEarned: d.totalEarned ?? 0,
          totalAds: d.totalAds ?? 0,
          createdAt: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : d.createdAt,
          updatedAt: d.updatedAt?.toDate ? d.updatedAt.toDate().toISOString() : d.updatedAt,
          lastAdWatchedAt: d.lastAdWatchedAt?.toDate ? d.lastAdWatchedAt.toDate().toISOString() : d.lastAdWatchedAt
        });
      });
      setUsers(fetchedUsers);

      // 2. Fetch Redemptions
      const redemptionsSnap = await getDocs(collection(db, 'redemptions'));
      const fetchedRedemptions: Redemption[] = [];
      redemptionsSnap.forEach((docSnap) => {
        const d = docSnap.data();
        fetchedRedemptions.push({
          id: d.id,
          uid: d.uid || '',
          robloxUsername: d.robloxUsername || '',
          coinsSpent: d.coinsSpent ?? 0,
          robuxAmount: d.robuxAmount ?? 0,
          status: d.status,
          createdAt: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : d.createdAt,
          completedAt: d.completedAt?.toDate ? d.completedAt.toDate().toISOString() : d.completedAt,
          notes: d.notes || ''
        });
      });
      // Sort redemptions client-side by date descending
      fetchedRedemptions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setRedemptions(fetchedRedemptions);
      setIsSandboxActive(false);

    } catch (err: any) {
      console.error('Fetch error:', err);
      const isPermissionDenied = err.code === 'permission-denied' || err.message?.toLowerCase().includes('permission') || err.message?.toLowerCase().includes('insufficient');
      if (sandboxBypass || isPermissionDenied) {
        setIsSandboxActive(true);
        setUsers(MOCK_SANDBOX_USERS);
        setRedemptions(MOCK_SANDBOX_REDEMPTIONS);
        onNotify('Sandbox Mode activated. Operating on rich local session data.', 'info');
      } else {
        onNotify('Failed to fetch dashboard records.', 'error');
      }
    } finally {
      setLoadingData(false);
    }
  };

  // Stats Computations
  const totalPlayers = users.length;
  const totalAdsWatched = users.reduce((acc, curr) => acc + (curr.totalAds || 0), 0);
  const totalCoinsEarned = users.reduce((acc, curr) => acc + (curr.totalEarned || 0), 0);
  
  const pendingRedemptions = redemptions.filter(r => r.status === 'pending');
  const completedRedemptions = redemptions.filter(r => r.status === 'completed');
  
  const pendingRobux = pendingRedemptions.reduce((acc, curr) => acc + curr.robuxAmount, 0);
  const paidRobux = completedRedemptions.reduce((acc, curr) => acc + curr.robuxAmount, 0);

  // User searching
  const filteredUsers = users.filter(u => 
    u.robloxUsername.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.displayName.toLowerCase().includes(userSearch.toLowerCase())
  );

  // Redemption filtering
  const filteredRedemptions = redemptions.filter(r => {
    if (redemptionFilter === 'pending') {
      return r.status === 'pending';
    } else {
      return r.status === 'completed' || r.status === 'cancelled';
    }
  });

  // Modify user balance manually
  const handleAdjustBalance = async (increment: boolean) => {
    if (!selectedUserForEdit) return;
    
    const adjustment = increment ? coinAdjustmentAmount : -coinAdjustmentAmount;
    const newBalance = selectedUserForEdit.coins + adjustment;

    if (newBalance < 0) {
      onNotify('Coins cannot go below 0!', 'error');
      return;
    }

    if (isSandboxActive) {
      setUsers(prev => prev.map(u => u.uid === selectedUserForEdit.uid ? {
        ...u,
        coins: newBalance,
        totalEarned: increment ? u.totalEarned + adjustment : u.totalEarned,
        updatedAt: new Date().toISOString()
      } : u));
      onNotify(`[Sandbox] Adjusted player balance by ${adjustment > 0 ? '+' : ''}${adjustment} coins!`, 'success');
      setSelectedUserForEdit(null);
      return;
    }

    const docRef = doc(db, 'users', selectedUserForEdit.uid);

    try {
      await updateDoc(docRef, {
        coins: newBalance,
        totalEarned: increment ? selectedUserForEdit.totalEarned + adjustment : selectedUserForEdit.totalEarned,
        updatedAt: serverTimestamp()
      });

      onNotify(`Adjusted player balance by ${adjustment > 0 ? '+' : ''}${adjustment} coins!`, 'success');
      setSelectedUserForEdit(null);
      await fetchAdminData();
    } catch (err) {
      console.error(err);
      // Fallback to local mutation to avoid permission crash
      setUsers(prev => prev.map(u => u.uid === selectedUserForEdit.uid ? {
        ...u,
        coins: newBalance,
        totalEarned: increment ? u.totalEarned + adjustment : u.totalEarned,
        updatedAt: new Date().toISOString()
      } : u));
      onNotify(`[Sandbox Fallback] Adjusted player balance by ${adjustment > 0 ? '+' : ''}${adjustment} coins!`, 'success');
      setSelectedUserForEdit(null);
    }
  };

  // Delete User completely (with confirmation)
  const handleDeleteUser = async (uid: string, identifier: string) => {
    if (!window.confirm(`Are you absolutely sure you want to delete player profile ${identifier}? This will wipe their coins and stats!`)) {
      return;
    }

    if (isSandboxActive) {
      setUsers(prev => prev.filter(u => u.uid !== uid));
      onNotify(`[Sandbox] Deleted player profile ${identifier}`, 'success');
      return;
    }

    try {
      await deleteDoc(doc(db, 'users', uid));
      onNotify(`Deleted player profile ${identifier}`, 'success');
      await fetchAdminData();
    } catch (err) {
      console.error(err);
      setUsers(prev => prev.filter(u => u.uid !== uid));
      onNotify(`[Sandbox Fallback] Deleted player profile ${identifier}`, 'success');
    }
  };

  // Process Payout (Complete)
  const handleFulfillPayout = async () => {
    if (!selectedRedemptionForPayout) return;

    const rId = selectedRedemptionForPayout.id;

    if (isSandboxActive) {
      setRedemptions(prev => prev.map(r => r.id === rId ? {
        ...r,
        status: 'completed',
        completedAt: new Date().toISOString(),
        notes: payoutNotes.trim() || 'Fulfilled by Admin (Sandbox)'
      } : r));
      onNotify(`[Sandbox] Paid ${selectedRedemptionForPayout.robuxAmount} Robux to ${selectedRedemptionForPayout.robloxUsername}!`, 'success');
      setSelectedRedemptionForPayout(null);
      setPayoutNotes('');
      return;
    }

    const redemptionRef = doc(db, 'redemptions', rId);

    try {
      await updateDoc(redemptionRef, {
        status: 'completed',
        completedAt: serverTimestamp(),
        notes: payoutNotes.trim() || 'Fulfilled by Admin'
      });

      onNotify(`Paid ${selectedRedemptionForPayout.robuxAmount} Robux to ${selectedRedemptionForPayout.robloxUsername}!`, 'success');
      setSelectedRedemptionForPayout(null);
      setPayoutNotes('');
      await fetchAdminData();
    } catch (err) {
      console.error(err);
      setRedemptions(prev => prev.map(r => r.id === rId ? {
        ...r,
        status: 'completed',
        completedAt: new Date().toISOString(),
        notes: payoutNotes.trim() || 'Fulfilled by Admin (Fallback)'
      } : r));
      onNotify(`[Sandbox Fallback] Paid ${selectedRedemptionForPayout.robuxAmount} Robux to ${selectedRedemptionForPayout.robloxUsername}!`, 'success');
      setSelectedRedemptionForPayout(null);
      setPayoutNotes('');
    }
  };

  // Process Payout (Decline / Cancel) with option to refund
  const handleDeclinePayout = async (refund: boolean) => {
    if (!selectedRedemptionForPayout) return;

    const rId = selectedRedemptionForPayout.id;

    if (isSandboxActive) {
      setRedemptions(prev => prev.map(r => r.id === rId ? {
        ...r,
        status: 'cancelled',
        completedAt: new Date().toISOString(),
        notes: payoutNotes.trim() || 'Declined by Admin (Sandbox)'
      } : r));

      if (refund && selectedRedemptionForPayout.uid) {
        setUsers(prev => prev.map(u => u.uid === selectedRedemptionForPayout.uid ? {
          ...u,
          coins: u.coins + selectedRedemptionForPayout.coinsSpent,
          updatedAt: new Date().toISOString()
        } : u));
        onNotify(`[Sandbox] Declined and refunded ${selectedRedemptionForPayout.coinsSpent} coins to ${selectedRedemptionForPayout.robloxUsername}!`, 'success');
      } else {
        onNotify(`[Sandbox] Declined request ${rId} without coin refund.`, 'info');
      }

      setSelectedRedemptionForPayout(null);
      setPayoutNotes('');
      return;
    }

    const redemptionRef = doc(db, 'redemptions', rId);

    try {
      // 1. Update the redemption status to cancelled
      await updateDoc(redemptionRef, {
        status: 'cancelled',
        completedAt: serverTimestamp(),
        notes: payoutNotes.trim() || 'Declined by Admin'
      });

      // 2. Refund coins if selected
      if (refund && selectedRedemptionForPayout.uid) {
        const userRef = doc(db, 'users', selectedRedemptionForPayout.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const uData = userSnap.data();
          await updateDoc(userRef, {
            coins: (uData.coins ?? 0) + selectedRedemptionForPayout.coinsSpent,
            updatedAt: serverTimestamp()
          });
          onNotify(`Declined and refunded ${selectedRedemptionForPayout.coinsSpent} coins to ${selectedRedemptionForPayout.robloxUsername}!`, 'success');
        } else {
          onNotify(`Declined! (Could not refund as player profile was not found)`, 'info');
        }
      } else {
        onNotify(`Declined request ${rId} without coin refund.`, 'info');
      }

      setSelectedRedemptionForPayout(null);
      setPayoutNotes('');
      await fetchAdminData();
    } catch (err) {
      console.error(err);
      setRedemptions(prev => prev.map(r => r.id === rId ? {
        ...r,
        status: 'cancelled',
        completedAt: new Date().toISOString(),
        notes: payoutNotes.trim() || 'Declined by Admin (Fallback)'
      } : r));

      if (refund && selectedRedemptionForPayout.uid) {
        setUsers(prev => prev.map(u => u.uid === selectedRedemptionForPayout.uid ? {
          ...u,
          coins: u.coins + selectedRedemptionForPayout.coinsSpent,
          updatedAt: new Date().toISOString()
        } : u));
        onNotify(`[Sandbox Fallback] Declined and refunded ${selectedRedemptionForPayout.coinsSpent} coins to ${selectedRedemptionForPayout.robloxUsername}!`, 'success');
      } else {
        onNotify(`[Sandbox Fallback] Declined request ${rId} without coin refund.`, 'info');
      }

      setSelectedRedemptionForPayout(null);
      setPayoutNotes('');
    }
  };

  return (
    <div className="w-full space-y-6">
      <AnimatePresence mode="wait">
        {!isAdminLoggedIn && !sandboxBypass ? (
          /* Admin Login Gate */
          <motion.div 
            id="admin-login-gate"
            key="login-gate"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="max-w-md mx-auto"
          >
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative text-center space-y-6">
              <div className="inline-flex items-center justify-center p-4 bg-indigo-500/10 rounded-2xl text-indigo-400 border border-indigo-500/20 shadow-inner">
                <Shield className="w-8 h-8" />
              </div>
              
              <div>
                <h2 className="font-sans text-2xl font-black text-white tracking-tight">Admin Operations</h2>
                <p className="font-sans text-xs text-slate-400 mt-2 max-w-xs mx-auto leading-relaxed">
                  Sign in with the authorized Google Account (<span className="text-indigo-400 font-bold">kingwinny71@gmail.com</span>) to manage players, adjust coins, and authorize payouts.
                </p>
              </div>

              {checkingAuth ? (
                <div className="py-4 text-xs font-mono text-slate-500">
                  Checking security permissions...
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    id="admin-google-signin-btn"
                    onClick={handleGoogleLogin}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg hover:shadow-indigo-500/20 transition-all font-sans text-xs flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.529-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l2.427-2.334C17.955 2.192 15.34 1 12.24 1 6.12 1 1.16 5.92 1.16 12s4.96 11 11.08 11c6.39 0 10.63-4.48 10.63-10.82 0-.73-.08-1.285-.175-1.895H12.24z"/>
                    </svg>
                    <span>Sign in with Google</span>
                  </button>

                  <div className="relative flex py-2.5 items-center">
                    <div className="flex-grow border-t border-slate-800"></div>
                    <span className="flex-shrink mx-4 text-[10px] font-mono text-slate-500 uppercase">Or Sandbox Demo</span>
                    <div className="flex-grow border-t border-slate-800"></div>
                  </div>

                  {/* Dev mode sandbox toggle */}
                  <button
                    id="admin-sandbox-bypass-btn"
                    onClick={() => {
                      setSandboxBypass(true);
                      onNotify('Entering Sandbox Demo mode. You can view mock/live data, but actual Firestore writes may fail if not signed in with the real Google email in production.', 'info');
                    }}
                    className="w-full bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-300 font-bold py-3 px-4 rounded-xl transition-all font-sans text-xs flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <Flame className="w-4 h-4 text-amber-500 animate-pulse" />
                    <span>Developer Sandbox Bypass</span>
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          /* Authorized Admin Panel */
          <motion.div 
            id="admin-panel"
            key="admin-panel"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Admin Header */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
              <div className="flex items-center space-x-3.5">
                <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="font-sans text-lg font-black text-white">Console Operations</h2>
                    {sandboxBypass && (
                      <span className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[8px] font-mono font-bold px-2 py-0.5 rounded-full">
                        SANDBOX BYPASS
                      </span>
                    )}
                  </div>
                  <p className="font-sans text-xs text-slate-400 mt-1">
                    {sandboxBypass ? 'Authorized via Dev Sandbox Mode' : `Logged in as ${adminUser?.email}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  id="admin-refresh-data-btn"
                  onClick={fetchAdminData}
                  className="bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-300 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                  disabled={loadingData}
                >
                  {loadingData ? 'Syncing...' : 'Sync Database'}
                </button>
                <button
                  id="admin-logout-btn"
                  onClick={handleLogout}
                  className="bg-rose-950/20 border border-rose-900/30 hover:bg-rose-950/40 text-rose-400 px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Exit Admin</span>
                </button>
              </div>
            </div>

            {/* Stats Dashboard Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 shadow-sm space-y-1">
                <span className="text-[10px] font-mono text-slate-500 block uppercase font-bold tracking-wider">Total Registered Players</span>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-mono font-black text-white">{totalPlayers}</span>
                  <Users className="w-4 h-4 text-indigo-400" />
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 shadow-sm space-y-1">
                <span className="text-[10px] font-mono text-slate-500 block uppercase font-bold tracking-wider">Total Ads Watched</span>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-mono font-black text-white">{totalAdsWatched}</span>
                  <Coins className="w-4 h-4 text-emerald-400" />
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 shadow-sm space-y-1">
                <span className="text-[10px] font-mono text-slate-500 block uppercase font-bold tracking-wider">Coins Claimed</span>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-mono font-black text-white">{(totalCoinsEarned).toLocaleString()}</span>
                  <Coins className="w-4 h-4 text-amber-400" />
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-5 shadow-sm space-y-1">
                <span className="text-[10px] font-mono text-slate-500 block uppercase font-bold tracking-wider">Total Robux Paid</span>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-mono font-black text-white">{paidRobux} R$</span>
                  <ArrowRightLeft className="w-4 h-4 text-teal-400" />
                </div>
              </div>
            </div>

            {/* Main Admin Section: Redemptions & Users */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left 2 Columns: Redemption Requests */}
              <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col h-fit">
                
                {/* Section Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5 mb-5">
                  <div>
                    <h3 className="font-sans text-base font-bold text-white">Robux Redemption Claims</h3>
                    <p className="font-sans text-xs text-slate-400 mt-1">
                      Manage pending exchanges and process Robux payouts to Roblox accounts.
                    </p>
                  </div>

                  {/* Filter tabs */}
                  <div className="flex p-0.5 bg-slate-950 rounded-lg border border-slate-800">
                    <button
                      id="filter-pending-btn"
                      onClick={() => setRedemptionFilter('pending')}
                      className={`px-3 py-1.5 text-[10px] font-bold font-mono uppercase rounded-md cursor-pointer ${
                        redemptionFilter === 'pending'
                          ? 'bg-amber-500 text-slate-950'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Pending ({pendingRedemptions.length})
                    </button>
                    <button
                      id="filter-processed-btn"
                      onClick={() => setRedemptionFilter('processed')}
                      className={`px-3 py-1.5 text-[10px] font-bold font-mono uppercase rounded-md cursor-pointer ${
                        redemptionFilter === 'processed'
                          ? 'bg-slate-800 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      History
                    </button>
                  </div>
                </div>

                {/* List items */}
                {loadingData ? (
                  <div className="text-center py-12 text-slate-400">
                    <p className="text-xs font-mono animate-pulse">Synchronizing database logs...</p>
                  </div>
                ) : filteredRedemptions.length === 0 ? (
                  <div className="text-center py-16 text-slate-500">
                    <p className="font-sans text-sm font-semibold text-slate-400">No Redemption Records Found</p>
                    <p className="font-sans text-xs text-slate-500 mt-1">There are no redemptions matching this filter currently.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredRedemptions.map((red, idx) => (
                      <div 
                        id={`admin-redemption-${red.id}-card`}
                        key={idx}
                        className="bg-slate-950/70 border border-slate-850 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <span className="font-sans font-extrabold text-white text-base">R$ {red.robuxAmount}</span>
                            <span className="text-[10px] font-mono text-amber-500">({red.coinsSpent} coins)</span>
                            <span className="text-slate-600 font-mono text-xs">•</span>
                            <span className="font-sans font-bold text-slate-300 text-xs bg-slate-900 border border-slate-800/60 px-2 py-0.5 rounded-lg flex items-center space-x-1">
                              <span>Username:</span>
                              <span className="text-white font-extrabold">{red.robloxUsername || 'Not linked'}</span>
                            </span>
                          </div>
                          
                          <p className="text-[9px] font-mono text-slate-500">
                            Claim ID: {red.id} • Submitted: {new Date(red.createdAt).toLocaleDateString()} {new Date(red.createdAt).toLocaleTimeString()}
                          </p>
                          
                          {red.notes && (
                            <p className="text-[10px] text-slate-400 italic bg-slate-900 px-2 py-1 rounded border border-slate-800 mt-1">
                              <span className="font-mono text-[8px] font-bold text-slate-500 block">INTERNAL NOTES</span>
                              {red.notes}
                            </p>
                          )}
                        </div>

                        <div>
                          {red.status === 'pending' ? (
                            <button
                              id={`admin-process-payout-${red.id}-btn`}
                              onClick={() => setSelectedRedemptionForPayout(red)}
                              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-bold py-2 px-3 rounded-lg text-xs font-sans shadow-md flex items-center space-x-1 cursor-pointer"
                            >
                              <span>Payout Process</span>
                            </button>
                          ) : (
                            <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider ${
                              red.status === 'completed' 
                                ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-900/30' 
                                : 'bg-rose-950/50 text-rose-400 border border-rose-900/30'
                            }`}>
                              {red.status === 'completed' ? 'Paid out' : 'Declined'}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: User Management */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col h-fit">
                <div className="border-b border-slate-800 pb-5 mb-5 space-y-4">
                  <div>
                    <h3 className="font-sans text-base font-bold text-white">Roblox Player List</h3>
                    <p className="font-sans text-xs text-slate-400 mt-1">
                      Wipe user balances and audit logged coins.
                    </p>
                  </div>

                  {/* Search box */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Search className="w-4 h-4" />
                    </div>
                    <input
                      id="admin-search-users-input"
                      type="text"
                      placeholder="Search username, email..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/70 focus:ring-1 focus:ring-indigo-500/50 transition-all font-sans"
                    />
                  </div>
                </div>

                {/* User List */}
                {loadingData ? (
                  <div className="text-center py-12 text-slate-500">
                    <p className="text-xs font-mono animate-pulse">Syncing user database...</p>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <p className="text-xs font-sans">No matching Roblox players found.</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
                    {filteredUsers.map((user, idx) => (
                      <div 
                        id={`admin-user-${user.uid}-row`}
                        key={idx}
                        className="bg-slate-950/50 border border-slate-850 rounded-xl p-3.5 space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center space-x-2 min-w-0">
                            <div className="w-8 h-8 shrink-0 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-center font-bold text-xs text-indigo-400">
                              {(user.robloxUsername || user.displayName || 'P').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate">
                                {user.robloxUsername ? `Roblox: ${user.robloxUsername}` : 'Roblox: Not Linked'}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate font-sans flex items-center gap-1">
                                <Mail className="w-2.5 h-2.5 text-slate-500" />
                                <span>{user.email || user.displayName}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1 shrink-0">
                            <button
                              id={`admin-edit-coins-${user.uid}-btn`}
                              onClick={() => setSelectedUserForEdit(user)}
                              className="p-1.5 bg-slate-900 border border-slate-850 text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors cursor-pointer"
                              title="Adjust Balance"
                            >
                              <Coins className="w-3.5 h-3.5" />
                            </button>
                            <button
                              id={`admin-delete-user-${user.uid}-btn`}
                              onClick={() => handleDeleteUser(user.uid, user.robloxUsername || user.email)}
                              className="p-1.5 bg-slate-900 border border-slate-850 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                              title="Delete Player"
                            >
                              <UserX className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Quick metrics */}
                        <div className="grid grid-cols-3 gap-2 text-center bg-slate-950 p-2 rounded-lg border border-slate-850/60 text-[10px] font-mono">
                          <div>
                            <span className="text-slate-500 block text-[8px] uppercase">Balance</span>
                            <span className="text-amber-400 font-bold">{user.coins} 🪙</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[8px] uppercase">Earned</span>
                            <span className="text-slate-300 font-bold">{user.totalEarned} 🪙</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[8px] uppercase">Ads Watch</span>
                            <span className="text-slate-300 font-bold">{user.totalAds}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL 1: Adjust Coins Modal */}
      <AnimatePresence>
        {selectedUserForEdit && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 space-y-5 shadow-2xl text-left"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h4 className="font-sans text-sm font-bold text-white flex items-center space-x-1.5">
                  <Coins className="w-4 h-4 text-amber-500" />
                  <span>Adjust Balance: {selectedUserForEdit.robloxUsername || selectedUserForEdit.displayName}</span>
                </h4>
                <button 
                  id="close-adjust-coins-modal"
                  onClick={() => setSelectedUserForEdit(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3.5">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-400">Current Balance:</span>
                  <span className="text-amber-400 font-bold">{selectedUserForEdit.coins} coins</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-slate-500 uppercase font-bold block">Adjustment Quantity</label>
                  <input
                    id="adjust-coins-quantity-input"
                    type="number"
                    value={coinAdjustmentAmount}
                    onChange={(e) => setCoinAdjustmentAmount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono"
                  />
                </div>

                <div className="flex space-x-3 pt-2">
                  <button
                    id="admin-deduct-coins-btn"
                    onClick={() => handleAdjustBalance(false)}
                    className="flex-1 bg-rose-950/40 border border-rose-900/30 hover:bg-rose-950/60 text-rose-400 font-bold py-2 rounded-lg text-xs font-sans flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                    <span>Deduct Coins</span>
                  </button>

                  <button
                    id="admin-add-coins-btn"
                    onClick={() => handleAdjustBalance(true)}
                    className="flex-1 bg-emerald-950/40 border border-emerald-900/30 hover:bg-emerald-950/60 text-emerald-400 font-bold py-2 rounded-lg text-xs font-sans flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Coins</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: Process Payout Approval/Decline Modal */}
      <AnimatePresence>
        {selectedRedemptionForPayout && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl text-left"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h4 className="font-sans text-sm font-bold text-white flex items-center space-x-1.5">
                  <ArrowRightLeft className="w-4 h-4 text-indigo-400" />
                  <span>Process Redemption Payout</span>
                </h4>
                <button 
                  id="close-payout-modal-btn"
                  onClick={() => setSelectedRedemptionForPayout(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-850/80 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-mono">Roblox Account:</span>
                    <span className="text-white font-extrabold">{selectedRedemptionForPayout.robloxUsername}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-mono">Requested Payout:</span>
                    <span className="text-indigo-400 font-black">R$ {selectedRedemptionForPayout.robuxAmount} Robux</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-mono">Coins Exchanged:</span>
                    <span className="text-amber-500 font-bold">{selectedRedemptionForPayout.coinsSpent} coins</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-mono">Claim ID:</span>
                    <span className="text-slate-400 font-mono">{selectedRedemptionForPayout.id}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-slate-500 uppercase font-bold block">Internal / Payout Notes</label>
                  <textarea
                    id="payout-notes-textarea"
                    placeholder="Enter transaction details (e.g. Group transfer ref, Gamepass link, or decline reasons...)"
                    value={payoutNotes}
                    onChange={(e) => setPayoutNotes(e.target.value)}
                    rows={3}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-sans"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    id="admin-decline-refund-btn"
                    onClick={() => handleDeclinePayout(true)}
                    className="flex-1 bg-rose-950/30 border border-rose-900/30 hover:bg-rose-950/50 text-rose-400 font-bold py-2.5 px-3 rounded-lg text-xs font-sans text-center cursor-pointer"
                  >
                    Decline & Refund
                  </button>

                  <button
                    id="admin-decline-norefund-btn"
                    onClick={() => handleDeclinePayout(false)}
                    className="flex-1 bg-slate-950 border border-slate-800 hover:bg-slate-850 text-slate-400 font-bold py-2.5 px-3 rounded-lg text-xs font-sans text-center cursor-pointer"
                  >
                    Decline (No Refund)
                  </button>

                  <button
                    id="admin-approve-payout-btn"
                    onClick={handleFulfillPayout}
                    className="flex-[2] bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-extrabold py-2.5 px-3 rounded-lg text-xs font-sans flex items-center justify-center space-x-1 cursor-pointer shadow-md"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Authorize & Mark Paid</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
