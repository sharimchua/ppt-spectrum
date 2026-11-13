/**
 * Main application shell.
 * Composes viewport, toolbar, layout renderer, modals, and custom hooks.
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { setPrimaryPlacementD, stepPrimaryPlacementD } from '../core/scene-ops';
import { SpectrumViewport } from './SpectrumViewport';
import { ControlToolbar } from './ControlToolbar';
import { FlexLayoutRenderer } from './FlexLayoutRenderer';
import { STORAGE_KEY_DONT_SHOW_INTRO } from './InfoModal';
import { FilterEditHud } from './FilterEditHud';
import { AppModals } from './AppModals';
import { useTeachingDemo } from './hooks/useTeachingDemo';
import { useSceneEngine } from './hooks/useSceneEngine';
import { useLayoutState } from './hooks/useLayoutState';
import { useTransport } from './hooks/useTransport';
import { useBookmarks } from './hooks/useBookmarks';
import { useShapeLibrary } from './hooks/useShapeLibrary';
import { useFilters } from './hooks/useFilters';
import { useKeyboardShortcuts, KeyboardActions } from './hooks/useKeyboardShortcuts';
import { useFullscreen } from './hooks/useFullscreen';
import { useMidi } from './hooks/useMidi';
import { useEnvelopes } from './hooks/useEnvelopes';
import { getFocusedSpanView } from '../core/scene-ops';

export const App: React.FC = () => {
  // Modal visibility states
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isShapeEditorOpen, setIsShapeEditorOpen] = useState<boolean>(false);
  const [isQuickSearchOpen, setIsQuickSearchOpen] = useState<boolean>(false);
  const [isFilterQuickSearchOpen, setIsFilterQuickSearchOpen] = useState<boolean>(false);
  const [isBookmarksOpen, setIsBookmarksOpen] = useState<boolean>(false);
  const [isCaptureOpen, setIsCaptureOpen] = useState<boolean>(false);
  const [isRadialMenuOpen, setIsRadialMenuOpen] = useState<boolean>(false);
  const [radialMenuAnchor, setRadialMenuAnchor] = useState<{ x: number; y: number } | null>(null);

  // Check if intro primer modal should be shown on launch
  const [isInfoOpen, setIsInfoOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEY_DONT_SHOW_INTRO) !== 'true';
  });

  // Fullscreen management
  const { isFullscreen, toggleFullscreen } = useFullscreen();

  // Temporary holder for oscillating state before useBookmarks initialisation
  const [isOscillatingInit, setIsOscillatingInit] = useState<boolean>(false);

  // Core scene engine (RenderCoordinator, AudioEngine, debounced save)
  const { scene, sceneRef, updateScene, coordinator, audioEngine } = useSceneEngine(isOscillatingInit);

  // Ref tracking active sweep oscillation to allow synchronous pause and scrub cancellation
  const isOscillatingRef = useRef<boolean>(false);
  const setIsOscillatingRef = useRef<((val: boolean | ((prev: boolean) => boolean)) => void) | null>(null);

  // Primary placement coordinate updates (user scrub turns off sweep while keeping audio running)
  const handleUpdatePlacementD = useCallback(
    (d: number) => {
      if (isOscillatingRef.current && setIsOscillatingRef.current) {
        setIsOscillatingRef.current(false);
      }
      updateScene((prev) => setPrimaryPlacementD(prev, d));
    },
    [updateScene]
  );

  const handleStepPrimaryD = useCallback(
    (step: number) => {
      if (isOscillatingRef.current && setIsOscillatingRef.current) {
        setIsOscillatingRef.current(false);
      }
      updateScene((prev) => stepPrimaryPlacementD(prev, step));
    },
    [updateScene]
  );

  // Audio transport and note triggering
  const {
    isPlaying,
    getViewportCenter,
    handleNoteOn,
    handleNoteOff,
    handleTriggerNote,
    handleTogglePlay: rawHandleTogglePlay,
  } = useTransport({ coordinator, audioEngine, sceneRef });

  // Web MIDI keyboard input (polyphonic play + ruler ghosting)
  const { midiState, isMidiModalOpen, openMidiModal, closeMidiModal } = useMidi({
    coordinator,
    audioEngine,
    sceneRef,
    onUpdatePlacementD: handleUpdatePlacementD,
  });

  // Dedicated Envelopes Sheet state & library
  const envelopes = useEnvelopes({ scene, updateScene });

  // Musical bookmarks and continuum sweep oscillation
  const {
    bookmarks,
    setBookmarks,
    isOscillating,
    setIsOscillating,
    toggleOscillating,
    handleJumpBookmarkA,
    handleJumpBookmarkB,
    handleSetBookmarkA,
    handleSetBookmarkB,
    setBookmarkFromCurrent,
  } = useBookmarks({
    sceneRef,
    updateScene,
    coordinator,
    setPrimaryD: handleUpdatePlacementD,
  });

  isOscillatingRef.current = isOscillating;
  setIsOscillatingRef.current = setIsOscillating;

  // Pausing transport turns off sweep oscillation if active
  const handleTogglePlay = useCallback(async () => {
    if (isPlaying && isOscillatingRef.current && setIsOscillatingRef.current) {
      setIsOscillatingRef.current(false);
    }
    await rawHandleTogglePlay();
  }, [isPlaying, rawHandleTogglePlay]);

  // Keep useSceneEngine oscillating state gate synced with useBookmarks
  if (isOscillating !== isOscillatingInit) {
    setIsOscillatingInit(isOscillating);
  }

  // Modular layout tree state and operations
  const {
    layout,
    setLayout,
    customLayout,
    canDelete,
    handleSplitCell,
    handleRemoveCell,
    handleDuplicateCell,
    handleAddCell,
    handleUpdateCell,
    handleResetLayout,
    handleShareLayout,
    handleNudgeCellFlex,
    handleEqualiseCellFlex,
  } = useLayoutState();

  // Shape library, presets, and session history stack
  const {
    activeShape,
    handleSelectPreset,
    handleUpdateActiveShape,
    handleDuplicateShape,
    handleDeleteUserShape,
    handleCreateShape,
    handleCaptureShape,
    historyBack,
    historyForward,
  } = useShapeLibrary({ scene, updateScene, coordinator, getViewportCenter });

  // Filters state management and HUD edit state
  const {
    isFiltersOpen,
    openFilters,
    closeFilters,
    toggleFiltersOpen,
    isFilterEditMode,
    setIsFilterEditMode,
    filterControlParam,
    setFilterControlParam,
    handleUpdateFilterCentreD,
    handleUpdateFilterParams,
    handleEnterFilterEditMode,
    handleCycleFilterMode,
    toggleFilter,
    toggleFilterEditMode,
    updateFilterState,
    addFilterCondition,
    updateFilterCondition,
    removeFilterCondition,
    moveFilterCondition,
    focusCondition,
    allFilters,
    handleSelectFilter,
    handleForkFilter,
    handleDuplicateFilter,
    handleDeleteFilter,
    handleCreateNewFilter,
    handleRenameFilter,
  } = useFilters({ scene, updateScene });

  // Audio mode toggle
  const handleToggleAudioMode = useCallback(() => {
    updateScene((prev) => ({
      ...prev,
      audio: {
        ...prev.audio,
        audioMode: prev.audio.audioMode === 'poetic' ? 'literal' : 'poetic',
      },
    }));
  }, [updateScene]);

  // Radial menu opening handlers
  const handleOpenRadialMenu = useCallback(() => {
    setRadialMenuAnchor(null);
    setIsRadialMenuOpen(true);
  }, []);

  const handleOpenRadialMenuAt = useCallback((pos: { x: number; y: number }) => {
    setRadialMenuAnchor(pos);
    setIsRadialMenuOpen(true);
  }, []);

  // Keyboard shortcut actions
  const keyboardActions = useMemo<KeyboardActions>(
    () => ({
      onTogglePlay: handleTogglePlay,
      onToggleShapeEditor: () => {
        closeFilters();
        setIsShapeEditorOpen((prev) => !prev);
      },
      onToggleQuickSearch: () => setIsQuickSearchOpen((prev) => !prev),
      onToggleBookmarks: () => setIsBookmarksOpen((prev) => !prev),
      onToggleCapture: () => setIsCaptureOpen((prev) => !prev),
      onToggleOscillate: toggleOscillating,
      onToggleFilterEditMode: toggleFilterEditMode,
      onToggleFilter: toggleFilter,
      onToggleFiltersOpen: () => {
        setIsShapeEditorOpen(false);
        setIsBookmarksOpen(false);
        toggleFiltersOpen();
      },
      onToggleFilterQuickSearch: () => setIsFilterQuickSearchOpen((prev) => !prev),
      onNoteOn: () => handleNoteOn(),
      onNoteOff: () => handleNoteOff(),
      onJumpBookmarkA: handleJumpBookmarkA,
      onJumpBookmarkB: handleJumpBookmarkB,
      onSetBookmarkFromCurrent: setBookmarkFromCurrent,
      onStepPrimaryD: handleStepPrimaryD,
      onHistoryBack: historyBack,
      onHistoryForward: historyForward,
    }),
    [
      handleTogglePlay,
      closeFilters,
      toggleOscillating,
      toggleFilterEditMode,
      toggleFilter,
      toggleFiltersOpen,
      handleNoteOn,
      handleNoteOff,
      handleJumpBookmarkA,
      handleJumpBookmarkB,
      setBookmarkFromCurrent,
      handleStepPrimaryD,
      historyBack,
      historyForward,
    ]
  );

  useKeyboardShortcuts({
    isCaptureOpen,
    isQuickSearchOpen,
    isFilterQuickSearchOpen,
    actions: keyboardActions,
  });

  const handlePlayDemo = useTeachingDemo({
    handleSelectPreset,
    setBookmarks,
    handleUpdatePlacementD,
    layout,
    setLayout,
    scene,
    toggleFilter,
    isOscillating,
    toggleOscillating,
    isPlaying,
    handleTogglePlay,
    setIsInfoOpen,
  });

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#0b0d13] text-slate-100 font-sans">
      <ControlToolbar
        scene={scene}
        isPlaying={isPlaying}
        currentLayoutId={layout.id}
        customLayout={customLayout}
        isEditMode={isEditMode}
        isFullscreen={isFullscreen}
        isShapeEditorOpen={isShapeEditorOpen}
        isOscillating={isOscillating}
        onToggleOscillate={toggleOscillating}
        onOpenBookmarks={() => setIsBookmarksOpen(true)}
        bookmarks={bookmarks}
        onSelectLayout={setLayout}
        onTogglePlay={handleTogglePlay}
        onUpdatePlacementD={handleUpdatePlacementD}
        onToggleAudioMode={handleToggleAudioMode}
        onToggleEditMode={() => setIsEditMode((prev) => !prev)}
        onShareLayout={handleShareLayout}
        onToggleFullscreen={toggleFullscreen}
        onToggleSettings={() => setIsSettingsOpen((prev) => !prev)}
        onToggleShapeEditor={() => setIsShapeEditorOpen((prev) => !prev)}
        onToggleFilter={toggleFilter}
        onOpenFilters={openFilters}
        onOpenEnvelopes={envelopes.openEnvelopes}
        onOpenCapture={() => setIsCaptureOpen(true)}
        onOpenInfo={() => setIsInfoOpen(true)}
        onOpenRadialMenu={handleOpenRadialMenu}
        midiState={midiState}
        onOpenMidiModal={openMidiModal}
      />

      {/* Floating Filter Edit HUD Banner (Visible when Filter Edit mode is active) */}
      {isFilterEditMode && (
        <FilterEditHud
          filter={scene.filter}
          spanView={getFocusedSpanView(scene.filter)}
          controlParam={filterControlParam}
          onSelectParam={setFilterControlParam}
          onCycleMode={handleCycleFilterMode}
          onOpenFilters={openFilters}
          onDone={() => setIsFilterEditMode(false)}
        />
      )}

      <SpectrumViewport
        scene={scene}
        coordinator={coordinator}
        layout={layout}
        isEditMode={isEditMode}
        onToggleEditMode={() => setIsEditMode((prev) => !prev)}
        onAddCell={handleAddCell}
        onResetLayout={handleResetLayout}
        onShareLayout={handleShareLayout}
      >
        <div className="relative w-full h-full p-2 sm:p-3">
          <FlexLayoutRenderer
            node={layout.root}
            scene={scene}
            coordinator={coordinator}
            onUpdatePlacementD={handleUpdatePlacementD}
            onUpdateFilterCentreD={handleUpdateFilterCentreD}
            onUpdateFilterParams={handleUpdateFilterParams}
            onUpdateCell={handleUpdateCell}
            isPlaying={isPlaying}
            onTogglePlay={handleTogglePlay}
            onOpenRadialMenuAt={handleOpenRadialMenuAt}
            isEditMode={isEditMode}
            isFilterEditMode={isFilterEditMode}
            filterControlParam={filterControlParam}
            canDelete={canDelete}
            onSplitCell={handleSplitCell}
            onRemoveCell={handleRemoveCell}
            onDuplicateCell={handleDuplicateCell}
            onNudgeCellFlex={handleNudgeCellFlex}
            onEqualiseCellFlex={handleEqualiseCellFlex}
          />
        </div>
      </SpectrumViewport>

      <AppModals
        isCaptureOpen={isCaptureOpen}
        onCloseCapture={() => setIsCaptureOpen(false)}
        onCaptureShape={handleCaptureShape}
        isInfoOpen={isInfoOpen}
        onCloseInfo={() => setIsInfoOpen(false)}
        onPlayDemo={handlePlayDemo}
        isShapeEditorOpen={isShapeEditorOpen}
        onCloseShapeEditor={() => setIsShapeEditorOpen(false)}
        activeShape={activeShape}
        onUpdateActiveShape={handleUpdateActiveShape}
        onSelectShape={handleSelectPreset}
        onDuplicateShape={handleDuplicateShape}
        onDeleteShape={handleDeleteUserShape}
        onCreateShape={handleCreateShape}
        onTriggerNote={handleTriggerNote}
        onNoteOn={handleNoteOn}
        onNoteOff={handleNoteOff}
        isBookmarksOpen={isBookmarksOpen}
        onCloseBookmarks={() => setIsBookmarksOpen(false)}
        bookmarks={bookmarks}
        onUpdateBookmarks={setBookmarks}
        onJumpToD={(targetD) => {
          handleUpdatePlacementD(targetD);
          setIsBookmarksOpen(false);
        }}
        isOscillating={isOscillating}
        onToggleOscillate={toggleOscillating}
        isSettingsOpen={isSettingsOpen}
        onCloseSettings={() => setIsSettingsOpen(false)}
        scene={scene}
        onUpdateScene={updateScene}
        onOpenInfoModal={() => setIsInfoOpen(true)}
        isQuickSearchOpen={isQuickSearchOpen}
        onCloseQuickSearch={() => setIsQuickSearchOpen(false)}
        isFilterQuickSearchOpen={isFilterQuickSearchOpen}
        onCloseFilterQuickSearch={() => setIsFilterQuickSearchOpen(false)}
        allFilters={allFilters}
        onSelectFilter={handleSelectFilter}
        onOpenFilterPanel={() => {
          setIsFilterQuickSearchOpen(false);
          openFilters();
        }}
        isRadialMenuOpen={isRadialMenuOpen}
        onCloseRadialMenu={() => setIsRadialMenuOpen(false)}
        radialMenuAnchor={radialMenuAnchor}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        onUpdatePlacementD={handleUpdatePlacementD}
        onUpdateFilterParams={handleUpdateFilterParams}
        toggleFilter={toggleFilter}
        onCycleFilterMode={handleCycleFilterMode}
        onOpenLibrary={() => setIsShapeEditorOpen(true)}
        onOpenCapture={() => setIsCaptureOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenFilters={openFilters}
        onSetBookmarkA={handleSetBookmarkA}
        onSetBookmarkB={handleSetBookmarkB}
        onJumpBookmarkA={handleJumpBookmarkA}
        onJumpBookmarkB={handleJumpBookmarkB}
        onEnterFilterEditMode={handleEnterFilterEditMode}
        isFiltersOpen={isFiltersOpen}
        onCloseFilters={closeFilters}
        onForkFilter={handleForkFilter}
        onDuplicateFilter={handleDuplicateFilter}
        onDeleteFilter={handleDeleteFilter}
        onCreateNewFilter={handleCreateNewFilter}
        onRenameFilter={handleRenameFilter}
        updateFilterState={updateFilterState}
        addFilterCondition={addFilterCondition}
        updateFilterCondition={updateFilterCondition}
        removeFilterCondition={removeFilterCondition}
        moveFilterCondition={moveFilterCondition}
        focusCondition={focusCondition}
        isMidiModalOpen={isMidiModalOpen}
        onCloseMidiModal={closeMidiModal}
        envelopes={envelopes}
      />
    </div>
  );
};

export default App;
