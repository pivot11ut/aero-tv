/**
 * Aero TV — Audio Synthesis Feedback System
 * Generates clean, subtle, premium audio cues using Web Audio API
 * No external audio files needed; instantaneous response on TV hardware.
 */

class TVAudioSystem {
    constructor() {
        this.ctx = null;
        this.enabled = localStorage.getItem('aero_tv_sound_enabled') !== 'false';
    }

    init() {
        if (!this.ctx && typeof window.AudioContext !== 'undefined') {
            try {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                this.ctx = new AudioCtx();
            } catch (e) {
                console.warn('AudioContext not supported on this TV runtime:', e);
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setEnabled(flag) {
        this.enabled = flag;
        localStorage.setItem('aero_tv_sound_enabled', flag ? 'true' : 'false');
    }

    playFocusTick() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            const now = this.ctx.currentTime;
            
            // Subtle 450Hz -> 280Hz wooden tactile tap (18ms)
            osc.frequency.setValueAtTime(450, now);
            osc.frequency.exponentialRampToValueAtTime(280, now + 0.018);

            gain.gain.setValueAtTime(0.045, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.018);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.02);
        } catch (e) {
            // Ignore audio interruption on TV background
        }
    }

    playSelectChime() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;

            // Dual harmonic chime (580Hz & 870Hz)
            const osc1 = this.ctx.createOscillator();
            const osc2 = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc1.type = 'triangle';
            osc2.type = 'sine';

            osc1.frequency.setValueAtTime(587.33, now); // D5
            osc2.frequency.setValueAtTime(880.00, now); // A5

            gain.gain.setValueAtTime(0.07, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(this.ctx.destination);

            osc1.start(now);
            osc2.start(now);
            osc1.stop(now + 0.095);
            osc2.stop(now + 0.095);
        } catch (e) {}
    }

    playBackSound() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            // Descending sweep
            osc.frequency.setValueAtTime(420, now);
            osc.frequency.exponentialRampToValueAtTime(220, now + 0.05);

            gain.gain.setValueAtTime(0.06, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.055);
        } catch (e) {}
    }

    playAmbientSwell() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.exponentialRampToValueAtTime(330, now + 0.4);

            gain.gain.setValueAtTime(0.001, now);
            gain.gain.linearRampToValueAtTime(0.05, now + 0.2);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.52);
        } catch (e) {}
    }

    playPinDigit() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(650, now);
            osc.frequency.exponentialRampToValueAtTime(800, now + 0.025);

            gain.gain.setValueAtTime(0.06, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(now);
            osc.stop(now + 0.028);
        } catch (e) {}
    }

    playPinSuccess() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                const start = now + (idx * 0.06);

                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, start);

                gain.gain.setValueAtTime(0.08, start);
                gain.gain.exponentialRampToValueAtTime(0.001, start + 0.12);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(start);
                osc.stop(start + 0.13);
            });
        } catch (e) {}
    }

    playPinError() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        try {
            const now = this.ctx.currentTime;
            [160, 140].forEach((freq, idx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                const start = now + (idx * 0.1);

                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(freq, start);

                gain.gain.setValueAtTime(0.09, start);
                gain.gain.exponentialRampToValueAtTime(0.001, start + 0.08);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(start);
                osc.stop(start + 0.085);
            });
        } catch (e) {}
    }
}

// Global audio instance
window.TVAudio = new TVAudioSystem();

