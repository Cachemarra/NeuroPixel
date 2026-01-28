import { create } from 'zustand'

export type ViewMode = 'single' | 'compare' | 'batch' | 'pipeline'
export type CompareMode = 'side-by-side' | 'swipe' | 'diff'

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

interface AppState {
    // Image management
    images: ImageData[]
    activeImageId: string | null
    addImage: (image: ImageData) => void
    updateImage: (id: string, updates: Partial<ImageData>) => void
    removeImage: (id: string) => void
    setActiveImage: (id: string | null) => void
    getActiveImage: () => ImageData | undefined

    // Active view mode
    activeView: ViewMode
    setActiveView: (view: ViewMode) => void

    // Comparison state
    compareSourceA: string | null
    compareSourceB: string | null
    compareMode: CompareMode
    setCompareSourceA: (id: string | null) => void
    setCompareSourceB: (id: string | null) => void
    setCompareMode: (mode: CompareMode) => void

    // Synchronized viewport state (source of truth for both viewers)
    viewportState: ViewportState
    setViewportState: (state: Partial<ViewportState>) => void
    resetViewport: () => void

    // Pipeline editor modal
    isPipelineEditorOpen: boolean
    openPipelineEditor: () => void
    closePipelineEditor: () => void

    // Pipeline steps
    pipelineSteps: PipelineStep[]
    pipelineName: string
    setPipelineName: (name: string) => void
    addPipelineStep: (step: PipelineStep) => void
    removePipelineStep: (id: string) => void
    updatePipelineStep: (id: string, updates: Partial<PipelineStep>) => void
    reorderPipelineSteps: (fromIndex: number, toIndex: number) => void
    clearPipeline: () => void

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
                        activeImageId: newImages[existingResultIndex].id,
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
    setActiveImage: (id) => set({ activeImageId: id }),
    getActiveImage: () => {
        const state = get()
        return state.images.find((img) => img.id === state.activeImageId)
    },

    // View mode
    activeView: 'single',
    setActiveView: (view) => set({ activeView: view }),

    // Comparison state
    compareSourceA: null,
    compareSourceB: null,
    compareMode: 'side-by-side',
    setCompareSourceA: (id) => set({ compareSourceA: id }),
    setCompareSourceB: (id) => set({ compareSourceB: id }),
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

    // Backend status
    isBackendConnected: false,
    setBackendConnected: (connected) => set({ isBackendConnected: connected }),

    // Upload state
    isUploading: false,
    setUploading: (uploading) => set({ isUploading: uploading }),
}))
