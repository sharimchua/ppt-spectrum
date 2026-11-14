import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  BookOpen,
  Sliders,
  Compass,
  Play,
  Wrench,
} from 'lucide-react';
import { OverviewSection } from './info-modal/OverviewSection';
import { ConceptsSection } from './info-modal/ConceptsSection';
import { UnderTheHoodSection } from './info-modal/UnderTheHoodSection';
import { CustomiseSection } from './info-modal/CustomiseSection';
import { LinksSection } from './info-modal/LinksSection';
import {
  TutorialDemoId,
  TutorialSectionId,
  CustomTutorialDemoOverride,
  STORAGE_KEY_DONT_SHOW_INTRO,
} from './info-modal/tutorial-demos';

interface InfoModalProps {
  isOpen: boolean;
  initialSection?: TutorialSectionId;
  initialScrollTop?: number;
  onSectionChange?: (section: TutorialSectionId) => void;
  onScrollTopChange?: (scrollTop: number) => void;
  onClose: () => void;
  onPlayDemo?: (
    demoId?: TutorialDemoId,
    fromSection?: TutorialSectionId,
    customOverride?: CustomTutorialDemoOverride
  ) => void;
}

interface NavItem {
  id: TutorialSectionId;
  label: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: '1. Start Here & Demos', icon: <Compass className="w-3.5 h-3.5" /> },
  { id: 'concepts', label: '2. How It Works', icon: <Sparkles className="w-3.5 h-3.5" /> },
  { id: 'hood', label: '3. Under the Hood', icon: <Wrench className="w-3.5 h-3.5" /> },
  { id: 'customise', label: '4. Controls & Links', icon: <Sliders className="w-3.5 h-3.5" /> },
];

