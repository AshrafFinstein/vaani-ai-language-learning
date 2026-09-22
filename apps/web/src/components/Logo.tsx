import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  showWordmark?: boolean;
}

/** Original Vaani AI brand mark: a stylized speech/sound-wave in a gradient tile. */
export function Logo({ className, showWordmark = true }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span className="vaani-gradient flex h-9 w-9 items-center justify-center rounded-xl shadow-sm">
        <svg viewBox="0 0 32 32" className="h-5 w-5" fill="none" aria-hidden="true">
          <path
            d="M9 10.5c0 5 3.2 9 7 11 3.8-2 7-6 7-11"
            stroke="white"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="16" cy="9" r="1.9" fill="white" />
        </svg>
      </span>
      {showWordmark && (
        <span className="text-lg font-bold tracking-tight">
          Vaani<span className="vaani-text-gradient"> AI</span>
        </span>
      )}
    </div>
  );
}
