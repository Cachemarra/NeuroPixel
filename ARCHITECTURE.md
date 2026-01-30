# ARCHITECTURE.md - LumaGraph

## 1. Project Overview
LumaGraph is a high-performance, local-first Scientific Image Analysis Workstation. It allows Computer Vision Engineers to visualize, process, and compare high-resolution images using advanced algorithms.

**Key Characteristics:**
* **Hybrid Architecture:** Combines a modern React UI with a robust Python Computer Vision backend.
* **Local-First:** Runs as a native desktop app (Tauri) using a Python sidecar.
* **Dual Deployment:** Can be deployed as a Desktop App (.exe/.dmg) OR as a Web App (Docker).
* **Extensible:** Supports a plugin system where users can drop `.py` scripts to add new algorithms.

---

## 2. Technology Stack

### Frontend (The UI)
* **Framework:** React 18 + TypeScript + Vite.
* **Styling:** TailwindCSS + shadcn/ui.
* **State Management:** Zustand (for global app state like current image, active tool).
* **Visualization:** * `Deck.gl` or `OpenSeadragon`: For high-performance WebGL rendering of large images (tiling support).
    * `Recharts`: For Histograms and plotting.
* **Communication:** Axios/TanStack Query connecting to the Backend REST API.

### Backend (The Logic)
* **Runtime:** Python 3.11+.
* **Framework:** FastAPI (Async, Pydantic v2 validation).
* **Core Libraries:** * `numpy` & `opencv-python-headless`: Image processing.
    * `tifffile`: 16-bit/Float image I/O.
    * `scikit-image` & `scikit-learn`: Advanced algorithms.
* **Packaging:** * **Desktop:** Compiled to a single executable via `PyInstaller`.
    * **Web:** Containerized via Docker.

### Desktop Wrapper (The Shell)
* **Framework:** Tauri v2 (Rust).
* **Role:** Manages the native window, filesystem access, and spawns the Python backend as a "Sidecar" process.

---

## 3. Monorepo Structure

The project follows a strict Monorepo structure to share code between Desktop and Web builds.

```text
lumagraph/
├── apps/
│   ├── desktop/            # Tauri Application (Rust)
│   │   ├── src-tauri/      # Rust Config & Sidecar logic
│   │   │   ├── src/main.rs # Spawns the Python executable
│   │   │   └── tauri.conf.json
│   │   └── ...
│   │
│   ├── web-client/         # Shared Frontend (React)
│   │   ├── src/
│   │   │   ├── components/ # Shadcn UI & Viz Components
│   │   │   ├── store/      # Zustand Stores
│   │   │   └── lib/        # API Client (Environment aware)
│   │   ├── vite.config.ts
│   │   └── Dockerfile      # For Web Deployment
│   │
│   └── backend/            # Shared Backend (Python)
│       ├── app/
│       │   ├── api/        # FastAPI Routes
│       │   ├── core/       # CV Algorithms
│       │   ├── plugins/    # Dynamic Plugin Loader
│       │   └── main.py     # Entry point
│       ├── poetry.lock
│       └── spec/           # PyInstaller spec file
│
├── .github/                # CI/CD Workflows
├── docker-compose.yml      # Local Development Orchestration
└── ARCHITECTURE.md         # This file

```

---

## 4. Communication & Data Flow

### Scenario A: Local Development (Docker/Dev Mode)

1. **Frontend** runs on `http://localhost:5173`.
2. **Backend** runs on `http://localhost:8000`.
3. **Frontend** sends HTTP requests directly to `localhost:8000`.

### Scenario B: Desktop App (Production)

1. **Tauri** starts and launches the **Python Executable** (Sidecar) on a random free port.
2. **Python Sidecar** reports its port to the Tauri layer.
3. **Frontend** (running inside Tauri WebView) makes requests to `localhost:{SIDE_CAR_PORT}`.

---

## 5. Design & UI Guidelines

*Ref: See `/design` folder for visual targets.*

* **Theme:** Deep Dark Mode (Zinc-950 background).
* **Typography:** * UI Labels: Sans-Serif (`Inter`).
* **Data/Numbers:** Monospace (`JetBrains Mono`). **Critical**: All coordinates, metrics, and logs must be monospace.


* **Layout:** 3-Column "Holy Grail" (Tools | Viewport | Inspector).
* **Comparisons:** The central viewport must support split-screen (Side-by-Side) and Overlay modes.

---

## 6. Plugin Architecture Specification

Plugins are strictly defined Python modules loaded at runtime.

**Contract:**

* Plugins must define a `SPEC` (Pydantic Model) describing inputs (sliders, dropdowns).
* Plugins must implement a `run(image: np.ndarray, params: dict)` function.
* **Security:** In Web Mode, user-uploaded plugins are DISABLED. Only pre-installed plugins run.

## 7. Development Phases

1. **Phase 1 (Scaffold):** Setup Repo, Docker Compose, and basic React-FastAPI connection (Hello World).
2. **Phase 2 (Core IO):** Image Upload, OpenSeadragon Viewer, Histogram calculation.
3. **Phase 3 (Ops):** Implementation of basic filters (Blur, Edge) and Plugin Loader.
4. **Phase 4 (Tauri):** Integration of the Python binary as a Sidecar.