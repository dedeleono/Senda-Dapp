'use client'

import { motion } from 'framer-motion'
import { useState, useEffect, Suspense, lazy, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

import loot_boxes from '@/public/loot_boxes.jpg'
import Maverick from '@/public/Maverick-Black.png'
import Solami from '@/public/solana-logo.svg'
import SolamiWord from '@/public/solana-word.svg'
import Helix from '@/public/helix-black.png'
import Trust from '@/public/trust.png'
import Escrow from '@/public/escrow.png'
import MoneyTransfer from '@/public/money-transfer.png'

// Lazy load heavy components
const WhyChooseUs = lazy(() => import('@/components/home/why-choose-us').then(module => ({ default: module.WhyChooseUs })))
const ComingSoon = lazy(() => import('@/components/home/coming-soon'))
const WorldMap = lazy(() => import('@/components/ui/acernity/world-map').then(module => ({ default: module.WorldMap })))
const SignupForm = lazy(() => import('./sign-up-form'))

const LoadingSpinner = () => (
  <div className="flex items-center justify-center w-full h-32">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
)

// Optimized animation variants
const fadeInOptimized = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
}

// Memoized components for better performance
const LogoSection = () => {
  const logos = useMemo(() => [Maverick.src, Helix.src], [])

  return (
    <section className="border-t border-b py-10">
      <div className="container mx-auto px-4">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={fadeInOptimized}
          className="space-y-6"
        >
          <p className="text-center text-sm text-muted-foreground">WE WORK ONLY WITH THE BEST AROUND THE GLOBE</p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16">
            <div className="flex items-center justify-center gap-2">
              <Image
                width={25}
                height={25}
                src={Solami.src}
                alt="Solana Logo"
                className="object-contain w-auto h-auto max-w-[25px] max-h-[25px] opacity-80"
                loading="lazy"
              />
              <Image
                width={100}
                height={100}
                src={SolamiWord.src}
                alt="Solana Word Logo"
                className="object-contain invert w-auto h-auto max-w-[100px] max-h-[100px] opacity-80"
                loading="lazy"
              />
            </div>
            {logos.map((logo, index) => (
              <div key={index} className="text-xl font-semibold text-muted-foreground/60">
                <Image
                  src={logo}
                  alt="Partner Logo"
                  width={100}
                  height={100}
                  className="object-contain w-auto h-auto max-w-[150px] max-h-[150px]"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}

const FeatureCard = ({ 
  title, 
  subtitle, 
  description, 
  imageSrc, 
  imageAlt, 
  bgColor, 
  textColor = 'text-black',
  linkTo,
  linkText
}: {
  title: string
  subtitle: string
  description: string
  imageSrc: string
  imageAlt: string
  bgColor: string
  textColor?: string
  linkTo?: string
  linkText?: string
}) => (
  <div className={`${bgColor} relative pt-8 sm:pt-12 px-6 sm:px-10 md:px-24 pb-40 sm:pb-52 md:pb-70 rounded-3xl md:h-[700px]`}>
    <h2 className={`text-lg font-normal ${textColor === 'text-black' ? 'text-primary' : 'text-white'} tracking-widest mb-5 text-center sm:text-start uppercase`}>
      {title}
    </h2>
    <h3 className={`text-4xl sm:text-5xl md:text-6xl font-bold ${textColor} mb-5 text-start leading-tight`}>
      {subtitle}
    </h3>
    <h5 className={`${textColor === 'text-black' ? 'text-black/75' : 'text-white/75'} pt-3 mb-16 text-end sm:text-start font-semibold`}>
      {description}
    </h5>
    {linkTo && linkText && (
      <div className="text-center sm:text-start">
        <Link
          href={linkTo}
          className="text-xl py-5 px-14 mt-5 font-semibold text-white rounded-lg duration-300 bg-primary border border-primary hover:bg-darkmode hover:border-darkmode"
        >
          {linkText}
        </Link>
      </div>
    )}
    <Image
      src={imageSrc}
      alt={imageAlt}
      width={300}
      height={300}
      className="md:w-[250px] md:h-[250px] w-[150px] h-[150px] absolute bottom-3 right-0 mx-auto"
      loading="lazy"
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
    />
  </div>
)

export default function LandingPageContent() {
  const [activeTab, setActiveTab] = useState('features')
  const router = useRouter()

  const handleHashChange = useCallback(() => {
    const hash = window.location.hash.slice(1)
    if (hash) {
      setActiveTab(hash)
      const element = document.getElementById(hash)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }, [])

  const handleSignupClick = useCallback(() => {
    router.push('/login')
  }, [router])

  useEffect(() => {
    handleHashChange()
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [handleHashChange])

  // Memoized world map dots data
  const worldMapDots = useMemo(() => [
    {
      start: { lat: 64.2008, lng: -149.4937 }, // Alaska (Fairbanks)
      end: { lat: 34.0522, lng: -118.2437 }, // Los Angeles
    },
    {
      start: { lat: 64.2008, lng: -149.4937 }, // Alaska (Fairbanks)
      end: { lat: -15.7975, lng: -47.8919 }, // Brazil (Brasília)
    },
    {
      start: { lat: -15.7975, lng: -47.8919 }, // Brazil (Brasília)
      end: { lat: 38.7223, lng: -9.1393 }, // Lisbon
    },
    {
      start: { lat: 51.5074, lng: -0.1278 }, // London
      end: { lat: 28.6139, lng: 77.209 }, // New Delhi
    },
    {
      start: { lat: 28.6139, lng: 77.209 }, // New Delhi
      end: { lat: 43.1332, lng: 131.9113 }, // Vladivostok
    },
    {
      start: { lat: 28.6139, lng: 77.209 }, // New Delhi
      end: { lat: -1.2921, lng: 36.8219 }, // Nairobi
    },
  ], [])

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation - Optimized */}
      <header className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="font-bold text-xl text-[#1c3144]">Senda</div>
        <nav className="hidden md:flex items-center space-x-6">
          <Link
            href="#why-choose-us"
            className={cn('text-sm transition-colors', activeTab === 'why-choose-us' ? 'font-medium' : 'text-muted-foreground')}
          >
            Why Choose Us
          </Link>
          <Link 
            href="#faqs" 
            className={cn('text-sm transition-colors', activeTab === 'faqs' ? 'font-medium' : 'text-muted-foreground')}
          >
            FAQs
          </Link>
        </nav>
        <Button size="sm" variant="default" className="rounded-md" onClick={handleSignupClick}>
          Sign up
        </Button>
      </header>

      {/* Hero Section - Optimized */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <motion.div 
            initial="hidden" 
            animate="visible" 
            variants={fadeInOptimized} 
            className="space-y-6"
          >
            <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">
              <span className="text-muted-foreground">Join the movement</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[#1c3144]">
              The bridge between trusted relationships and borderless money
            </h1>
            <p className="text-muted-foreground max-w-md">Dedicated to building trust for the digital era.</p>
            <div className="flex flex-wrap gap-4">
              <Link href="#cta">
                <Button variant={'default'} className="rounded-md text-white hover:bg-gray-800">
                  Open Account for Free
                </Button>
              </Link>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="relative"
          >
            <Image
              src={loot_boxes.src}
              alt="Hero Image"
              width={500}
              height={500}
              priority={true}
              className="object-cover"
              placeholder="blur"
              blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
            />
          </motion.div>
        </div>
      </section>

      {/* Logo Section - Memoized */}
      <LogoSection />

      {/* Features Section - Optimized */}
      <section id="why-choose-us" className="bg-cover bg-center py-16 md:py-24 overflow-hidden space-y-5 px-4">
        <div className="text-center mt-24">
          <h3 className="text-4xl sm:text-6xl font-bold text-black">Why choose us?</h3>
          <h3 className="text-4xl sm:text-6xl font-bold text-black/50 lg:mr-48 my-2">Why choose us?</h3>
          <h3 className="text-4xl sm:text-6xl font-bold text-black/25 lg:-mr-32 my-2">Why choose us?</h3>
        </div>
        
        <div className="container mx-auto lg:max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <FeatureCard
              title="beliefs"
              subtitle="Honesty and hard work are our beliefs"
              description="Our secure dual-signature escrow paths, ensures funds are only released when you approve."
              imageSrc={Escrow.src}
              imageAlt="Escrow"
              bgColor="bg-[#1c3144]"
              textColor="text-white"
            />
            
            <FeatureCard
              title="Access"
              subtitle="Access your funds with ease"
              description="Send and receive money anywhere in the world without traditional banking restrictions or delays."
              imageSrc={MoneyTransfer.src}
              imageAlt="Money Transfer"
              bgColor="bg-[#d7dfbe]/50"
              textColor="text-black"
            />
          </div>
        </div>

        <div className="container mx-auto lg:max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <FeatureCard
              title="Trust"
              subtitle="Never worry about getting your trust broken again"
              description=""
              imageSrc={Trust.src}
              imageAlt="Trust"
              bgColor="bg-[#d7dfbe]/50"
              textColor="text-black"
            />

            <FeatureCard
              title="Accessibility"
              subtitle="We know that sending money is the easy part"
              description="That's why we're partnering with the best in the industry to help you on and off-ramp your funds with ease"
              imageSrc={Escrow.src}
              imageAlt="Escrow"
              bgColor="bg-[#1c3144]"
              textColor="text-white"
              linkTo="#cta"
              linkText="Open Account"
            />
          </div>
        </div>
      </section>

      {/* World Map Section - Optimized */}
      <section className="relative py-4 bg-cover bg-center overflow-hidden">
        <div className="container mx-auto lg:max-w-7xl">
          <div className="text-center">
            <h3 className="text-4xl sm:text-6xl font-bold text-black my-2">We work anywhere in the world.</h3>
            <h3 className="text-4xl sm:text-6xl font-bold text-black/50 lg:mr-48 my-2">
              We work anywhere in the world.
            </h3>
            <h3 className="text-4xl sm:text-6xl font-bold text-black/25 lg:-mr-32 my-2">
              We work anywhere in the world.
            </h3>
          </div>
        </div>
        <div className="py-10 bg-white w-full">
          <Suspense fallback={<LoadingSpinner />}>
            <WorldMap dots={worldMapDots} />
          </Suspense>
        </div>
      </section>

      {/* CTA Section - Optimized */}
      <section id="cta" className="w-full bg-gradient-to-br from-[#f6ead7]/50 via-[#f6ead7]/30 to-white/60 py-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#1c3144]/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#1c3144]/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-12 relative">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.4 }}
            className="flex-1 flex flex-col items-start justify-center"
          >
            <span className="inline-block px-4 py-1.5 bg-[#1c3144]/10 rounded-full text-sm font-medium text-[#1c3144] mb-6">
              Join us
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-[#1c3144] mb-6 leading-tight">
              Ready to send your first{' '}
              <span className="text-[#1c3144] relative">
                remesa?
                <div className="absolute -bottom-2 left-0 w-full h-1 bg-[#1c3144]/20 rounded-full" />
              </span>
            </h2>
            <p className="text-gray-600 mb-8 max-w-md text-lg leading-relaxed">
              Send money to friends and family anywhere in the world with Senda.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="flex-1 bg-white rounded-3xl shadow-xl p-8 flex flex-col items-center relative min-w-[420px] border border-gray-100"
          >
            <h3 className="text-3xl font-bold text-[#1c3144] mb-8 mt-2">Open your account</h3>
            <Suspense fallback={<LoadingSpinner />}>
              <SignupForm />
            </Suspense>
          </motion.div>
        </div>
      </section>

      {/* Lazy loaded components */}
      <Suspense fallback={<LoadingSpinner />}>
        <WhyChooseUs />
      </Suspense>

      <Suspense fallback={<LoadingSpinner />}>
        <ComingSoon />
      </Suspense>

      {/* FAQ Section - Optimized */}
      <section id="faqs" className="py-24 bg-gradient-to-b from-slate-50/50 via-emerald-50/30 to-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-start gap-12 max-w-7xl mx-auto">
            <div className="md:w-1/2 md:sticky md:top-24">
              <span className="text-[#596f62] font-semibold text-sm uppercase tracking-wider">Help & Support</span>
              <h2 className="mt-3 text-6xl font-black tracking-tight text-primary">Frecuently Asked Questions</h2>
              <p className="mt-4 text-lg leading-relaxed text-gray-600">
                We're here to help you with any questions you may have.
              </p>
              <div className="mt-8 p-6 bg-[#f6ead7] rounded-2xl">
                <p className="text-sm text-black">Couldn't find what you were looking for?</p>
                <Link
                  href="/contact"
                  className="mt-2 inline-flex items-center text-black font-semibold hover:text-emerald-700 transition-colors"
                >
                  Contact us directly →
                </Link>
              </div>
            </div>

            <div className="md:w-1/2 w-full">
              <Accordion type="single" collapsible className="space-y-4">
                <AccordionItem
                  value="faq1"
                  className="border border-gray-200 rounded-xl overflow-hidden bg-white/50 backdrop-blur-sm"
                >
                  <AccordionTrigger className="px-6 py-4 text-left hover:no-underline">
                    <div className="flex items-center gap-4">
                      <span className="text-lg font-semibold text-gray-800">
                        How is Senda different from traditional remittances services?
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 py-4 border-t border-gray-200">
                    <p className="text-gray-700">
                      Our platform eliminates unnecessary intermediaries, reduces fees, and offers transparent tracking
                      of your money through the entire transfer process.
                    </p>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem
                  value="faq2"
                  className="border border-gray-200 rounded-xl overflow-hidden bg-white/50 backdrop-blur-sm"
                >
                  <AccordionTrigger className="px-6 py-4 text-left hover:no-underline">
                    <div className="flex items-center gap-4">
                      <span className="text-lg font-semibold text-gray-800">How much does Senda charge?</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 py-4 border-t border-gray-200">
                    <p className="text-gray-700">
                      Senda only charges a small fee per successful on/off ramp (fiat-stablecoin) transaction. There are
                      no hidden fees or unfavorable exchange rates. Sending money with Senda is free.
                    </p>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem
                  value="faq3"
                  className="border border-gray-200 rounded-xl overflow-hidden bg-white/50 backdrop-blur-sm"
                >
                  <AccordionTrigger className="px-6 py-4 text-left hover:no-underline">
                    <div className="flex items-center gap-4">
                      <span className="text-lg font-semibold text-gray-800">Is this platform secure?</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 py-4 border-t border-gray-200">
                    <p className="text-gray-700">
                      Absolutely. All transactions are encrypted and verified by multiple nodes on the blockchain;
                      we've also gone through rigorous testing and audits to keep your funds safe.
                    </p>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem
                  value="faq4"
                  className="border border-gray-200 rounded-xl overflow-hidden bg-white/50 backdrop-blur-sm"
                >
                  <AccordionTrigger className="px-6 py-4 text-left hover:no-underline">
                    <div className="flex items-center gap-4">
                      <span className="text-lg font-semibold text-gray-800">Is this platform free to use?</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 py-4 border-t border-gray-200">
                    <p className="text-gray-700">
                      Certainly! Creating trust paths and sending money is completely free.
                    </p>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem
                  value="faq5"
                  className="border border-gray-200 rounded-xl overflow-hidden bg-white/50 backdrop-blur-sm"
                >
                  <AccordionTrigger className="px-6 py-4 text-left hover:no-underline">
                    <div className="flex items-center gap-4">
                      <span className="text-lg font-semibold text-gray-800">Where can I download the Senda app?</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 py-4 border-t border-gray-200">
                    <p className="text-gray-700">
                      Our app is currently not available for download. However, you can use our platform by creating an
                      account on our website.
                    </p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-sm text-muted-foreground">© 2025 Senda. All Rights Reserved.</div>
            <div className="flex space-x-4 mt-4 md:mt-0">
              <a href="https://x.com/senda_rtt" className="text-sm text-muted-foreground hover:text-foreground">
                Twitter
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}