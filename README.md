# LumaGraph

**High-performance, local-first Scientific Image Analysis Workstation.**

LumaGraph allows Computer Vision Engineers to visualize, process, and compare high-resolution images using advanced algorithms in a hybrid desktop/web environment.

## Key Features

*   **Analysis Workspace:** Single image analysis with real-time histograms, statistics (Mean, Std Dev, Entropy), and pixel inspection.
*   **Comparison Engine:** Compare two images side-by-side or using overlay modes, with automatic calculation of SSIM, PSNR, and MSE metrics.
*   **Pipeline Editor:** Visual node-based editor for creating complex image processing workflows.
*   **Batch Processing:** Apply processing pipelines to large sets of images efficiently.
*   **Plugin System:** Extensible Python-based architecture. Includes standard library plugins:
    *   Brightness/Contrast/Exposure/Saturation/Temperature
    *   HSL Adjustment, RGB to Grayscale, Shadows/Highlights
    *   Canny Edge Detection, Laplacian, Gaussian Blur, Unsharp Mask, Sharpen, Denoise
    *   Morphology operations, Thresholding (Otsu)
    *   Geometry (Rotate, Flip, Crop, Resize)

## Screenshots

### Analysis Workspace
![Analysis Workspace](design/analysis_workspace_default_state/screen.png)

### Comparison Engine
![Comparison Engine](design/comparison_engine_diff_mode/screen.png)

### Pipeline Editor
![Pipeline Editor](design/pipeline_configuration_editor/screen.png)

## Tech Stack

**Frontend (Web/Desktop UI):**
*   **React 18** + **TypeScript** + **Vite**
*   **TailwindCSS** + **shadcn/ui**
*   **Zustand** (State Management)
*   **@xyflow/react** (Node Editor)
*   **@tanstack/react-query** (Data Fetching)

**Backend (Core Logic):**
*   **Python 3.11**
*   **FastAPI** (Async API)
*   **OpenCV** + **NumPy** + **Scikit-Image**
*   **Scikit-Learn**
*   **Poetry** (Dependency Management)

**Desktop Runtime:**
*   **Tauri v2** (Rust) - Provides native OS integration and sidecar management.

## ⚠️ Known Issues
*   **Build Configuration:** The `apps/desktop/src-tauri/tauri.conf.json` file contains `npm` commands for build scripts (`npm run dev`, `npm run build`), but the project requires `pnpm`. Users building the desktop app should verify their environment or update these commands locally if they encounter issues.

## Getting Started

### Prerequisites
*   Node.js (pnpm required)
*   Python 3.11+ (Poetry required)
*   Rust (for Desktop build)

### Development

1.  **Frontend:**
    ```bash
    cd apps/web-client
    pnpm install
    pnpm dev
    ```

2.  **Backend:**
    ```bash
    cd apps/backend
    poetry install
    poetry run python -m app.main
    ```

3.  **Desktop (Tauri):**
    ```bash
    cd apps/desktop
    pnpm tauri dev
    ```

### Docker
You can also run the web version using Docker Compose:
```bash
docker-compose up --build
```

## Security
Recent updates include hardening against:
*   Path Traversal attacks (UUID-based storage).
*   Insecure File Uploads (Magic number MIME type verification).
*   CORS configuration for strict origin control.
