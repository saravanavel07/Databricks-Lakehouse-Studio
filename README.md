<div align="center">

# Databricks Lakehouse Studio

### A visual, local-first demonstration of a governed Medallion lakehouse workflow

**Explore data. Run a pipeline. Inspect quality, lineage, and analytics—all from one studio-style interface.**

[![Python](https://img.shields.io/badge/Python-3.x-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-React-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Architecture](https://img.shields.io/badge/Architecture-Medallion-FF3621)](#-architecture)

</div>

---

## Overview

Databricks Lakehouse Studio is a **portfolio and learning project** that brings a sample data-engineering workflow and an interactive dashboard together. It demonstrates how sales records can move through a Bronze → Silver → Gold architecture and how checks, lineage, and analytics can be surfaced in a single interface.

The repository combines Python data-pipeline modules with a React/TypeScript interface. The lakehouse workflow is implemented as a local demonstration; it is not, by itself, a production Databricks deployment.

## Highlights

- **Medallion data flow:** preserve raw records in Bronze, clean and validate in Silver, and create business-oriented Gold data marts.
- **Pipeline orchestration:** model an ordered, multi-stage DAG and inspect execution status and run metrics.
- **Data quality:** evaluate schema, completeness, validity, uniqueness, and business-rule checks; isolate invalid rows in quarantine.
- **Analytics workspace:** explore datasets and issue read-only SQL against the local analytics store.
- **Lineage and governance concepts:** view source-to-mart relationships and role-based access/PII-masking demonstrations.
- **AI-assisted insights concept:** the interface supports an optional AI path and a deterministic fallback; configure external credentials securely before enabling any provider.
- **Live motion particles:** an animated particle network visualizes flowing data, moving packets, radar sweeps, and stage pulses across the lakehouse journey.

## Live motion animation

<p align="center">
  <a href="assets/lakehouse-motion.svg">
    <img src="assets/lakehouse-motion.svg" alt="Live animated lakehouse flow showing particles traveling from Bronze through Silver to Gold" width="100%" />
  </a>
</p>

The live illustration shows glowing data packets moving between **Bronze**, **Silver**, and **Gold**, surrounded by floating particles, ripples, and animated radio-beam sweeps.

The interactive application background is implemented in [`src/components/ParticleCanvas.tsx`](src/components/ParticleCanvas.tsx) using the HTML Canvas 2D API and `requestAnimationFrame`. The illustration respects `prefers-reduced-motion` and is not connected to a live pipeline.

## Architecture

```text
Sample sales CSV
      │
      ▼
  Ingestion / validation
      │
      ▼
 Bronze — raw source records
      │
      ▼
 Silver — deduplicated and validated records ──► Quarantine
      │
      ▼
 Gold — curated analytical marts
      │
      ├── Daily revenue
      ├── Product performance
      ├── Regional performance
      └── Customer segments
```

The Python implementation is organized by responsibility under `src/`:

| Area | Purpose |
| --- | --- |
| `src/ingestion` | Source intake and validation |
| `src/bronze` | Raw-layer processing |
| `src/silver` | Cleaning and conformance |
| `src/gold` | Analytical dataset generation |
| `src/orchestration` | DAG and pipeline execution |
| `src/quality` | Data-quality evaluation |
| `src/analytics` | SQL analytics support |
| `src/storage` | Local persistence utilities |
| `src/lineage` / `src/governance` | Lineage and governance demonstrations |
| `src/ai` | AI-assistant logic |
| `src/App.tsx` | React/TypeScript studio interface |

## Technology

- **Backend and data pipeline:** Python
- **Frontend:** React and TypeScript
- **UI details visible in source:** Tailwind-style utility classes, `lucide-react` icons, and custom Canvas animation
- **Local persistence / SQL demonstration:** SQLite
- **Data layout:** CSV and JSON files in `lakehouse_storage/`
- **Data platform concepts:** Databricks Lakehouse and Medallion architecture

> The repository language breakdown is approximately **50.3% Python, 49.2% TypeScript, and 0.5% CSS**. Databricks is the inspiration and target platform concept; the checked-in sample pipeline uses local storage for demonstration purposes.

## Repository contents

```text
.
├── assets/                   # Animated README lakehouse diagram
├── lakehouse_storage/       # Example Bronze, Silver, Gold, quarantine, and run artifacts
├── scripts/                 # Pipeline runner and sample-data generator
├── src/                     # Python pipeline modules and React/TypeScript UI
└── tests/                   # Python unit tests
```

## Getting started

### Requirements

- Python 3.10 or later is recommended.
- A Node.js toolchain is needed to build or serve the React interface once the frontend package configuration is available.

### Python workflow

Clone the repository and create a virtual environment:

```bash
git clone https://github.com/saravanavel07/Databricks-Lakehouse-Studio.git
cd Databricks-Lakehouse-Studio
python -m venv .venv
```

Activate it:

```bash
# macOS / Linux
source .venv/bin/activate

# Windows PowerShell
.venv\Scripts\Activate.ps1
```

The intended project commands are:

```bash
python scripts/run_pipeline.py
python -m unittest discover -s tests -v
```

### Current repository setup note

The checked-in tree currently does not include a root-level `config.py`, a sample input-data directory, a Python dependency manifest, or a frontend `package.json`/lockfile and API server entry point.

## Tests

Python tests are located in `tests/`. Run them from the repository root with:

```bash
python -m unittest discover -s tests -v
```

The dashboard also includes a control for running tests through its API, which requires the corresponding backend service to be available.

## Configuration and security

- Keep API keys, workspace tokens, and other secrets out of source control. Use environment variables or a suitable secret manager.
- The UI includes optional Databricks connection fields, but a working cloud connector must be configured and implemented separately.
- Treat the governance, permissions, and masking views as demonstrations unless independently enforced by a trusted backend.
- Review and constrain SQL and API operations before exposing the app to untrusted users.

## Contributing

Issues and pull requests are welcome. For changes, please include a short description of the behavior, relevant tests, and any setup/configuration changes required to reproduce it.

---

<div align="center">

Built to explore modern lakehouse ideas—from raw data to trusted analytics.

</div>
