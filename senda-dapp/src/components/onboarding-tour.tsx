'use client'

import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride'
import { ReactNode, useState } from 'react'

const tourSteps: Step[] = [
  {
    target: '[data-tour="total-balance"]',
    content: 'View your total balance across all tokens',
    title: 'Total Balance',
    disableBeacon: true,
  },
  {
    target: '[data-tour="token-balances"]',
    content: 'See individual token balances and manage your assets',
    title: 'Token Balances',
  },
  {
    target: '[data-tour="send-funds"]',
    content: 'Send funds to other users or external addresses',
    title: 'Send Funds',
  },
  {
    target: '[data-tour="add-funds"]',
    content: 'Add funds to your wallet using various methods',
    title: 'Add Funds',
  },
  {
    target: '[data-tour="withdraw"]',
    content: 'Withdraw funds to external addresses',
    title: 'Withdraw',
  },
  {
    target: '[data-tour="trust-paths"]',
    content: 'Manage trust paths for secure transactions',
    title: 'Trust Paths',
  },
  {
    target: '[data-tour="deposits"]',
    content: 'Track your deposits and their status',
    title: 'Deposits',
  },
  {
    target: '[data-tour="transactions"]',
    content: 'View your transaction history and details',
    title: 'Transactions',
  },
]

interface OnboardingTourProps {
  children: ReactNode
  run: boolean
}

export const OnboardingTour = ({ children, run }: OnboardingTourProps) => {
  const [stepIndex, setStepIndex] = useState(0)

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED]

    if (finishedStatuses.includes(status)) {
      localStorage.setItem('hasSeenWalletTour', 'true')
    }
  }

  return (
    <>
      <Joyride
        steps={tourSteps}
        run={run}
        continuous
        showProgress
        showSkipButton
        callback={handleJoyrideCallback}
        styles={{
          options: {
            arrowColor: '#fff',
            backgroundColor: '#fff',
            overlayColor: 'rgba(30, 41, 59, 0.6)',
            primaryColor: '#7ea16b',
            textColor: '#22223b',
            width: 420,
            zIndex: 10000,
          },
          buttonNext: {
            backgroundColor: '#7ea16b',
            color: '#fff',
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 16,
            padding: '10px 24px',
            boxShadow: '0 2px 8px rgba(30,41,59,0.08)',
          },
          buttonBack: {
            color: '#7ea16b',
            fontWeight: 500,
            fontSize: 15,
            marginRight: 12,
            background: 'none',
            border: 'none',
          },
          buttonSkip: {
            color: '#b0b0b0',
            fontWeight: 500,
            fontSize: 15,
            background: 'none',
            border: 'none',
          },
          tooltip: {
            borderRadius: 16,
            padding: '32px 28px 24px 28px',
            boxShadow: '0 8px 32px rgba(30,41,59,0.12), 0 1.5px 4px rgba(30,41,59,0.08)',
            fontSize: 18,
            lineHeight: 1.6,
          },
          tooltipTitle: {
            fontWeight: 700,
            fontSize: 22,
            marginBottom: 8,
            color: '#22223b',
          },
          tooltipContent: {
            fontSize: 17,
            color: '#4a4e69',
            marginBottom: 12,
          },
        }}
      />
      {children}
    </>
  )
} 