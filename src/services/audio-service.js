/**
 * Audio synthesis and haptic feedback service
 */
class AudioService {
  constructor() {
    this.ctx = null;
  }

  initContext() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  beep(freq = 880, durationMs = 140, type = 'sine') {
    try {
      this.initContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      osc.connect(gain);
      gain.connect(this.ctx.destination);

      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + durationMs / 1000);

      osc.start();
      osc.stop(this.ctx.currentTime + durationMs / 1000);
    } catch (e) {
      // Audio autoplay policy or browser restriction
    }
  }

  vibrate(pattern = 40) {
    try {
      if (navigator.vibrate) {
        navigator.vibrate(pattern);
      }
    } catch (e) {}
  }

  playSuccess() {
    this.beep(880, 140);
    this.vibrate(40);
  }

  playDuplicate() {
    this.beep(520, 120);
    this.vibrate([30, 40, 30]);
  }

  playError() {
    this.beep(320, 200, 'triangle');
    this.vibrate([80, 40, 80]);
  }
}

export const audioService = new AudioService();
