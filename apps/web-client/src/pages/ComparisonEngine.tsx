/**
 * ComparisonEngine - Side-by-side image comparison view
 * Phase 4: Synchronized Comparison Engine with Swipe & Difference modes
 */

import { useAppStore, CompareMode } from '@/store/appStore'
import { ComparisonEngine as ComparisonViewer } from '@/components/ComparisonEngine'

export function ComparisonEngine() {
    const { images, compareSourceA, compareSourceB } = useAppStore()

    // Get current comparison images for metrics
    const imageA = images.find((img) => img.id === compareSourceA)
    const imageB = images.find((img) => img.id === compareSourceB)

    return (
        <>
            {/* Main Comparison Viewer */}
            <div className="flex-1 flex flex-col min-w-0">
                <ComparisonViewer />
            </div>

            {/* Right Sidebar (Metrics & Reports) */}
            <aside className="w-80 bg-surface-dark border-l border-border-dark flex flex-col z-20 flex-shrink-0">
                {/* Header */}
                <div className="h-12 px-5 flex items-center justify-between border-b border-border-dark">
                    <h2 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Similarity Report</h2>
                    <button className="text-text-secondary hover:text-primary transition-colors">
                        <span className="material-symbols-outlined text-[18px]">download</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Status Card */}
                    {imageA && imageB ? (
                        <div className="flex items-center gap-3 p-3 rounded bg-emerald-500/10 border border-emerald-500/20">
                            <span className="material-symbols-outlined text-emerald-500">check_circle</span>
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-emerald-500 uppercase">Ready to Compare</span>
                                <span className="text-[10px] text-text-secondary">Both images selected</span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 p-3 rounded bg-amber-500/10 border border-amber-500/20">
                            <span className="material-symbols-outlined text-amber-500">info</span>
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-amber-500 uppercase">Select Images</span>
                                <span className="text-[10px] text-text-secondary">Choose A and B above</span>
                            </div>
                        </div>
                    )}

                    {/* Comparison Info */}
                    <div className="space-y-3">
                        <h3 className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Sources</h3>

                        {/* Image A Info */}
                        <div className="p-3 rounded bg-panel-dark border border-border-dark">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
                                <span className="text-xs font-medium text-cyan-400">Source A</span>
                            </div>
                            {imageA ? (
                                <div className="space-y-1 text-xs">
                                    <p className="font-mono text-white truncate">{imageA.name}</p>
                                    <p className="text-text-secondary">
                                        {imageA.metadata.width} × {imageA.metadata.height} • {imageA.metadata.bitDepth}
                                    </p>
                                </div>
                            ) : (
                                <p className="text-xs text-text-secondary/50">Not selected</p>
                            )}
                        </div>

                        {/* Image B Info */}
                        <div className="p-3 rounded bg-panel-dark border border-border-dark">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                                <span className="text-xs font-medium text-orange-400">Source B</span>
                            </div>
                            {imageB ? (
                                <div className="space-y-1 text-xs">
                                    <p className="font-mono text-white truncate">{imageB.name}</p>
                                    <p className="text-text-secondary">
                                        {imageB.metadata.width} × {imageB.metadata.height} • {imageB.metadata.bitDepth}
                                    </p>
                                </div>
                            ) : (
                                <p className="text-xs text-text-secondary/50">Not selected</p>
                            )}
                        </div>
                    </div>

                    {/* Metrics (placeholder until backend implementation) */}
                    {imageA && imageB && (
                        <div className="space-y-3 pt-3 border-t border-border-dark">
                            <h3 className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Metrics</h3>

                            <MetricCard label="Structural Similarity (SSIM)" value="--" progress={0} color="slate" />
                            <MetricCard label="Peak Signal-to-Noise (PSNR)" value="--" progress={0} color="slate" />
                            <MetricCard label="Mean Squared Error (MSE)" value="--" progress={0} color="slate" />

                            <p className="text-[10px] text-text-secondary/50 text-center pt-2">
                                Metrics calculated server-side (coming soon)
                            </p>
                        </div>
                    )}

                    {/* Controls Guide */}
                    <div className="space-y-2 pt-3 border-t border-border-dark">
                        <h3 className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Controls</h3>
                        <div className="space-y-1.5 text-[10px] text-text-secondary">
                            <div className="flex items-center gap-2">
                                <kbd className="px-1.5 py-0.5 bg-panel-dark border border-border-dark rounded text-[9px]">Scroll</kbd>
                                <span>Zoom in/out</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <kbd className="px-1.5 py-0.5 bg-panel-dark border border-border-dark rounded text-[9px]">Drag</kbd>
                                <span>Pan image</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <kbd className="px-1.5 py-0.5 bg-panel-dark border border-border-dark rounded text-[9px]">Handle</kbd>
                                <span>Swipe reveal (Swipe mode)</span>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    )
}

function MetricCard({
    label,
    value,
    progress,
    color
}: {
    label: string
    value: string
    progress: number
    color: 'emerald' | 'amber' | 'slate'
}) {
    const colorClasses = {
        emerald: { text: 'text-emerald-500', bg: 'bg-emerald-500' },
        amber: { text: 'text-amber-500', bg: 'bg-amber-500' },
        slate: { text: 'text-text-secondary', bg: 'bg-text-secondary' },
    }[color]

    return (
        <div className="p-3 rounded bg-panel-dark border border-border-dark">
            <p className="text-[10px] font-bold text-text-secondary/70 uppercase tracking-wider mb-1">{label}</p>
            <div className="flex items-baseline gap-2">
                <span className={`text-lg font-mono font-bold ${colorClasses.text}`}>{value}</span>
            </div>
            <div className="w-full bg-border-dark h-1 mt-2 rounded-full overflow-hidden">
                <div className={`${colorClasses.bg} h-full rounded-full transition-all`} style={{ width: `${progress}%` }}></div>
            </div>
        </div>
    )
}
