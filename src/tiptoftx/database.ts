/**
 * FASTA database loading and k-mer indexing.
 *
 * TypeScript reimplementation of tiptoft/Fasta.py.
 * Parses a FASTA string and builds all k-mer indices for efficient read matching.
 */

import type { DatabaseIndex } from './types'
import { extractAllKmers } from './kmers'

export interface LoadDatabaseOptions {
  kmerSize: number
  useHCCompression: boolean
  maxKmerCount: number
}

/**
 * Parse a FASTA string and build all k-mer indices.
 */
export function loadDatabase(
  fastaText: string,
  opts: LoadDatabaseOptions,
): DatabaseIndex {
  const { kmerSize, useHCCompression, maxKmerCount } = opts

  // sequencesToKmers: gene → Map<kmer, count (0 = unseen)>
  const sequencesToKmers = new Map<string, Map<string, number>>()
  // sequencesToKmersCount: gene → Map<kmer, frequency in gene sequence>
  const sequencesToKmersCount = new Map<string, Map<string, number>>()
  // kmersToGenes: kmer → list of gene names
  const kmersToGenes = new Map<string, string[]>()
  // geneToKmers: gene → set of kmers
  const geneToKmers = new Map<string, Set<string>>()
  // allKmersSet: all k-mers across all genes
  const allKmersSet = new Set<string>()

  // Parse FASTA: split on '>' entries (skip empty strings from leading '>')
  const entries = fastaText.trim().split('>')
  for (const entry of entries) {
    if (entry.trim().length === 0) continue

    const lines = entry.split('\n')
    const header = lines[0].trim()
    if (header.length === 0) continue

    // Gene name = full header (no splitting)
    const geneName = header

    // Join remaining lines as the sequence (remove whitespace, uppercase)
    const sequence = lines
      .slice(1)
      .join('')
      .replace(/\s+/g, '')
      .toUpperCase()

    if (sequence.length === 0) continue

    // Extract k-mers with positions
    const kmerPositions = extractAllKmers(sequence, kmerSize, useHCCompression, maxKmerCount)

    // Build counter map (all values 0 — will be incremented during read processing)
    const kmerCounter = new Map<string, number>()
    // Build frequency map (value = number of occurrences in the gene sequence)
    const kmerFreq = new Map<string, number>()
    const kmerSet = new Set<string>()

    for (const [kmer, positions] of kmerPositions) {
      kmerCounter.set(kmer, 0)
      kmerFreq.set(kmer, positions.length)
      kmerSet.add(kmer)
      allKmersSet.add(kmer)

      // Build reverse index: kmer → genes
      const genes = kmersToGenes.get(kmer)
      if (genes !== undefined) {
        genes.push(geneName)
      } else {
        kmersToGenes.set(kmer, [geneName])
      }
    }

    sequencesToKmers.set(geneName, kmerCounter)
    sequencesToKmersCount.set(geneName, kmerFreq)
    geneToKmers.set(geneName, kmerSet)
  }

  return {
    kmersToGenes,
    geneToKmers,
    allKmersSet,
    sequencesToKmers,
    sequencesToKmersCount,
  }
}
