/**
 * ComparisonEngine - Side-by-side image comparison view
 * Extracted from: design/comparison_engine_diff_mode/code.html
 */

import { useState } from 'react'

type ViewModeType = 'sbs' | 'swipe' | 'heatmap'

export function ComparisonEngine() {
    const [viewMode, setViewMode] = useState<ViewModeType>('sbs')

    return (
        <>
            {/* Left Navigation Sidebar */}
            <aside className="w-64 flex flex-col border-r border-white/10 bg-background-dark z-20 flex-shrink-0">
                {/* Brand Header */}
                <div className="h-16 flex items-center gap-3 px-4 border-b border-white/10">
                    <div className="bg-primary/20 rounded-full size-8 flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined text-[20px]">blur_on</span>
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-base font-semibold leading-none tracking-tight">NeuroPixel</h1>
                        <p className="text-[#9ca7ba] text-xs font-normal mt-1">v2.4.1 (Pro)</p>
                    </div>
                </div>

                {/* Navigation Items */}
                <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
                    <NavItem icon="folder_open" label="Projects" />
                    <NavItem icon="database" label="Datasets" />

                    <div className="my-2 border-t border-white/10"></div>
                    <div className="px-3 py-2 text-xs font-bold text-[#5a6b85] uppercase tracking-wider">Analysis</div>

                    <NavItem icon="psychology" label="Model Training" />
                    <NavItem icon="compare" label="Comparison Engine" active />
                    <NavItem icon="bar_chart" label="Analytics" />
                </nav>

                {/* Bottom Actions */}
                <div className="p-4 border-t border-white/10">
                    <NavItem icon="settings" label="Settings" />
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0 bg-[#0b0e14]">
                {/* Top Toolbar */}
                <header className="h-16 flex items-center justify-between px-4 gap-4 border-b border-white/10 bg-background-dark z-10 shadow-sm">
                    {/* Source Selectors */}
                    <div className="flex items-center gap-3 flex-1 max-w-2xl">
                        {/* Source A */}
                        <SourceSelector label="Original" options={['scan_0041_raw.tiff', 'scan_0042_raw.tiff', 'scan_0043_raw.tiff']} />

                        <div className="text-slate-600">
                            <span className="material-symbols-outlined text-lg">arrow_forward</span>
                        </div>

                        {/* Source B */}
                        <SourceSelector label="Processed" labelColor="text-primary" options={['model_v4_output.tiff', 'model_v4_output_hq.tiff', 'model_v3_legacy.tiff']} />
                    </div>

                    {/* View Mode Segmented Controls */}
                    <div className="flex bg-[#282e39] p-1 rounded h-10 items-center">
                        <ViewModeButton icon="splitscreen" label="Side-by-Side" value="sbs" current={viewMode} onChange={setViewMode} />
                        <ViewModeButton icon="compare" label="Swipe" value="swipe" current={viewMode} onChange={setViewMode} />
                        <ViewModeButton icon="blur_on" label="Heatmap" value="heatmap" current={viewMode} onChange={setViewMode} />
                    </div>

                    {/* Sync Button */}
                    <button className="h-10 px-4 flex items-center gap-2 bg-primary hover:bg-blue-600 text-white rounded shadow-sm hover:shadow transition-all text-xs font-bold tracking-wide uppercase">
                        <span className="material-symbols-outlined text-[18px]">lock</span>
                        Sync Pan/Zoom
                    </button>
                </header>

                {/* Canvas Workspace */}
                <div className="flex-1 flex relative overflow-hidden bg-[#05080f]">
                    {/* Grid Background Pattern */}
                    <div
                        className="absolute inset-0 z-0 opacity-10 pointer-events-none"
                        style={{
                            backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)',
                            backgroundSize: '40px 40px'
                        }}
                    ></div>

                    {/* Left Canvas (Original) */}
                    <CanvasPane label="scan_0041_raw.tiff" side="left" />

                    {/* Right Canvas (Processed) */}
                    <CanvasPane label="model_v4_output.tiff" side="right" />
                </div>
            </main>

            {/* Right Sidebar (Metrics & Reports) */}
            <aside className="w-80 bg-background-dark border-l border-white/10 flex flex-col z-20 flex-shrink-0">
                {/* Header */}
                <div className="h-16 px-5 flex items-center justify-between border-b border-white/10">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-200">Similarity Report</h2>
                    <button className="text-slate-400 hover:text-primary transition-colors">
                        <span className="material-symbols-outlined text-[20px]">download</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-6">
                    {/* Overall Status */}
                    <div className="flex items-center gap-3 p-3 rounded bg-emerald-500/10 border border-emerald-500/20">
                        <span className="material-symbols-outlined text-emerald-500">check_circle</span>
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-emerald-500 uppercase">Match Passed</span>
                            <span className="text-[10px] text-slate-400">Threshold &gt; 0.90 met</span>
                        </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid gap-3">
                        <MetricCard
                            label="Structural Similarity (SSIM)"
                            value="0.9241"
                            change="+0.02"
                            progress={92}
                            color="emerald"
                        />
                        <MetricCard
                            label="Peak Signal-to-Noise (PSNR)"
                            value="28.4 dB"
                            suffix="avg"
                            progress={65}
                            color="amber"
                        />
                        <MetricCard
                            label="Mean Squared Error (MSE)"
                            value="154.2"
                            progress={25}
                            color="slate"
                        />
                    </div>

                    {/* Luma Distribution */}
                    <div className="pt-4 border-t border-white/10">
                        <div className="flex justify-between items-center mb-3">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Luma Distribution</p>
                            <span className="text-[10px] text-primary cursor-pointer hover:underline">Detailed View</span>
                        </div>
                        <div className="h-24 w-full flex items-end justify-between gap-[2px]">
                            {[20, 30, 45, 40, 60, 75, 80, 90, 65, 50, 55, 60, 70, 85, 95, 80, 60, 50, 40, 30, 20, 10].map((h, i) => {
                                const isPrimary = i >= 14 && i <= 16
                                return (
                                    <div
                                        key={i}
                                        className={`w-1 ${isPrimary ? 'bg-primary' : 'bg-slate-700'}`}
                                        style={{ height: `${h}%`, opacity: isPrimary ? 1 : 0.4 + (i / 22) * 0.6 }}
                                    ></div>
                                )
                            })}
                        </div>
                        <div className="flex justify-between mt-1 text-[10px] font-mono text-slate-500">
                            <span>0</span>
                            <span>128</span>
                            <span>255</span>
                        </div>
                    </div>

                    {/* Metadata Table */}
                    <div className="pt-4 border-t border-white/10">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Metadata Diff</p>
                        <div className="text-xs font-mono space-y-2">
                            <MetadataRow label="Resolution" valueA="2048x2048" valueB="2048x2048" />
                            <MetadataRow label="Channels" valueA="1 (Gray)" valueB="1 (Gray)" />
                            <MetadataRow label="Bit Depth" valueA="16-bit" valueB="32-bit (Float)" highlight />
                        </div>
                    </div>
                </div>
            </aside>
        </>
    )
}

