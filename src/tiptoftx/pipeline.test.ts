import { describe, expect, it } from 'vitest'
import { runTipToftX } from './pipeline'
import { DEFAULT_OPTIONS } from './types'

/**
 * Generate a deterministic pseudo-random DNA sequence.
 * Uses a 32-bit LCG (Numerical Recipes parameters) for reproducibility.
 */
function synthSeq(len: number): string {
  const bases = 'ACGT'
  const chars: string[] = []
  let s = 1234567 | 0
  for (let i = 0; i < len; i++) {
    s = (Math.imul(s, 1664525) + 1013904223) | 0
    chars.push(bases[(s >>> 16) & 3])
  }
  return chars.join('')
}

// A 300 bp pseudo-random non-repetitive sequence used as the synthetic gene
const GENE_SEQ = synthSeq(300)
const GENE_NAME = 'repSYNTH.1_1_SYNTH001'

// Synthetic FASTA database with exactly one gene
const SYNTH_FASTA = `>${GENE_NAME}\n${GENE_SEQ}\n`

// FASTQ file with one read that exactly matches the gene sequence
const SYNTH_FASTQ = `@synthread1\n${GENE_SEQ}\n+\n${'!'.repeat(GENE_SEQ.length)}\n`

function noop() {/* intentionally empty */}

describe('runTipToftX', () => {
  it('returns zero hits and zero reads for an empty FASTQ file', async () => {
    const file = new File([''], 'empty.fastq')
    const result = await runTipToftX([file], SYNTH_FASTA, DEFAULT_OPTIONS, noop, noop)
    expect(result.totalReadsProcessed).toBe(0)
    expect(result.hits).toHaveLength(0)
  })

  it('detects a plasmid replicon from a read that matches the gene', async () => {
    const file = new File([SYNTH_FASTQ], 'synthetic.fastq')
    const result = await runTipToftX(
      [file],
      SYNTH_FASTA,
      { ...DEFAULT_OPTIONS, minPctCoverage: 50 },
      noop,
      noop,
    )
    expect(result.totalReadsProcessed).toBe(1)
    expect(result.hits.length).toBeGreaterThanOrEqual(1)
    expect(result.hits[0].gene).toBe('repSYNTH.1')
  })

  it('reports Full completeness when all gene k-mers are covered', async () => {
    const file = new File([SYNTH_FASTQ], 'synthetic.fastq')
    const result = await runTipToftX(
      [file],
      SYNTH_FASTA,
      { ...DEFAULT_OPTIONS, minPctCoverage: 50 },
      noop,
      noop,
    )
    expect(result.hits[0]?.completeness).toBe('Full')
  })

  it('yields no hits when minPctCoverage threshold is not met', async () => {
    // A single very short read (< minBlockSize) will be skipped
    const shortFastq = `@short\n${'A'.repeat(30)}\n+\n${'!'.repeat(30)}\n`
    const file = new File([shortFastq], 'short.fastq')
    const result = await runTipToftX([file], SYNTH_FASTA, DEFAULT_OPTIONS, noop, noop)
    expect(result.hits).toHaveLength(0)
  })

  it('includes processingTimeMs in the result', async () => {
    const file = new File([''], 'empty.fastq')
    const result = await runTipToftX([file], SYNTH_FASTA, DEFAULT_OPTIONS, noop, noop)
    expect(result.processingTimeMs).toBeGreaterThanOrEqual(0)
  })

  it('calls onProgress callbacks during execution', async () => {
    const file = new File([''], 'empty.fastq')
    const messages: string[] = []
    await runTipToftX([file], SYNTH_FASTA, DEFAULT_OPTIONS, (msg) => messages.push(msg), noop)
    expect(messages.length).toBeGreaterThan(0)
  })

  it('processes multiple FASTQ files', async () => {
    const file1 = new File([SYNTH_FASTQ], 'f1.fastq')
    const file2 = new File([SYNTH_FASTQ], 'f2.fastq')
    const result = await runTipToftX(
      [file1, file2],
      SYNTH_FASTA,
      { ...DEFAULT_OPTIONS, minPctCoverage: 50 },
      noop,
      noop,
    )
    // Two files each with 1 read → 2 reads total
    expect(result.totalReadsProcessed).toBe(2)
  })
})
