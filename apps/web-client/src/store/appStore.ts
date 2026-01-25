import { create } from 'zustand'

export type ViewMode = 'single' | 'compare' | 'batch'

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

    // Pipeline editor modal
    isPipelineEditorOpen: boolean
    openPipelineEditor: () => void
    closePipelineEditor: () => void

    // Backend connection status
    isBackendConnected: boolean
    setBackendConnected: (connected: boolean) => void

    // Upload state
    isUploading: boolean
    setUploading: (uploading: boolean) => void
}

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
                        id: newImages[existingResultIndex].id, // Keep the same ID
                    }
                    return {
                        images: newImages,
                        activeImageId: newImages[existingResultIndex].id,
                    }
                }
            }

            return {
                images: [...state.images, image],
                activeImageId: image.id,
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

    // Pipeline editor
    isPipelineEditorOpen: false,
    openPipelineEditor: () => set({ isPipelineEditorOpen: true }),
    closePipelineEditor: () => set({ isPipelineEditorOpen: false }),

    // Backend status
    isBackendConnected: false,
    setBackendConnected: (connected) => set({ isBackendConnected: connected }),

    // Upload state
    isUploading: false,
    setUploading: (uploading) => set({ isUploading: uploading }),
}))
