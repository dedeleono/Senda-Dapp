'use client'

import { ThemeProvider } from './theme-provider'
import { Toaster } from './ui/sonner'
import React from 'react'
import { useAuthRedirects } from '@/hooks/use-auth-redirects'

export function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  
  useAuthRedirects();
  
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <main className="bg-secondary/30 dark:bg-primary/20 overflow-hidden">{children}</main>
      <Toaster />
    </ThemeProvider>
  )
}
