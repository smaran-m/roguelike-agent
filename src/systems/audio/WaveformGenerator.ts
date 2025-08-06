export class WaveformGenerator {
  constructor(private readonly audioContext: AudioContext) {}

  createNoiseBuffer(duration: number, type: 'white' | 'pink' = 'white'): AudioBuffer {
    const bufferSize = this.audioContext.sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    if (type === 'white') {
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    } else if (type === 'pink') {
      // Pink noise implementation (1/f noise)
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        data[i] *= 0.11; // Compensation for gain
        b6 = white * 0.115926;
      }
    }

    return buffer;
  }

  createCustomWave(frequencies: number[], amplitudes: number[]): PeriodicWave {
    // Create custom waveform from frequency components (additive synthesis)
    const real = new Float32Array(frequencies.length + 1);
    const imag = new Float32Array(frequencies.length + 1);
    
    real[0] = 0; // DC component
    imag[0] = 0;
    
    for (let i = 0; i < frequencies.length; i++) {
      real[i + 1] = amplitudes[i] || 0;
      imag[i + 1] = 0;
    }
    
    return this.audioContext.createPeriodicWave(real, imag);
  }

  // Generate frequency for musical notes
  getFrequencyFromNote(note: string, octave: number = 4): number {
    const noteFrequencies: Record<string, number> = {
      'C': 261.63, 'C#': 277.18, 'Db': 277.18,
      'D': 293.66, 'D#': 311.13, 'Eb': 311.13,
      'E': 329.63,
      'F': 349.23, 'F#': 369.99, 'Gb': 369.99,
      'G': 392.00, 'G#': 415.30, 'Ab': 415.30,
      'A': 440.00, 'A#': 466.16, 'Bb': 466.16,
      'B': 493.88
    };

    const baseFreq = noteFrequencies[note];
    if (!baseFreq) {
      throw new Error(`Invalid note: ${note}`);
    }

    // Adjust for octave (4 is middle octave)
    return baseFreq * Math.pow(2, octave - 4);
  }

  // Generate chord frequencies from chord name
  getChordFrequencies(rootNote: string, chordType: string = 'major', octave: number = 4): number[] {
    const rootFreq = this.getFrequencyFromNote(rootNote, octave);
    
    const intervals: Record<string, number[]> = {
      'major': [1, 1.25, 1.5],           // Major triad
      'minor': [1, 1.2, 1.5],            // Minor triad  
      'diminished': [1, 1.2, 1.414],     // Diminished triad
      'augmented': [1, 1.25, 1.587],     // Augmented triad
      'sus2': [1, 1.125, 1.5],          // Suspended 2nd
      'sus4': [1, 1.33, 1.5]            // Suspended 4th
    };

    const ratios = intervals[chordType] || intervals['major'];
    return ratios.map(ratio => rootFreq * ratio);
  }
}