export const InfoModal: React.FC<InfoModalProps> = ({
  isOpen,
  initialSection = 'overview',
  initialScrollTop = 0,
  onSectionChange,
  onScrollTopChange,
  onClose,
  onPlayDemo,
}) => {
  const [activeSection, setActiveSection] = useState<TutorialSectionId>(initialSection);
  const [dontShowAgain, setDontShowAgain] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEY_DONT_SHOW_INTRO) === 'true';
  });

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const savedScrollTopRef = useRef<number>(initialScrollTop);
  const savedSectionRef = useRef<TutorialSectionId>(initialSection);
  savedScrollTopRef.current = initialScrollTop;
  savedSectionRef.current = initialSection;

  // Restore exact bookmarked scroll position when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setActiveSection(savedSectionRef.current);
    const rafId = window.requestAnimationFrame(() => {
      const container = scrollContainerRef.current;
      if (!container) return;
      if (savedScrollTopRef.current > 0) {
        container.scrollTop = savedScrollTopRef.current;
      } else if (savedSectionRef.current !== 'overview') {
        const target = document.getElementById(`ppt-section-${savedSectionRef.current}`);
        if (target) {
          container.scrollTop = Math.max(0, target.offsetTop - 16);
        }
      } else {
        container.scrollTop = 0;
      }
    });
    return () => window.cancelAnimationFrame(rafId);
  }, [isOpen]);

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
      if (onScrollTopChange) {
        onScrollTopChange(container.scrollTop);
      }
      const sectionIds: TutorialSectionId[] = ['overview', 'concepts', 'hood', 'customise'];
      const scrollPos = container.scrollTop + 140;

      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const el = document.getElementById(`ppt-section-${sectionIds[i]}`);
        if (el && el.offsetTop <= scrollPos) {
          setActiveSection(sectionIds[i]);
          if (onSectionChange) {
            onSectionChange(sectionIds[i]);
          }
          break;
        }
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isOpen, onSectionChange, onScrollTopChange]);

  const scrollToSection = (sectionId: TutorialSectionId) => {
    setActiveSection(sectionId);
    if (onSectionChange) {
      onSectionChange(sectionId);
    }
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

  const handlePlayDemoClick = (
    demoId: TutorialDemoId = 'hemiola-sweep',
    fromSection: TutorialSectionId = activeSection,
    customOverride?: CustomTutorialDemoOverride
  ) => {
    if (scrollContainerRef.current && onScrollTopChange) {
      onScrollTopChange(scrollContainerRef.current.scrollTop);
    }
    if (onPlayDemo) {
      onPlayDemo(demoId, fromSection, customOverride);
    }
  };

  return (
    <div
      aria-hidden={!isOpen}
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2.5 sm:p-4 transition-opacity duration-200 ${
        isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none invisible'
      }`}
    >
      <div className="relative flex flex-col w-full max-w-4xl max-h-[92vh] rounded-2xl border border-stone-800 bg-[#0c101a] shadow-2xl overflow-hidden">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between border-b border-stone-800/80 px-4 sm:px-6 py-3.5 bg-[#080b12]/95 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-6 rounded-md bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-bold tracking-wider text-stone-100 uppercase">
                PPT Spectrum — Interactive Guide &amp; Musical Thought Experiments
              </h2>
              <p className="text-[10px] text-stone-400 hidden sm:block">
                How rhythm, harmony, and timbre connect as amplitude across one continuous speed spectrum
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
        <div className="border-b border-stone-800/80 bg-stone-950/90 px-3 sm:px-6 py-2 shrink-0">
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
          data-tutorial-scroll-body="true"
          className="flex-1 overflow-y-auto px-3.5 sm:px-6 py-5 sm:py-6 space-y-8 text-xs text-stone-300 leading-relaxed font-sans"
        >
          {/* Section 1: Start Here & Guided Demos */}
          <section id="ppt-section-overview" className="scroll-mt-4">
            <OverviewSection onPlayDemo={handlePlayDemoClick} />
          </section>

          {/* Divider 2: How It Works */}
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-stone-800" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-[#0c101a] px-3.5 py-1 rounded-full border border-stone-800 text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-amber-400 flex items-center gap-1.5 shadow-sm">
                <Sparkles className="w-3.5 h-3.5" />
                <span>2. How It Works — Interactive Thought Experiments</span>
              </span>
            </div>
          </div>

          {/* Section 2: Concepts & Thought Experiments */}
          <section id="ppt-section-concepts" className="scroll-mt-4">
            <ConceptsSection onPlayDemo={handlePlayDemoClick} />
          </section>

          {/* Divider 3: Under the Hood */}
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-stone-800" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-[#0c101a] px-3.5 py-1 rounded-full border border-stone-800 text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-1.5 shadow-sm">
                <Wrench className="w-3.5 h-3.5" />
                <span>3. Under the Hood — Sound Design, Sieves &amp; Sampling</span>
              </span>
            </div>
          </div>

          {/* Section 3: Under the Hood */}
          <section id="ppt-section-hood" className="scroll-mt-4">
            <UnderTheHoodSection onPlayDemo={handlePlayDemoClick} />
          </section>

          {/* Divider 4: Controls & Links */}
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-stone-800" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-[#0c101a] px-3.5 py-1 rounded-full border border-stone-800 text-[10px] sm:text-[11px] font-mono uppercase tracking-wider text-emerald-400 flex items-center gap-1.5 shadow-sm">
                <BookOpen className="w-3.5 h-3.5" />
                <span>4. Controls, Shortcuts &amp; Learning Portal</span>
              </span>
            </div>
          </div>

          {/* Section 4: Controls & Ecosystem Links */}
          <section id="ppt-section-customise" className="scroll-mt-4 space-y-8">
            <CustomiseSection />
            <LinksSection />
          </section>
        </div>

        {/* Modal Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-stone-800/80 px-4 sm:px-6 py-3.5 bg-[#080b12]/95 shrink-0">
          <label className="flex items-center gap-2 text-stone-400 text-xs cursor-pointer select-none self-start sm:self-auto">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => handleDontShowChange(e.target.checked)}
              className="rounded bg-stone-800 border-stone-700 text-amber-500 focus:ring-0 cursor-pointer"
            />
            <span>Don&apos;t show this guide automatically on startup</span>
          </label>

          {onPlayDemo && (
            <button
              onClick={() => handlePlayDemoClick('hemiola-sweep', activeSection)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold text-xs border border-amber-500/40 transition-colors cursor-pointer"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Play 3:2 Sweep Demo</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
