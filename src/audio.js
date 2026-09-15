/**
 * Web Audio API synthesizer for retro photobooth sounds:
 * - Mechanical shutter click + mirror slap
 * - Countdown ticking beep
 * - Final warning beep
 */
class SoundEffects {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  _initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTick(isUrgent = false) {
    if (!this.enabled) return;
    try {
      this._initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = isUrgent ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(isUrgent ? 880 : 660, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(isUrgent ? 1100 : 440, this.ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.09);
    } catch (e) {
      console.warn('Audio tick failed:', e);
    }
  }

  playShutter() {
    if (!this.enabled) return;
    try {
      this._initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;

      // 1. Shutter click (noise burst through bandpass)
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.12);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
      }

      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1800, now);
      filter.Q.setValueAtTime(3, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.7, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.11);

      noiseSource.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noiseSource.start(now);

      // 2. Mechanical winding / mirror slap thud
      const thud = this.ctx.createOscillator();
      const thudGain = this.ctx.createGain();
      thud.type = 'sine';
      thud.frequency.setValueAtTime(140, now);
      thud.frequency.exponentialRampToValueAtTime(35, now + 0.15);

      thudGain.gain.setValueAtTime(0.5, now);
      thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      thud.connect(thudGain);
      thudGain.connect(this.ctx.destination);

      thud.start(now);
      thud.stop(now + 0.16);
    } catch (e) {
      console.warn('Shutter sound failed:', e);
    }
  }
}

export const sfx = new SoundEffects();
