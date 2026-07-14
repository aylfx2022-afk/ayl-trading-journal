import { Timestamp } from 'firebase/firestore';

export interface Trade {
  id?: string;
  openTime: Timestamp;
  closeTime?: Timestamp | null;
  type: 'buy' | 'sell';
  size: number;
  item: string;
  openPrice: number;
  closePrice: number;
  profit: number;
  comment?: string;
  notes?: string;
  chartUrls?: string[];
  userId: string;
  accountId?: string; // Link to a specific trading profile
  createdAt: Timestamp;
  // New fields
  pair?: string;
  entryPrice?: number;
  slPrice?: number;
  tpPrice?: number;
  exitPrice?: number;
  rr?: number;
  entryDateTime?: Timestamp;
  exitDateTime?: Timestamp;
  tags?: string[];
  isDeleted?: boolean;
  mentalState?: string;
  physicalState?: string;
  ticket?: string;
  preTradeEmotion?: string;
  duringTradeEmotion?: string;
  postTradeEmotion?: string;
  entryTimeframe?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: 'user' | 'admin';
}

export interface UserSettings {
  uid: string;
  customTags: string[];
}

export interface TradingAccount {
  id?: string;
  name: string;
  userId: string;
  type: 'live' | 'backtest' | 'other';
  createdAt: Timestamp;
  isDefault?: boolean;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}
