'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import InvitationContent from './_components/InvitationContent';

export default function InvitationPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        }
      >
        <InvitationContent />
      </Suspense>
    </div>
  );
} 