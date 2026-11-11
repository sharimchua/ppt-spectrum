/**
 * Main application shell.
 * Composes viewport, toolbar, layout renderer, modals, and custom hooks.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { setPrimaryPlacementD, stepPrimaryPlacementD } from '../core/scene-ops';
import { SpectrumViewport } from './SpectrumViewport';
import { ControlToolbar } from './ControlToolbar';
import { FlexLayoutRenderer } from './FlexLayoutRenderer';
import { CaptureModal } from './CaptureModal';
import { InfoModal, STORAGE_KEY_DONT_SHOW_INTRO } from './InfoModal';
import { SettingsDrawer } from './SettingsDrawer';
import { TraySheet } from './TraySheet';
import { MusicalBookmarksModal } from './MusicalBookmarksModal';
import { ShapeQuickSearchModal } from './ShapeQuickSearchModal';
import { FilterQuickSearchModal } from './FilterQuickSearchModal';
import { RadialMenuOverlay } from './RadialMenuOverlay';
import { FilterEditHud } from './FilterEditHud';
import { FiltersSheet } from './filters/FiltersSheet';
import { useSceneEngine } from './hooks/useSceneEngine';
import { useLayoutState } from './hooks/useLayoutState';
import { useTransport } from './hooks/useTransport';
import { useBookmarks } from './hooks/useBookmarks';
import { useShapeLibrary } from './hooks/useShapeLibrary';
import { useFilters } from './hooks/useFilters';
import { useKeyboardShortcuts, KeyboardActions } from './hooks/useKeyboardShortcuts';
import { useFullscreen } from './hooks/useFullscreen';
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

  // Primary placement coordinate updates
  const handleUpdatePlacementD = useCallback(
    (d: number) => {
      updateScene((prev) => setPrimaryPlacementD(prev, d));
    },
    [updateScene]
  );

  const handleStepPrimaryD = useCallback(
    (step: number) => {
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
    handleTogglePlay,
  } = useTransport({ coordinator, audioEngine, sceneRef });

  // Musical bookmarks and continuum sweep oscillation
  const {
    bookmarks,
    setBookmarks,
    isOscillating,
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
        onOpenCapture={() => setIsCaptureOpen(true)}
        onOpenInfo={() => setIsInfoOpen(true)}
        onOpenRadialMenu={handleOpenRadialMenu}
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

      <CaptureModal
        isOpen={isCaptureOpen}
        onClose={() => setIsCaptureOpen(false)}
        onCaptureShape={handleCaptureShape}
        tplHz={scene.anchors.tplFrequencyHz}
      />

      <InfoModal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        onPlayDemo={handleTogglePlay}
      />

      <TraySheet
        isOpen={isShapeEditorOpen}
        onClose={() => setIsShapeEditorOpen(false)}
        activeShape={activeShape}
        onUpdateShape={handleUpdateActiveShape}
        allShapes={scene.shapes}
        onSelectShape={handleSelectPreset}
        onDuplicateShape={handleDuplicateShape}
        onDeleteShape={handleDeleteUserShape}
        onCreateShape={handleCreateShape}
        onTriggerNote={() => handleTriggerNote()}
        onNoteOn={() => handleNoteOn()}
        onNoteOff={() => handleNoteOff()}
      />

      <MusicalBookmarksModal
        isOpen={isBookmarksOpen}
        onClose={() => setIsBookmarksOpen(false)}
        currentD={scene.placements[0]?.d ?? 0}
        bookmarks={bookmarks}
        onUpdateBookmarks={setBookmarks}
        onJumpToD={(targetD) => {
          handleUpdatePlacementD(targetD);
          setIsBookmarksOpen(false);
        }}
        isOscillating={isOscillating}
        onToggleOscillate={toggleOscillating}
        onTriggerNote={() => handleTriggerNote()}
      />

      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        scene={scene}
        onUpdateScene={updateScene}
        onOpenInfoModal={() => setIsInfoOpen(true)}
      />

      <ShapeQuickSearchModal
        isOpen={isQuickSearchOpen}
        onClose={() => setIsQuickSearchOpen(false)}
        shapes={scene.shapes}
        activeShapeId={activeShape?.id}
        onSelectShape={handleSelectPreset}
      />

      <FilterQuickSearchModal
        isOpen={isFilterQuickSearchOpen}
        onClose={() => setIsFilterQuickSearchOpen(false)}
        filters={allFilters}
        activeFilterId={scene.filter.id || scene.filter.presetId}
        onSelectFilter={handleSelectFilter}
        onOpenFilterPanel={() => {
          setIsFilterQuickSearchOpen(false);
          openFilters();
        }}
      />

      <RadialMenuOverlay
        isOpen={isRadialMenuOpen}
        onClose={() => setIsRadialMenuOpen(false)}
        scene={scene}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        onUpdatePlacementD={handleUpdatePlacementD}
        onUpdateFilterParams={handleUpdateFilterParams}
        onToggleFilter={toggleFilter}
        onCycleFilterMode={handleCycleFilterMode}
        onOpenLibrary={() => setIsShapeEditorOpen(true)}
        onOpenCapture={() => setIsCaptureOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenFilters={openFilters}
        isOscillating={isOscillating}
        onToggleOscillate={toggleOscillating}
        bookmarks={bookmarks}
        onSetBookmarkA={handleSetBookmarkA}
        onSetBookmarkB={handleSetBookmarkB}
        onJumpBookmarkA={handleJumpBookmarkA}
        onJumpBookmarkB={handleJumpBookmarkB}
        anchorPos={radialMenuAnchor}
        onEnterFilterEditMode={handleEnterFilterEditMode}
      />

      <FiltersSheet
        isOpen={isFiltersOpen}
        filter={scene.filter}
        allFilters={allFilters}
        onSelectFilter={handleSelectFilter}
        onForkFilter={handleForkFilter}
        onDuplicateFilter={handleDuplicateFilter}
        onDeleteFilter={handleDeleteFilter}
        onCreateNewFilter={handleCreateNewFilter}
        onRenameFilter={handleRenameFilter}
        onClose={closeFilters}
        onToggleEnabled={toggleFilter}
        onUpdateFilter={updateFilterState}
        onAddCondition={addFilterCondition}
        onUpdateCondition={updateFilterCondition}
        onRemoveCondition={removeFilterCondition}
        onMoveCondition={moveFilterCondition}
        onFocusCondition={focusCondition}
      />
    </div>
  );
};

export default App;
