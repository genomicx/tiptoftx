/**
 * Pipeline orchestration for TipToftX.
 *
 * TypeScript reimplementation of the Python TipToft run() method
 * and Fastq.read_filter_and_map().
 *
 * Steps:
 *  1. Load the FASTA database and build k-mer indices.
 *  2. For each FASTQ file, stream reads and apply a two-pass filter:
 *     Pass 1 (quick): sample non-overlapping k-mers and count hits in the
 *     database to decide whether to proceed.
 *     Pass 2 (fine): extract all k-mers, find the largest hit block, and
 *     apply the fractional scoring formula to accumulate per-gene coverage.
 *  3. Build final GeneScore objects, filter by coverage threshold and
 *     allele containment, and return PlasmidHit records.
 */

import { loadDatabase } from './database'
import { extractAllKmers, getOneCoverageKmers, reverseComplement } from './kmers'
import { selectLargestBlock, adjustBlockStart, adjustBlockEnd } from './blocks'
import { parseFastqFile } from './fastq'
import { buildGeneScores, filterByMinCoverage, filterContainedAlleles, toPlasmidHit } from './scoring'
import type { TipToftXOptions, TipToftXResult, DatabaseIndex } from './types'

type ProgressCallback = (msg: string, pct: number) => void
type LogCallback = (msg: string) => void

// ---------------------------------------------------------------------------
// Pass-1 helper: run one-coverage k-mer filter on a sequence.
// Returns the number of k-mers found in the database and the set of matching
// gene names with their per-gene hit counts.
// ---------------------------------------------------------------------------
function runPass1(
  seq: string,
  k: number,
  compress: boolean,
  db: DatabaseIndex,
  minKmersOnex: number,
): { hitCount: number; candidateGeneHits: Map<string, number> } {
  const onexKmers = getOneCoverageKmers(seq, k, compress)
  let hitCount = 0
  // Map: geneName → number of 1x k-mer hits for this sequence
  const candidateGeneHits = new Map<string, number>()

  for (const kmer of onexKmers) {
    if (db.allKmersSet.has(kmer)) {
      hitCount++
      const genes = db.kmersToGenes.get(kmer)
      if (genes !== undefined) {
        for (const gene of genes) {
          candidateGeneHits.set(gene, (candidateGeneHits.get(gene) ?? 0) + 1)
        }
      }
    }
  }

  // Filter candidate genes: keep only those with > minKmersOnex hits
  for (const [gene, count] of candidateGeneHits) {
    if (count <= minKmersOnex) {
      candidateGeneHits.delete(gene)
    }
  }

  return { hitCount, candidateGeneHits }
}

// ---------------------------------------------------------------------------
// Pass-2: fine mapping and fractional score accumulation.
// Returns true if the read matched at least one candidate gene.
// ---------------------------------------------------------------------------
function runPass2(
  seq: string,
  candidateGeneHits: Map<string, number>,
  k: number,
  compress: boolean,
  maxKmerCount: number,
  minBlockSize: number,
  maxGap: number,
  margin: number,
  minKmersOnex: number,
  db: DatabaseIndex,
): boolean {
  const seqLen = seq.length

  // Extract all k-mers with positions for the chosen sequence
  const readKmers = extractAllKmers(seq, k, compress, maxKmerCount)

  // Build the sequence-hits array: bin i covers bases [i*k, (i+1)*k)
  const numBins = Math.floor(seqLen / k) + 1
  const sequenceHits = new Array<number>(numBins).fill(0)

  // Track which k-mers from this read are in the database
  const hitKmers = new Map<string, number[]>()

  for (const [kmer, positions] of readKmers) {
    if (db.allKmersSet.has(kmer)) {
      hitKmers.set(kmer, positions)
      for (const pos of positions) {
        const bin = Math.floor(pos / k)
        if (bin < numBins) {
          sequenceHits[bin]++
        }
      }
    }
  }

  // Find the largest block of consecutive k-mer hits
  const block = selectLargestBlock(sequenceHits, k, minBlockSize, maxGap)
  if (block === null) {
    return false
  }

  // Convert block bounds from k-mer units to base positions with margin
  const blockStart = adjustBlockStart(block.start, k, margin)
  const blockEnd = adjustBlockEnd(block.end, k, margin, seqLen)

  // Collect block k-mers: hit k-mers where at least one position falls within
  // [blockStart, blockEnd]
  const blockKmers = new Set<string>()
  for (const [kmer, positions] of hitKmers) {
    for (const pos of positions) {
      if (pos >= blockStart && pos <= blockEnd) {
        blockKmers.add(kmer)
        break
      }
    }
  }

  // Apply fractional scoring formula to candidate genes
  // Note: candidateGeneHits was already filtered in runPass1 to only include
  // genes with > minKmersOnex hits, so no re-check is needed here.
  let anyGeneMatched = false

  for (const [geneName] of candidateGeneHits) {
    const geneKmers = db.sequencesToKmers.get(geneName)
    const geneKmersCount = db.sequencesToKmersCount.get(geneName)
    if (geneKmers === undefined || geneKmersCount === undefined) {
      continue
    }

    // Intersection of block k-mers with the gene's k-mer set
    const intersect: string[] = []
    for (const kmer of blockKmers) {
      if (geneKmers.has(kmer)) {
        intersect.push(kmer)
      }
    }

    // Only proceed if the intersection is large enough
    if (intersect.length <= minKmersOnex * k) {
      continue
    }

    // Fractional scoring: mirrors Python
    //   fasta_obj.sequences_to_kmers[gene_name][kmer] += 1 / freq
    for (const kmer of intersect) {
      const freq = geneKmersCount.get(kmer) ?? 1
      if (freq > 0) {
        geneKmers.set(kmer, (geneKmers.get(kmer) ?? 0) + 1 / freq)
      }
    }

    anyGeneMatched = true
  }

  return anyGeneMatched
}

