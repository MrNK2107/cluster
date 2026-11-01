import React, { useState } from 'react';
import type { AuthUser } from '../utils/supabase';
import { cn } from '../utils/cn';

const TINTS = ['bg-brand-500', 'bg-mint-500', 'bg-sun-400 text-ink-950', 'bg-pink-500', 'bg-orange-500', 'bg-violet-500'];

/** Google photo when there is one, otherwise a coloured initial. */
export const Avatar: React.FC<{ user: AuthUser; className?: string }> = ({ user, className }) => {
  const [broken, setBroken] = useState(false);
  const label = user.name || user.email || '?';
  const initial = label.trim()[0]?.toUpperCase() ?? '?';
  const tint = TINTS[[...label].reduce((a, ch) => a + ch.charCodeAt(0), 0) % TINTS.length];

  if (user.avatarUrl && !broken) {
    return (
      <img
        src={user.avatarUrl}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        className={cn('shrink-0 rounded-full object-cover ring-2 ring-white/15', className)}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn('shrink-0 rounded-full flex items-center justify-center font-display font-bold text-white', tint, className)}
    >
      {initial}
    </span>
  );
};
