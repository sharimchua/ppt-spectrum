import React from 'react';
import { Scene, Shape, Filter, FilterCondition } from '../core/types';
import { BookmarkSettings } from './bookmarks-storage';
import { CaptureModal } from './CaptureModal';
import { InfoModal } from './InfoModal';
import { TraySheet } from './TraySheet';
import { MusicalBookmarksModal } from './MusicalBookmarksModal';
import { SettingsDrawer } from './SettingsDrawer';
import { ShapeQuickSearchModal } from './ShapeQuickSearchModal';
import { FilterQuickSearchModal } from './FilterQuickSearchModal';
import { EnvelopeQuickSearchModal } from './EnvelopeQuickSearchModal';
import { RadialMenuOverlay } from './RadialMenuOverlay';
import { FiltersSheet } from './filters/FiltersSheet';
import { EnvelopesSheet } from './envelopes/EnvelopesSheet';
import { UseEnvelopesResult } from './hooks/useEnvelopes';
import { LibraryShareModal } from './LibraryShareModal';
import { UseLibraryBundlesResult } from './hooks/useLibraryBundles';
import { MidiPermissionModal } from './MidiPermissionModal';

export interface AppModalsProps {
  // Capture Modal
  isCaptureOpen: boolean;
  onCloseCapture: () => void;
  onCaptureShape: (shape: Shape, dPosition: number) => void;

  // Info / Tutorial Modal
  isInfoOpen: boolean;
  onCloseInfo: () => void;
  onPlayDemo: () => void;

  // Shape Editor Tray
  isShapeEditorOpen: boolean;
  onCloseShapeEditor: () => void;
  activeShape?: Shape;
  onUpdateActiveShape: (shape: Shape) => void;
  onSelectShape: (presetId: string) => void;
  onDuplicateShape: (shape: Shape) => void;
  onDeleteShape: (id: string) => void;
  onCreateShape: (newShape: Shape) => void;
  onTriggerNote: () => void;
  onNoteOn: () => void;
  onNoteOff: () => void;

  // Bookmarks Modal
  isBookmarksOpen: boolean;
  onCloseBookmarks: () => void;
  bookmarks: BookmarkSettings;
  onUpdateBookmarks: React.Dispatch<React.SetStateAction<BookmarkSettings>>;
  onJumpToD: (d: number) => void;
  isOscillating: boolean;
  onToggleOscillate: () => void;

  // Settings Drawer
  isSettingsOpen: boolean;
  onCloseSettings: () => void;
  scene: Scene;
  onUpdateScene: (updater: Scene | ((prev: Scene) => Scene)) => void;
  onOpenInfoModal: () => void;

  // Quick Search Modals
  isQuickSearchOpen: boolean;
  onCloseQuickSearch: () => void;
  onOpenShapeEditor?: () => void;
  isFilterQuickSearchOpen: boolean;
  onCloseFilterQuickSearch: () => void;
  isEnvelopeQuickSearchOpen: boolean;
  onCloseEnvelopeQuickSearch: () => void;
  allFilters: Filter[];
  onSelectFilter: (id: string) => void;
  onOpenFilterPanel: () => void;

  // Radial Menu
  isRadialMenuOpen: boolean;
  onCloseRadialMenu: () => void;
  radialMenuAnchor: { x: number; y: number } | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onUpdatePlacementD: (d: number) => void;
  onUpdateFilterParams: (params: Partial<Scene['filter']>) => void;
  toggleFilter: () => void;
  onCycleFilterMode: () => void;
  onOpenLibrary: () => void;
  onOpenCapture: () => void;
  onOpenSettings: () => void;
  onOpenFilters: () => void;
  onSetBookmarkA: () => void;
  onSetBookmarkB: () => void;
  onJumpBookmarkA: () => void;
  onJumpBookmarkB: () => void;
  onEnterFilterEditMode: () => void;

  // Filters Sheet
  isFiltersOpen: boolean;
  onCloseFilters: () => void;
  onForkFilter: () => void;
  onDuplicateFilter: () => void;
  onDeleteFilter: (id: string) => void;
  onCreateNewFilter: () => void;
  onRenameFilter: (name: string) => void;
  updateFilterState: (patch: Partial<Omit<Filter, 'conditions'>>) => void;
  addFilterCondition: (cond: FilterCondition) => void;
  updateFilterCondition: (id: string, cond: FilterCondition) => void;
  removeFilterCondition: (id: string) => void;
  moveFilterCondition: (id: string, direction: 'up' | 'down') => void;
  focusCondition: (id: string) => void;

