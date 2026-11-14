import React, { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { resolveMediaUrl } from '../lib/media.ts';

interface SafeImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  aspectClass?: string;
}

export function SafeImage({ src, alt, className = '', aspectClass = '' }: SafeImageProps) {
  const [failed, setFailed] = useState(false);
  const resolved = resolveMediaUrl(src);

  if (failed || !resolved) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-[#EFECE5] dark:bg-[#1A1916] text-[#78716C] dark:text-[#A8A29E] p-4 text-center ${aspectClass} ${className}`}
      >
        <ImageOff className="w-6 h-6 mb-2 opacity-50" />
        <span className="text-xs font-medium tracking-wide max-w-[180px] truncate">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={resolved}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`${aspectClass} ${className}`}
    />
  );
}
