"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type GameMusicMode = "normal" | "high";
export type GameAudioCue =
  | "greenJump"
  | "redJump"
  | "rugJump"
  | "honeyPlatform"
  | "solanaPlatform"
  | "cashPrinterPlatform"
  | "redPill"
  | "onFire"
  | "jetpack"
  | "honey"
  | "mumu"
  | "loseGame";

const audioMutedStorageKey = "bobros-game-audio-muted";
const musicVolume = 0.16;
const effectVolumes: Record<GameAudioCue, number> = {
  greenJump: 0.39,
  redJump: 0.38,
  rugJump: 0.4,
  honeyPlatform: 0.39,
  solanaPlatform: 0.4,
  cashPrinterPlatform: 0.42,
  redPill: 0.42,
  onFire: 0.44,
  jetpack: 0.44,
  honey: 0.4,
  mumu: 0.42,
  loseGame: 0.42,
};

const musicSources: Record<GameMusicMode, string> = {
  normal: "/game/sounds/dumb-theme.mp3",
  high: "/game/sounds/high-level-theme.mp3",
};

const effectSources: Record<Exclude<GameAudioCue, "rugJump">, string> = {
  greenJump: "/game/sounds/green-platform-jump.wav",
  redJump: "/game/sounds/red-platform-jump.wav",
  honeyPlatform: "/game/sounds/honey-platform.mp3",
  solanaPlatform: "/game/sounds/solana-platform.mp3",
  cashPrinterPlatform: "/game/sounds/cash-printer-platform.mp3",
  redPill: "/game/sounds/red-pill-sound.mp3",
  onFire: "/game/sounds/onfire-sound.mp3",
  jetpack: "/game/sounds/jetpack-sound.mp3",
  honey: "/game/sounds/honey-sound.mp3",
  mumu: "/game/sounds/mumu-sound.mp3",
  loseGame: "/game/sounds/lose-game.mp3",
};

const rugSources = [
  "/game/sounds/rug-platform-jump.mp3",
  "/game/sounds/rug-platform-jump-2.mp3",
  "/game/sounds/rug-platform-jump-3.mp3",
] as const;

function safePause(audio: HTMLAudioElement | undefined | null, reset = false) {
  if (!audio) return;

  audio.pause();
  if (reset) {
    audio.currentTime = 0;
  }
}

