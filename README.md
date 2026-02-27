# TipToftX

Browser-based plasmid incompatibility group detection from uncorrected long reads using k-mer matching against PlasmidFinder database.

## Features

- No assembly required — works directly from raw FASTQ reads
- Homopolymer error tolerance for Oxford Nanopore and PacBio data
- PlasmidFinder database for incompatibility group detection
- Privacy-first client-side processing — no data leaves your browser
- Drag-and-drop FASTQ input

## Usage

1. Open the app in your browser.
2. Drag and drop a FASTQ file (gzipped or plain) onto the upload area.
3. Results are displayed immediately, showing detected plasmid incompatibility groups and their coverage.

No installation, account, or internet upload required.

## Development

```bash
npm install
npm run dev
npm test
npm run build
```

## Citation

Page AJ, Seemann T. TipToft: predicting plasmid types from short-read sequencing data. J Open Source Softw. 2019;4(35):1021. doi:10.21105/joss.01021

## License

GPL-3.0-only
