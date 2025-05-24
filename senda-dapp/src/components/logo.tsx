'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

interface LogoProps {
  width?: number;
  height?: number;
  className?: string;
}

export default function ThemeAwareLogo({ width = 100, height = 100, className }: LogoProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return <Image src={"2.svg"} alt="logo" width={width} height={height} className={`${className} `} />
}