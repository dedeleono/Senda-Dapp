"use client";

import { Suspense } from 'react';
import TwoFactorVerifyContent from './_components/TwoFactorVerifyContent';

export default function TwoFactorVerifyPage() {
  return (
    <div className="min-h-screen bg-primary/30 dark:bg-primary/30 flex items-center justify-center p-6">
      <Suspense
        fallback={
          <div className="min-h-screen bg-primary/30 dark:bg-primary/30 flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        }
      >
        <TwoFactorVerifyContent />
      </Suspense>
    </div>
  );
} 