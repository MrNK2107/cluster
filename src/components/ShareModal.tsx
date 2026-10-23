import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Download, 
  FileText, 
  Share2, 
  Cloud, 
  Globe 
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
  const [activeTab, setActiveTab] = useState<'markdown' | 'link' | 'deploy'>('markdown');

  if (!isOpen) return null;

  const markdownText = documentToMarkdown(document);

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
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
              Export & Share "{document.title}"
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
            <FileText className="w-3.5 h-3.5" /> Markdown Todos
          </button>
          <button
            onClick={() => setActiveTab('link')}
            className={`pb-2 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'link'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" /> Snapshot Link
          </button>
          <button
            onClick={() => setActiveTab('deploy')}
            className={`pb-2 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'deploy'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" /> 100% Free Hosting Guide
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-5 flex-1 overflow-y-auto text-xs">
          {activeTab === 'markdown' && (
            <div className="space-y-3">
              <p className="text-slate-600 dark:text-slate-400">
                Instantly export all clusters, checklists, and notes into clean Markdown. Perfect to paste into Notion, Obsidian, Slack, or GitHub.
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
                <p className="font-semibold text-xs mb-1">Serverless Snapshot URL</p>
                <p className="text-[11px] leading-relaxed text-indigo-800 dark:text-indigo-300">
                  This snapshot encodes this entire document into the URL itself. Anyone who opens the link gets a full clone without needing any server database or account!
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCopyShareLink}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors text-xs"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? 'Snapshot Link Copied!' : 'Copy Shareable Snapshot Link'}</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'deploy' && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <h4 className="font-bold text-slate-800 dark:text-slate-100 text-xs mb-1">
                  How to host this app 100% Free for anyone to use:
                </h4>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                  <li>
                    <strong>Vercel (Recommended):</strong> Push this repo to GitHub, import it in <a href="https://vercel.com" target="_blank" rel="noreferrer" className="text-indigo-500 underline">vercel.com</a>, and click <strong>Deploy</strong>. Free custom domain + SSL forever.
                  </li>
                  <li>
                    <strong>Cloudflare Pages:</strong> Connect your GitHub repo to Cloudflare Pages. Unlimited bandwidth, 100% free forever.
                  </li>
                  <li>
                    <strong>GitHub Pages:</strong> Enable GitHub Pages in repository settings using GitHub Actions.
                  </li>
                </ol>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/30 text-emerald-900 dark:text-emerald-200 text-[11px]">
                <strong>Why is it $0 forever?</strong> Because all data is stored local-first in each visitor's browser (IndexedDB). You incur zero database costs, zero hosting fees, and zero server maintenance!
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
