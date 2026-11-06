import React, { useEffect, useState } from 'react';
import type { CardType, CardColor, Cluster } from '../types';
import { COLOR_MAP } from '../theme/colors';
import { CARD_KINDS } from './CanvasDock';
import { ColorSwatches } from './CardView';
import { Button, Dialog } from './ui';
import { cn } from '../utils/cn';

interface MobileQuickAddSheetProps {
  isOpen: boolean;
  initialType?: CardType;
  initialClusterId?: string | null;
  clusters: Cluster[];
  onClose: () => void;
  onAdd: (params: { type: CardType; title: string; content: string; clusterId: string | null; color: CardColor }) => void;
}

const DEFAULT_COLOR: Record<CardType, CardColor> = {
  todo: 'blue',
  note: 'green',
  sticky: 'yellow',
  counter: 'pink',
  links: 'purple',
  rota: 'green',
};

const PROMPTS: Record<CardType, { title: string; content?: string; submit: string }> = {
  todo: { title: 'e.g. Weekend errands', content: 'First task (add #tags if you like)', submit: 'Add to-do list' },
  note: { title: 'e.g. Meeting notes', content: 'Write anything…', submit: 'Add note' },
  sticky: { title: 'Optional title', content: 'A thought worth keeping…', submit: 'Add sticky' },
  counter: { title: 'e.g. Glasses of water', submit: 'Add tally' },
  links: { title: 'e.g. Useful links', submit: 'Add links card' },
  rota: { title: 'e.g. Room cleaning', submit: 'Add chore rota' },
};

export const MobileQuickAddSheet: React.FC<MobileQuickAddSheetProps> = ({
  isOpen,
  initialType = 'todo',
  initialClusterId = null,
  clusters,
  onClose,
  onAdd,
}) => {
  const [type, setType] = useState<CardType>(initialType);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [clusterId, setClusterId] = useState<string | null>(initialClusterId);
  const [color, setColor] = useState<CardColor>(DEFAULT_COLOR[initialType]);

  // Each opening starts fresh from the trigger that opened it.
  useEffect(() => {
    if (!isOpen) return;
    setType(initialType);
    setColor(DEFAULT_COLOR[initialType]);
    setClusterId(initialClusterId);
    setTitle('');
    setContent('');
  }, [isOpen, initialType, initialClusterId]);

  const prompt = PROMPTS[type];
  const kind = CARD_KINDS.find((k) => k.type === type)!;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      type,
      title: title.trim() || kind.label,
      content: content.trim(),
      clusterId,
      color,
    });
    onClose();
  };

  const inputClass =
    'w-full rounded-xl bg-ink-50 dark:bg-ink-950 px-4 text-[16px] text-ink-900 dark:text-white placeholder:text-ink-400 outline-none ring-1 ring-inset ring-ink-200 dark:ring-ink-700 focus:ring-2 focus:ring-brand-500';

  return (
    <Dialog open={isOpen} onClose={onClose} title="Add something">
      <form onSubmit={submit} className="space-y-5">
        <div role="radiogroup" aria-label="Card type" className="-mx-6 px-6 flex gap-2 overflow-x-auto scrollbar-none">
          {CARD_KINDS.map(({ type: t, label, icon: Icon, tint }) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={type === t}
              onClick={() => {
                setType(t);
                setColor(DEFAULT_COLOR[t]);
              }}
              className={cn(
                'shrink-0 flex flex-col items-center justify-center gap-1 w-[76px] h-[68px] rounded-2xl text-[12px] font-semibold transition-all',
                type === t
                  ? 'bg-ink-950 text-white dark:bg-white dark:text-ink-950'
                  : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300',
              )}
            >
              <Icon className={cn('w-5 h-5', type === t ? '' : tint)} />
              {label === 'To-do list' ? 'To-do' : label}
            </button>
          ))}
        </div>

        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={prompt.title}
          aria-label="Title"
          className={cn(inputClass, 'h-12 font-semibold')}
        />

        {prompt.content &&
          (type === 'todo' ? (
            <input
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={prompt.content}
              aria-label="First task"
              className={cn(inputClass, 'h-12')}
            />
          ) : (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={prompt.content}
              aria-label="Text"
              rows={3}
              className={cn(inputClass, 'py-3 resize-none leading-relaxed')}
            />
          ))}

        <div>
          <div className="mb-1.5 text-[13px] font-semibold text-ink-500 dark:text-ink-400">
            Colour: <span className="text-ink-800 dark:text-ink-200">{COLOR_MAP[color].label}</span>
          </div>
          <div className="-ml-1 [&>div]:grid-cols-8 [&>div]:gap-2">
            <ColorSwatches value={color} onPick={setColor} />
          </div>
        </div>

        {clusters.length > 0 && (
          <div>
            <div className="mb-2 text-[13px] font-semibold text-ink-500 dark:text-ink-400">Put it in</div>
            <div className="-mx-6 px-6 flex gap-2 overflow-x-auto scrollbar-none">
              {[{ id: null as string | null, title: 'No cluster', swatch: 'bg-ink-300' }, ...clusters.map((c) => ({ id: c.id as string | null, title: c.title, swatch: COLOR_MAP[c.color]?.swatch }))].map((opt) => (
                <button
                  key={opt.id ?? 'none'}
                  type="button"
                  onClick={() => setClusterId(opt.id)}
                  aria-pressed={clusterId === opt.id}
                  className={cn(
                    'shrink-0 inline-flex items-center gap-2 h-9 px-3.5 rounded-full text-[13px] font-semibold',
                    clusterId === opt.id
                      ? 'bg-brand-600 text-white'
                      : 'bg-white text-ink-700 ring-1 ring-inset ring-ink-200 dark:bg-ink-900 dark:text-ink-200 dark:ring-ink-700',
                  )}
                >
                  <span className={cn('w-2 h-2 rounded-full', clusterId === opt.id ? 'bg-white' : opt.swatch)} />
                  <span className="max-w-40 truncate">{opt.title || 'Untitled'}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <Button type="submit" variant="primary" size="lg" className="w-full">
          {prompt.submit}
        </Button>
      </form>
    </Dialog>
  );
};
