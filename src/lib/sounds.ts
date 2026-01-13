'use client';

// WoW-style UI sound system
// Sounds are short, subtle, and fantasy-themed

export const UISounds = {
  panelOpen: '/sounds/panel-open.mp3',
  panelClose: '/sounds/panel-close.mp3',
  buttonClick: '/sounds/button-click.mp3',
  buttonHover: '/sounds/button-hover.mp3',
  questAccept: '/sounds/quest-accept.mp3',
  questComplete: '/sounds/quest-complete.mp3',
  itemPickup: '/sounds/item-pickup.mp3',
  error: '/sounds/error.mp3',
} as const;

export type SoundName = keyof typeof UISounds;

// Audio cache to prevent reloading
const audioCache: Map<string, HTMLAudioElement> = new Map();

// Global state
let soundEnabled = true;
let soundVolume = 0.3;

// Load and cache audio
function getAudio(sound: SoundName): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null;

  const path = UISounds[sound];

  if (!audioCache.has(path)) {
    const audio = new Audio(path);
    audio.preload = 'auto';
    audioCache.set(path, audio);
  }

  return audioCache.get(path) || null;
}

// Preload all sounds
export function preloadSounds(): void {
  if (typeof window === 'undefined') return;

  Object.keys(UISounds).forEach((sound) => {
    getAudio(sound as SoundName);
  });
}

// Play a sound effect
export function playSound(sound: SoundName, volumeOverride?: number): void {
  if (!soundEnabled) return;

  const audio = getAudio(sound);
  if (!audio) return;

  // Clone for overlapping sounds
  const clone = audio.cloneNode() as HTMLAudioElement;
  clone.volume = volumeOverride ?? soundVolume;

  clone.play().catch(() => {
    // Silently handle autoplay restrictions
  });
}

// Toggle sound on/off
export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled;

  // Persist to localStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem('wow-ui-sound-enabled', String(enabled));
  }
}

// Get current sound state
export function isSoundEnabled(): boolean {
  return soundEnabled;
}

// Set volume (0-1)
export function setSoundVolume(volume: number): void {
  soundVolume = Math.max(0, Math.min(1, volume));

  // Persist to localStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem('wow-ui-sound-volume', String(soundVolume));
  }
}

// Get current volume
export function getSoundVolume(): number {
  return soundVolume;
}

// Initialize from localStorage
export function initSoundSettings(): void {
  if (typeof window === 'undefined') return;

  const storedEnabled = localStorage.getItem('wow-ui-sound-enabled');
  const storedVolume = localStorage.getItem('wow-ui-sound-volume');

  if (storedEnabled !== null) {
    soundEnabled = storedEnabled === 'true';
  }

  if (storedVolume !== null) {
    soundVolume = parseFloat(storedVolume) || 0.3;
  }
}

// React hook helper - call this in a useEffect
export function useSoundInit(): void {
  if (typeof window !== 'undefined') {
    initSoundSettings();
    preloadSounds();
  }
}
