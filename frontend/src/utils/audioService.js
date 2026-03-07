/**
 * AudioService.js
 * Central singleton for managing the web audio context across the whole app.
 * This ensures that when a user clicks "Enable Sound" in the header, 
 * it unlocks the EXACT same engine used for the sirens.
 */

let _sharedCtx = null;

export const getAudioCtx = () => {
  if (!_sharedCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      _sharedCtx = new AudioContextClass();
    }
  }
  return _sharedCtx;
};

/**
 * Authorizes the audio context from a user gesture.
 * Crucial for bypassing browser autoplay blocks.
 */
export const authorizeAudio = async () => {
  const ctx = getAudioCtx();
  if (!ctx) return false;
  
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }
  
  // Play a tiny silent buffer to fully "warm up" the hardware
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, ctx.currentTime);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(0);
  oscillator.stop(0.1);
  
  return ctx.state === 'running';
};
