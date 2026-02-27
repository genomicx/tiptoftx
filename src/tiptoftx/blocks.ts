/**
 * Block identification and merging for k-mer matches.
 *
 * TypeScript reimplementation of tiptoft/Blocks.py.
 * Identifies contiguous regions of k-mer matches and merges nearby blocks
 * to account for sequencing errors in long reads.
 */

import type { Block } from './types'

/**
 * Find all contiguous blocks of k-mer matches.
 * sequenceHits[i] = number of k-mer matches at bin i (position i*k to (i+1)*k)
 */
export function findBlocks(sequenceHits: number[]): Block[] {
  const blocks: Block[] = []
  let inBlock = false
  let currentBlockStart = 0

  for (let i = 0; i < sequenceHits.length; i++) {
    const valCount = sequenceHits[i]
    if (!inBlock && valCount > 0) {
      // Start of a new block
      inBlock = true
      currentBlockStart = i
    } else if (inBlock && valCount === 0) {
      // End of current block
      inBlock = false
      blocks.push({ start: currentBlockStart, end: i })
    }
  }

  // Handle case where sequence ends while still in a block
  if (inBlock) {
    blocks.push({ start: currentBlockStart, end: sequenceHits.length })
  }

  return blocks
}

/**
 * Merge blocks where gap between adjacent blocks < maxGap.
 * maxGap is in k-mer units (not bases).
 *
 * Mirrors Python Blocks.merge_blocks() exactly:
 * iterates pairwise, if blocks[i].end + maxGap > blocks[i+1].start,
 * extends first block and copies merged values forward.
 */
export function mergeBlocks(blocks: Block[], maxGap: number): Block[] {
  // Work on mutable copies to mirror the Python list mutation pattern
  const mutable: Array<{ start: number; end: number }> = blocks.map(b => ({
    start: b.start,
    end: b.end,
  }))

  for (let i = 0; i < mutable.length - 1; i++) {
    if (mutable[i].end + maxGap > mutable[i + 1].start) {
      // Extend the first block to encompass the second
      if (mutable[i].end < mutable[i + 1].end) {
        mutable[i].end = mutable[i + 1].end
      }
      // Copy merged block forward
      mutable[i + 1].start = mutable[i].start
      mutable[i + 1].end = mutable[i].end
    }
  }

  return mutable
}

/**
 * Return the largest merged block, or null if none meet minBlockSize.
 * minBlockSize is in bases, k is the k-mer size (to convert from k-mer units).
 * maxGap is in k-mer units, passed through to mergeBlocks.
 *
 * Internally calls findBlocks + mergeBlocks then selects the largest result.
 * Mirrors Python Blocks.find_largest_block().
 */
export function selectLargestBlock(
  sequenceHits: number[],
  k: number,
  minBlockSize: number,
  maxGap: number,
): Block | null {
  const rawBlocks = findBlocks(sequenceHits)
  if (rawBlocks.length === 0) return null

  const mergedBlocks = mergeBlocks(rawBlocks, maxGap)

  let largestBlockSize = 0
  let largestBlockIndex = 0

  for (let i = 0; i < mergedBlocks.length; i++) {
    const blockSize = mergedBlocks[i].end - mergedBlocks[i].start
    if (blockSize > largestBlockSize) {
      largestBlockIndex = i
      largestBlockSize = blockSize
    }
  }

  // Mirror Python: if largest_block < (min_block_size / k), return null
  if (largestBlockSize < minBlockSize / k) {
    return null
  }

  return mergedBlocks[largestBlockIndex]
}

/**
 * Convert block start from k-mer units to bases with margin, clamped to 0.
 */
export function adjustBlockStart(blockStart: number, k: number, margin: number): number {
  const baseStart = blockStart * k
  if (baseStart - margin < 0) {
    return 0
  }
  return baseStart - margin
}

/**
 * Convert block end from k-mer units to bases with margin, clamped to seqLength.
 */
export function adjustBlockEnd(
  blockEnd: number,
  k: number,
  margin: number,
  seqLength: number,
): number {
  const baseEnd = blockEnd * k
  if (baseEnd + margin > seqLength) {
    return seqLength
  }
  return baseEnd + margin
}
