export function AboutPage() {
  return (
    <div className="about-page">
      <h2>About TipToftX</h2>

      <p>
        TipToftX is a browser-based tool for detecting plasmid replicon sequences in long-read
        sequencing data. It implements the TipToft k-mer matching algorithm entirely in
        WebAssembly-free TypeScript, running 100% client-side so no sequencing data ever leaves
        your machine.
      </p>

      <p>
        Upload one or more FASTQ files (including gzip-compressed) and TipToftX will scan each
        read against the PlasmidFinder replicon database using a two-pass k-mer filter. Results
        are reported as plasmid replicon hits with percentage coverage and completeness status.
      </p>

      <h3>How it works</h3>
      <ul>
        <li>
          <strong>Pass 1 (quick filter):</strong> Non-overlapping k-mers are sampled from each
          read and checked against the database. Reads with fewer than the minimum one-coverage
          k-mer threshold are discarded.
        </li>
        <li>
          <strong>Pass 2 (fine mapping):</strong> All k-mers are extracted, the largest
          consecutive hit block is identified, and fractional scoring accumulates per-gene
          coverage.
        </li>
        <li>
          Genes below the minimum coverage threshold are filtered out, and contained alleles
          (alleles whose k-mer set is a subset of a higher-scoring allele) are removed.
        </li>
      </ul>

      <h3>Citation</h3>
      <p>
        Page AJ, Seemann T. TipToft: predicting plasmid types from short-read sequencing data.{' '}
        <em>J Open Source Softw.</em> 2019;4(35):1021.{' '}
        <a
          href="https://doi.org/10.21105/joss.01021"
          target="_blank"
          rel="noopener noreferrer"
        >
          doi:10.21105/joss.01021
        </a>
      </p>

      <h3>Author</h3>
      <p>
        TipToftX was developed by <strong>Nabil-Fareed Alikhan</strong> at the Quadram Institute
        Bioscience. Nabil-Fareed is a computational biologist specialising in genomic
        epidemiology and the development of open-source tools for microbial genomics.
      </p>

      <h3>Database</h3>
      <p>
        Replicon sequences are sourced from the{' '}
        <a
          href="https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4068535/"
          target="_blank"
          rel="noopener noreferrer"
        >
          PlasmidFinder
        </a>{' '}
        database. The bundled database file is loaded at startup and never transmitted over the
        network during analysis.
      </p>

      <div className="privacy-note">
        <strong>Privacy:</strong> All analysis is performed entirely in your browser. No sequence
        data, file names, or results are sent to any server. Your data stays on your machine.
      </div>
    </div>
  )
}
