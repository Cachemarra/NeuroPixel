import { create } from 'zustand'
import { applyNodeChanges, applyEdgeChanges } from '@xyflow/react'
import type { NodeChange, EdgeChange } from '@xyflow/react'
import type { PipelineNode, PipelineEdge, NodeData } from '@/types/nodeGraph'

export type ViewMode = 'single' | 'compare' | 'batch' | 'pipeline'
export type CompareMode = 'side-by-side' | 'swipe' | 'swapbox' | 'diff'

export interface ImageMetadata {
    width: number
    height: number
    channels: number
    bitDepth: string
    fileSize: number
}

export interface ImageData {
    id: string
    name: string
    url: string
    thumbnailUrl: string
    metadata: ImageMetadata
    sourceId?: string
    isResult?: boolean
}

export interface ViewportState {
    x: number
    y: number
    zoom: number
}

export interface PipelineStep {
    id: string
    pluginName: string
    params: Record<string, any>
    active: boolean
}

export interface BatchProgress {
    jobId: string
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
    current: number
    total: number
    filename?: string
    elapsedSeconds: number
}

// History entry for undo/redo
export interface HistoryEntry {
    imageId: string
    url: string
    thumbnailUrl: string
    name: string
}

interface AppState {
    // Image management
    images: ImageData[]
    activeImageId: string | null
    addImage: (image: ImageData) => void
    updateImage: (id: string, updates: Partial<ImageData>) => void
    removeImage: (id: string) => void
    clearImages: () => void
    setActiveImage: (id: string | null) => void
    getActiveImage: () => ImageData | undefined

    // Active view mode
    activeView: ViewMode
    setActiveView: (view: ViewMode) => void

    // Edit history (undo/redo)
    editHistory: HistoryEntry[]
    historyIndex: number
    pushToHistory: (entry: HistoryEntry) => void
    undo: () => HistoryEntry | null
    redo: () => HistoryEntry | null
    canUndo: () => boolean
    canRedo: () => boolean
    clearHistory: () => void

    // Comparison state
    compareSourceA: string | null
    compareSourceB: string | null
    compareSourceC: string | null
    compareMode: CompareMode
    setCompareSourceA: (id: string | null) => void
    setCompareSourceB: (id: string | null) => void
    setCompareSourceC: (id: string | null) => void
    setCompareMode: (mode: CompareMode) => void

    // Synchronized viewport state (source of truth for both viewers)
    viewportState: ViewportState
    setViewportState: (state: Partial<ViewportState>) => void
    resetViewport: () => void

    // Pipeline editor modal
    isPipelineEditorOpen: boolean
    openPipelineEditor: () => void
    closePipelineEditor: () => void

    // Pipeline steps (legacy, kept for batch modal compatibility)
    pipelineSteps: PipelineStep[]
    pipelineName: string
    setPipelineName: (name: string) => void
    addPipelineStep: (step: PipelineStep) => void
    removePipelineStep: (id: string) => void
    updatePipelineStep: (id: string, updates: Partial<PipelineStep>) => void
    reorderPipelineSteps: (fromIndex: number, toIndex: number) => void
    clearPipeline: () => void

    // Node Graph (new ComfyUI-style workflow)
    pipelineNodes: PipelineNode[]
    pipelineEdges: PipelineEdge[]
    pipelineHistory: { nodes: PipelineNode[]; edges: PipelineEdge[] }[]
    pipelineHistoryIndex: number
    setNodes: (nodes: PipelineNode[]) => void
    setEdges: (edges: PipelineEdge[]) => void
    onNodesChange: (changes: import('@xyflow/react').NodeChange<PipelineNode>[]) => void
    onEdgesChange: (changes: import('@xyflow/react').EdgeChange<PipelineEdge>[]) => void
    addNode: (node: PipelineNode) => void
    removeNode: (nodeId: string) => void
    updateNodeData: (nodeId: string, data: Partial<NodeData>) => void
    addEdge: (edge: PipelineEdge) => void
    removeEdge: (edgeId: string) => void
    toggleNodeDisabled: (nodeId: string) => void
    clearGraph: () => void

    // Pipeline History Actions
    pushPipelineHistory: () => void
    undoPipeline: () => void
    redoPipeline: () => void
    canUndoPipeline: () => boolean
    canRedoPipeline: () => boolean

