'use client'

import React from 'react'
import Image from 'next/image'

type IconProps = {
  asset: any | null
  size?: number
}

const TokenIcon = ({ asset, size = 24 }: IconProps) => {
  return (
    <div
      className="relative shrink-0 rounded-full border border-border bg-background p-0"
      style={{
        width: size + 2,
        height: size + 2,
      }}
    >
      <Image
        src="/token-icons/placeholder.jpg"
        alt={asset?.symbol ?? asset?.mint.toBase58() ?? ''}
        width={size}
        height={size}
        className="absolute inset-0 rounded-full"
      />
      <Image
        src={asset?.image ?? ''}
        alt={asset?.symbol ?? asset?.mint.toBase58() ?? ''}
        width={size}
        height={size}
        className="absolute inset-0 rounded-full"
        style={{
          width: size,
          height: size,
        }}
      />
    </div>
  )
}

export { TokenIcon }
