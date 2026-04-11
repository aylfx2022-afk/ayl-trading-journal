import { Timestamp } from 'firebase/firestore';

export interface Trade {
  id?: string;
  ticket: string;
  openTime: Timestamp;
  type: 'buy' | 'sell';
  size: number;
  item: string;
  openPrice: number;
  closeTime: Timestamp;
  closePrice: number;
  profit: number;
  comment?: string;
  notes?: string;
  chartUrls?: string[];
  userId: string;
  createdAt: Timestamp;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: 'user' | 'admin';
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
