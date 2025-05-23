'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ArrowRightLeft, TrendingUp, Menu, ChevronLeft, ChevronRight, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { motion, AnimatePresence } from 'framer-motion'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth } from '@/hooks/use-auth'
import { useSignOut } from '@/hooks/use-sign-out'
import ThemeToggle from '@/components/theme-toggle'

interface SidebarProps {
  className?: string
}

interface SidebarNavItem {
  title: string
  href: string
  icon: React.ReactNode
}

const mainNavItems: SidebarNavItem[] = [
  {
    title: 'Dashboard',
    href: '/home',
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    title: 'Transactions',
    href: '/transactions',
    icon: <ArrowRightLeft className="h-5 w-5" />,
  },
]

const investmentNavItems: SidebarNavItem[] = [
  {
    title: 'My Paths',
    href: '/my-paths',
    icon: <TrendingUp className="h-5 w-5" />,
  },
]

export function Sidebar({ className }: SidebarProps) {
  const { session } = useAuth()
  const handleSignOut = useSignOut()

  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  
  // Use refs to prevent re-render loops
  const updateTimeoutRef = useRef<number | null>(null)
  const isUpdatingRef = useRef(false)
  const resizeTimeoutRef = useRef<number | null>(null)

  // Debounced CSS update function
  const updateSidebarWidth = useCallback(() => {
    if (isUpdatingRef.current) return

    isUpdatingRef.current = true
    
    // Clear any pending timeout
    if (updateTimeoutRef.current !== null) {
      cancelAnimationFrame(updateTimeoutRef.current)
    }

    // Use requestAnimationFrame to batch DOM updates
    updateTimeoutRef.current = requestAnimationFrame(() => {
      try {
        if (typeof window !== 'undefined') {
          if (window.innerWidth >= 1024) {
            document.documentElement.style.setProperty(
              '--sidebar-width',
              collapsed ? '96px' : '272px'
            )
          } else {
            document.documentElement.style.removeProperty('--sidebar-width')
          }
        }
      } catch (error) {
        console.error('Error updating sidebar width:', error)
      } finally {
        isUpdatingRef.current = false
      }
    })
  }, [collapsed])

  // Debounced resize handler
  const handleResize = useCallback(() => {
    if (resizeTimeoutRef.current !== null) {
      clearTimeout(resizeTimeoutRef.current)
    }
    
    resizeTimeoutRef.current = window.setTimeout(() => {
      updateSidebarWidth()
    }, 150) // 150ms debounce
  }, [updateSidebarWidth])

  useEffect(() => {
    // Initial update
    updateSidebarWidth()

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize, { passive: true })
      
      return () => {
        window.removeEventListener('resize', handleResize)
        
        // Cleanup timeouts
        if (updateTimeoutRef.current !== null) {
          cancelAnimationFrame(updateTimeoutRef.current)
        }
        if (resizeTimeoutRef.current !== null) {
          clearTimeout(resizeTimeoutRef.current)
        }
      }
    }
  }, [updateSidebarWidth, handleResize])

  const SidebarContent = ({ isCollapsed = false }: { isCollapsed?: boolean }) => (
    <TooltipProvider>
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="px-6 py-6 flex items-center justify-between">
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.h1
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="text-2xl font-bold whitespace-nowrap"
              >
                SENDA
              </motion.h1>
            )}
          </AnimatePresence>

          {/* Toggle Button - only show on desktop */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex h-8 w-8 shrink-0 ml-auto"
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Main Section */}
        <div className="px-3 py-2">
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.h2
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="mb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
              >
                Main
              </motion.h2>
            )}
          </AnimatePresence>

          <nav className="space-y-1">
            {mainNavItems.map((item) => {
              const isActive = pathname === item.href
              const NavItem = (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                    isCollapsed && 'justify-center',
                  )}
                >
                  <div className="shrink-0">{item.icon}</div>
                  <AnimatePresence mode="wait">
                    {!isCollapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                        className="whitespace-nowrap"
                      >
                        {item.title}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              )

              if (isCollapsed) {
                return (
                  <Tooltip key={item.href} delayDuration={0}>
                    <TooltipTrigger asChild>{NavItem}</TooltipTrigger>
                    <TooltipContent side="right" className="font-medium">
                      {item.title}
                    </TooltipContent>
                  </Tooltip>
                )
              }

              return NavItem
            })}
          </nav>
        </div>
        
        <div className="px-3 py-2 mt-6">
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.h2
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="mb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
              >
                Trusted Personas
              </motion.h2>
            )}
          </AnimatePresence>

          <nav className="space-y-1">
            {investmentNavItems.map((item) => {
              const isActive = pathname === item.href
              const NavItem = (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                    isCollapsed && 'justify-center',
                  )}
                >
                  <div className="shrink-0">{item.icon}</div>
                  <AnimatePresence mode="wait">
                    {!isCollapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                        className="whitespace-nowrap"
                      >
                        {item.title}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              )

              if (isCollapsed) {
                return (
                  <Tooltip key={item.href} delayDuration={0}>
                    <TooltipTrigger asChild>{NavItem}</TooltipTrigger>
                    <TooltipContent side="right" className="font-medium">
                      {item.title}
                    </TooltipContent>
                  </Tooltip>
                )
              }

              return NavItem
            })}
          </nav>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* User Section - Bottom */}
        <div className="px-3 py-4 border-t border-border/50">
          <div className={cn(
            "flex items-center transition-all duration-200",
            isCollapsed ? "justify-center" : "gap-3"
          )}>
            {/* Avatar with Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "p-0 h-auto hover:bg-transparent",
                    isCollapsed ? "w-10 h-10" : "w-auto h-auto"
                  )}
                >
                  <Avatar className="h-10 w-10 cursor-pointer">
                    <AvatarImage src={session?.user?.image as string} alt="User Avatar" />
                    <AvatarFallback>{session?.user.email?.slice(0, 1).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent className="w-56" side={isCollapsed ? "right" : "top"} align="start">
                <DropdownMenuLabel className="text-center">
                  <div className="text-sm font-bold">{session?.user.name || session?.user?.email?.split('@')[0]}</div>
                  <div className="text-xs text-muted-foreground">{session?.user.email}</div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer group p-0">
                  <div className="group-hover:bg-red-100 dark:group-hover:bg-red-900/20 rounded-sm flex items-center gap-2 w-full p-3">
                    <LogOut className="h-4 w-4 group-hover:text-red-600" />
                    <span className="group-hover:text-red-600">Log Out</span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Info (only when not collapsed) */}
            <AnimatePresence mode="wait">
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="flex-1 min-w-0"
                >
                  <div className="text-sm font-medium truncate">
                    {session?.user.name || session?.user?.email?.split('@')[0]}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {session?.user.email}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Theme Toggle */}
            <div className={cn(
              "flex-shrink-0",
              isCollapsed && "hidden"
            )}>
              <ThemeToggle />
            </div>

            {/* Theme Toggle for Collapsed State */}
            {isCollapsed && (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <div className="mt-2">
                    <ThemeToggle />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  Toggle Theme
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  )

  return (
    <>
      {/* Mobile Menu Button */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden fixed top-4 left-4 z-50 bg-background/80 backdrop-blur-sm border shadow-lg"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Desktop Floating Sidebar */}
      <motion.aside
        animate={{
          width: collapsed ? 80 : 256,
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={cn(
          'hidden lg:flex fixed left-4 top-5 bottom-4 z-40',
          'bg-background/95 backdrop-blur-sm border rounded-2xl shadow-2xl',
          'flex-col overflow-hidden',
          className,
        )}
      >
        <SidebarContent isCollapsed={collapsed} />
      </motion.aside>
    </>
  )
}

export default Sidebar