function NavItem({ icon, label, active = false }: { icon: string; label: string; active?: boolean }) {
    return (
        <a className={`flex items-center gap-3 px-3 py-2 rounded transition-colors group ${active
                ? 'bg-primary/10 text-primary'
                : 'text-[#9ca7ba] hover:bg-[#1f2633]'
            }`} href="#">
            <span className={`material-symbols-outlined text-[20px] ${active ? 'fill-current' : 'group-hover:text-primary'}`}>{icon}</span>
            <span className="text-sm font-medium">{label}</span>
        </a>
    )
}

function SourceSelector({ label, labelColor = 'text-slate-500', options }: { label: string; labelColor?: string; options: string[] }) {
    return (
        <div className="relative group flex-1">
            <label className={`absolute -top-2.5 left-2 bg-background-dark px-1 text-[10px] font-bold ${labelColor} uppercase tracking-wider z-10`}>
                {label}
            </label>
            <div className="relative">
                <select className="w-full h-10 pl-3 pr-8 bg-[#1b2027] border border-[#3b4454] rounded text-sm text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none cursor-pointer font-mono">
                    {options.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-slate-400">
                    <span className="material-symbols-outlined text-lg">expand_more</span>
                </div>
            </div>
        </div>
    )
}

function ViewModeButton({
    icon,
    label,
    value,
    current,
    onChange
}: {
    icon: string;
    label: string;
    value: ViewModeType;
    current: ViewModeType;
    onChange: (v: ViewModeType) => void
}) {
    const isActive = current === value
    return (
        <button
            className={`cursor-pointer relative px-4 h-full flex items-center justify-center rounded transition-all font-medium text-xs ${isActive
                    ? 'bg-[#111418] shadow-sm text-primary'
                    : 'text-[#9ca7ba] hover:text-white'
                }`}
            onClick={() => onChange(value)}
        >
            <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">{icon}</span>
                <span>{label}</span>
            </span>
        </button>
    )
}

function CanvasPane({ label, side }: { label: string; side: 'left' | 'right' }) {
    const borderClass = side === 'left' ? 'border-r border-slate-800' : ''

    return (
        <div className={`flex-1 relative group overflow-hidden ${borderClass}`}>
            <div className="w-full h-full flex items-center justify-center p-8">
                <div className="relative w-full h-full max-w-2xl max-h-[600px] shadow-2xl border border-slate-800 bg-black flex items-center justify-center">
                    <div className="text-center">
                        <span className="material-symbols-outlined text-6xl text-white/20">image</span>
                        <p className="text-white/30 text-sm mt-2">{side === 'left' ? 'Original' : 'Processed'}</p>
                    </div>
                    {/* Crosshair Overlay */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 border border-primary/50 rounded-full flex items-center justify-center pointer-events-none">
                        <div className="w-1 h-1 bg-primary rounded-full"></div>
                    </div>
                </div>
            </div>

            {/* HUD Overlays */}
            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm border border-white/10 px-2 py-1 rounded text-xs font-mono text-slate-300">
                SRC: {label}
            </div>
            <div className="absolute bottom-4 left-4 flex gap-2">
                <div className="bg-black/80 backdrop-blur-sm border border-white/10 px-2 py-1 rounded text-[10px] font-mono text-primary font-bold">
                    ZOOM: 125%
                </div>
                <div className="bg-black/80 backdrop-blur-sm border border-white/10 px-2 py-1 rounded text-[10px] font-mono text-slate-400">
                    X: 1042 Y: 512
                </div>
            </div>
        </div>
    )
}

function MetricCard({
    label,
    value,
    change,
    suffix,
    progress,
    color
}: {
    label: string;
    value: string;
    change?: string;
    suffix?: string;
    progress: number;
    color: 'emerald' | 'amber' | 'slate'
}) {
    const colorClasses = {
        emerald: { text: 'text-emerald-500', bg: 'bg-emerald-500', badge: 'text-emerald-600 bg-emerald-100' },
        amber: { text: 'text-amber-500', bg: 'bg-amber-500', badge: '' },
        slate: { text: 'text-slate-300', bg: 'bg-slate-400', badge: '' },
    }[color]

    return (
        <div className="p-4 rounded bg-[#1b2027] border border-[#3b4454] shadow-sm relative overflow-hidden group">
            {change && (
                <div className="absolute top-0 right-0 p-2 opacity-50 group-hover:opacity-100 transition-opacity">
                    <span className="material-symbols-outlined text-slate-600 text-[16px]">info</span>
                </div>
            )}
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
            <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-mono font-bold ${colorClasses.text}`}>{value}</span>
                {change && (
                    <span className={`text-xs font-medium ${colorClasses.badge} px-1.5 py-0.5 rounded`}>{change}</span>
                )}
                {suffix && (
                    <span className="text-xs font-medium text-slate-400">{suffix}</span>
                )}
            </div>
            <div className="w-full bg-slate-700 h-1 mt-3 rounded-full overflow-hidden">
                <div className={`${colorClasses.bg} h-full rounded-full`} style={{ width: `${progress}%` }}></div>
            </div>
        </div>
    )
}

function MetadataRow({ label, valueA, valueB, highlight = false }: { label: string; valueA: string; valueB: string; highlight?: boolean }) {
    return (
        <div className="flex justify-between">
            <span className="text-slate-500">{label}</span>
            <span className="text-slate-200">
                {valueA} <span className="text-slate-600">vs</span>{' '}
                <span className={highlight ? 'text-amber-500' : ''}>{valueB}</span>
            </span>
        </div>
    )
}
