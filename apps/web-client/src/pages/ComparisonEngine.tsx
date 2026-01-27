/**
 * ComparisonEngine - Side-by-side image comparison view
 * Phase 4: Synchronized Comparison Engine with Swipe & Difference modes
 */

import { useState, useRef, useEffect } from 'react'
import { useAppStore } from '@/store/appStore'
import { useImageUpload } from '@/hooks/useImageUpload'
import { ComparisonEngine as ComparisonViewer } from '@/components/ComparisonEngine'

export function ComparisonEngine() {
    const { images, compareSourceA, compareSourceB, setCompareSourceA, setCompareSourceB } = useAppStore()
    const { uploadImage } = useImageUpload()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [targetSource, setTargetSource] = useState<'A' | 'B' | null>(null)
    const [metrics, setMetrics] = useState<{ ssim: number; psnr: number; mse: number } | null>(null)
    const [loadingMetrics, setLoadingMetrics] = useState(false)

    // Get current comparison images for metrics
    const imageA = images.find((img) => img.id === compareSourceA)
    const imageB = images.find((img) => img.id === compareSourceB)

    const handleSourceClick = (source: 'A' | 'B') => {
        setTargetSource(source)
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
            fileInputRef.current.click()
        }
    }

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0) return

        // Upload first file
        const imageData = await uploadImage(files[0])

        if (imageData && targetSource) {
            if (targetSource === 'A') {
                setCompareSourceA(imageData.id)
            } else {
                setCompareSourceB(imageData.id)
            }
        }
        setTargetSource(null)
    }

    useEffect(() => {
        if (!compareSourceA || !compareSourceB) {
            setMetrics(null)
            return
        }

        const fetchMetrics = async () => {
            setLoadingMetrics(true)
            try {
                const res = await fetch(`http://localhost:8000/images/compare/${compareSourceA}/${compareSourceB}`)
                if (res.ok) {
                    const data = await res.json()
                    setMetrics(data)
                }
            } catch (error) {
                console.error("Failed to fetch metrics:", error)
            } finally {
                setLoadingMetrics(false)
            }
        }

        fetchMetrics()
    }, [compareSourceA, compareSourceB])

    return (
        <>
            <input
                ref={fileInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,.tif,.tiff,.bmp"
                onChange={handleFileSelect}
                className="hidden"
            />

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
                        <div
                            className="p-3 rounded bg-panel-dark border border-border-dark cursor-pointer hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-colors group relative"
                            onClick={() => handleSourceClick('A')}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
                                    <span className="text-xs font-medium text-cyan-400">Source A</span>
                                </div>
                                <span className="material-symbols-outlined text-[16px] text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity">upload</span>
                            </div>
                            {imageA ? (
                                <div className="space-y-1 text-xs">
                                    <p className="font-mono text-white truncate">{imageA.name}</p>
                                    <p className="text-text-secondary">
                                        {imageA.metadata.width} × {imageA.metadata.height} • {imageA.metadata.bitDepth}
                                    </p>
                                </div>
                            ) : (
                                <p className="text-xs text-text-secondary/50">Click to select/upload...</p>
                            )}
                        </div>

                        {/* Image B Info */}
                        <div
                            className="p-3 rounded bg-panel-dark border border-border-dark cursor-pointer hover:border-orange-500/50 hover:bg-orange-500/5 transition-colors group relative"
                            onClick={() => handleSourceClick('B')}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                                    <span className="text-xs font-medium text-orange-400">Source B</span>
                                </div>
                                <span className="material-symbols-outlined text-[16px] text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity">upload</span>
                            </div>
                            {imageB ? (
                                <div className="space-y-1 text-xs">
                                    <p className="font-mono text-white truncate">{imageB.name}</p>
                                    <p className="text-text-secondary">
                                        {imageB.metadata.width} × {imageB.metadata.height} • {imageB.metadata.bitDepth}
                                    </p>
                                </div>
                            ) : (
                                <p className="text-xs text-text-secondary/50">Click to select/upload...</p>
                            )}
                        </div>
                    </div>

                    {imageA && imageB && (
                        <div className="space-y-3 pt-3 border-t border-border-dark">
                            <h3 className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Metrics</h3>

                            {loadingMetrics ? (
                                <div className="p-4 text-center text-xs text-text-secondary animate-pulse">
                                    Calculating metrics...
                                </div>
                            ) : metrics ? (
                                <>
                                    <MetricCard
                                        label="Structural Similarity (SSIM)"
                                        value={metrics.ssim.toFixed(4)}
                                        progress={metrics.ssim * 100}
                                        color={metrics.ssim > 0.9 ? "emerald" : metrics.ssim > 0.7 ? "amber" : "slate"}
                                    />
                                    <MetricCard
                                        label="Peak Signal-to-Noise (PSNR)"
                                        value={`${metrics.psnr.toFixed(2)} dB`}
                                        progress={Math.min((metrics.psnr / 60) * 100, 100)} // Approx scale for PSNR
                                        color={metrics.psnr > 40 ? "emerald" : metrics.psnr > 30 ? "amber" : "slate"}
                                    />
                                    <MetricCard
                                        label="Mean Squared Error (MSE)"
                                        value={metrics.mse.toFixed(2)}
                                        progress={0} // MSE is unbounded, difficult to show progress
                                        color="slate"
                                    />
                                </>
                            ) : (
                                <div className="text-center text-xs text-text-secondary">
                                    Unable to calculate metrics
                                </div>
                            )}
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
