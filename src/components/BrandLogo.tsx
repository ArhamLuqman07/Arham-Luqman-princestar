import React from 'react';

export const OFFICIAL_LOGO_URL =
  '/assets/aistudio/WhatsApp_Image_2026-08-16_at_00.12.46_423540cc.jpeg';

interface BrandLogoProps {
  logoUrl?: string;
  compact?: boolean;
  size?: 'sm' | 'md' | 'lg';
  tone?: 'auto' | 'dark';
  showTagline?: boolean;
  hideTaglineOnMobile?: boolean;
  interactive?: boolean;
  className?: string;
}

export function BrandLogo({
  logoUrl,
  compact = false,
  size = 'sm',
  tone = 'auto',
  showTagline = false,
  hideTaglineOnMobile = false,
  interactive = true,
  className = '',
}: BrandLogoProps) {
  const src = logoUrl?.trim() || OFFICIAL_LOGO_URL;

  const boxSize =
    size === 'lg'
      ? 'h-14 w-14 sm:h-16 sm:w-16 p-1'
      : size === 'md'
      ? 'h-11 w-11 p-0.5'
      : 'h-8 w-8 sm:h-10 sm:w-10 p-0.5';

  const titleClass =
    size === 'lg'
      ? 'text-xl sm:text-2xl tracking-[0.15em]'
      : 'text-[15px] sm:text-[21px] tracking-[0.10em] sm:tracking-[0.15em]';

  const textColor =
    tone === 'dark'
      ? 'text-[#E7E5E4] group-hover:text-white'
      : 'text-[#111111] dark:text-[#E7E5E4] group-hover:text-white';

  const subColor =
    tone === 'dark'
      ? 'text-[#D4AF37] group-hover:text-white/90'
      : 'text-[#A67C2E] dark:text-[#D4AF37] group-hover:text-white/90';

  const hoverSurface = interactive
    ? tone === 'dark'
      ? 'cursor-pointer rounded-full px-1.5 py-0.5 sm:px-2.5 sm:py-1 transition-all duration-200 hover:bg-white/10'
      : 'cursor-pointer rounded-full px-1.5 py-0.5 sm:px-2.5 sm:py-1 transition-all duration-200 hover:bg-[#111111] dark:hover:bg-white/10'
    : '';

  return (
    <span
      className={`group inline-flex items-center gap-2 sm:gap-3 min-w-0 max-w-full select-none ${hoverSurface} ${className}`}
    >
      <span
        className={`${boxSize} rounded-full bg-black border-[1.5px] border-[#A67C2E]/70 dark:border-[#D4AF37]/70 group-hover:border-[#D4AF37] group-hover:shadow-[0_0_12px_rgba(212,175,55,0.35)] overflow-hidden shrink-0 flex items-center justify-center transition-all duration-200 group-hover:scale-[1.03] cursor-pointer`}
      >
        <img
          src={src}
          alt="PRINCE STAR — LUXURY LIFESTYLE"
          referrerPolicy="no-referrer"
          className="w-full h-full object-contain rounded-full"
        />
      </span>
      {!compact && (
        <span className="flex flex-col leading-none text-left min-w-0 cursor-pointer">
          <span
            className={`font-display font-semibold whitespace-nowrap transition-colors duration-200 ${titleClass} ${textColor}`}
          >
            PRINCE STAR
          </span>
          {showTagline && (
            <span
              className={`${
                hideTaglineOnMobile ? 'hidden sm:block' : 'block'
              } mt-0.5 sm:mt-1 text-[8px] sm:text-[10px] font-medium uppercase tracking-[0.14em] sm:tracking-[0.24em] whitespace-nowrap transition-colors duration-200 ${subColor}`}
            >
              LUXURY LIFESTYLE
            </span>
          )}
        </span>
      )}
    </span>
  );
}
