/**
 * Web MIDI connection, permission, and input event manager.
 * Mirrors the ppt-visualiser MIDI permission and focus-safety lifecycle.
 */

export type MidiPermissionStatus = 'prompt' | 'granted' | 'denied' | 'unsupported';

export interface MidiInputDeviceInfo {
  id: string;
  name: string;
  manufacturer?: string;
  connection?: string;
}

export interface MidiDeviceState {
  inputs: MidiInputDeviceInfo[];
  selectedInputId: string;
  isConnected: boolean;
  permissionStatus: MidiPermissionStatus;
  lastError?: string | null;
}

export type NoteOnCallback = (midi: number, velocity: number) => void;
export type NoteOffCallback = (midi: number) => void;
export type SustainCallback = (isDown: boolean) => void;

interface MidiPermissionDescriptor {
  name: PermissionName;
  sysex?: boolean;
}

export class MidiManager {
  private midiAccess: MIDIAccess | null = null;
  private noteOnCallbacks: Set<NoteOnCallback> = new Set();
  private noteOffCallbacks: Set<NoteOffCallback> = new Set();
  private sustainCallbacks: Set<SustainCallback> = new Set();
  private stateChangeCallbacks: Set<(state: MidiDeviceState) => void> = new Set();

  private focusModeEnabled: boolean = true;
  private heldMidiNotes: Set<number> = new Set();
  private sustainPedalDown: boolean = false;
  private mockFocusedState: boolean | null = null;
  private mockPermissionStatus: MidiPermissionStatus | null = null;

  public state: MidiDeviceState = {
    inputs: [],
    selectedInputId: 'all',
    isConnected: false,
    permissionStatus: 'prompt',
    lastError: null,
  };

  private boundMessageHandler = (event: Event) => {
    this.handleMidiMessage(event as MIDIMessageEvent);
  };

  private handleFocusChange = () => {
    const focused = this.isWindowFocused();
    if (!focused && this.focusModeEnabled) {
      this.releaseAllHeldNotes();
    }
  };

