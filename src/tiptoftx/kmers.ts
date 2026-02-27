/**
 * K-mer extraction and management from DNA sequences.
 *
 * TypeScript reimplementation of tiptoft/Kmers.py and homopolymer_compression.
 */

/**
 * Apply homopolymer compression: consecutive identical bases → single base
 * e.g. "AAATTTCCC" → "ATC"
 */
export function compressHomopolymers(seq: string): string {
  if (seq.length === 0) return seq
  const chars: string[] = [seq[0]]
  for (let i = 1; i < seq.length; i++) {
    if (seq[i] !== seq[i - 1]) {
      chars.push(seq[i])
    }
  }
  return chars.join('')
}

/**
 * Extract all k-mers with positions (sliding window).
 * Filter out k-mers appearing more than maxKmerCount times.
 * Returns Map<kmer, positions[]>
 */
export function extractAllKmers(
  seq: string,
  k: number,
  compress: boolean,
  maxKmerCount: number,
): Map<string, number[]> {
  const sequence = compress ? compressHomopolymers(seq) : seq
  const end = sequence.length - k + 1
  const kmers = new Map<string, number[]>()

  for (let i = 0; i < end; i++) {
    const kmer = sequence.slice(i, i + k)
    const positions = kmers.get(kmer)
    if (positions !== undefined) {
      positions.push(i)
    } else {
      kmers.set(kmer, [i])
    }
  }

  // Filter out overly repetitive k-mers (those occurring more than maxKmerCount times)
  for (const [kmer, positions] of kmers) {
    if (positions.length > maxKmerCount) {
      kmers.delete(kmer)
    }
  }

  return kmers
}

/**
 * Get 1x coverage k-mers: sample every k bases (non-overlapping).
 * Used for the fast first-pass filter.
 */
export function getOneCoverageKmers(
  seq: string,
  k: number,
  compress: boolean,
): string[] {
  const sequence = compress ? compressHomopolymers(seq) : seq
  const end = sequence.length - k + 1
  const kmers: string[] = []
  for (let i = 0; i < end; i += k) {
    kmers.push(sequence.slice(i, i + k))
  }
  return kmers
}

/**
 * Compute reverse complement of a DNA sequence.
 */
export function reverseComplement(seq: string): string {
  const complement: Record<string, string> = {
    A: 'T',
    T: 'A',
    C: 'G',
    G: 'C',
    a: 't',
    t: 'a',
    c: 'g',
    g: 'c',
  }
  const chars = new Array<string>(seq.length)
  for (let i = 0; i < seq.length; i++) {
    const base = seq[seq.length - 1 - i]
    chars[i] = complement[base] ?? base
  }
  return chars.join('')
}
