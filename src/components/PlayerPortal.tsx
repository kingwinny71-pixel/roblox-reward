import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  auth, 
  googleProvider,
  db, 
  handleFirestoreError, 
  OperationType 
} from '../firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  getDocs, 
  query, 
  where,
  serverTimestamp 
} from 'firebase/firestore';
import { User, Redemption } from '../types';
import { 
  User as UserIcon, 
  Coins, 
  Tv, 
  History, 
  ArrowRightLeft, 
  LogOut, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  ArrowRight, 
  ShoppingBag,
  Sparkles,
  Gamepad2,
  RefreshCw,
  LogIn
} from 'lucide-react';
import AdSimulator from './AdSimulator';

interface PlayerPortalProps {
  onNotify: (message: string, type: 'success' | 'error' | 'info') => void;
  devMode: boolean;
}

const ROBUX_PACKAGES = [
  { robux: 10, coins: 100, label: "Starter Pack", popular: false },
  { robux: 50, coins: 500, label: "Casual Pack", popular: false },
  { robux: 100, coins: 1000, label: "Pro Pack", popular: true },
  { robux: 250, coins: 2500, label: "Mega Pack", popular: false },
  { robux: 500, coins: 5000, label: "Ultra Pack", popular: false },
  { robux: 1000, coins: 10000, label: "Legend Pack", popular: false },
];

