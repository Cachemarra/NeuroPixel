# Pipeline Screen — Agent Memory

> Quick-reference notes for working on the Pipeline subsystem of NeuroPixel.

## Key Files

| File                                                        | Role                                                                  | Lines |
| ----------------------------------------------------------- | --------------------------------------------------------------------- | ----- |
| `apps/web-client/src/pages/PipelineEditorPage.tsx`          | **Main full-page node-graph editor** (ReactFlow-based, ComfyUI-style) | 947   |
| `apps/web-client/src/components/PipelineEditor.tsx`         | **Legacy modal step-list editor** (still mounted in App.tsx)          | 440   |
| `apps/web-client/src/components/ContextMenu.tsx`            | Right-click menus (canvas + node) + AddNodeSubmenu                    | 202   |
| `apps/web-client/src/components/NodePalette.tsx`            | Draggable sidebar palette for adding nodes                            | 317   |
| `apps/web-client/src/components/nodes/index.ts`             | Node type registry (`nodeTypes` map)                                  | 36    |
| `apps/web-client/src/components/nodes/BaseNode.tsx`         | Shared wrapper: header, handles, collapse, resizer                    | 216   |
| `apps/web-client/src/components/nodes/OperatorNode.tsx`     | Plugin operator node with param controls                              | 132   |
| `apps/web-client/src/components/nodes/LoadImageNode.tsx`    | Image source selector node                                            | 73    |
| `apps/web-client/src/components/nodes/SaveImageNode.tsx`    | File output node (filename, format, folder picker)                    | 114   |
| `apps/web-client/src/components/nodes/PreviewNode.tsx`      | Intermediate result preview node                                      | 44    |
| `apps/web-client/src/components/nodes/LoadBatchNode.tsx`    | Batch folder input node                                               | —     |
| `apps/web-client/src/components/nodes/SaveBatchNode.tsx`    | Batch output node                                                     | —     |
| `apps/web-client/src/components/nodes/MarkdownNoteNode.tsx` | Text annotation node                                                  | —     |
| `apps/web-client/src/store/appStore.ts`                     | Zustand store: nodes, edges, pipeline history, execution state        | 500   |
| `apps/web-client/src/types/nodeGraph.ts`                    | Type definitions for all node data shapes                             | 160   |
| `apps/web-client/src/types/plugin.ts`                       | PluginSpec, PluginParam types                                         | —     |
| `apps/web-client/src/hooks/usePlugins.ts`                   | Plugin fetching + category grouping hook                              | 207   |
| `apps/backend/app/core/pipeline.py`                         | Backend Pipeline class (sequential execution)                         | 134   |
| `apps/backend/app/api/batch.py`                             | Backend batch processing API route                                    | —     |

## Architecture Notes

- **Two editors coexist**: `PipelineEditorPage` (full-page ReactFlow graph) and `PipelineEditor` (modal step-list). Both are mounted in `App.tsx`.
- The full-page editor is shown when `activeView === 'pipeline'`. The legacy modal editor shows when `isPipelineEditorOpen === true`.
- Execution in **PipelineEditorPage** is entirely **client-side**: it sorts nodes by X-position and calls `/plugins/run` sequentially — it does NOT use the backend `Pipeline` class.
- Execution in **PipelineEditor** delegates to `openBatchModal()` which uses `BatchProgressModal`.
- Pipeline history (undo/redo) uses JSON.parse/stringify for snapshot cloning — works but heavy for large graphs.
- Node connections (edges) are **ignored during execution** — the engine sorts by X-position instead of traversing the graph.
- `save_batch` and `load_batch` node types are **registered** in nodeTypes but **not handled** in the execution function of PipelineEditorPage.

## Keyboard Shortcuts

- `Ctrl+Z` / `Ctrl+Y` — Undo/Redo pipeline graph
- `Delete` / `Backspace` — Delete selected nodes
- Right-click canvas — Context menu
- Right-click node — Node context menu

## Hardcoded URLs

All API calls use `http://localhost:8005` directly (no env var / config).

## Backend Pipeline API

The backend Pipeline class exists but is only used by the `/batch/run` endpoint. The node-graph editor makes direct `/plugins/run` calls per node.
