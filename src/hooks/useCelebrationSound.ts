import { useCallback, useRef } from "react";

export function useCelebrationSound() {
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  // Play a cheerful ascending arpeggio
  const playSuccessSound = useCallback(() => {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Success chord frequencies (C major arpeggio with extensions)
    const frequencies = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];
    
    frequencies.forEach((freq, i) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(freq, now + i * 0.08);
      
      gainNode.gain.setValueAtTime(0, now + i * 0.08);
      gainNode.gain.linearRampToValueAtTime(0.15, now + i * 0.08 + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.5);
      
      oscillator.start(now + i * 0.08);
      oscillator.stop(now + i * 0.08 + 0.6);
    });

    // Add a sparkle effect
    setTimeout(() => {
      playSparkle();
    }, 600);
  }, [getAudioContext]);

  // Play sparkle/twinkle sounds
  const playSparkle = useCallback(() => {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    const sparkleFreqs = [2093, 2637, 3136, 2093, 2637];
    
    sparkleFreqs.forEach((freq, i) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(freq, now + i * 0.1);
      
      gainNode.gain.setValueAtTime(0, now + i * 0.1);
      gainNode.gain.linearRampToValueAtTime(0.08, now + i * 0.1 + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.2);
      
      oscillator.start(now + i * 0.1);
      oscillator.stop(now + i * 0.1 + 0.25);
    });
  }, [getAudioContext]);

  // Play excellent/fanfare sound for 90%+ scores
  const playExcellentSound = useCallback(() => {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Triumphant fanfare frequencies
    const fanfare = [
      { freq: 523.25, time: 0, duration: 0.15 },
      { freq: 659.25, time: 0.15, duration: 0.15 },
      { freq: 783.99, time: 0.3, duration: 0.15 },
      { freq: 1046.50, time: 0.45, duration: 0.4 },
      { freq: 783.99, time: 0.85, duration: 0.1 },
      { freq: 1046.50, time: 0.95, duration: 0.5 },
    ];

    fanfare.forEach(({ freq, time, duration }) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(freq, now + time);
      
      gainNode.gain.setValueAtTime(0, now + time);
      gainNode.gain.linearRampToValueAtTime(0.2, now + time + 0.03);
      gainNode.gain.setValueAtTime(0.18, now + time + duration - 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + time + duration);
      
      oscillator.start(now + time);
      oscillator.stop(now + time + duration + 0.1);
    });

    // Add shimmer effect
    setTimeout(() => {
      playShimmer();
    }, 1500);
  }, [getAudioContext]);

  // Play shimmer effect for excellent results
  const playShimmer = useCallback(() => {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    for (let i = 0; i < 8; i++) {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      const baseFreq = 1500 + Math.random() * 1500;
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(baseFreq, now + i * 0.08);
      
      gainNode.gain.setValueAtTime(0, now + i * 0.08);
      gainNode.gain.linearRampToValueAtTime(0.05, now + i * 0.08 + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.15);
      
      oscillator.start(now + i * 0.08);
      oscillator.stop(now + i * 0.08 + 0.2);
    }
  }, [getAudioContext]);

  // Play encouraging sound for failed results
  const playEncouragingSound = useCallback(() => {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Gentle, encouraging melody
    const melody = [
      { freq: 392, time: 0, duration: 0.3 },
      { freq: 440, time: 0.3, duration: 0.3 },
      { freq: 523.25, time: 0.6, duration: 0.5 },
    ];

    melody.forEach(({ freq, time, duration }) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(freq, now + time);
      
      gainNode.gain.setValueAtTime(0, now + time);
      gainNode.gain.linearRampToValueAtTime(0.12, now + time + 0.05);
      gainNode.gain.setValueAtTime(0.1, now + time + duration - 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + time + duration);
      
      oscillator.start(now + time);
      oscillator.stop(now + time + duration + 0.1);
    });
  }, [getAudioContext]);

  const playCelebrationSound = useCallback((isPassed: boolean, isExcellent: boolean) => {
    if (isExcellent && isPassed) {
      playExcellentSound();
    } else if (isPassed) {
      playSuccessSound();
    } else {
      playEncouragingSound();
    }
  }, [playExcellentSound, playSuccessSound, playEncouragingSound]);

  return { playCelebrationSound, playSparkle };
}
