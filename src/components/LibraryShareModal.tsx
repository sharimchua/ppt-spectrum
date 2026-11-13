/**
 * Library Bundles & Non-Destructive Import/Export Modal.
 * Allows loading Shape+Filter+Envelope presets, sharing a single setup via ?bundle= slug,
 * and exporting/importing custom library sets idempotently.
 */

import React, { useState } from 'react';
import { Package, Share2, Check, Download, Upload, X, Play } from 'lucide-react';
import { UseLibraryBundlesResult } from './hooks/useLibraryBundles';

export interface LibraryShareModalProps {
  bundlesApi: UseLibraryBundlesResult;
}

export const LibraryShareModal: React.FC<LibraryShareModalProps> = ({ bundlesApi }) => {
  const {
    isBundleModalOpen,
    closeBundleModal,
    bundles,
    lastImportStats,
    lastImportError,
    handleApplyBundle,
    handleShareCurrentBundleUrl,
    handleExportSetJson,
    handleImportText,
  } = bundlesApi;

  const [shareName, setShareName] = useState('');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [importInput, setImportInput] = useState('');
  const [applyOnImport, setApplyOnImport] = useState(true);

  if (!isBundleModalOpen) return null;

  const onCopyShareUrl = async () => {
    await handleShareCurrentBundleUrl(shareName.trim() || undefined);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const onCopySetJson = async () => {
    const json = handleExportSetJson();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(json);
      } catch {
        // Ignore clipboard errors
      }
    }
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const onDownloadSetJson = () => {
    const json = handleExportSetJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ppt-spectrum-library.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      onClick={closeBundleModal}
    >
      <div
        className="w-full max-w-lg max-h-[85vh] bg-[#090d16] border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-purple-400" />
            <div>
              <h2 className="text-sm font-bold text-white">Library Bundles &amp; Sharing</h2>
              <p className="text-[10px] text-slate-400 font-mono">
                Preconfigured Shape + Filter + Envelope setups
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeBundleModal}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Curated & Imported Bundles */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
              Scene Setups
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {bundles.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-purple-500/40 transition"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white truncate">
                      {b.origin === 'user' ? '★ ' : ''}{b.name}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {b.shape.name}
                      {b.filter ? ` · ${b.filter.name}` : ''}
                      {b.envelope ? ` · ${b.envelope.name}` : ''}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      handleApplyBundle(b);
                      closeBundleModal();
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-semibold shrink-0 cursor-pointer"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Load</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Share Current Setup as Slug */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
            <h3 className="text-xs font-semibold text-white">Share Current Setup as Deep Link</h3>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={shareName}
                onChange={(e) => setShareName(e.target.value)}
                placeholder="Optional setup name..."
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
              />
              <button
                type="button"
                onClick={() => void onCopyShareUrl()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold cursor-pointer shrink-0"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{copiedUrl ? 'Copied Link' : 'Copy Slug URL'}</span>
              </button>
            </div>
          </div>

          {/* Export / Import Library Set */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-semibold text-white">Library Set Export / Import</h3>
                <p className="text-[10px] text-slate-400">
                  Non-destructive &amp; idempotent merge — never overwrites local items.
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => void onCopySetJson()}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-slate-200 cursor-pointer"
                >
                  {copiedJson ? 'Copied!' : 'Copy JSON'}
                </button>
                <button
                  type="button"
                  onClick={onDownloadSetJson}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-slate-200 cursor-pointer"
                >
                  <Download className="w-3 h-3" /> Export
                </button>
              </div>
            </div>

            <textarea
              value={importInput}
              onChange={(e) => setImportInput(e.target.value)}
              placeholder="Paste a ?bundle= slug or library JSON set here..."
              rows={3}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-[11px] font-mono text-slate-200 focus:outline-none focus:border-purple-500"
            />

            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyOnImport}
                  onChange={(e) => setApplyOnImport(e.target.checked)}
                  className="accent-purple-500"
                />
                <span>Load imported bundle into active scene</span>
              </label>

              <button
                type="button"
                onClick={() => {
                  if (handleImportText(importInput, applyOnImport)) {
                    setImportInput('');
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Merge Import</span>
              </button>
            </div>

            {lastImportError && (
              <p className="text-[11px] text-rose-400 font-mono">{lastImportError}</p>
            )}
            {lastImportStats && (
              <p className="text-[11px] text-emerald-400 font-mono">
                Merged: +{lastImportStats.addedShapes} shapes, +{lastImportStats.addedFilters} filters, +
                {lastImportStats.addedEnvelopes} envelopes, +{lastImportStats.addedBundles} bundles
                {lastImportStats.skippedDuplicates > 0
                  ? ` (${lastImportStats.skippedDuplicates} identical skipped)`
                  : ''}
                {lastImportStats.renamedCollisions > 0
                  ? ` (${lastImportStats.renamedCollisions} renamed to preserve local)`
                  : ''}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
