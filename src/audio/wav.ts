// 16-bit mono PCM WAV encoder. Pure: no DOM, so Node tests can check the header.

function ascii(v: DataView, at: number, s: string): void {
  for (let i = 0; i < s.length; i++) v.setUint8(at + i, s.charCodeAt(i));
}

/** Samples in -1..1 become little-endian 16-bit PCM. Values outside the range are clipped. */
export function encodeWav(samples: Float32Array, sampleRate = 44100): ArrayBuffer {
  const n = samples.length;
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  ascii(v, 0, 'RIFF');
  v.setUint32(4, 36 + n * 2, true);
  ascii(v, 8, 'WAVE');
  ascii(v, 12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // mono
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  ascii(v, 36, 'data');
  v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(44 + i * 2, Math.round(s < 0 ? s * 32768 : s * 32767), true);
  }
  return buf;
}
