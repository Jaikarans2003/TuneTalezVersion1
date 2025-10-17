'use client';

import React from 'react';
import Image from 'next/image';

interface LogoProps {
  size?: number;
  url: string;
}

const Logo: React.FC<LogoProps> = ({ size = 52, url }) => {
  // Only use the provided URL
  const logoSrc = url;
  
  return (
    <div className="flex items-center">
      <Image 
        src={logoSrc} 
        alt="TuneTalez Logo" 
        width={size} 
        height={size}
        className="object-contain"
        quality={500}
        priority
        unoptimized
      />
    </div>
  );
};

export default Logo;