  constructor() {
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('focus', this.handleFocusChange);
      window.addEventListener('blur', this.handleFocusChange);
    }
    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      document.addEventListener('visibilitychange', this.handleFocusChange);
    }

    // Initialise permission state and connect silently only if already granted
    void this.initialisePermissionState();
  }

  public async checkPermissionStatus(): Promise<MidiPermissionStatus> {
    if (this.mockPermissionStatus !== null) {
      return this.mockPermissionStatus;
    }

    if (typeof navigator === 'undefined' || !navigator.requestMIDIAccess) {
      return 'unsupported';
    }

    if (!navigator.permissions || !navigator.permissions.query) {
      return 'prompt';
    }

    try {
      const descriptor: MidiPermissionDescriptor = {
        name: 'midi' as PermissionName,
        sysex: false,
      };
      const status = await navigator.permissions.query(descriptor);
      const state = (status.state as MidiPermissionStatus) || 'prompt';

      status.onchange = () => {
        const nextState = (status.state as MidiPermissionStatus) || 'prompt';
        this.setPermissionStatus(nextState);
        if (nextState === 'granted' && !this.midiAccess) {
          void this.requestAccess();
        }
      };

      return state;
    } catch {
      return 'prompt';
    }
  }

  public async initialisePermissionState(): Promise<void> {
    const status = await this.checkPermissionStatus();
    this.state.permissionStatus = status;
    this.notifyState();

    if (status === 'granted') {
      await this.requestAccess();
    }
  }

  public setPermissionStatusForTesting(status: MidiPermissionStatus | null): void {
    this.mockPermissionStatus = status;
    if (status !== null) {
      this.state.permissionStatus = status;
      this.notifyState();
    }
  }

  public setPermissionStatus(status: MidiPermissionStatus): void {
    this.state.permissionStatus = status;
    this.notifyState();
  }

  public isWindowFocused(): boolean {
    if (this.mockFocusedState !== null) return this.mockFocusedState;
    if (typeof document === 'undefined') return true;
    return document.hasFocus() && !document.hidden;
  }

  public setFocusMode(enabled: boolean): void {
    this.focusModeEnabled = enabled;
  }

  public getFocusMode(): boolean {
    return this.focusModeEnabled;
  }

  public setFocusedForTesting(focused: boolean | null): void {
    this.mockFocusedState = focused;
    if (focused === false && this.focusModeEnabled) {
      this.releaseAllHeldNotes();
    }
  }

  public releaseAllHeldNotes(): void {
    if (this.sustainPedalDown) {
      this.triggerSustain(false);
    }
    for (const note of Array.from(this.heldMidiNotes)) {
      this.triggerNoteOff(note);
    }
    this.heldMidiNotes.clear();
  }

  public async requestAccess(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.requestMIDIAccess) {
      this.state.isConnected = false;
      this.state.permissionStatus = 'unsupported';
      this.state.lastError = 'Web MIDI API is not supported in this browser or context (requires HTTPS or localhost).';
      this.notifyState();
      return false;
    }

    try {
      this.midiAccess = await navigator.requestMIDIAccess({ sysex: false });
      this.state.permissionStatus = 'granted';
      this.state.lastError = null;
      this.updateInputs();

      this.midiAccess.onstatechange = () => {
        this.updateInputs();
      };

      return true;
    } catch (err) {
      this.state.isConnected = false;
      this.state.permissionStatus = 'denied';
      this.state.lastError = err instanceof Error ? err.message : 'MIDI permission was denied by the browser.';
      this.notifyState();
      return false;
    }
  }

  private updateInputs(): void {
    if (!this.midiAccess) return;

    const inputList: MidiInputDeviceInfo[] = [];

    if (!this.state.selectedInputId) {
      this.state.selectedInputId = 'all';
    }

    for (const input of this.midiAccess.inputs.values()) {
      inputList.push({
        id: input.id,
        name: input.name || `MIDI Port ${input.id}`,
        manufacturer: input.manufacturer || undefined,
        connection: input.connection,
      });

      if (this.state.selectedInputId === 'all' || this.state.selectedInputId === input.id) {
        this.bindInput(input);
      } else {
        input.onmidimessage = null;
      }
    }

    this.state.inputs = inputList;
    this.state.isConnected = inputList.length > 0;
    this.notifyState();
  }

  private bindInput(input: MIDIInput): void {
    if (input.onmidimessage !== this.boundMessageHandler) {
      input.onmidimessage = this.boundMessageHandler;
    }
    if (typeof input.open === 'function' && input.connection !== 'open') {
      void input.open().then(
        () => {
          const item = this.state.inputs.find((i) => i.id === input.id);
          if (item && item.connection !== input.connection) {
            item.connection = input.connection;
            this.notifyState();
          }
        },
        (err: unknown) => {
          this.state.lastError =
            err instanceof Error
              ? err.message
              : `Could not open MIDI port "${input.name || input.id}" (it may be in use by another app or browser).`;
          this.notifyState();
        }
      );
    }
  }

  public selectInput(id: string): void {
    this.state.selectedInputId = id;
    if (this.midiAccess) {
      this.updateInputs();
    } else {
      this.notifyState();
    }
  }

  private handleMidiMessage(event: MIDIMessageEvent): void {
    if (this.focusModeEnabled && !this.isWindowFocused()) {
      return;
    }

    const data = event.data;
    if (!data || data.length < 2) return;

    const status = data[0] & 0xf0;
    const note = data[1];
    const velocity = data.length > 2 ? data[2] / 127 : 0.8;

    if (status === 0x90 && velocity > 0) {
      this.triggerNoteOn(note, velocity);
    } else if (status === 0x80 || (status === 0x90 && velocity === 0)) {
      this.triggerNoteOff(note);
    } else if (status === 0xb0 && note === 64 && data.length > 2) {
      // MIDI CC 64: Damper / Sustain Pedal (>= 64 down, < 64 up)
      this.triggerSustain(data[2] >= 64);
    }
  }

  public triggerSustain(isDown: boolean): void {
    if (this.focusModeEnabled && !this.isWindowFocused() && isDown) {
      return;
    }
    if (this.sustainPedalDown === isDown) return;
    this.sustainPedalDown = isDown;
    for (const cb of this.sustainCallbacks) {
      cb(isDown);
    }
  }

  public triggerNoteOn(midi: number, velocity: number = 0.8): void {
    if (this.focusModeEnabled && !this.isWindowFocused()) {
      return;
    }
    this.heldMidiNotes.add(midi);
    for (const cb of this.noteOnCallbacks) {
      cb(midi, velocity);
    }
  }

  public triggerNoteOff(midi: number): void {
    this.heldMidiNotes.delete(midi);
    for (const cb of this.noteOffCallbacks) {
      cb(midi);
    }
  }

  public onNoteOn(cb: NoteOnCallback): () => void {
    this.noteOnCallbacks.add(cb);
    return () => this.noteOnCallbacks.delete(cb);
  }

  public onNoteOff(cb: NoteOffCallback): () => void {
    this.noteOffCallbacks.add(cb);
    return () => this.noteOffCallbacks.delete(cb);
  }

  public onSustainChange(cb: SustainCallback): () => void {
    this.sustainCallbacks.add(cb);
    return () => this.sustainCallbacks.delete(cb);
  }

  public onStateChange(cb: (state: MidiDeviceState) => void): () => void {
    this.stateChangeCallbacks.add(cb);
    cb({ ...this.state, inputs: [...this.state.inputs] });
    return () => this.stateChangeCallbacks.delete(cb);
  }

  private notifyState(): void {
    const snapshot: MidiDeviceState = {
      ...this.state,
      inputs: [...this.state.inputs],
    };
    for (const cb of this.stateChangeCallbacks) {
      cb(snapshot);
    }
  }

  public destroy(): void {
    if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
      window.removeEventListener('focus', this.handleFocusChange);
      window.removeEventListener('blur', this.handleFocusChange);
    }
    if (typeof document !== 'undefined' && typeof document.removeEventListener === 'function') {
      document.removeEventListener('visibilitychange', this.handleFocusChange);
    }
    this.releaseAllHeldNotes();
    this.noteOnCallbacks.clear();
    this.noteOffCallbacks.clear();
    this.sustainCallbacks.clear();
    this.stateChangeCallbacks.clear();
  }
}

export const midiManagerInstance = new MidiManager();
