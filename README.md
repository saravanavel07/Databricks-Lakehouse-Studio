<div align="center">

# Databricks Lakehouse Studio

### A visual, local-first demonstration of a governed Medallion lakehouse workflow

**Explore data. Run a pipeline. Inspect quality, lineage, and analytics—all from one studio-style interface.**

[![Python](https://img.shields.io/badge/Python-3.x-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-UI-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-UI-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![SQLite](https://img.shields.io/badge/SQLite-local%20SQL-003B57?logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![HTML Canvas](https://img.shields.io/badge/HTML-Canvas%202D-E34F26?logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
[![CSS](https://img.shields.io/badge/CSS-styling-1572B6?logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![Architecture](https://img.shields.io/badge/Architecture-Medallion-FF3621)](#-architecture)

</div>

---

## Overview

Databricks Lakehouse Studio is a **portfolio and learning project** that brings a sample data-engineering workflow and an interactive dashboard together. It demonstrates how sales records can move through a Bronze → Silver → Gold architecture and how quality checks, lineage, and analytics can be surfaced in one interface.

The repository combines Python data-pipeline modules with a React/TypeScript interface. The lakehouse workflow is implemented as a local demonstration; it is not, by itself, a production Databricks deployment.

## Highlights

- **Medallion data flow:** preserve raw records in Bronze, clean and validate in Silver, and create business-oriented Gold data marts.
- **Pipeline orchestration:** model an ordered, multi-stage DAG and inspect execution status and run metrics.
- **Data quality:** evaluate schema, completeness, validity, uniqueness, and business-rule checks; isolate invalid rows in quarantine.
- **Analytics workspace:** explore datasets and issue read-only SQL against the local analytics store.
- **Lineage and governance concepts:** view source-to-mart relationships and role-based access/PII-masking demonstrations.
- **AI-assisted insights concept:** the interface supports an optional AI path and a deterministic fallback; configure external credentials securely before enabling any provider.
- **Live motion particles:** an animated particle network visualizes flowing data, moving packets, and pulsing nodes across the lakehouse journey.

## Live motion animation

<p align="center">
  <a href="assets/lakehouse-motion.svg">
    <img src="assets/lakehouse-motion.svg" alt="Animated lakehouse flow showing particles traveling from Bronze through Silver to Gold" width="100%" />
  </a>
</p>

The illustration depicts glowing data packets moving between **Bronze**, **Silver**, and **Gold**, surrounded by floating particles, ripples, and animated sweeps. The interactive application background is implemented in [`src/components/ParticleCanvas.tsx`](src/components/ParticleCanvas.tsx) with the HTML Canvas 2D API and `requestAnimationFrame`. It includes small drifting particles, connecting lines, glowing data packets with trails, pulsing nodes, pointer interaction, and a faster/brighter mode while a pipeline is running. It respects the browser's `prefers-reduced-motion` setting. The animation is a visual effect and is not connected to a live data pipeline.

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
| `src/components/ParticleCanvas.tsx` | Canvas-based animated background |

## Technology stack

The badges above identify technologies used in the checked-in source—not a claim that every optional runtime or cloud service is configured.

| Technology | Use in this project |
| --- | --- |
| **Python** | Data ingestion, Medallion pipeline stages, orchestration, quality checks, and tests |
| **React** | Component-based dashboard interface |
| **TypeScript** | Frontend application and UI component code |
| **HTML Canvas 2D API** | Custom particle and data-flow animation, drawn with `requestAnimationFrame` |
| **CSS** | Interface styling; utility-class styling patterns are present in the UI |
| **SQLite** | Local SQL and analytics demonstration |
| **CSV / JSON** | Sample data and local lakehouse artifacts |
| **Databricks Lakehouse / Medallion architecture** | Platform concepts and workflow modeled by the project; a cloud connector must be configured separately |

> Repository language composition: approximately **50.3% Python, 49.2% TypeScript, and 0.5% CSS**. The checked-in sample pipeline uses local storage for demonstration purposes.

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

The checked-in tree currently does not include a root-level `config.py`, a sample input-data directory, a Python dependency manifest, or a frontend `package.json`/lockfile and API server entry point. Add and configure these components as needed for your environment before attempting to run the full interface or pipeline.

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
