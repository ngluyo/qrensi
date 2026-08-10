/**
 * Perbandingan embedding wajah (blueprint §6.2). Descriptor face-api = 128-d.
 * Keputusan lolos SELALU di server. Memakai euclidean distance (rekomendasi
 * face-api): makin kecil makin mirip.
 */

// Ambang default face-api ~0.6. Kita pakai 0.55 (sedikit lebih ketat).
export const FACE_MATCH_THRESHOLD = 0.55;

export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

/** Format array 128-d ke literal pgvector: "[0.1,0.2,...]". */
export function toVectorLiteral(v: number[]): string {
  return `[${v.join(",")}]`;
}

/** Parse literal pgvector / array JSON kembali ke number[]. */
export function parseVector(v: unknown): number[] | null {
  if (Array.isArray(v)) return v as number[];
  if (typeof v === "string") {
    try {
      const arr = JSON.parse(v);
      return Array.isArray(arr) ? arr : null;
    } catch {
      return null;
    }
  }
  return null;
}