  // MIDI Modal
  isMidiModalOpen: boolean;
  onCloseMidiModal: () => void;

  // Envelopes Sheet
  envelopes: UseEnvelopesResult;

  // Library Bundles Modal
  bundlesApi: UseLibraryBundlesResult;
}

export const AppModals: React.FC<AppModalsProps> = ({
  isCaptureOpen,
  onCloseCapture,
  onCaptureShape,
  isInfoOpen,
  onCloseInfo,
  onPlayDemo,
  isShapeEditorOpen,
  onCloseShapeEditor,
  activeShape,
  onUpdateActiveShape,
  onSelectShape,
  onDuplicateShape,
  onDeleteShape,
  onCreateShape,
  onTriggerNote,
  onNoteOn,
  onNoteOff,
  isBookmarksOpen,
  onCloseBookmarks,
  bookmarks,
  onUpdateBookmarks,
  onJumpToD,
  isOscillating,
  onToggleOscillate,
  isSettingsOpen,
  onCloseSettings,
  scene,
  onUpdateScene,
  onOpenInfoModal,
  isQuickSearchOpen,
  onCloseQuickSearch,
  onOpenShapeEditor,
  isFilterQuickSearchOpen,
  onCloseFilterQuickSearch,
  isEnvelopeQuickSearchOpen,
  onCloseEnvelopeQuickSearch,
  allFilters,
  onSelectFilter,
  onOpenFilterPanel,
  isRadialMenuOpen,
  onCloseRadialMenu,
  radialMenuAnchor,
  isPlaying,
  onTogglePlay,
  onUpdatePlacementD,
  onUpdateFilterParams,
  toggleFilter,
  onCycleFilterMode,
  onOpenLibrary,
  onOpenCapture,
  onOpenSettings,
  onOpenFilters,
  onSetBookmarkA,
  onSetBookmarkB,
  onJumpBookmarkA,
  onJumpBookmarkB,
  onEnterFilterEditMode,
  isFiltersOpen,
  onCloseFilters,
  onForkFilter,
  onDuplicateFilter,
  onDeleteFilter,
  onCreateNewFilter,
  onRenameFilter,
  updateFilterState,
  addFilterCondition,
  updateFilterCondition,
  removeFilterCondition,
  moveFilterCondition,
  focusCondition,
  isMidiModalOpen,
  onCloseMidiModal,
  envelopes,
  bundlesApi,
}) => {
  return (
    <>
      <CaptureModal
        isOpen={isCaptureOpen}
        onClose={onCloseCapture}
        onCaptureShape={onCaptureShape}
        tplHz={scene.anchors.tplFrequencyHz}
      />

      <InfoModal
        isOpen={isInfoOpen}
        onClose={onCloseInfo}
        onPlayDemo={onPlayDemo}
      />

      <TraySheet
        isOpen={isShapeEditorOpen}
        onClose={onCloseShapeEditor}
        activeShape={activeShape}
        onUpdateShape={onUpdateActiveShape}
        allShapes={scene.shapes}
        onSelectShape={onSelectShape}
        onDuplicateShape={onDuplicateShape}
        onDeleteShape={onDeleteShape}
        onCreateShape={onCreateShape}
        onTriggerNote={onTriggerNote}
        onNoteOn={onNoteOn}
        onNoteOff={onNoteOff}
      />

      <MusicalBookmarksModal
        isOpen={isBookmarksOpen}
        onClose={onCloseBookmarks}
        currentD={scene.placements[0]?.d ?? 0}
        bookmarks={bookmarks}
        onUpdateBookmarks={onUpdateBookmarks}
        onJumpToD={onJumpToD}
        isOscillating={isOscillating}
        onToggleOscillate={onToggleOscillate}
        onTriggerNote={onTriggerNote}
      />

      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={onCloseSettings}
        scene={scene}
        onUpdateScene={onUpdateScene}
        onOpenInfoModal={onOpenInfoModal}
      />

      <ShapeQuickSearchModal
        isOpen={isQuickSearchOpen}
        onClose={onCloseQuickSearch}
        shapes={scene.shapes}
        activeShapeId={activeShape?.id}
        onSelectShape={onSelectShape}
        onOpenShapeEditor={onOpenShapeEditor}
      />

      <FilterQuickSearchModal
        isOpen={isFilterQuickSearchOpen}
        onClose={onCloseFilterQuickSearch}
        filters={allFilters}
        activeFilterId={scene.filter.id || scene.filter.presetId}
        onSelectFilter={onSelectFilter}
        onOpenFilterPanel={onOpenFilterPanel}
      />

      <EnvelopeQuickSearchModal
        isOpen={isEnvelopeQuickSearchOpen}
        onClose={onCloseEnvelopeQuickSearch}
        envelopes={envelopes.allEnvelopes}
        activeEnvelopeId={envelopes.activeEnvelope.id}
        onSelectEnvelope={envelopes.handleSelectEnvelope}
        onOpenEnvelopeStudio={envelopes.openEnvelopes}
      />

      <RadialMenuOverlay
        isOpen={isRadialMenuOpen}
        onClose={onCloseRadialMenu}
        scene={scene}
        isPlaying={isPlaying}
        onTogglePlay={onTogglePlay}
        onUpdatePlacementD={onUpdatePlacementD}
        onUpdateFilterParams={onUpdateFilterParams}
        onToggleFilter={toggleFilter}
        onCycleFilterMode={onCycleFilterMode}
        onOpenLibrary={onOpenLibrary}
        onOpenBundles={bundlesApi.openBundleModal}
        onOpenCapture={onOpenCapture}
        onOpenSettings={onOpenSettings}
        onOpenFilters={onOpenFilters}
        onOpenEnvelopes={envelopes.openEnvelopes}
        onToggleEnvelope={envelopes.handleToggleEnvelopeEnabled}
        isOscillating={isOscillating}
        onToggleOscillate={onToggleOscillate}
        bookmarks={bookmarks}
        onSetBookmarkA={onSetBookmarkA}
        onSetBookmarkB={onSetBookmarkB}
        onJumpBookmarkA={onJumpBookmarkA}
        onJumpBookmarkB={onJumpBookmarkB}
        anchorPos={radialMenuAnchor}
        onEnterFilterEditMode={onEnterFilterEditMode}
      />

      <FiltersSheet
        isOpen={isFiltersOpen}
        filter={scene.filter}
        allFilters={allFilters}
        onSelectFilter={onSelectFilter}
        onForkFilter={onForkFilter}
        onDuplicateFilter={onDuplicateFilter}
        onDeleteFilter={onDeleteFilter}
        onCreateNewFilter={onCreateNewFilter}
        onRenameFilter={onRenameFilter}
        onClose={onCloseFilters}
        onToggleEnabled={toggleFilter}
        onUpdateFilter={updateFilterState}
        onAddCondition={addFilterCondition}
        onUpdateCondition={updateFilterCondition}
        onRemoveCondition={removeFilterCondition}
        onMoveCondition={moveFilterCondition}
        onFocusCondition={focusCondition}
        onEnterFilterEditMode={onEnterFilterEditMode}
      />

      <MidiPermissionModal
        isOpen={isMidiModalOpen}
        onClose={onCloseMidiModal}
      />

      <EnvelopesSheet
        isOpen={envelopes.isEnvelopesOpen}
        envelope={envelopes.activeEnvelope}
        allEnvelopes={envelopes.allEnvelopes}
        onClose={envelopes.closeEnvelopes}
        onSelectEnvelope={envelopes.handleSelectEnvelope}
        onToggleEnabled={envelopes.handleToggleEnvelopeEnabled}
        onUpdateEnvelope={envelopes.handleUpdateEnvelope}
        onForkEnvelope={envelopes.handleForkEnvelope}
        onDuplicateEnvelope={envelopes.handleDuplicateEnvelope}
        onCreateNewEnvelope={envelopes.handleCreateNewEnvelope}
        onRenameEnvelope={envelopes.handleRenameEnvelope}
        onDeleteEnvelope={envelopes.handleDeleteEnvelope}
        onTriggerNote={onTriggerNote}
        onNoteOn={onNoteOn}
        onNoteOff={onNoteOff}
      />

      <LibraryShareModal bundlesApi={bundlesApi} />
    </>
  );
};
