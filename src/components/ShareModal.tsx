import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Download,
  FileText,
  Share2,
  Globe,
  AlertTriangle
} from 'lucide-react';
import type { BoardDocument } from '../types';
import { documentToMarkdown } from '../utils/markdownExport';
import { exportDocumentJSON } from '../utils/storage';

interface ShareModalProps {
  isOpen: boolean;
  document: BoardDocument;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  document,
  onClose,
}) => {
  const [copiedMd, setCopiedMd] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeTab, setActiveTab] = useState<'markdown' | 'link'>('markdown');

  if (!isOpen) return null;

  const markdownText = documentToMarkdown(document);
  const snapshotBytes = new Blob([JSON.stringify(document)]).size;
  const snapshotKb = Math.max(1, Math.round(snapshotBytes / 1024));
  const snapshotTooLarge = snapshotBytes > 60_000;

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(markdownText);
    setCopiedMd(true);
    setTimeout(() => setCopiedMd(false), 2000);
  };

  const handleCopyShareLink = () => {
    // Generate URL hash snapshot
    try {
      const dataStr = JSON.stringify(document);
      const encoded = btoa(encodeURIComponent(dataStr));
      const shareUrl = `${window.location.origin}${window.location.pathname}#doc=${encoded}`;
      navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Clipboard blocked; the user can still download the JSON.
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
              Export & share "{document.title}"
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-5 pt-2 gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('markdown')}
            className={`pb-2 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'markdown'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> Markdown
          </button>
          <button
            onClick={() => setActiveTab('link')}
            className={`pb-2 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'link'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" /> Snapshot link
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-5 flex-1 overflow-y-auto text-xs">
          {activeTab === 'markdown' && (
            <div className="space-y-3">
              <p className="text-slate-600 dark:text-slate-400">
                Export the clusters, checklists and notes in this space as Markdown.
              </p>
              <div className="relative">
                <textarea
                  readOnly
                  value={markdownText}
                  rows={9}
                  className="w-full p-3 font-mono text-[11px] bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl outline-none resize-none text-slate-800 dark:text-slate-200"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => exportDocumentJSON(document)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  <Download className="w-3.5 h-3.5" /> Download JSON
                </button>
                <button
                  onClick={handleCopyMarkdown}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors"
                >
                  {copiedMd ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedMd ? 'Copied to Clipboard!' : 'Copy Markdown'}</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'link' && (
            <div className="space-y-4">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/40 rounded-xl text-indigo-900 dark:text-indigo-200">
                <p className="font-semibold text-xs mb-1">Snapshot link</p>
                <p className="text-[11px] leading-relaxed text-indigo-800 dark:text-indigo-300">
                  Anyone who opens the link gets a copy of this space as it is right now. No account or server is involved.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-amber-900 dark:text-amber-200 flex gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                <p className="text-[11px] leading-relaxed">
                  The link itself contains every note, task and bookmark in this space (about {snapshotKb} KB).
                  Only send it to people who should see all of it.
                  {snapshotTooLarge && ' This space is large; some chat apps may truncate the link. Consider the JSON download instead.'}
                </p>
              </div>

              <button
                onClick={handleCopyShareLink}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors text-xs"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? 'Link copied' : 'Copy snapshot link'}</span>
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
