export interface User {
  uid: string;
  email: string;
  displayName: string;
  robloxUsername: string; // The linked Roblox username
  coins: number;
  totalEarned: number;
  totalAds: number;
  createdAt: any; // Firestore Timestamp or string
  updatedAt: any;
  lastAdWatchedAt?: any;
  dailyAdsCount?: number;
  lastAdDate?: string; // format: YYYY-MM-DD
}

export interface AdView {
  uid: string;
  robloxUsername: string;
  earnedCoins: number;
  timestamp: any;
  adType: string;
}

export interface Redemption {
  id: string;
  uid: string;
  robloxUsername: string;
  coinsSpent: number;
  robuxAmount: number;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: any;
  completedAt?: any;
  notes?: string;
}
