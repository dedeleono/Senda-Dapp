import React from 'react'
import { auth } from '@/lib/auth/auth'
import { redirect } from 'next/navigation'
import ThemeToggle from '@/components/theme-toggle'
import { Sidebar } from './_components/sidebar'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import DashboardLayoutClient from './_components/layout-client'

export default async function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await auth()

  if (!session) {
    return redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900/50">
      <Sidebar />
      <div className="flex flex-col min-h-screen md:px-4 pt-1 lg:ml-[var(--sidebar-width,272px)] lg:transition-all lg:duration-300">
        {/* <header className="flex items-center justify-between px-4 py-4 lg:px-6 bg-background/95 backdrop-blur-sm border-b lg:border lg:mr-4 lg:mt-4 lg:rounded-2xl lg:border-b-0 shadow-sm">
          <div className="lg:hidden" /> 
          
          <div className="flex items-center gap-3 ml-auto">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
            </Button>
            <ThemeToggle />
            <DashboardLayoutClient />
          </div>
        </header> */}
        <main className="flex-1 lg:mr-4 lg:mb-4">{children}</main>
      </div>
    </div>
  )
}
