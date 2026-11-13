/**
 * Dedicated Envelopes state management hook.
 * Manages Envelopes sheet visibility, Pitch/Rhythm envelope parameters, and Envelope Library CRUD.
 */

import { useState, useCallback, useMemo } from 'react';
import { Scene, Envelope } from '../../core/types';
import { PRESET_ENVELOPES } from '../../core/envelope-presets';
import {
  setPrimaryEnvelope,
  toggleEnvelopeEnabled,
  updateActiveEnvelope,
  forkEnvelope,
  duplicateEnvelope,
  createUserEnvelope,
  renameActiveEnvelope,
  deleteUserEnvelope,
} from '../../core/scene-ops';

export interface UseEnvelopesOptions {
  scene: Scene;
  updateScene: (updater: Scene | ((prev: Scene) => Scene)) => void;
}

export interface UseEnvelopesResult {
  isEnvelopesOpen: boolean;
  openEnvelopes: () => void;
  closeEnvelopes: () => void;
  toggleEnvelopesOpen: () => void;
  activeEnvelope: Envelope;
  allEnvelopes: Envelope[];
  handleSelectEnvelope: (envelopeId: string) => void;
  handleToggleEnvelopeEnabled: () => void;
  handleUpdateEnvelope: (
    patch: Partial<Omit<Envelope, 'adsr'>> & { adsr?: Partial<Envelope['adsr']> }
  ) => void;
  handleForkEnvelope: () => void;
  handleDuplicateEnvelope: () => void;
  handleCreateNewEnvelope: () => void;
  handleRenameEnvelope: (name: string) => void;
  handleDeleteEnvelope: (envelopeId: string) => void;
}

export function useEnvelopes({ scene, updateScene }: UseEnvelopesOptions): UseEnvelopesResult {
  const [isEnvelopesOpen, setIsEnvelopesOpen] = useState<boolean>(false);

  const openEnvelopes = useCallback(() => setIsEnvelopesOpen(true), []);
  const closeEnvelopes = useCallback(() => setIsEnvelopesOpen(false), []);
  const toggleEnvelopesOpen = useCallback(() => setIsEnvelopesOpen((prev) => !prev), []);

  const allEnvelopes = useMemo(
    () => (scene.envelopes && scene.envelopes.length > 0 ? scene.envelopes : PRESET_ENVELOPES),
    [scene.envelopes]
  );

  const activeEnvelope = useMemo(
    () => scene.envelope || allEnvelopes[0] || PRESET_ENVELOPES[0],
    [scene.envelope, allEnvelopes]
  );

  const handleSelectEnvelope = useCallback(
    (envelopeId: string) => {
      updateScene((prev) => setPrimaryEnvelope(prev, envelopeId));
    },
    [updateScene]
  );

  const handleToggleEnvelopeEnabled = useCallback(() => {
    updateScene((prev) => toggleEnvelopeEnabled(prev));
  }, [updateScene]);

  const handleUpdateEnvelope = useCallback(
    (patch: Partial<Omit<Envelope, 'adsr'>> & { adsr?: Partial<Envelope['adsr']> }) => {
      updateScene((prev) => updateActiveEnvelope(prev, patch));
    },
    [updateScene]
  );

  const handleForkEnvelope = useCallback(() => {
    updateScene((prev) => forkEnvelope(prev, prev.envelope || PRESET_ENVELOPES[0]));
  }, [updateScene]);

  const handleDuplicateEnvelope = useCallback(() => {
    updateScene((prev) => duplicateEnvelope(prev, prev.envelope || PRESET_ENVELOPES[0]));
  }, [updateScene]);

  const handleCreateNewEnvelope = useCallback(() => {
    updateScene((prev) => createUserEnvelope(prev));
  }, [updateScene]);

  const handleRenameEnvelope = useCallback(
    (name: string) => {
      updateScene((prev) => renameActiveEnvelope(prev, name));
    },
    [updateScene]
  );

  const handleDeleteEnvelope = useCallback(
    (envelopeId: string) => {
      updateScene((prev) => deleteUserEnvelope(prev, envelopeId));
    },
    [updateScene]
  );

  return {
    isEnvelopesOpen,
    openEnvelopes,
    closeEnvelopes,
    toggleEnvelopesOpen,
    activeEnvelope,
    allEnvelopes,
    handleSelectEnvelope,
    handleToggleEnvelopeEnabled,
    handleUpdateEnvelope,
    handleForkEnvelope,
    handleDuplicateEnvelope,
    handleCreateNewEnvelope,
    handleRenameEnvelope,
    handleDeleteEnvelope,
  };
}
