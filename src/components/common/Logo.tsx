import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface LogoProps {
  variant?: 'full' | 'icon'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  disableLink?: boolean
}

export function Logo({ variant: _variant = 'full', size = 'md', className, disableLink = false }: LogoProps) {
  const sizeMap = {
    sm: 32,
    md: 40,
    lg: 48,
  }

  const dimension = sizeMap[size]

  if (disableLink) {
    return (
      <div className={cn('flex items-center', className)}>
        <Image
          src="/logo/V.png"
          alt="Materia Virtualis"
          width={dimension}
          height={dimension}
          className={cn('object-contain')}
          priority
        />
      </div>
    )
  }

  return (
    <Link href="/" className={cn('flex items-center', className)}>
      <Image
        src="/logo/V.png"
        alt="Materia Virtualis"
        width={dimension}
        height={dimension}
        className={cn('object-contain')}
        priority
      />
    </Link>
  )
}