export function useGameAudio() {
  const [muted, setMutedState] = useState(false);
  const mutedRef = useRef(false);
  const desiredMusicPlayingRef = useRef(false);
  const currentMusicModeRef = useRef<GameMusicMode>("normal");
  const currentMusicRef = useRef<HTMLAudioElement | null>(null);
  const musicRefs = useRef<Partial<Record<GameMusicMode, HTMLAudioElement>>>({});
  const effectRefs = useRef<Partial<Record<Exclude<GameAudioCue, "rugJump">, HTMLAudioElement>>>({});
  const rugRefs = useRef<HTMLAudioElement[]>([]);
  const lastEffectPlayedAtRef = useRef<Partial<Record<GameAudioCue, number>>>({});
  const lastRugIndexRef = useRef(-1);

  const setMuted = useCallback((nextMuted: boolean) => {
    mutedRef.current = nextMuted;
    setMutedState(nextMuted);

    try {
      window.localStorage.setItem(audioMutedStorageKey, nextMuted ? "true" : "false");
    } catch {
      // Local storage can be unavailable in private contexts. Audio still works.
    }

    if (nextMuted) {
      safePause(currentMusicRef.current, true);
      for (const audio of Object.values(effectRefs.current)) {
        safePause(audio, true);
      }
      for (const audio of rugRefs.current) {
        safePause(audio, true);
      }
      return;
    }

    if (desiredMusicPlayingRef.current) {
      const audio = musicRefs.current[currentMusicModeRef.current];
      if (audio) {
        audio.volume = musicVolume;
        void audio.play().catch(() => undefined);
        currentMusicRef.current = audio;
      }
    }
  }, []);

  useEffect(() => {
    let storedMuted = false;

    try {
      storedMuted = window.localStorage.getItem(audioMutedStorageKey) === "true";
    } catch {
      storedMuted = false;
    }

    mutedRef.current = storedMuted;
    setMutedState(storedMuted);

    for (const [mode, src] of Object.entries(musicSources) as Array<[GameMusicMode, string]>) {
      const audio = new Audio(src);
      audio.loop = true;
      audio.preload = "auto";
      audio.volume = musicVolume;
      musicRefs.current[mode] = audio;
    }

    for (const [cue, src] of Object.entries(effectSources) as Array<[Exclude<GameAudioCue, "rugJump">, string]>) {
      const audio = new Audio(src);
      audio.preload = "auto";
      audio.volume = effectVolumes[cue];
      effectRefs.current[cue] = audio;
    }

    rugRefs.current = rugSources.map((src) => {
      const audio = new Audio(src);
      audio.preload = "auto";
      audio.volume = effectVolumes.rugJump;
      return audio;
    });

    return () => {
      for (const audio of Object.values(musicRefs.current)) {
        safePause(audio, true);
      }
      for (const audio of Object.values(effectRefs.current)) {
        safePause(audio, true);
      }
      for (const audio of rugRefs.current) {
        safePause(audio, true);
      }
    };
  }, []);

  const startMusic = useCallback((mode: GameMusicMode = "normal") => {
    desiredMusicPlayingRef.current = true;
    currentMusicModeRef.current = mode;

    if (mutedRef.current) return;

    const nextTrack = musicRefs.current[mode];
    if (!nextTrack) return;

    if (currentMusicRef.current && currentMusicRef.current !== nextTrack) {
      safePause(currentMusicRef.current, true);
    }

    nextTrack.loop = true;
    nextTrack.volume = musicVolume;
    currentMusicRef.current = nextTrack;
    if (!nextTrack.paused) return;

    void nextTrack.play().catch(() => undefined);
  }, []);

  const switchToHighLevelMusic = useCallback(() => {
    startMusic("high");
  }, [startMusic]);

  const pauseMusic = useCallback(() => {
    safePause(currentMusicRef.current);
  }, []);

  const resumeMusic = useCallback(() => {
    if (!desiredMusicPlayingRef.current || mutedRef.current) return;

    startMusic(currentMusicModeRef.current);
  }, [startMusic]);

  const stopMusic = useCallback(() => {
    desiredMusicPlayingRef.current = false;
    for (const audio of Object.values(musicRefs.current)) {
      safePause(audio, true);
    }
    currentMusicRef.current = null;
  }, []);

  const playCue = useCallback((cue: GameAudioCue) => {
    if (mutedRef.current) return;

    const now = Date.now();
    const minGap = cue === "mumu" ? 520 : cue === "loseGame" ? 1000 : 72;
    const lastPlayedAt = lastEffectPlayedAtRef.current[cue] ?? 0;
    if (now - lastPlayedAt < minGap) return;

    const audio =
      cue === "rugJump"
        ? (() => {
            if (rugRefs.current.length === 0) return undefined;
            let nextIndex = Math.floor(Math.random() * rugRefs.current.length);
            if (rugRefs.current.length > 1 && nextIndex === lastRugIndexRef.current) {
              nextIndex = (nextIndex + 1) % rugRefs.current.length;
            }
            lastRugIndexRef.current = nextIndex;
            return rugRefs.current[nextIndex];
          })()
        : effectRefs.current[cue];

    if (!audio) return;

    lastEffectPlayedAtRef.current[cue] = now;
    audio.volume = effectVolumes[cue];
    audio.currentTime = 0;
    void audio.play().catch(() => undefined);
  }, []);

  const toggleMuted = useCallback(() => {
    setMuted(!mutedRef.current);
  }, [setMuted]);

  const playGreenJump = useCallback(() => playCue("greenJump"), [playCue]);
  const playRedJump = useCallback(() => playCue("redJump"), [playCue]);
  const playRugJump = useCallback(() => playCue("rugJump"), [playCue]);
  const playHoneyPlatform = useCallback(() => playCue("honeyPlatform"), [playCue]);
  const playSolanaPlatform = useCallback(() => playCue("solanaPlatform"), [playCue]);
  const playCashPrinterPlatform = useCallback(() => playCue("cashPrinterPlatform"), [playCue]);
  const playRedPill = useCallback(() => playCue("redPill"), [playCue]);
  const playOnFire = useCallback(() => playCue("onFire"), [playCue]);
  const playJetpack = useCallback(() => playCue("jetpack"), [playCue]);
  const playHoney = useCallback(() => playCue("honey"), [playCue]);
  const playMumu = useCallback(() => playCue("mumu"), [playCue]);
  const playLoseGame = useCallback(() => playCue("loseGame"), [playCue]);

  return {
    muted,
    setMuted,
    toggleMuted,
    startMusic,
    switchToHighLevelMusic,
    pauseMusic,
    resumeMusic,
    stopMusic,
    playGreenJump,
    playRedJump,
    playRugJump,
    playHoneyPlatform,
    playSolanaPlatform,
    playCashPrinterPlatform,
    playRedPill,
    playOnFire,
    playJetpack,
    playHoney,
    playMumu,
    playLoseGame,
  };
}
