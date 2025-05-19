'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
// import { useTranslations } from "use-intl";
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'

export function WhyChooseUs() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const steps = [
    {
      id: 0,
      title: 'Onboarding',
      description: 'Create your account in minutes with your email',
      images: Array(4).fill('/placeholder.svg'),
    },
    {
      id: 1,
      title: 'Fund it',
      description: 'Top-up your account with any of our options using fiat or crypto (stables)',
      images: Array(4).fill('/placeholder.svg'),
    },
    {
      id: 2,
      title: 'Trust Path',
      description: 'Create your first trust-path with your trusted persona and start sending money!',
      features: ['Simple journey', 'No banks', 'No KYC'],
      images: Array(4).fill('/placeholder.svg'),
    },
    {
      id: 3,
      title: "That's it!",
      description: 'You can now send money to anyone in the world with just a few clicks',
      features: ['History', 'Blockchain Confirmation', 'Instant'],
      images: Array(4).fill('/placeholder.svg'),
    },
  ]

  const toggleStep = (index: number) => {
    setActiveIndex(activeIndex === index ? null : index)
  }

  return (
    <section id="why-choose-us" className="relative z-20 py-10 lg:py-20 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="space-y-6 text-center mb-16">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-bold mb-4 text-black"
          >
            We believe you deserve only the best.
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-medium max-w-4xl mx-auto leading-tight
                     text-black/50"
          >
            So we kept it simple; anyone can start sending money in 3 easy steps.
          </motion.h2>
        </div>

        {/* Step cards */}
        <div className="space-y-6">
          {steps.map((step, index) => (
            <StepCard
              key={step.id}
              step={step}
              isActive={activeIndex === index}
              stepNumber={index + 1}
              onClick={() => toggleStep(index)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

interface StepCardProps {
  step: {
    title: string
    description: string
    features?: string[]
    images: string[]
  }
  isActive: boolean
  stepNumber: number
  onClick: () => void
}

const StepCard: React.FC<StepCardProps> = ({ step, isActive, stepNumber, onClick }) => {
  return (
    <div className="w-full">
      {/* Header (always visible) */}
      <motion.div
        onClick={onClick}
        className={cn(
          'flex items-center gap-4 p-6 rounded-xl cursor-pointer transition-all duration-300',
          isActive
            ? 'bg-[#d7dfbe]/25 shadow-lg border-t border-l border-r border-[#d7dfbe]/20'
            : 'bg-background/80 dark:bg-foreground/80 hover:bg-background/90 border border-neutral-200/50 shadow',
        )}
        layout
      >
        {/* Step number */}
        <div
          className={cn(
            'w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold transition-colors',
            isActive ? 'bg-[#f6ead7] text-black' : 'bg-neutral-100 dark:text-background text-foreground',
          )}
        >
          {stepNumber}
        </div>

        {/* Title */}
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-[#1c3144]">{step.title}</h3>
        </div>

        {/* Expand icon */}
        <motion.div animate={{ rotate: isActive ? 180 : 0 }} transition={{ duration: 0.3 }}>
          <ChevronDown className="w-6 h-6" />
        </motion.div>
      </motion.div>

      {/* Content (visible when expanded) */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden border-l border-r border-b rounded-b-xl border-[#d7dfbe]/40 dark:bg-foreground bg-background"
          >
            <div className="p-6 space-y-6">
              {/* Description */}
              <p className="text-neutral-800  text-sm leading-relaxed">{step.description}</p>

              {/* Features (if any) */}
              {step.features && (
                <div className="space-y-2">
                  {step.features.map((feature, i) => (
                    <div key={i} className="flex gap-2 items-center text-neutral-700 text-sm">
                      <span className="text-green-500">✓</span> {feature}
                    </div>
                  ))}
                </div>
              )}

              {/* Images */}
              <motion.div
                className="grid grid-cols-2 md:grid-cols-4 gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {step.images.map((src, i) => (
                  <div
                    key={i}
                    className="aspect-video rounded-lg overflow-hidden shadow-md border border-neutral-200/50 "
                  >
                    <Image
                      src={src}
                      alt={`${step.title} illustration ${i + 1}`}
                      width={300}
                      height={200}
                      className="object-cover w-full h-full hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ))}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
