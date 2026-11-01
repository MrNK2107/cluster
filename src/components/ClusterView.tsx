import React, { useCallback, useState } from 'react';
import { Plus, ChevronDown, Palette, MoreHorizontal, Trash2 } from 'lucide-react';
import type { Cluster, CardData, CardType } from '../types';
import { colorTheme } from '../theme/colors';
import { IconButton, MenuItem, MenuLabel, MenuPanel, useDismiss } from './ui';
import { ColorSwatches } from './CardView';
import { CARD_KINDS } from './CanvasDock';
import { cn } from '../utils/cn';

interface ClusterViewProps {
  cluster: Cluster;
  cards: CardData[];
  isSelected: boolean;
  isDropTarget?: boolean;
  children?: React.ReactNode;
  onSelect: () => void;
  onUpdate: (updated: Partial<Cluster>) => void;
  onDelete: () => void;
  onStartDrag: (e: React.MouseEvent, clusterId: string) => void;
  onAddCardInside: (clusterId: string, type: CardType) => void;
}

const stop = {
  onClick: (e: React.SyntheticEvent) => e.stopPropagation(),
  onMouseDown: (e: React.SyntheticEvent) => e.stopPropagation(),
};

export const ClusterView: React.FC<ClusterViewProps> = ({
  cluster,
  cards,
  isSelected,
  isDropTarget = false,
  children,
  onSelect,
  onUpdate,
  onDelete,
  onStartDrag,
  onAddCardInside,
}) => {
  const [popover, setPopover] = useState<'add' | 'color' | 'menu' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const close = useCallback(() => {
    setPopover(null);
    setConfirmDelete(false);
  }, []);
  const popRef = useDismiss(popover !== null, close);
  const theme = colorTheme(cluster.color);

  let total = 0;
  let done = 0;
  for (const c of cards) {
    total += c.todos?.length ?? 0;
    done += c.todos?.filter((t) => t.completed).length ?? 0;
  }

  return (
    <section
      data-cluster-id={cluster.id}
      aria-label={cluster.title}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      style={{
        position: 'absolute',
        left: cluster.x,
        top: cluster.y,
        width: cluster.width,
        minHeight: cluster.collapsed ? undefined : cluster.height,
        zIndex: popover ? 25 : 5,
      }}
      className={cn(
        'group/cluster rounded-[28px] border-2 transition-[border-color,box-shadow,background-color] duration-200',
        theme.region,
        isDropTarget
          ? 'border-brand-500 border-solid bg-brand-500/[0.08] shadow-[0_0_0_6px] shadow-brand-500/15'
          : isSelected
            ? 'border-brand-500 shadow-[0_0_0_4px] shadow-brand-500/15'
            : cn(theme.regionBorder, 'border-dashed'),
        cluster.collapsed && 'pb-3',
      )}
    >
      {/* Header strip: drag handle with the label tab hanging over the border */}
      <header
        onMouseDown={(e) => onStartDrag(e, cluster.id)}
        className="relative flex items-start justify-between gap-2 px-4 h-11 cursor-grab active:cursor-grabbing select-none"
      >
        <div className={cn('-mt-[18px] inline-flex items-center gap-2 max-w-[calc(100%-8px)] h-9 pl-4 pr-3 rounded-full shadow-[0_8px_18px_-10px_rgba(20,20,60,0.5)]', theme.tab)}>
          <input
            {...stop}
            value={cluster.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="Name this cluster"
            aria-label="Cluster name"
            size={Math.max(8, Math.min(32, cluster.title.length + 2))}
            className="min-w-0 max-w-full [field-sizing:content] bg-transparent outline-none font-display text-[15px] font-bold tracking-tight placeholder:text-current placeholder:opacity-60"
          />
          <span className="shrink-0 text-[12px] font-semibold tabular-nums opacity-75">
            {total > 0 ? `${done}/${total}` : cards.length}
          </span>
        </div>

        <div
          ref={popRef}
          {...stop}
          className={cn(
            'absolute right-3 -top-[17px] flex items-center gap-0.5 p-0.5 rounded-full bg-white dark:bg-ink-800 ring-1 ring-ink-900/[0.08] dark:ring-white/10 shadow-[0_6px_16px_-8px_rgba(20,20,60,0.4)] transition-opacity',
            isSelected || popover ? 'opacity-100' : 'opacity-0 group-hover/cluster:opacity-100 focus-within:opacity-100 max-md:opacity-100',
          )}
        >
          <IconButton label="Add card to cluster" size="sm" onClick={() => setPopover(popover === 'add' ? null : 'add')}>
            <Plus className="w-4 h-4" />
          </IconButton>
          <IconButton label="Cluster colour" size="sm" onClick={() => setPopover(popover === 'color' ? null : 'color')}>
            <Palette className="w-4 h-4" />
          </IconButton>
          <IconButton
            label={cluster.collapsed ? 'Expand cluster' : 'Collapse cluster'}
            size="sm"
            onClick={() => onUpdate({ collapsed: !cluster.collapsed })}
          >
            <ChevronDown className={cn('w-4 h-4 transition-transform duration-200', !cluster.collapsed && 'rotate-180')} />
          </IconButton>
          <IconButton label="Cluster options" size="sm" onClick={() => setPopover(popover === 'menu' ? null : 'menu')}>
            <MoreHorizontal className="w-4 h-4" />
          </IconButton>

          {popover === 'add' && (
            <MenuPanel className="right-0 top-full mt-1.5 w-52">
              <MenuLabel>Add to {cluster.title || 'cluster'}</MenuLabel>
              {CARD_KINDS.map(({ type, label, icon: Icon, tint }) => (
                <MenuItem
                  key={type}
                  icon={<Icon className={cn('w-4 h-4', tint)} />}
                  onClick={() => {
                    onAddCardInside(cluster.id, type);
                    close();
                  }}
                >
                  {label}
                </MenuItem>
              ))}
            </MenuPanel>
          )}

          {popover === 'color' && (
            <MenuPanel className="right-0 top-full mt-1.5 min-w-0 w-auto">
              <ColorSwatches
                value={cluster.color}
                onPick={(c) => {
                  onUpdate({ color: c });
                  close();
                }}
              />
            </MenuPanel>
          )}

          {popover === 'menu' && (
            <MenuPanel className="right-0 top-full mt-1.5 w-60">
              <MenuItem
                tone="danger"
                icon={<Trash2 className="w-4 h-4" />}
                onClick={() => {
                  if (!confirmDelete) {
                    setConfirmDelete(true);
                    return;
                  }
                  onDelete();
                  close();
                }}
              >
                {confirmDelete ? 'Click again to delete' : 'Delete cluster'}
              </MenuItem>
              <p className="px-2.5 pt-1 pb-1.5 text-[12px] leading-snug text-ink-400">Cards inside stay on the canvas.</p>
            </MenuPanel>
          )}
        </div>
      </header>

      {!cluster.collapsed && React.Children.count(children) > 0 && <div className="px-4 pb-5 pt-1 space-y-4">{children}</div>}

      {!cluster.collapsed && cards.length === 0 && (
        <div className="px-6 pt-10 text-center">
          <p className="text-[14px] font-medium text-ink-400 dark:text-ink-500">Drag cards here, or</p>
          <button
            type="button"
            {...stop}
            onClick={(e) => {
              e.stopPropagation();
              onAddCardInside(cluster.id, 'todo');
            }}
            className={cn('mt-2 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[13px] font-semibold ring-1 ring-inset ring-current/20 hover:bg-white/60 dark:hover:bg-white/5', theme.text)}
          >
            <Plus className="w-4 h-4" /> Add a to-do list
          </button>
        </div>
      )}
    </section>
  );
};
