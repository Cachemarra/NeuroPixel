import { create } from 'zustand'

export type ViewMode = 'single' | 'compare' | 'batch'

interface AppState {
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
}

export const useAppStore = create<AppState>((set) => ({
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
}))
