import { ReactNode } from 'react'
import { useBackendHealth } from '@/hooks/useBackendHealth'
import { useAppStore, ViewMode } from '@/store/appStore'

interface LayoutProps {
    children: ReactNode
}

export function Layout({ children }: LayoutProps) {
    const { isConnected, gpuActive } = useBackendHealth()
    const { activeView, setActiveView, openPipelineEditor } = useAppStore()

    return (
        <div className="flex flex-col h-screen overflow-hidden">
            {/* Top Navigation Bar */}
            <Header
                isConnected={isConnected}
                gpuActive={gpuActive}
                activeView={activeView}
                setActiveView={setActiveView}
                onOpenPipeline={openPipelineEditor}
            />

            {/* Main Content */}
            <div className="flex flex-1 overflow-hidden">
                {children}
            </div>
        </div>
    )
}

interface HeaderProps {
    isConnected: boolean
    gpuActive: boolean
    activeView: ViewMode
    setActiveView: (view: ViewMode) => void
    onOpenPipeline: () => void
}

function Header({ isConnected, gpuActive, activeView, setActiveView, onOpenPipeline }: HeaderProps) {
    const statusColor = isConnected && gpuActive ? 'bg-green-500' : 'bg-red-500'
    const statusText = isConnected ? (gpuActive ? 'GPU Active' : 'GPU Inactive') : 'Disconnected'

    return (
        <header className="flex shrink-0 items-center justify-between border-b border-border-dark bg-surface-dark px-4 py-2 h-12 z-20">
            <div className="flex items-center gap-4 text-white">
                {/* Logo */}
                <div className="flex items-center gap-2">
                    <div className="size-5 text-primary">
                        <svg fill="currentColor" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                            <path d="M4 4H17.3334V17.3334H30.6666V30.6666H44V44H4V4Z"></path>
                        </svg>
                    </div>
                    <h2 className="text-white text-base font-bold tracking-tight">NeuroPixel</h2>
                </div>

                <div className="h-4 w-px bg-border-dark mx-2"></div>

                {/* Menu */}
                <div className="flex items-center gap-6">
                    <a className="text-text-secondary hover:text-white text-xs font-medium transition-colors cursor-pointer" href="#">File</a>
                    <a className="text-text-secondary hover:text-white text-xs font-medium transition-colors cursor-pointer" href="#">Edit</a>
                    <a className="text-text-secondary hover:text-white text-xs font-medium transition-colors cursor-pointer" href="#">View</a>
                    <button
                        className="text-text-secondary hover:text-white text-xs font-medium transition-colors cursor-pointer"
                        onClick={onOpenPipeline}
                    >
                        Pipeline
                    </button>
                    <a className="text-text-secondary hover:text-white text-xs font-medium transition-colors cursor-pointer" href="#">Help</a>
                </div>
            </div>

            <div className="flex items-center gap-4">
                {/* View Mode Switcher */}
                <div className="bg-background-dark p-1 rounded-md border border-border-dark flex gap-1">
                    <button
                        className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors ${activeView === 'single'
                                ? 'bg-primary text-white shadow-sm'
                                : 'text-text-secondary hover:text-white hover:bg-panel-dark'
                            }`}
                        onClick={() => setActiveView('single')}
                    >
                        Single
                    </button>
                    <button
                        className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors ${activeView === 'compare'
                                ? 'bg-primary text-white shadow-sm'
                                : 'text-text-secondary hover:text-white hover:bg-panel-dark'
                            }`}
                        onClick={() => setActiveView('compare')}
                    >
                        Compare
                    </button>
                    <button
                        className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors ${activeView === 'batch'
                                ? 'bg-primary text-white shadow-sm'
                                : 'text-text-secondary hover:text-white hover:bg-panel-dark'
                            }`}
                        onClick={() => setActiveView('batch')}
                    >
                        Batch
                    </button>
                </div>

                {/* GPU Status */}
                <div className="flex items-center gap-2 text-text-secondary text-xs font-mono">
                    <span className={`w-2 h-2 rounded-full ${statusColor}`}></span>
                    {statusText}
                </div>

                {/* User Avatar */}
                <div
                    className="bg-center bg-no-repeat bg-cover rounded-full size-8 border border-border-dark bg-panel-dark flex items-center justify-center"
                >
                    <span className="material-symbols-outlined text-text-secondary text-base">person</span>
                </div>
            </div>
        </header>
    )
}
