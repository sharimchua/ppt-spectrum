import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  BookOpen,
  Sliders,
  ExternalLink,
  Compass,
  Play,
} from 'lucide-react';
import { OverviewSection } from './info-modal/OverviewSection';
import { ConceptsSection } from './info-modal/ConceptsSection';
import { CustomiseSection } from './info-modal/CustomiseSection';
import { LinksSection } from './info-modal/LinksSection';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayDemo?: () => void;
}

export const STORAGE_KEY_DONT_SHOW_INTRO = 'ppt_spectrum_dont_show_intro_v1';

type NavSection = 'overview' | 'concepts' | 'customise' | 'links';

interface NavItem {
  id: NavSection;
  label: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Spectrum Overview', icon: <Compass className="w-3.5 h-3.5" /> },
  { id: 'concepts', label: 'PPT Musical Concepts', icon: <Sparkles className="w-3.5 h-3.5" /> },
  { id: 'customise', label: 'Customisation & Controls', icon: <Sliders className="w-3.5 h-3.5" /> },
  { id: 'links', label: 'Links & Resources', icon: <ExternalLink className="w-3.5 h-3.5" /> },
];

export const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose, onPlayDemo }) => {
  const [activeSection, setActiveSection] = useState<NavSection>('overview');
  const [dontShowAgain, setDontShowAgain] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEY_DONT_SHOW_INTRO) === 'true';
  });

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Scroll spy on active section
  useEffect(() => {
    if (!isOpen) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const sectionIds: NavSection[] = ['overview', 'concepts', 'customise', 'links'];
      const scrollPos = container.scrollTop + 140;

      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const el = document.getElementById(`ppt-section-${sectionIds[i]}`);
        if (el && el.offsetTop <= scrollPos) {
          setActiveSection(sectionIds[i]);
          break;
        }
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isOpen]);

  if (!isOpen) return null;

  const scrollToSection = (sectionId: NavSection) => {
    setActiveSection(sectionId);
    const target = document.getElementById(`ppt-section-${sectionId}`);
    if (target && scrollContainerRef.current) {
      const offsetTop = target.offsetTop - 16;
      scrollContainerRef.current.scrollTo({
        top: offsetTop,
        behavior: 'smooth',
      });
    }
  };

  const handleDontShowChange = (checked: boolean) => {
    setDontShowAgain(checked);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_DONT_SHOW_INTRO, checked ? 'true' : 'false');
    }
  };

  const handlePlayDemoClick = () => {
    if (onPlayDemo) {
      onPlayDemo();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-4xl max-h-[92vh] rounded-2xl border border-stone-800 bg-[#0c101a] shadow-2xl overflow-hidden">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between border-b border-stone-800/80 px-5 sm:px-6 py-3.5 bg-[#080b12]/95 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-6 rounded-md bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-bold tracking-wider text-stone-100 uppercase">
                Prime Period Theory — Spectrum Guide &amp; Theoretical Foundations
              </h2>
              <p className="text-[10px] text-stone-400 hidden sm:block">
                Interactive spatial synthesiser, lens laboratory, and unified continuum guide
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-800 hover:text-stone-100 transition-colors cursor-pointer"
            aria-label="Close dialogue"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Bookmarks Bar */}
        <div className="border-b border-stone-800/80 bg-stone-950/90 px-4 sm:px-6 py-2 shrink-0">
          <nav className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 sm:gap-2">
            {NAV_ITEMS.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-amber-500 text-stone-950 shadow-sm'
                      : 'text-stone-400 hover:bg-stone-900 hover:text-stone-200'
                  }`}
                >
                  {item.icon}
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Scrollable Document Body */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-8 text-xs text-stone-300 leading-relaxed font-sans"
        >
          {/* Section 1: Spectrum Overview */}
          <section id="ppt-section-overview" className="scroll-mt-4">
            <OverviewSection onPlayDemo={handlePlayDemoClick} />
          </section>

          {/* Section Divider: Concepts */}
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-stone-800" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-[#0c101a] px-3.5 py-1 rounded-full border border-stone-800 text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-amber-400 flex items-center gap-1.5 shadow-sm">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Theoretical Foundations &amp; PPT Concepts</span>
              </span>
            </div>
          </div>

          {/* Section 2: PPT Musical Concepts */}
          <section id="ppt-section-concepts" className="scroll-mt-4">
            <ConceptsSection />
          </section>

          {/* Section Divider: Customisation & Controls */}
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-stone-800" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-[#0c101a] px-3.5 py-1 rounded-full border border-stone-800 text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-1.5 shadow-sm">
                <Sliders className="w-3.5 h-3.5" />
                <span>Engine Controls &amp; Customisation</span>
              </span>
            </div>
          </div>

          {/* Section 3: Customisation & Controls */}
          <section id="ppt-section-customise" className="scroll-mt-4">
            <CustomiseSection />
          </section>

          {/* Section Divider: Links */}
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-stone-800" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-[#0c101a] px-3.5 py-1 rounded-full border border-stone-800 text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 shadow-sm">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Community, Portal &amp; Resources</span>
              </span>
            </div>
          </div>

          {/* Section 4: Links & Resources */}
          <section id="ppt-section-links" className="scroll-mt-4">
            <LinksSection />
          </section>
        </div>

        {/* Modal Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-stone-800/80 px-5 sm:px-6 py-3.5 bg-[#080b12]/95 shrink-0">
          <label className="flex items-center gap-2 text-stone-400 text-xs cursor-pointer select-none self-start sm:self-auto">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => handleDontShowChange(e.target.checked)}
              className="rounded bg-stone-800 border-stone-700 text-amber-500 focus:ring-0 cursor-pointer"
            />
            <span>Don&apos;t show this intro on startup</span>
          </label>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            {onPlayDemo && (
              <button
                onClick={handlePlayDemoClick}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold text-xs border border-amber-500/40 transition-colors cursor-pointer"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Play Sawtooth Sweep Demo</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 font-semibold text-xs text-stone-100 transition-colors cursor-pointer"
            >
              Get Started
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
