'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { OnboardingTour } from '@/components/onboarding-tour'

export const WalletOnboardingTour = () => {
  const { isAuthenticated, hasWallet } = useAuth()
  const [shouldRunTour, setShouldRunTour] = useState(false)

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('hasSeenWalletTour')
    
    if (isAuthenticated && hasWallet && !hasSeenTour) {
      // Add a small delay to ensure all elements are mounted
      const timer = setTimeout(() => {
        setShouldRunTour(true)
      }, 1000)

      return () => clearTimeout(timer)
    }
  }, [isAuthenticated, hasWallet])

  return (
    <OnboardingTour run={shouldRunTour}>
      <div />
    </OnboardingTour>
  )
} 