import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '../utils/cn';

/* --------------------------------------------------------------------------
 * Brand
 * ----------------------------------------------------------------------- */

/** Three tiles gathering into a cluster. */
export const LogoMark: React.FC<{ className?: string }> = ({ className = 'w-8 h-8' }) => (
  <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
    <rect x="3" y="3" width="20" height="20" rx="6" className="fill-brand-500" />
    <rect x="17" y="10" width="20" height="20" rx="6" className="fill-sun-400" transform="rotate(8 27 20)" />
    <rect x="9" y="17" width="20" height="20" rx="6" className="fill-mint-500" opacity="0.92" />
  </svg>
);

export const Wordmark: React.FC<{ className?: string }> = ({ className }) => (
  <span className={cn('font-display font-bold tracking-tight lowercase', className)}>clustr</span>
);

/* --------------------------------------------------------------------------
 * Buttons
 * ----------------------------------------------------------------------- */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-[0_8px_20px_-10px] shadow-brand-600/70 disabled:shadow-none',
  secondary:
    'bg-white text-ink-800 ring-1 ring-inset ring-ink-200 hover:bg-ink-50 hover:ring-ink-300 dark:bg-ink-900 dark:text-ink-100 dark:ring-ink-700 dark:hover:bg-ink-800',
  ghost: 'text-ink-600 hover:bg-ink-100 hover:text-ink-900 dark:text-ink-300 dark:hover:bg-ink-800 dark:hover:text-white',
  danger:
    'text-rose-600 ring-1 ring-inset ring-rose-200 hover:bg-rose-50 dark:text-rose-400 dark:ring-rose-500/30 dark:hover:bg-rose-500/10',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-5 text-[15px] gap-2.5 rounded-xl',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', className, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center font-semibold whitespace-nowrap select-none transition-[background-color,box-shadow,color,transform] duration-150 active:scale-[0.98] disabled:opacity-55 disabled:active:scale-100',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = 'Button';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  size?: 'sm' | 'md';
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, size = 'md', className, type = 'button', children, ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex items-center justify-center shrink-0 text-ink-500 hover:text-ink-900 hover:bg-ink-900/[0.06] dark:text-ink-400 dark:hover:text-white dark:hover:bg-white/[0.08] transition-colors active:scale-95',
        size === 'sm' ? 'w-7 h-7 rounded-md' : 'w-9 h-9 rounded-lg',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  ),
);
IconButton.displayName = 'IconButton';

/** The modifier key label for the user's platform. */
export const MOD_KEY =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent) ? '⌘' : 'Ctrl';

export const Kbd: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <kbd
    className={cn(
      'inline-flex items-center h-5 px-1.5 rounded-md text-[10px] font-semibold font-sans text-ink-500 bg-ink-100 ring-1 ring-inset ring-ink-200 dark:text-ink-400 dark:bg-ink-800 dark:ring-ink-700',
      className,
    )}
  >
    {children}
  </kbd>
);

/* --------------------------------------------------------------------------
 * Popover menu: closes on outside click and Escape.
 * ----------------------------------------------------------------------- */

export const useDismiss = (open: boolean, onClose: () => void) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);
  return ref;
};

export const MenuPanel: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div
    role="menu"
    className={cn(
      'absolute z-50 min-w-48 p-1.5 rounded-xl bg-white dark:bg-ink-900 ring-1 ring-ink-900/[0.08] dark:ring-white/10 float-shadow animate-pop-in origin-top-right text-sm',
      className,
    )}
  >
    {children}
  </div>
);

export const MenuItem: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: React.ReactNode; active?: boolean; tone?: 'default' | 'danger'; hint?: React.ReactNode }
> = ({ icon, active, tone = 'default', hint, className, children, ...props }) => (
  <button
    type="button"
    role="menuitem"
    className={cn(
      'w-full flex items-center gap-2.5 px-2.5 h-9 rounded-lg text-left font-medium transition-colors',
      tone === 'danger'
        ? 'text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10'
        : active
          ? 'text-brand-700 bg-brand-50 dark:text-brand-200 dark:bg-brand-500/15'
          : 'text-ink-700 hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-800',
      className,
    )}
    {...props}
  >
    {icon && <span className="shrink-0 flex items-center justify-center w-4 h-4">{icon}</span>}
    <span className="flex-1 truncate">{children}</span>
    {hint}
  </button>
);

export const MenuDivider: React.FC = () => <div className="my-1.5 h-px bg-ink-100 dark:bg-ink-800" />;

export const MenuLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="px-2.5 pt-1.5 pb-1 text-[11px] font-semibold text-ink-400 dark:text-ink-500">{children}</div>
);

/* --------------------------------------------------------------------------
 * Dialog shell
 * ----------------------------------------------------------------------- */

export const Dialog: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ open, onClose, title, description, children, className }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6 bg-ink-950/45 backdrop-blur-[3px] animate-fade-in"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
        className={cn(
          'w-full sm:max-w-md max-h-[92dvh] flex flex-col overflow-hidden bg-white dark:bg-ink-900 rounded-t-3xl sm:rounded-3xl ring-1 ring-ink-900/[0.06] dark:ring-white/10 float-shadow animate-sheet-up sm:animate-pop-in',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-2">
          <div className="min-w-0">
            <h2 className="font-display text-xl font-bold tracking-tight text-ink-950 dark:text-white">{title}</h2>
            {description && <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{description}</p>}
          </div>
          <IconButton label="Close" onClick={onClose} className="-mr-2 -mt-1">
            <X className="w-4 h-4" />
          </IconButton>
        </div>
        <div className="overflow-y-auto px-6 pb-6 pt-3">{children}</div>
      </div>
    </div>
  );
};
