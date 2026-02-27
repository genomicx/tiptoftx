import { describe, expect, it } from 'vitest'
import {
  compressHomopolymers,
  extractAllKmers,
  getOneCoverageKmers,
  reverseComplement,
} from './kmers'

describe('compressHomopolymers', () => {
  it('collapses consecutive identical bases', () => {
    expect(compressHomopolymers('AAATTTCCC')).toBe('ATC')
  })

  it('leaves alternating bases unchanged', () => {
    expect(compressHomopolymers('ACGT')).toBe('ACGT')
  })

  it('returns empty string for empty input', () => {
    expect(compressHomopolymers('')).toBe('')
  })

  it('collapses all-same sequence to single base', () => {
    expect(compressHomopolymers('AAAA')).toBe('A')
  })

  it('handles single base', () => {
    expect(compressHomopolymers('G')).toBe('G')
  })

  it('handles mixed runs', () => {
    expect(compressHomopolymers('AACCGGTT')).toBe('ACGT')
  })
})

describe('extractAllKmers', () => {
  it('extracts all sliding-window k-mers', () => {
    const kmers = extractAllKmers('ACGTA', 3, false, 10)
    expect(kmers.has('ACG')).toBe(true)
    expect(kmers.has('CGT')).toBe(true)
    expect(kmers.has('GTA')).toBe(true)
    expect(kmers.size).toBe(3)
  })

  it('records correct positions', () => {
    const kmers = extractAllKmers('ACGTA', 3, false, 10)
    expect(kmers.get('ACG')).toEqual([0])
    expect(kmers.get('CGT')).toEqual([1])
  })

  it('filters repetitive k-mers exceeding maxKmerCount', () => {
    // 'AAAA' appears 13 times in 16 As; maxKmerCount=3 → filtered out
    const kmers = extractAllKmers('AAAAAAAAAAAAAAAA', 4, false, 3)
    expect(kmers.has('AAAA')).toBe(false)
  })

  it('applies homopolymer compression when compress=true', () => {
    // 'AAATTTCCC' compresses to 'ATC', k=3 → only k-mer is 'ATC'
    const kmers = extractAllKmers('AAATTTCCC', 3, true, 10)
    expect(kmers.has('ATC')).toBe(true)
    expect(kmers.size).toBe(1)
  })

  it('returns empty map when sequence is shorter than k', () => {
    const kmers = extractAllKmers('ACG', 4, false, 10)
    expect(kmers.size).toBe(0)
  })

  it('allows k-mers at or below maxKmerCount', () => {
    // 'ACACAC' k=2: 'AC' appears at positions 0,2,4 (count=3); maxKmerCount=3 → NOT filtered (3 > 3 is false)
    const kmers = extractAllKmers('ACACAC', 2, false, 3)
    expect(kmers.has('AC')).toBe(true)
  })
})

describe('getOneCoverageKmers', () => {
  it('samples every k-th position', () => {
    // 'ACGTACGT' length 8, k=4: positions 0, 4
    const kmers = getOneCoverageKmers('ACGTACGT', 4, false)
    expect(kmers).toEqual(['ACGT', 'ACGT'])
  })

  it('returns empty array for sequence shorter than k', () => {
    expect(getOneCoverageKmers('ACG', 4, false)).toEqual([])
  })

  it('applies compression before sampling', () => {
    // 'AAATTTCCCGGG' compresses to 'ATCG', k=2 → ['AT', 'CG']
    const kmers = getOneCoverageKmers('AAATTTCCCGGG', 2, true)
    expect(kmers).toEqual(['AT', 'CG'])
  })

  it('handles exact multiple of k', () => {
    const kmers = getOneCoverageKmers('ACGTACGT', 4, false)
    expect(kmers.length).toBe(2)
  })
})

describe('reverseComplement', () => {
  it('reverses and complements ACGT correctly', () => {
    // ACGT reversed → TGCA, complemented → ACGT
    expect(reverseComplement('ACGT')).toBe('ACGT')
  })

  it('complements A↔T correctly', () => {
    expect(reverseComplement('AAAA')).toBe('TTTT')
  })

  it('computes ATCG → CGAT', () => {
    // reversed: GCTA, complement G→C, C→G, T→A, A→T → CGAT
    expect(reverseComplement('ATCG')).toBe('CGAT')
  })

  it('passes through unknown bases unchanged', () => {
    expect(reverseComplement('NNN')).toBe('NNN')
  })

  it('handles empty string', () => {
    expect(reverseComplement('')).toBe('')
  })

  it('handles lowercase bases', () => {
    expect(reverseComplement('acgt')).toBe('acgt')
  })
})