export default function PlayerPortal({ onNotify, devMode }: PlayerPortalProps) {
  // Authentication / State
  const [authChecking, setAuthChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [robloxUsernameInput, setRobloxUsernameInput] = useState('');
  
  // Logged-in State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loadingRedemptions, setLoadingRedemptions] = useState(false);
  const [activeTab, setActiveTab] = useState<'earn' | 'exchange' | 'history'>('earn');
  
  // Ad simulator state
  const [showAd, setShowAd] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Cooldown timer state
  const [cooldownTimeRemaining, setCooldownTimeRemaining] = useState<number>(0);

  // Cooldown timer effects
  useEffect(() => {
    if (!currentUser) {
      setCooldownTimeRemaining(0);
      return;
    }
    const uid = currentUser.uid;
    const storedCooldown = localStorage.getItem(`ad_cooldown_${uid}`);
    if (storedCooldown) {
      const cooldownUntil = parseInt(storedCooldown, 10);
      const remaining = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
      if (remaining > 0) {
        setCooldownTimeRemaining(remaining);
      }
    }
  }, [currentUser?.uid]);

  useEffect(() => {
    if (cooldownTimeRemaining <= 0) return;
    const timer = setInterval(() => {
      setCooldownTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownTimeRemaining]);

  // Monitor Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await syncUserProfile(firebaseUser);
      } else {
        setCurrentUser(null);
        setAuthChecking(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch redemptions whenever logged-in user changes
  useEffect(() => {
    if (currentUser && currentUser.robloxUsername) {
      fetchUserRedemptions(currentUser.uid);
    }
  }, [currentUser?.uid, currentUser?.robloxUsername]);

  const syncUserProfile = async (firebaseUser: any) => {
    setAuthChecking(true);
    const docRef = doc(db, 'users', firebaseUser.uid);
    try {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const userObj: User = {
          uid: data.uid,
          email: data.email,
          displayName: data.displayName,
          robloxUsername: data.robloxUsername || '',
          coins: data.coins ?? 0,
          totalEarned: data.totalEarned ?? 0,
          totalAds: data.totalAds ?? 0,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          lastAdWatchedAt: data.lastAdWatchedAt,
          dailyAdsCount: data.dailyAdsCount ?? 0,
          lastAdDate: data.lastAdDate || ''
        };
        setCurrentUser(userObj);
        setRobloxUsernameInput(userObj.robloxUsername);
      } else {
        // Create new profile for first-time Google sign in
        const newProfile: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || 'Player',
          robloxUsername: '', // initially empty, must link
          coins: 0,
          totalEarned: 0,
          totalAds: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await setDoc(docRef, {
          uid: newProfile.uid,
          email: newProfile.email,
          displayName: newProfile.displayName,
          robloxUsername: '',
          coins: 0,
          totalEarned: 0,
          totalAds: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        setCurrentUser(newProfile);
      }
    } catch (err) {
      console.error(err);
      onNotify('Error loading your profile.', 'error');
    } finally {
      setAuthChecking(false);
    }
  };

  const fetchFreshUserProfile = async (uid: string) => {
    const docRef = doc(db, 'users', uid);
    try {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const userObj: User = {
          uid: data.uid,
          email: data.email,
          displayName: data.displayName,
          robloxUsername: data.robloxUsername || '',
          coins: data.coins ?? 0,
          totalEarned: data.totalEarned ?? 0,
          totalAds: data.totalAds ?? 0,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          lastAdWatchedAt: data.lastAdWatchedAt,
          dailyAdsCount: data.dailyAdsCount ?? 0,
          lastAdDate: data.lastAdDate || ''
        };
        setCurrentUser(userObj);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        onNotify('Signed in successfully!', 'success');
      }
    } catch (error) {
      console.error(error);
      onNotify('Google Sign-In failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLinkRobloxUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!robloxUsernameInput.trim()) {
      onNotify('Please enter your Roblox username', 'error');
      return;
    }
    
    // Roblox username pattern check
    const usernameRegex = /^[a-zA-Z0-9_\-+]+$/;
    if (!usernameRegex.test(robloxUsernameInput.trim())) {
      onNotify('Invalid Roblox username. Letters, numbers, and - + _ only.', 'error');
      return;
    }

    if (!auth.currentUser) return;
    setLoading(true);

    const uid = auth.currentUser.uid;
    const docRef = doc(db, 'users', uid);
    try {
      await updateDoc(docRef, {
        robloxUsername: robloxUsernameInput.trim(),
        updatedAt: serverTimestamp()
      });

      setCurrentUser(prev => prev ? {
        ...prev,
        robloxUsername: robloxUsernameInput.trim()
      } : null);

      onNotify('Roblox username successfully linked!', 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeLinkedAccount = async () => {
    if (!currentUser || !auth.currentUser) return;
    if (!window.confirm("Are you sure you want to change your linked Roblox account? Your coins balance will remain unchanged.")) {
      return;
    }
    
    setLoading(true);
    const docRef = doc(db, 'users', auth.currentUser.uid);
    try {
      await updateDoc(docRef, {
        robloxUsername: '',
        updatedAt: serverTimestamp()
      });
      setCurrentUser(prev => prev ? { ...prev, robloxUsername: '' } : null);
      setRobloxUsernameInput('');
      onNotify('Linked account cleared. Please link a new Roblox username.', 'info');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setCurrentUser(null);
      setRobloxUsernameInput('');
      onNotify('Signed out successfully.', 'info');
    } catch (error) {
      onNotify('Logout failed. Try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserRedemptions = async (uid: string) => {
    setLoadingRedemptions(true);
    try {
      const q = query(
        collection(db, 'redemptions'), 
        where('uid', '==', uid)
      );
      const querySnapshot = await getDocs(q);
      const fetched: Redemption[] = [];
      querySnapshot.forEach((docSnap) => {
        const d = docSnap.data();
        fetched.push({
          id: d.id,
          uid: d.uid,
          robloxUsername: d.robloxUsername,
          coinsSpent: d.coinsSpent,
          robuxAmount: d.robuxAmount,
          status: d.status,
          createdAt: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : d.createdAt,
          completedAt: d.completedAt?.toDate ? d.completedAt.toDate().toISOString() : d.completedAt,
          notes: d.notes
        });
      });
      // Sort client-side by date descending
      fetched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setRedemptions(fetched);
    } catch (err) {
      console.error("Error fetching redemptions: ", err);
    } finally {
      setLoadingRedemptions(false);
    }
  };

  const refreshBalanceAndData = async () => {
    if (!currentUser) return;
    setRefreshing(true);
    await fetchFreshUserProfile(currentUser.uid);
    await fetchUserRedemptions(currentUser.uid);
    setRefreshing(false);
    onNotify('Balances updated!', 'success');
  };

  const handleAdCompleted = async (adType: string, earnedCoins: number) => {
    if (!currentUser || !auth.currentUser) return;
    setShowAd(false);

    const uid = auth.currentUser.uid;
    const userDocRef = doc(db, 'users', uid);
    const adLogRef = doc(collection(db, 'adviews'));

    const todayStr = new Date().toISOString().split('T')[0];
    const isNewDay = currentUser.lastAdDate !== todayStr;
    const nextDailyCount = isNewDay ? 1 : (currentUser.dailyAdsCount ?? 0) + 1;

    if (!isNewDay && (currentUser.dailyAdsCount ?? 0) >= 15) {
      onNotify('Daily ad limit reached! You can watch up to 15 ads per day. Come back tomorrow!', 'error');
      return;
    }

    try {
      // Create ad log
      await setDoc(adLogRef, {
        uid: currentUser.uid,
        robloxUsername: currentUser.robloxUsername,
        earnedCoins: earnedCoins,
        timestamp: serverTimestamp(),
        adType: adType
      });

      // Update user coins and daily counts
      await updateDoc(userDocRef, {
        coins: currentUser.coins + earnedCoins,
        totalEarned: currentUser.totalEarned + earnedCoins,
        totalAds: currentUser.totalAds + 1,
        lastAdWatchedAt: serverTimestamp(),
        dailyAdsCount: nextDailyCount,
        lastAdDate: todayStr,
        updatedAt: serverTimestamp()
      });

      // Generate random cooldown of 30-60 seconds
      const cooldownSecs = Math.floor(Math.random() * (60 - 30 + 1)) + 30;
      const cooldownUntil = Date.now() + cooldownSecs * 1000;
      localStorage.setItem(`ad_cooldown_${uid}`, cooldownUntil.toString());
      setCooldownTimeRemaining(cooldownSecs);

      // Refresh state
      await fetchFreshUserProfile(currentUser.uid);
      onNotify(`Success! ${earnedCoins} Coins have been added to your account!`, 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
    }
  };

  const handleRedeem = async (robuxAmount: number, coinsCost: number) => {
    if (!currentUser || !auth.currentUser) return;

    if (currentUser.coins < coinsCost) {
      onNotify(`Insufficient coins! You need ${coinsCost - currentUser.coins} more coins to redeem ${robuxAmount} Robux.`, 'error');
      return;
    }

    setLoading(true);
    const uid = auth.currentUser.uid;
    const userDocRef = doc(db, 'users', uid);
    const redemptionId = 'red_'.concat(Math.random().toString(36).substring(2, 11));
    const redemptionDocRef = doc(db, 'redemptions', redemptionId);

    try {
      // 1. Write the redemption request
      await setDoc(redemptionDocRef, {
        id: redemptionId,
        uid: currentUser.uid,
        robloxUsername: currentUser.robloxUsername,
        coinsSpent: coinsCost,
        robuxAmount: robuxAmount,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      // 2. Subtract coins from the user
      await updateDoc(userDocRef, {
        coins: currentUser.coins - coinsCost,
        updatedAt: serverTimestamp()
      });

      onNotify(`Redeemed! ${robuxAmount} Robux request has been registered.`, 'success');
      
      // Refresh local copy
      await fetchFreshUserProfile(currentUser.uid);
      await fetchUserRedemptions(currentUser.uid);
      setActiveTab('history');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `redemptions/${redemptionId}`);
    } finally {
      setLoading(false);
    }
  };

  // Auth checking skeleton or spinner
  if (authChecking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500"></div>
        <p className="font-mono text-xs text-slate-400">Verifying session...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {!currentUser ? (
          /* Sign In Landing Section */
          <motion.div 
            id="landing-container"
            key="landing"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="max-w-md mx-auto"
          >
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
              {/* Card visual details */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full filter blur-3xl"></div>
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-500/5 rounded-full filter blur-3xl"></div>
              
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center p-3.5 bg-amber-500/10 rounded-2xl text-amber-500 border border-amber-500/20 mb-4 shadow-inner">
                  <Coins className="w-8 h-8 animate-pulse" />
                </div>
                <h2 className="font-sans text-2xl font-extrabold text-white tracking-tight">Earn Free Robux</h2>
                <p className="font-sans text-xs text-slate-400 mt-2 max-w-xs mx-auto leading-relaxed">
                  Sign in securely with your Google Account, watch quick ad playables, earn coins, and instantly claim your Robux!
                </p>
              </div>

              {/* Google Auth Sign In */}
              <div className="space-y-4">
                <button
                  id="google-signin-btn"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full bg-white hover:bg-slate-100 text-slate-900 font-bold py-3.5 px-4 rounded-xl shadow-lg transition-all font-sans flex items-center justify-center space-x-3 cursor-pointer group"
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                  </svg>
                  <span>{loading ? 'Signing in...' : 'Sign In with Google'}</span>
                </button>
              </div>

              <div className="mt-6 pt-5 border-t border-slate-800 text-center">
                <p className="text-[10px] text-slate-500 font-sans leading-relaxed">
                  We secure your transactions with Google Authentication. Your credentials are never shared or saved anywhere.
                </p>
              </div>
            </div>

            {/* Benefits section */}
            <div className="grid grid-cols-3 gap-3.5 mt-6 text-center">
              <div className="bg-slate-900/40 border border-slate-800/50 rounded-xl p-3">
                <span className="text-lg">📺</span>
                <p className="font-sans text-[10px] font-bold text-white mt-1">1. Watch Ads</p>
                <p className="font-sans text-[9px] text-slate-400 mt-0.5">Quick & interactive</p>
              </div>
              <div className="bg-slate-900/40 border border-slate-800/50 rounded-xl p-3">
                <span className="text-lg">🪙</span>
                <p className="font-sans text-[10px] font-bold text-white mt-1">2. Earn Coins</p>
                <p className="font-sans text-[9px] text-slate-400 mt-0.5">10 coins per completion</p>
              </div>
              <div className="bg-slate-900/40 border border-slate-800/50 rounded-xl p-3">
                <span className="text-lg">💸</span>
                <p className="font-sans text-[10px] font-bold text-white mt-1">3. Get Robux</p>
                <p className="font-sans text-[9px] text-slate-400 mt-0.5">Group admin delivery</p>
              </div>
            </div>
          </motion.div>
        ) : !currentUser.robloxUsername ? (
          /* Link Roblox Username view */
          <motion.div 
            id="link-username-container"
            key="link-username"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="max-w-md mx-auto"
          >
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full filter blur-3xl"></div>
              
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center p-3 bg-indigo-500/10 rounded-2xl text-indigo-400 border border-indigo-500/20 mb-4">
                  <UserIcon className="w-8 h-8" />
                </div>
                <h2 className="font-sans text-xl font-extrabold text-white tracking-tight">Link Your Roblox Account</h2>
                <p className="font-sans text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Hi <span className="text-white font-bold">{currentUser.displayName}</span>! Please link your Roblox account username so we know where to send your Robux.
                </p>
              </div>

              <form id="link-roblox-form" onSubmit={handleLinkRobloxUsername} className="space-y-4">
                <div className="space-y-2">
                  <label className="font-sans text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                    Roblox Account Username
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <UserIcon className="w-5 h-5" />
                    </div>
                    <input
                      id="roblox-username-link-input"
                      type="text"
                      placeholder="Ex: Builderman"
                      value={robloxUsernameInput}
                      onChange={(e) => setRobloxUsernameInput(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all font-sans font-medium"
                      required
                      disabled={loading}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 font-sans leading-relaxed">
                    Make sure to enter your exact username (not Display Name) so your payout is not sent to the wrong player.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    id="roblox-cancel-logout-btn"
                    type="button"
                    onClick={handleLogout}
                    className="flex-1 bg-slate-950 border border-slate-800 hover:bg-slate-850 text-slate-300 font-medium py-3 px-4 rounded-xl transition-all font-sans text-xs text-center cursor-pointer"
                    disabled={loading}
                  >
                    Logout
                  </button>
                  <button
                    id="link-submit-btn"
                    type="submit"
                    className="flex-[2] bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-bold py-3 px-4 rounded-xl shadow-lg transition-all font-sans text-xs flex items-center justify-center space-x-1.5 cursor-pointer"
                    disabled={loading}
                  >
                    <span>{loading ? 'Linking...' : 'Link & Continue'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        ) : (
          /* Main Player Dashboard Portal */
          <motion.div 
            id="player-dashboard"
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Top User Status Panel */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center font-black text-xl text-white shadow-lg relative border border-indigo-400/20">
                  {currentUser.robloxUsername.charAt(0).toUpperCase()}
                  <span className="absolute -bottom-1.5 -right-1.5 bg-slate-900 text-amber-500 text-[9px] border border-slate-800 rounded-full px-1.5 py-0.5 font-bold font-mono">
                    LVL 1
                  </span>
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-sans text-lg font-bold text-white truncate max-w-[160px]">{currentUser.robloxUsername}</h3>
                    <span className="bg-slate-800 text-[10px] text-slate-400 font-mono font-bold px-2 py-0.5 rounded-full border border-slate-750">
                      R$ Player
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    <p className="text-[10px] font-mono text-indigo-400 truncate max-w-[140px]">{currentUser.email}</p>
                    <span className="text-slate-700">•</span>
                    <button 
                      id="change-roblox-username-btn"
                      onClick={handleChangeLinkedAccount}
                      className="text-[10px] font-sans text-slate-400 hover:text-white underline cursor-pointer"
                    >
                      Change Roblox
                    </button>
                  </div>
                </div>
              </div>

              {/* Main Balance Card */}
              <div className="flex items-center gap-4 bg-slate-950/85 border border-slate-800/80 p-4 rounded-xl md:w-auto">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 shadow-inner">
                    <Coins className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 block uppercase font-bold tracking-wider">Your Balance</span>
                    <span className="text-xl font-mono font-extrabold text-amber-400 tracking-tight">
                      {currentUser.coins.toLocaleString()} <span className="text-xs text-amber-500/80 font-sans font-bold">COINS</span>
                    </span>
                  </div>
                </div>

                <div className="border-l border-slate-800 h-10 mx-1"></div>

                <div className="flex items-center space-x-1 bg-amber-500/5 px-2.5 py-1.5 rounded-lg border border-amber-500/10 text-amber-400">
                  <RefreshCw 
                    id="refresh-balance-btn"
                    className={`w-3.5 h-3.5 cursor-pointer ${refreshing ? 'animate-spin' : ''}`}
                    onClick={refreshBalanceAndData}
                  />
                  <span className="text-[9px] font-mono font-bold">REFRESH</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  id="player-logout-btn"
                  onClick={handleLogout}
                  className="bg-slate-950 border border-slate-800 hover:bg-slate-850 hover:text-white text-slate-400 p-2.5 rounded-xl transition-all shadow-sm cursor-pointer"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-slate-800 p-1 bg-slate-950/50 rounded-xl">
              <button
                id="earn-tab-btn"
                onClick={() => setActiveTab('earn')}
                className={`flex-1 py-3 text-xs font-semibold rounded-lg flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                  activeTab === 'earn'
                    ? 'bg-slate-850 text-white shadow-sm border border-slate-800/60'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Tv className="w-4 h-4" />
                <span>Earn Coins</span>
              </button>
              
              <button
                id="exchange-tab-btn"
                onClick={() => setActiveTab('exchange')}
                className={`flex-1 py-3 text-xs font-semibold rounded-lg flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                  activeTab === 'exchange'
                    ? 'bg-slate-850 text-white shadow-sm border border-slate-800/60'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ArrowRightLeft className="w-4 h-4" />
                <span>Exchange Robux</span>
              </button>

              <button
                id="history-tab-btn"
                onClick={() => setActiveTab('history')}
                className={`flex-1 py-3 text-xs font-semibold rounded-lg flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                  activeTab === 'history'
                    ? 'bg-slate-850 text-white shadow-sm border border-slate-800/60'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <History className="w-4 h-4" />
                <span>Payouts History</span>
                {redemptions.some(r => r.status === 'pending') && (
                  <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse ml-1"></span>
                )}
              </button>
            </div>

            {/* Tab Content Panels */}
            <AnimatePresence mode="wait">
              {activeTab === 'earn' && (
                /* Tab 1: Earn Coins by watching ads */
                <motion.div
                  id="tab-earn-panel"
                  key="earn-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-slate-900 border border-amber-500/20 rounded-2xl p-8 relative overflow-hidden">
                    <div className="absolute top-1/2 right-12 -translate-y-1/2 opacity-20 select-none hidden md:block">
                      <Gamepad2 className="w-40 h-40 text-amber-500/20" />
                    </div>

                    <div className="max-w-md space-y-5">
                      <div className="inline-flex items-center space-x-1 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-full text-xs text-amber-400 font-bold">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Instant Crediting active</span>
                      </div>
                      
                      <div className="space-y-2">
                        <h2 className="font-sans text-xl md:text-2xl font-extrabold text-white tracking-tight">
                          1 Ad = <span className="text-amber-400 font-black">10–30 Coins</span>
                        </h2>
                        <p className="font-sans text-xs text-slate-400 leading-relaxed">
                          Watch short sponsor ads to win a random reward of 10 to 30 gold coins! 
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
                        <div className="bg-slate-950/80 border border-slate-800 px-4 py-2 rounded-xl text-xs">
                          <span className="text-slate-500 block text-[9px] font-mono font-bold">DAILY ADS WATCHED</span>
                          <span className="font-mono font-bold text-white text-sm">
                            {currentUser.lastAdDate === new Date().toISOString().split('T')[0] ? currentUser.dailyAdsCount ?? 0 : 0} / 15
                          </span>
                        </div>
                        <div className="bg-slate-950/80 border border-slate-800 px-4 py-2 rounded-xl text-xs">
                          <span className="text-slate-500 block text-[9px] font-mono font-bold">TOTAL ADS WATCHED</span>
                          <span className="font-mono font-bold text-white text-sm">{currentUser.totalAds} ads</span>
                        </div>
                        <div className="bg-slate-950/80 border border-slate-800 px-4 py-2 rounded-xl text-xs">
                          <span className="text-slate-500 block text-[9px] font-mono font-bold">TOTAL COINS EARNED</span>
                          <span className="font-mono font-bold text-amber-400 text-sm">{currentUser.totalEarned} coins</span>
                        </div>
                      </div>

                      {cooldownTimeRemaining > 0 ? (
                        <button
                          id="watch-ad-station-btn"
                          disabled
                          className="bg-slate-800/80 text-slate-500 border border-slate-700/50 py-4 px-8 rounded-xl font-sans flex items-center space-x-2 text-sm cursor-not-allowed"
                        >
                          <Clock className="w-5 h-5 text-slate-500 animate-spin" />
                          <span>Cooldown: {cooldownTimeRemaining}s remaining</span>
                        </button>
                      ) : (currentUser.lastAdDate === new Date().toISOString().split('T')[0] && (currentUser.dailyAdsCount ?? 0) >= 15) ? (
                        <button
                          id="watch-ad-station-btn"
                          disabled
                          className="bg-rose-950/20 text-rose-400 border border-rose-900/30 py-4 px-8 rounded-xl font-sans flex items-center space-x-2 text-sm cursor-not-allowed"
                        >
                          <AlertCircle className="w-5 h-5 text-rose-400" />
                          <span>Daily Ad Limit Reached (15/15)</span>
                        </button>
                      ) : (
                        <button
                          id="watch-ad-station-btn"
                          onClick={() => setShowAd(true)}
                          className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black py-4 px-8 rounded-xl shadow-lg hover:shadow-orange-500/20 transition-all font-sans flex items-center space-x-2 text-sm group cursor-pointer"
                        >
                          <Tv className="w-5 h-5" />
                          <span>Open Reward Ad Station</span>
                          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Quick info notes */}
                  <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 flex items-start space-x-3 text-slate-400 text-xs">
                    <AlertCircle className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                    <div className="space-y-1">
                      <p className="font-semibold text-slate-300">How to get Robux?</p>
                      <p className="leading-relaxed text-[11px]">
                        Exchange your coins for Robux in the Exchange shop. The administrator will view your request, verify the ad log, and pay the Robux directly to your Roblox account (e.g. through a Roblox group payout or gamepass purchase!).
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'exchange' && (
                /* Tab 2: Robux exchange shop */
                <motion.div
                  id="tab-exchange-panel"
                  key="exchange-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="text-center md:text-left">
                    <h3 className="font-sans text-lg font-bold text-white flex items-center justify-center md:justify-start space-x-2">
                      <ShoppingBag className="w-5 h-5 text-amber-400" />
                      <span>Robux Exchange Store</span>
                    </h3>
                    <p className="font-sans text-xs text-slate-400 mt-1">
                      Choose a Robux package. Select packages that match your balance. 100 Coins = 10 Robux!
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {ROBUX_PACKAGES.map((pkg, idx) => {
                      const canAfford = currentUser.coins >= pkg.coins;
                      
                      return (
                        <div 
                          id={`robux-package-${pkg.robux}-card`}
                          key={idx}
                          className={`bg-slate-900 border rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden transition-all ${
                            pkg.popular 
                              ? 'border-amber-500/40 shadow-amber-500/5 shadow-md' 
                              : 'border-slate-800 hover:border-slate-700 shadow-sm'
                          }`}
                        >
                          {pkg.popular && (
                            <span className="absolute top-2.5 right-2.5 bg-amber-500/15 border border-amber-500/20 text-amber-400 text-[8px] font-mono font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                              POPULAR
                            </span>
                          )}

                          <div className="space-y-3">
                            <span className="text-[10px] font-mono text-slate-500 block uppercase font-semibold">{pkg.label}</span>
                            <div className="flex items-baseline space-x-1">
                              <span className="text-3xl font-black text-white tracking-tight">{pkg.robux}</span>
                              <span className="text-xs font-bold text-indigo-400 uppercase">Robux</span>
                            </div>
                            
                            <div className="inline-flex items-center space-x-1.5 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800 text-[11px] font-mono text-amber-400 font-semibold w-fit">
                              <Coins className="w-3.5 h-3.5" />
                              <span>{pkg.coins.toLocaleString()} Coins</span>
                            </div>
                          </div>

                          <div className="pt-5 border-t border-slate-850 mt-4">
                            <button
                              id={`claim-robux-${pkg.robux}-btn`}
                              disabled={!canAfford || loading}
                              onClick={() => handleRedeem(pkg.robux, pkg.coins)}
                              className={`w-full py-2.5 px-3 rounded-xl font-sans text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                                canAfford 
                                  ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-black shadow-md shadow-amber-500/5' 
                                  : 'bg-slate-950 border border-slate-800 text-slate-500 cursor-not-allowed'
                              }`}
                            >
                              <span>Claim {pkg.robux} R$</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                            {!canAfford && (
                              <span className="text-[9px] font-mono text-slate-500 block text-center mt-1.5">
                                Needs {pkg.coins - currentUser.coins} more coins
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {activeTab === 'history' && (
                /* Tab 3: Redemption Status History */
                <motion.div
                  id="tab-history-panel"
                  key="history-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div>
                    <h3 className="font-sans text-lg font-bold text-white">Your Payouts Status</h3>
                    <p className="font-sans text-xs text-slate-400 mt-1">
                      Check the real-time status of your Robux redemption claims.
                    </p>
                  </div>

                  {loadingRedemptions ? (
                    <div className="text-center py-12 bg-slate-900/30 border border-slate-800/50 rounded-2xl text-slate-400">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto mb-4"></div>
                      <p className="text-xs font-mono">Fetching requests...</p>
                    </div>
                  ) : redemptions.length === 0 ? (
                    <div className="text-center py-16 bg-slate-900/30 border border-slate-800/50 rounded-2xl text-slate-400 max-w-lg mx-auto">
                      <History className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                      <p className="font-sans font-bold text-white text-sm">No Payout Requests Yet</p>
                      <p className="font-sans text-xs text-slate-500 mt-1.5 max-w-xs mx-auto">
                        Watch sponsor ads to stack up coins, then exchange them for Robux packages in the store!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {redemptions.map((red, idx) => (
                        <div 
                          id={`redemption-${red.id}-history-card`}
                          key={idx}
                          className="bg-slate-900 border border-slate-800/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
                        >
                          <div className="flex items-start space-x-3">
                            <div className="p-2.5 bg-slate-950 border border-slate-850 rounded-lg text-slate-400">
                              <Coins className="w-4 h-4 text-amber-500/80" />
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-sans font-bold text-white text-sm">{red.robuxAmount} Robux</span>
                                <span className="text-[10px] text-slate-500 font-mono">({red.coinsSpent} coins)</span>
                              </div>
                              <p className="text-[10px] font-mono text-slate-500">
                                Request ID: <span className="text-slate-400">{red.id}</span> • {new Date(red.createdAt).toLocaleDateString()} {new Date(red.createdAt).toLocaleTimeString()}
                              </p>
                              {red.notes && (
                                <div className="bg-slate-950/80 border border-slate-800/80 rounded px-2 py-1 text-[10px] text-indigo-300 mt-1">
                                  <span className="font-mono text-indigo-400 font-bold uppercase tracking-wider text-[8px] block">ADMIN NOTE:</span>
                                  {red.notes}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 pt-3 sm:pt-0 border-t border-slate-850 sm:border-0">
                            <span className="text-[10px] font-mono text-slate-500 sm:hidden">STATUS</span>
                            
                            {red.status === 'pending' && (
                              <span className="inline-flex items-center space-x-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider">
                                <Clock className="w-3.5 h-3.5 animate-pulse" />
                                <span>Pending Approval</span>
                              </span>
                            )}
                            
                            {red.status === 'completed' && (
                              <span className="inline-flex items-center space-x-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider">
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Sent / Paid</span>
                              </span>
                            )}

                            {red.status === 'cancelled' && (
                              <span className="inline-flex items-center space-x-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider">
                                <AlertCircle className="w-3.5 h-3.5" />
                                <span>Declined / Refunded</span>
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ad Simulator Modal Overlay */}
      <AnimatePresence>
        {showAd && currentUser && currentUser.robloxUsername && (
          <AdSimulator
            username={currentUser.robloxUsername}
            onAdCompleted={handleAdCompleted}
            onClose={() => setShowAd(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
