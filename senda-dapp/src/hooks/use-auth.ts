'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useWalletStore } from '@/stores/use-wallet-store';

export function useAuth() {
  const { data: session, status, update } = useSession();
  const { initWallet, publicKey, error: walletError } = useWalletStore();
  const [isInitializingWallet, setIsInitializingWallet] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Memoize session user data to prevent unnecessary re-renders
  const stableUserId = session?.user?.id || null;
  const stableWalletKey = session?.user?.sendaWalletPublicKey || null;

  // Initialize when user logs in
  useEffect(() => {
    const initializeWallet = async () => {
      if (!stableUserId || !stableWalletKey) {
        console.error('Missing user ID or Senda wallet public key');
        return;
      }

      // Skip if wallet is already initialized for this user
      if (publicKey?.toString() === stableWalletKey) {
        return;
      }

      try {
        setIsInitializingWallet(true);
        setError(null);
        
        console.log('Initializing Senda wallet for authenticated user:', stableWalletKey);
        
        await initWallet(stableUserId, stableWalletKey)
        
        console.log('Wallet initialized successfully');
      } catch (error) {
        console.error('Error during wallet initialization:', error);
        setError(error instanceof Error ? error : new Error(String(error)));
      } finally {
        setIsInitializingWallet(false);
      }
    };

    if (status === 'authenticated' && stableUserId && stableWalletKey && !publicKey) {
      initializeWallet();
    }
  }, [status, stableUserId, stableWalletKey, publicKey, initWallet]);

  return {
    session,
    status,
    update,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading',
    isInitializingWallet,
    error: error || walletError,
    userId: stableUserId,
    walletError,
    hasWallet: !!publicKey,
  } as const;
} 