// ---------------------------------------------------------------------------
// Main exported function
// ---------------------------------------------------------------------------
export async function runTipToftX(
  files: File[],
  dbText: string,
  opts: TipToftXOptions,
  onProgress: ProgressCallback,
  onLog: LogCallback,
): Promise<TipToftXResult> {
  const startTime = Date.now()

  // -------------------------------------------------------------------------
  // Step 1: Load database (0-10%)
  // -------------------------------------------------------------------------
  onProgress('Loading database…', 0)

  const db: DatabaseIndex = loadDatabase(dbText, {
    kmerSize: opts.kmerSize,
    useHCCompression: opts.useHCCompression,
    maxKmerCount: opts.maxKmerCount,
  })

  const numGenes = db.sequencesToKmers.size
  const numKmers = db.allKmersSet.size
  onLog(`[DB] Loaded ${numGenes} genes, ${numKmers} k-mers`)
  onProgress('Database loaded', 10)

  // -------------------------------------------------------------------------
  // Step 2: Process each FASTQ file (10-90%)
  // -------------------------------------------------------------------------
  let totalReadsProcessed = 0
  let readsWithMatches = 0

  const fileProgressRange = files.length > 0 ? 80 / files.length : 80

  for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
    const file = files[fileIndex]
    const fileProgressBase = 10 + fileIndex * fileProgressRange

    onLog(`[FILE] Processing ${file.name}`)
    onProgress(`Processing ${file.name}`, fileProgressBase)

    let readsInFile = 0

    for await (const read of parseFastqFile(file)) {
      const seq = read.seq
      readsInFile++
      totalReadsProcessed++

      // Skip reads that are too short for any block to form
      if (seq.length < opts.minBlockSize) {
        continue
      }

      const revSeq = reverseComplement(seq)

      // ------------------------------------------------------------------
      // Pass 1: quick filter on forward and reverse complement sequences
      // ------------------------------------------------------------------
      const fwdPass1 = runPass1(seq, opts.kmerSize, opts.useHCCompression, db, opts.minKmersOnex)
      const revPass1 = runPass1(revSeq, opts.kmerSize, opts.useHCCompression, db, opts.minKmersOnex)

      const fwdPassed = fwdPass1.hitCount > opts.minKmersOnex && fwdPass1.candidateGeneHits.size > 0
      const revPassed = revPass1.hitCount > opts.minKmersOnex && revPass1.candidateGeneHits.size > 0

      if (!fwdPassed && !revPassed) {
        continue
      }

      // ------------------------------------------------------------------
      // Pass 2: use whichever direction had more Pass 1 hits
      // ------------------------------------------------------------------
      let chosenSeq: string
      let chosenCandidates: Map<string, number>

      if (fwdPass1.hitCount >= revPass1.hitCount) {
        chosenSeq = seq
        chosenCandidates = fwdPass1.candidateGeneHits
      } else {
        chosenSeq = revSeq
        chosenCandidates = revPass1.candidateGeneHits
      }

      const matched = runPass2(
        chosenSeq,
        chosenCandidates,
        opts.kmerSize,
        opts.useHCCompression,
        opts.maxKmerCount,
        opts.minBlockSize,
        opts.maxGap,
        opts.margin,
        opts.minKmersOnex,
        db,
      )

      if (matched) {
        readsWithMatches++
      }
    }

    onLog(`[FILE] Finished ${file.name}: ${readsInFile} reads processed`)
    onProgress(`Finished ${file.name}`, fileProgressBase + fileProgressRange)
  }

  // -------------------------------------------------------------------------
  // Step 3: Aggregate and filter (90-100%)
  // -------------------------------------------------------------------------
  onProgress('Aggregating results…', 90)

  const rawScores = buildGeneScores(db)
  const filteredByCoverage = filterByMinCoverage(rawScores, opts.minPctCoverage)
  const filteredAlleles = filterContainedAlleles(filteredByCoverage, opts.noGeneFilter)

  // Convert to PlasmidHit and sort by percentageCoverage descending
  const hits = filteredAlleles
    .map(gene => toPlasmidHit(gene))
    .sort((a, b) => b.percentCoverage - a.percentCoverage)

  onLog(`[RESULT] ${hits.length} plasmid replicon(s) found`)
  onProgress('Done', 100)

  return {
    hits,
    totalReadsProcessed,
    readsWithMatches,
    processingTimeMs: Date.now() - startTime,
  }
}
