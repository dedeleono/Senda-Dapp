'use client';
import { IoMdSunny, IoMdMoon } from "react-icons/io";
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useEffect, useState } from 'react';
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const themeToggleVariants = cva(
  "text-foreground hover:text-white/90 hover:bg-white/10 rounded-md transition-colors duration-200",
  {
    variants: {
      size: {
        sm: "w-8 h-8 p-2",
        md: "w-9 h-9 p-2.5",
        default: "w-10 h-10 p-3",
        lg: "w-11 h-11 p-3.5"
      }
    },
    defaultVariants: {
      size: "default"
    }
  }
);

const iconVariants = cva(
  "transition-all duration-300",
  {
    variants: {
      size: {
        sm: "h-4 w-4",
        md: "h-[18px] w-[18px]",
        default: "h-5 w-5",
        lg: "h-6 w-6"
      }
    },
    defaultVariants: {
      size: "default"
    }
  }
);

export interface ThemeToggleProps extends VariantProps<typeof themeToggleVariants> {}

export default function ThemeToggle({ size }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isChanging, setIsChanging] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      
      if (savedTheme && theme !== savedTheme) {
        setTheme(savedTheme);
      }
    }
  }, [setTheme, theme]);

  const handleThemeChange = (newTheme: string) => {
    setIsChanging(true);
    
    document.documentElement.classList.add('theme-transitioning');
    
    setTimeout(() => {
      setTheme(newTheme);
      localStorage.setItem('theme', newTheme);
      
      setTimeout(() => {
        document.documentElement.classList.remove('theme-transitioning');
        setIsChanging(false);
      }, 100);
    }, 10);
  };

  if (!mounted) {
    return <div className={cn(themeToggleVariants({ size }))} aria-hidden="true" />;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className={cn(
            themeToggleVariants({ size }),
            isChanging && "pointer-events-none"
          )}
        >
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
            <IoMdSunny 
              className={cn(
                iconVariants({ size }), 
                "absolute inset-0 m-auto transform transition-all duration-300 ease-in-out text-foreground",
                theme === 'dark' ? "opacity-0 rotate-90 scale-50" : "opacity-100 rotate-0 scale-100"
              )} 
            />
            <IoMdMoon 
              className={cn(
                iconVariants({ size }), 
                "absolute inset-0 m-auto transform transition-all duration-300 ease-in-out text-foreground",
                theme === 'dark' ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-50"
              )} 
            />
          </div>
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-black/90 backdrop-blur-xl border border-white/10">
        <DropdownMenuItem 
          onClick={() => handleThemeChange('light')}
          className="text-white/80 hover:text-white focus:text-white hover:bg-white/10 cursor-pointer"
        >
          Light
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleThemeChange('dark')}
          className="text-white/80 hover:text-white focus:text-white hover:bg-white/10 cursor-pointer"
        >
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleThemeChange('system')}
          className="text-white/80 hover:text-white focus:text-white hover:bg-white/10 cursor-pointer"
        >
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
