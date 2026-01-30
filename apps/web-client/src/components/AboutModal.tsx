import { useAppStore } from '@/store/appStore'

export function AboutModal() {
    const { isAboutModalOpen, setAboutModalOpen } = useAppStore()

    if (!isAboutModalOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="w-[450px] bg-surface-dark border border-border-dark rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header with Pattern */}
                <div className="h-32 bg-gradient-to-br from-primary/20 to-purple-500/20 relative flex items-center justify-center border-b border-border-dark">
                    <div className="absolute inset-0 opacity-20" style={{
                        backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                        backgroundSize: '24px 24px'
                    }}></div>
                    <div className="text-center z-10">
                        <div className="bg-surface-dark/50 backdrop-blur-md p-4 rounded-full mb-2 inline-flex border border-white/10">
                            <div className="size-10 text-primary">
                                <svg fill="currentColor" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M4 4H17.3334V17.3334H30.6666V30.6666H44V44H4V4Z"></path>
                                </svg>
                            </div>
                        </div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">LumaGraph</h1>
                        <p className="text-xs text-text-secondary font-mono">v2.4.1-beta</p>
                    </div>
                    <button
                        onClick={() => setAboutModalOpen(false)}
                        className="absolute top-2 right-2 p-1 text-white/50 hover:text-white transition-colors rounded-full hover:bg-white/10"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 text-center space-y-4">
                    <p className="text-text-secondary text-sm leading-relaxed">
                        Advanced Scientific Image Analysis Workstation.<br />
                        Built with React, FastAPI, Tauri, and OpenCV.
                    </p>

                    <div className="py-2">
                        <p className="text-sm font-medium text-primary">Made with love by Luis N</p>
                    </div>

                    <a
                        href="https://github.com/lumagraph/lumagraph"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-panel-dark hover:bg-border-dark border border-border-dark rounded text-xs text-white transition-all hover:scale-105"
                    >
                        <span className="material-symbols-outlined text-[16px]">code</span>
                        View Repository
                    </a>
                </div>

                {/* Footer */}
                <div className="bg-panel-dark p-3 text-center border-t border-border-dark">
                    <p className="text-[10px] text-text-secondary">
                        © 2026 LumaGraph AI. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    )
}
