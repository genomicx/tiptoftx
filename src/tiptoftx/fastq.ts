/**
 * FASTQ file parsing for browser environments.
 *
 * TypeScript reimplementation supporting plain and gzip-compressed FASTQ files.
 * Uses the browser's DecompressionStream API for gzip decompression.
 */

import type { FastqRead } from './types'

export type { FastqRead }

/**
 * Parse a FASTQ file (plain or gzip) and yield reads.
 * Handles .fastq, .fq, .fastq.gz, .fq.gz
 * Uses browser DecompressionStream for gzip.
 */
export async function* parseFastqFile(file: File): AsyncGenerator<FastqRead> {
  const isGzip = file.name.endsWith('.gz')

  // Set up the readable stream, optionally decompressing gzip
  let stream: ReadableStream<Uint8Array>
  if (isGzip) {
    stream = file.stream().pipeThrough(new DecompressionStream('gzip'))
  } else {
    stream = file.stream()
  }

  // Decode bytes to text
  const textStream = stream.pipeThrough(new TextDecoderStream())
  const reader = textStream.getReader()

  // Line buffer to handle partial lines across chunks
  let lineBuffer = ''
  // FASTQ line accumulator: 4 lines per record
  const recordLines: string[] = []

  try {
    let done = false
    while (!done) {
      const result = await reader.read()
      done = result.done

      if (result.value !== undefined) {
        lineBuffer += result.value
      }

      // Process all complete lines from the buffer
      let newlineIndex: number
      while ((newlineIndex = lineBuffer.indexOf('\n')) !== -1) {
        const line = lineBuffer.slice(0, newlineIndex)
        lineBuffer = lineBuffer.slice(newlineIndex + 1)

        // Strip carriage returns (Windows line endings)
        recordLines.push(line.endsWith('\r') ? line.slice(0, -1) : line)

        if (recordLines.length === 4) {
          const idLine = recordLines[0]
          const seqLine = recordLines[1]
          // recordLines[2] is '+' separator (ignored)
          // recordLines[3] is quality string (ignored)
          recordLines.length = 0

          if (idLine.startsWith('@')) {
            yield {
              id: idLine.slice(1),
              seq: seqLine,
            }
          }
        }
      }
    }

    // Handle any remaining content in the buffer (file without trailing newline)
    if (lineBuffer.length > 0) {
      recordLines.push(lineBuffer.endsWith('\r') ? lineBuffer.slice(0, -1) : lineBuffer)
    }

    if (recordLines.length === 4) {
      const idLine = recordLines[0]
      const seqLine = recordLines[1]
      if (idLine.startsWith('@')) {
        yield {
          id: idLine.slice(1),
          seq: seqLine,
        }
      }
    }
  } catch (err) {
    throw new Error(
      `Failed to parse FASTQ file "${file.name}": ${err instanceof Error ? err.message : String(err)}`,
    )
  } finally {
    reader.releaseLock()
  }
}
