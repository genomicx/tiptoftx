import { describe, expect, it } from 'vitest'
import { loadDatabase } from './database'

const SIMPLE_FASTA = '>testgene_1_ACC001\nACGTACGTACGTACGT\n'

describe('loadDatabase', () => {
  it('parses a single FASTA entry', () => {
    const db = loadDatabase(SIMPLE_FASTA, { kmerSize: 4, useHCCompression: false, maxKmerCount: 10 })
    expect(db.geneToKmers.has('testgene_1_ACC001')).toBe(true)
  })

  it('builds forward k-mer → gene index', () => {
    const db = loadDatabase(SIMPLE_FASTA, { kmerSize: 4, useHCCompression: false, maxKmerCount: 10 })
    expect(db.kmersToGenes.get('ACGT')).toContain('testgene_1_ACC001')
  })

  it('adds k-mers to allKmersSet', () => {
    const db = loadDatabase(SIMPLE_FASTA, { kmerSize: 4, useHCCompression: false, maxKmerCount: 10 })
    expect(db.allKmersSet.has('ACGT')).toBe(true)
  })

  it('initialises all k-mer counters to zero', () => {
    const db = loadDatabase(SIMPLE_FASTA, { kmerSize: 4, useHCCompression: false, maxKmerCount: 10 })
    const kmerMap = db.sequencesToKmers.get('testgene_1_ACC001')
    expect(kmerMap).toBeDefined()
    for (const v of kmerMap!.values()) {
      expect(v).toBe(0)
    }
  })

  it('stores frequency counts in sequencesToKmersCount', () => {
    // 'ACGTACGT' (8bp, k=4): 'ACGT' appears at positions 0 and 4 → freq=2
    const fasta = '>testgene_1_ACC001\nACGTACGT\n'
    const db = loadDatabase(fasta, { kmerSize: 4, useHCCompression: false, maxKmerCount: 10 })
    const freqMap = db.sequencesToKmersCount.get('testgene_1_ACC001')
    expect(freqMap).toBeDefined()
    expect(freqMap!.get('ACGT')).toBe(2)
  })

  it('handles multiple FASTA entries', () => {
    const fasta = '>gene1_1_A1\nACGTACGT\n>gene2_1_A2\nTTTTGGGG\n'
    const db = loadDatabase(fasta, { kmerSize: 4, useHCCompression: false, maxKmerCount: 10 })
    expect(db.sequencesToKmers.size).toBe(2)
    expect(db.geneToKmers.has('gene1_1_A1')).toBe(true)
    expect(db.geneToKmers.has('gene2_1_A2')).toBe(true)
  })

  it('skips empty FASTA entries', () => {
    const fasta = '>\n\n>real_1_A1\nACGTACGT\n'
    const db = loadDatabase(fasta, { kmerSize: 4, useHCCompression: false, maxKmerCount: 10 })
    expect(db.sequencesToKmers.size).toBe(1)
  })

  it('normalises sequence to uppercase', () => {
    const fasta = '>g_1_A\nacgtacgt\n'
    const db = loadDatabase(fasta, { kmerSize: 4, useHCCompression: false, maxKmerCount: 10 })
    expect(db.allKmersSet.has('ACGT')).toBe(true)
  })

  it('filters k-mers exceeding maxKmerCount', () => {
    // Gene with a highly repetitive sequence: 'AAAA' will appear many times
    const fasta = '>rep_1_A\n' + 'A'.repeat(30) + '\n'
    const db = loadDatabase(fasta, { kmerSize: 4, useHCCompression: false, maxKmerCount: 3 })
    expect(db.allKmersSet.has('AAAA')).toBe(false)
  })

  it('applies homopolymer compression when enabled', () => {
    const fasta = '>g_1_A\nAAAGGGCCC\n'
    const db = loadDatabase(fasta, { kmerSize: 3, useHCCompression: true, maxKmerCount: 10 })
    // Compressed: 'AGC' → 1 k-mer of length 3
    expect(db.allKmersSet.has('AGC')).toBe(true)
    expect(db.allKmersSet.has('AAA')).toBe(false)
  })

  it('cross-indexes k-mers shared across multiple genes', () => {
    const fasta = '>gene1_1_A\nACGT\n>gene2_1_B\nACGT\n'
    const db = loadDatabase(fasta, { kmerSize: 4, useHCCompression: false, maxKmerCount: 10 })
    const genes = db.kmersToGenes.get('ACGT')
    expect(genes).toBeDefined()
    expect(genes!.length).toBe(2)
  })
})