    // Pipeline execution
    isPipelineExecuting: boolean
    pipelineExecutionProgress: number
    pipelineCurrentNodeId: string | null
    pipelineExecutionStatus: string
    startPipelineExecution: () => void
    updatePipelineProgress: (progress: number, nodeId: string | null, status: string) => void
    stopPipelineExecution: () => void

    // Batch processing
    batchProgress: BatchProgress | null
    setBatchProgress: (progress: BatchProgress | null) => void
    isBatchModalOpen: boolean
    openBatchModal: () => void
    closeBatchModal: () => void
    batchInputFolder: string
    setBatchInputFolder: (folder: string) => void

    // Shortcuts modal
    isShortcutsOpen: boolean
    toggleShortcuts: () => void
    isAboutModalOpen: boolean
    setAboutModalOpen: (isOpen: boolean) => void

    // Backend connection status
    isBackendConnected: boolean
    setBackendConnected: (connected: boolean) => void

    // Upload state
    isUploading: boolean
    setUploading: (uploading: boolean) => void
}

const DEFAULT_VIEWPORT: ViewportState = { x: 0, y: 0, zoom: 1 }

export const useAppStore = create<AppState>((set, get) => ({
    // Image management
    images: [],
    activeImageId: null,
    addImage: (image) =>
        set((state) => {
            // If this is a result, check if we already have a result for this source
            if (image.isResult && image.sourceId) {
                const existingResultIndex = state.images.findIndex(
                    (img) => img.isResult && img.sourceId === image.sourceId
                )

                if (existingResultIndex !== -1) {
                    const newImages = [...state.images]
                    newImages[existingResultIndex] = {
                        ...newImages[existingResultIndex],
                        ...image,
                        id: newImages[existingResultIndex].id,
                    }
                    return {
                        images: newImages,
                        // Only keep it active if it was already active, otherwise preserve current active
                        activeImageId: state.activeImageId === newImages[existingResultIndex].id
                            ? newImages[existingResultIndex].id
                            : state.activeImageId,
                    }
                }
            }

            return {
                images: [...state.images, image],
                activeImageId: state.activeImageId || image.id,
            }
        }),
    updateImage: (id, updates) =>
        set((state) => ({
            images: state.images.map((img) => (img.id === id ? { ...img, ...updates } : img)),
        })),
    removeImage: (id) =>
        set((state) => ({
            images: state.images.filter((img) => img.id !== id),
            activeImageId: state.activeImageId === id ? null : state.activeImageId,
        })),
    clearImages: () => set({ images: [], activeImageId: null }),
    setActiveImage: (id) => set({ activeImageId: id }),
    getActiveImage: () => {
        const state = get()
        return state.images.find((img) => img.id === state.activeImageId)
    },

    // View mode
    activeView: 'single',
    setActiveView: (view) => set({ activeView: view }),

    // Edit history (undo/redo) - max 20 entries
    editHistory: [],
    historyIndex: -1,
    pushToHistory: (entry) =>
        set((state) => {
            // Truncate any redo entries when pushing new edit
            const newHistory = state.editHistory.slice(0, state.historyIndex + 1)
            newHistory.push(entry)
            // Limit to 20 entries
            if (newHistory.length > 20) {
                newHistory.shift()
            }
            return {
                editHistory: newHistory,
                historyIndex: newHistory.length - 1,
            }
        }),
    undo: () => {
        const state = get()
        if (state.historyIndex > 0) {
            const newIndex = state.historyIndex - 1
            const entry = state.editHistory[newIndex]
            set({ historyIndex: newIndex })
            return entry
        }
        return null
    },
    redo: () => {
        const state = get()
        if (state.historyIndex < state.editHistory.length - 1) {
            const newIndex = state.historyIndex + 1
            const entry = state.editHistory[newIndex]
            set({ historyIndex: newIndex })
            return entry
        }
        return null
    },
    canUndo: () => {
        const state = get()
        return state.historyIndex > 0
    },
    canRedo: () => {
        const state = get()
        return state.historyIndex < state.editHistory.length - 1
    },
    clearHistory: () => set({ editHistory: [], historyIndex: -1 }),

    // Comparison state
    compareSourceA: null,
    compareSourceB: null,
    compareSourceC: null,
    compareMode: 'side-by-side',
    setCompareSourceA: (id) => set({ compareSourceA: id }),
    setCompareSourceB: (id) => set({ compareSourceB: id }),
    setCompareSourceC: (id) => set({ compareSourceC: id }),
    setCompareMode: (mode) => set({ compareMode: mode }),

    // Synchronized viewport state
    viewportState: { ...DEFAULT_VIEWPORT },
    setViewportState: (updates) =>
        set((state) => ({
            viewportState: { ...state.viewportState, ...updates },
        })),
    resetViewport: () => set({ viewportState: { ...DEFAULT_VIEWPORT } }),

    // Pipeline editor
    isPipelineEditorOpen: false,
    openPipelineEditor: () => set({ isPipelineEditorOpen: true }),
    closePipelineEditor: () => set({ isPipelineEditorOpen: false }),

    // Pipeline steps
    pipelineSteps: [],
    pipelineName: '',
    setPipelineName: (name) => set({ pipelineName: name }),
    addPipelineStep: (step) =>
        set((state) => ({
            pipelineSteps: [...state.pipelineSteps, step],
        })),
    removePipelineStep: (id) =>
        set((state) => ({
            pipelineSteps: state.pipelineSteps.filter((s) => s.id !== id),
        })),
    updatePipelineStep: (id, updates) =>
        set((state) => ({
            pipelineSteps: state.pipelineSteps.map((s) =>
                s.id === id ? { ...s, ...updates } : s
            ),
        })),
    reorderPipelineSteps: (fromIndex, toIndex) =>
        set((state) => {
            const steps = [...state.pipelineSteps]
            const [removed] = steps.splice(fromIndex, 1)
            steps.splice(toIndex, 0, removed)
            return { pipelineSteps: steps }
        }),
    clearPipeline: () => set({ pipelineSteps: [], pipelineName: '' }),

    // Node Graph state and actions
    pipelineNodes: [],
    pipelineEdges: [],
    pipelineHistory: [],
    pipelineHistoryIndex: -1,
    setNodes: (nodes) => {
        set({ pipelineNodes: nodes })
        get().pushPipelineHistory()
    },
    setEdges: (edges) => {
        set({ pipelineEdges: edges })
        get().pushPipelineHistory()
    },
    onNodesChange: (changes: NodeChange<PipelineNode>[]) => {
        set((state) => {
            const nextNodes = applyNodeChanges(changes, state.pipelineNodes) as PipelineNode[]
            // Only push to history if this wasn't just a selection change or position change (to avoid flooding)
            // Actually, position changes should be undoable.
            return { pipelineNodes: nextNodes }
        })
    },
    onEdgesChange: (changes: EdgeChange<PipelineEdge>[]) => {
        set((state) => ({
            pipelineEdges: applyEdgeChanges(changes, state.pipelineEdges) as PipelineEdge[],
        }))
    },
    addNode: (node) =>
        set((state) => {
            const nextNodes = [...state.pipelineNodes, node]
            setTimeout(() => get().pushPipelineHistory(), 0)
            return { pipelineNodes: nextNodes }
        }),
    removeNode: (nodeId) =>
        set((state) => {
            const nextNodes = state.pipelineNodes.filter((n) => n.id !== nodeId)
            const nextEdges = state.pipelineEdges.filter(
                (e) => e.source !== nodeId && e.target !== nodeId
            )
            setTimeout(() => get().pushPipelineHistory(), 0)
            return {
                pipelineNodes: nextNodes,
                pipelineEdges: nextEdges,
            }
        }),
    updateNodeData: (nodeId, data) =>
        set((state) => {
            const nextNodes = state.pipelineNodes.map((n) =>
                n.id === nodeId
                    ? { ...n, data: { ...n.data, ...data } as NodeData }
                    : n
            )
            // Pushing to history for data changes should be debounced or explicit
            return { pipelineNodes: nextNodes }
        }),
    addEdge: (edge) =>
        set((state) => {
            const nextEdges = [...state.pipelineEdges, edge]
            setTimeout(() => get().pushPipelineHistory(), 0)
            return { pipelineEdges: nextEdges }
        }),
    removeEdge: (edgeId) =>
        set((state) => {
            const nextEdges = state.pipelineEdges.filter((e) => e.id !== edgeId)
            setTimeout(() => get().pushPipelineHistory(), 0)
            return { pipelineEdges: nextEdges }
        }),
    toggleNodeDisabled: (nodeId) =>
        set((state) => {
            const nextNodes = state.pipelineNodes.map((n) =>
                n.id === nodeId
                    ? { ...n, data: { ...n.data, disabled: !n.data.disabled } as NodeData }
                    : n
            )
            setTimeout(() => get().pushPipelineHistory(), 0)
            return { pipelineNodes: nextNodes }
        }),
    clearGraph: () => {
        set({ pipelineNodes: [], pipelineEdges: [], pipelineName: '' })
        get().pushPipelineHistory()
    },

    // Pipeline History Actions
    pushPipelineHistory: () => {
        const { pipelineNodes, pipelineEdges, pipelineHistory, pipelineHistoryIndex } = get()
        // Save current state
        const snapshot = {
            nodes: JSON.parse(JSON.stringify(pipelineNodes)),
            edges: JSON.parse(JSON.stringify(pipelineEdges)),
        }

        // Truncate redo history
        const newHistory = pipelineHistory.slice(0, pipelineHistoryIndex + 1)

        // Don't push if it's identical to last entry
        if (newHistory.length > 0) {
            const last = newHistory[newHistory.length - 1]
            if (JSON.stringify(last.nodes) === JSON.stringify(snapshot.nodes) &&
                JSON.stringify(last.edges) === JSON.stringify(snapshot.edges)) {
                return
            }
        }

        newHistory.push(snapshot)
        if (newHistory.length > 50) newHistory.shift()

        set({
            pipelineHistory: newHistory,
            pipelineHistoryIndex: newHistory.length - 1,
        })
    },
    undoPipeline: () => {
        const { pipelineHistory, pipelineHistoryIndex } = get()
        if (pipelineHistoryIndex > 0) {
            const prevIndex = pipelineHistoryIndex - 1
            const snapshot = pipelineHistory[prevIndex]
            set({
                pipelineNodes: JSON.parse(JSON.stringify(snapshot.nodes)),
                pipelineEdges: JSON.parse(JSON.stringify(snapshot.edges)),
                pipelineHistoryIndex: prevIndex,
            })
        }
    },
    redoPipeline: () => {
        const { pipelineHistory, pipelineHistoryIndex } = get()
        if (pipelineHistoryIndex < pipelineHistory.length - 1) {
            const nextIndex = pipelineHistoryIndex + 1
            const snapshot = pipelineHistory[nextIndex]
            set({
                pipelineNodes: JSON.parse(JSON.stringify(snapshot.nodes)),
                pipelineEdges: JSON.parse(JSON.stringify(snapshot.edges)),
                pipelineHistoryIndex: nextIndex,
            })
        }
    },
    canUndoPipeline: () => get().pipelineHistoryIndex > 0,
    canRedoPipeline: () => get().pipelineHistoryIndex < get().pipelineHistory.length - 1,

    // Pipeline execution
    isPipelineExecuting: false,
    pipelineExecutionProgress: 0,
    pipelineCurrentNodeId: null,
    pipelineExecutionStatus: '',
    startPipelineExecution: () => set({
        isPipelineExecuting: true,
        pipelineExecutionProgress: 0,
        pipelineCurrentNodeId: null,
        pipelineExecutionStatus: 'Starting pipeline...',
    }),
    updatePipelineProgress: (progress, nodeId, status) => set({
        pipelineExecutionProgress: progress,
        pipelineCurrentNodeId: nodeId,
        pipelineExecutionStatus: status,
    }),
    stopPipelineExecution: () => set({
        isPipelineExecuting: false,
        pipelineExecutionProgress: 0,
        pipelineCurrentNodeId: null,
        pipelineExecutionStatus: '',
    }),

    // Batch processing
    batchProgress: null,
    setBatchProgress: (progress) => set({ batchProgress: progress }),
    isBatchModalOpen: false,
    openBatchModal: () => set({ isBatchModalOpen: true }),
    closeBatchModal: () => set({ isBatchModalOpen: false, batchProgress: null }),
    batchInputFolder: '/mnt/HDD/data',
    setBatchInputFolder: (folder) => set({ batchInputFolder: folder }),

    // Shortcuts
    isShortcutsOpen: false,
    toggleShortcuts: () => set((state) => ({ isShortcutsOpen: !state.isShortcutsOpen })),
    isAboutModalOpen: false,
    setAboutModalOpen: (isOpen) => set({ isAboutModalOpen: isOpen }),

    // Backend status
    isBackendConnected: false,
    setBackendConnected: (connected) => set({ isBackendConnected: connected }),

    // Upload state
    isUploading: false,
    setUploading: (uploading) => set({ isUploading: uploading }),
}))
