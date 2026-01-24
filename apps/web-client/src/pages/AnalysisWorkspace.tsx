/**
 * AnalysisWorkspace - Main analysis view with file explorer, operations, and inspector panels
 * Extracted from: design/analysis_workspace_default_state/code.html
 */

export function AnalysisWorkspace() {
    return (
        <>
            {/* Left Sidebar: Toolbox (300px) */}
            <aside className="w-[300px] flex flex-col border-r border-border-dark bg-surface-dark shrink-0 z-10">
                {/* File Explorer Section */}
                <div className="flex flex-col border-b border-border-dark h-1/3 min-h-[200px]">
                    <div className="px-4 py-2 border-b border-border-dark flex justify-between items-center bg-panel-dark">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Explorer</h3>
                        <div className="flex gap-2">
                            <span className="material-symbols-outlined text-text-secondary text-[16px] cursor-pointer hover:text-white">folder_open</span>
                            <span className="material-symbols-outlined text-text-secondary text-[16px] cursor-pointer hover:text-white">refresh</span>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {/* File Item: Active */}
                        <div className="flex items-center gap-3 bg-primary/20 border border-primary/30 px-2 py-2 rounded-sm cursor-pointer group">
                            <div className="bg-gradient-to-br from-blue-500 to-cyan-400 rounded-sm size-10 shrink-0"></div>
                            <div className="flex flex-col min-w-0">
                                <p className="text-white text-xs font-medium truncate font-mono">sample_001.tiff</p>
                                <p className="text-primary text-[10px] truncate">Active • 16-bit</p>
                            </div>
                        </div>
                        {/* File Item */}
                        <div className="flex items-center gap-3 hover:bg-panel-dark px-2 py-2 rounded-sm cursor-pointer transition-colors">
                            <div className="bg-gradient-to-br from-red-500 to-orange-400 rounded-sm size-10 shrink-0 opacity-70"></div>
                            <div className="flex flex-col min-w-0">
                                <p className="text-text-secondary text-xs font-medium truncate font-mono">control_grp_b.png</p>
                                <p className="text-text-secondary/60 text-[10px] truncate">512x512 • 8-bit</p>
                            </div>
                        </div>
                        {/* File Item */}
                        <div className="flex items-center gap-3 hover:bg-panel-dark px-2 py-2 rounded-sm cursor-pointer transition-colors">
                            <div className="bg-gradient-to-br from-green-500 to-emerald-400 rounded-sm size-10 shrink-0 opacity-70"></div>
                            <div className="flex flex-col min-w-0">
                                <p className="text-text-secondary text-xs font-medium truncate font-mono">dataset_v2_final.raw</p>
                                <p className="text-text-secondary/60 text-[10px] truncate">2048x2048 • 32-bit</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Operations Accordion */}
                <div className="flex-1 overflow-y-auto border-b border-border-dark flex flex-col">
                    <div className="px-4 py-2 border-b border-border-dark bg-panel-dark">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Operations</h3>
                    </div>
                    <div className="p-2 space-y-2">
                        {/* Accordion Item: Preprocessing (Active Tool) */}
                        <details className="flex flex-col rounded-sm border border-border-dark bg-surface-dark group" open>
                            <summary className="flex cursor-pointer items-center justify-between px-3 py-2 bg-panel-dark select-none">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary text-[18px]">tune</span>
                                    <p className="text-white text-xs font-medium">Preprocessing</p>
                                </div>
                                <span className="material-symbols-outlined text-text-secondary group-open:rotate-180 transition-transform text-[18px]">expand_more</span>
                            </summary>
                            {/* Canny Edge Tool Panel */}
                            <div className="p-3 bg-surface-dark space-y-4 border-t border-border-dark">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-primary font-medium">Active: Canny Edge</span>
                                    <span className="material-symbols-outlined text-text-secondary text-[14px] cursor-pointer hover:text-white">settings</span>
                                </div>
                                {/* Sigma Slider */}
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] text-text-secondary uppercase">
                                        <span>Sigma</span>
                                        <span className="font-mono text-white">1.50</span>
                                    </div>
                                    <input className="h-1 bg-border-dark rounded-lg appearance-none cursor-pointer w-full" max="5" min="0" step="0.1" type="range" defaultValue="1.5" />
                                </div>
                                {/* Dual Threshold Inputs */}
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-text-secondary uppercase block">Low Thresh</label>
                                        <div className="flex items-center bg-background-dark border border-border-dark rounded-sm px-2 py-1 focus-within:border-primary transition-colors">
                                            <input className="bg-transparent border-none p-0 w-full text-xs font-mono text-white focus:ring-0 focus:outline-none" type="number" defaultValue="50" />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-text-secondary uppercase block">High Thresh</label>
                                        <div className="flex items-center bg-background-dark border border-border-dark rounded-sm px-2 py-1 focus-within:border-primary transition-colors">
                                            <input className="bg-transparent border-none p-0 w-full text-xs font-mono text-white focus:ring-0 focus:outline-none" type="number" defaultValue="150" />
                                        </div>
                                    </div>
                                </div>
                                <button className="w-full bg-primary hover:bg-blue-600 text-white text-xs font-medium py-1.5 rounded-sm transition-colors mt-2">
                                    Apply Filter
                                </button>
                            </div>
                        </details>

                        {/* Accordion Item: Segmentation */}
                        <details className="flex flex-col rounded-sm border border-border-dark bg-surface-dark group">
                            <summary className="flex cursor-pointer items-center justify-between px-3 py-2 bg-surface-dark hover:bg-panel-dark transition-colors select-none">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-text-secondary text-[18px]">category</span>
                                    <p className="text-text-secondary text-xs font-medium">Segmentation</p>
                                </div>
                                <span className="material-symbols-outlined text-text-secondary group-open:rotate-180 transition-transform text-[18px]">expand_more</span>
                            </summary>
                        </details>

                        {/* Accordion Item: Morphology */}
                        <details className="flex flex-col rounded-sm border border-border-dark bg-surface-dark group">
                            <summary className="flex cursor-pointer items-center justify-between px-3 py-2 bg-surface-dark hover:bg-panel-dark transition-colors select-none">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-text-secondary text-[18px]">blur_on</span>
                                    <p className="text-text-secondary text-xs font-medium">Morphology</p>
                                </div>
                                <span className="material-symbols-outlined text-text-secondary group-open:rotate-180 transition-transform text-[18px]">expand_more</span>
                            </summary>
                        </details>
                    </div>
                </div>

                <div className="p-3 mt-auto border-t border-border-dark bg-panel-dark">
                    <p className="text-[10px] text-text-secondary font-mono">v2.4.1-beta</p>
                </div>
            </aside>

            {/* Center Viewport: Canvas */}
            <main className="flex-1 flex flex-col bg-background-dark relative min-w-0">
                {/* Viewport Controls */}
                <div className="h-12 border-b border-border-dark bg-surface-dark px-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-text-secondary font-mono">50% Zoom</span>
                        <div className="h-4 w-px bg-border-dark"></div>
                        <span className="text-xs text-text-secondary font-mono">1024x1024px</span>
                    </div>
                </div>

                {/* Canvas Area */}
                <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-[#101012] bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px]">
                    {/* The Scientific Image */}
                    <div className="relative shadow-2xl shadow-black/50 border border-border-dark">
                        <div className="w-[500px] h-[500px] bg-gradient-to-br from-blue-900 via-cyan-800 to-green-900 flex items-center justify-center">
                            <div className="text-center">
                                <span className="material-symbols-outlined text-6xl text-white/30">image</span>
                                <p className="text-white/50 text-sm mt-2">Drag image here or use File Explorer</p>
                            </div>
                            {/* Overlay for ROI visualization */}
                            <div className="absolute top-1/4 left-1/4 w-32 h-32 border border-primary/80 bg-primary/10 backdrop-blur-[1px]">
                                <div className="absolute -top-4 left-0 bg-primary text-white text-[10px] px-1 font-mono">ROI 1</div>
                                {/* Resize handles */}
                                <div className="absolute -top-1 -left-1 w-2 h-2 bg-white border border-primary"></div>
                                <div className="absolute -top-1 -right-1 w-2 h-2 bg-white border border-primary"></div>
                                <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-white border border-primary"></div>
                                <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-white border border-primary"></div>
                            </div>
                        </div>
                    </div>

                    {/* Floating HUD */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-surface-dark/90 backdrop-blur-md border border-border-dark rounded-md shadow-lg p-1 flex gap-2">
                        <button className="p-2 hover:bg-panel-dark text-text-secondary hover:text-white rounded-sm transition-colors" title="Pan">
                            <span className="material-symbols-outlined text-[20px]">pan_tool</span>
                        </button>
                        <div className="w-px bg-border-dark my-1"></div>
                        <button className="p-2 hover:bg-panel-dark text-text-secondary hover:text-white rounded-sm transition-colors" title="Zoom In">
                            <span className="material-symbols-outlined text-[20px]">add</span>
                        </button>
                        <button className="p-2 hover:bg-panel-dark text-text-secondary hover:text-white rounded-sm transition-colors" title="Zoom Out">
                            <span className="material-symbols-outlined text-[20px]">remove</span>
                        </button>
                        <button className="p-2 hover:bg-panel-dark text-text-secondary hover:text-white rounded-sm transition-colors" title="Fit to Screen">
                            <span className="material-symbols-outlined text-[20px]">fit_screen</span>
                        </button>
                        <div className="w-px bg-border-dark my-1"></div>
                        <button className="p-2 hover:bg-panel-dark text-primary hover:text-blue-400 bg-primary/10 rounded-sm transition-colors" title="ROI Selection">
                            <span className="material-symbols-outlined text-[20px]">crop_free</span>
                        </button>
                    </div>
                </div>
            </main>

            {/* Right Sidebar: Inspector (350px) */}
            <aside className="w-[350px] flex flex-col border-l border-border-dark bg-surface-dark shrink-0 z-10">
                {/* Histogram Section */}
                <div className="flex flex-col h-1/3 min-h-[250px] border-b border-border-dark">
                    <div className="px-4 py-2 border-b border-border-dark bg-panel-dark flex justify-between items-center">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Histogram (RGB)</h3>
                        <span className="material-symbols-outlined text-text-secondary text-[16px] cursor-pointer">more_horiz</span>
                    </div>
                    <div className="p-4 flex-1 flex items-end justify-between gap-1 relative bg-surface-dark overflow-hidden">
                        {/* Histogram visualization */}
                        <div className="absolute inset-x-4 bottom-4 top-4 flex items-end gap-[2px] opacity-80">
                            {/* Red Channel */}
                            <div className="w-1/3 h-full flex items-end gap-[1px]">
                                {[20, 40, 80, 60, 30, 45, 90, 55, 25].map((h, i) => (
                                    <div key={i} className="w-1 bg-red-500/50 rounded-t-sm" style={{ height: `${h}%` }}></div>
                                ))}
                            </div>
                            {/* Green Channel */}
                            <div className="w-1/3 h-full flex items-end gap-[1px]">
                                {[30, 50, 95, 70, 40, 60, 85, 45, 20].map((h, i) => (
                                    <div key={i} className="w-1 bg-green-500/50 rounded-t-sm" style={{ height: `${h}%` }}></div>
                                ))}
                            </div>
                            {/* Blue Channel */}
                            <div className="w-1/3 h-full flex items-end gap-[1px]">
                                {[10, 20, 40, 30, 15, 25, 35, 20, 10].map((h, i) => (
                                    <div key={i} className="w-1 bg-blue-500/50 rounded-t-sm" style={{ height: `${h}%` }}></div>
                                ))}
                            </div>
                        </div>
                        {/* Axis Labels */}
                        <div className="absolute bottom-0 left-4 right-4 flex justify-between text-[9px] text-text-secondary font-mono">
                            <span>0</span>
                            <span>128</span>
                            <span>255</span>
                        </div>
                    </div>
                </div>

                {/* Statistics Grid */}
                <div className="flex flex-col flex-1 overflow-y-auto">
                    <div className="px-4 py-2 border-b border-border-dark bg-panel-dark">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Statistics</h3>
                    </div>
                    <div className="p-4">
                        <div className="grid grid-cols-2 gap-px bg-border-dark border border-border-dark rounded-sm overflow-hidden">
                            <StatItem label="Mean Intensity" value="124.52" />
                            <StatItem label="Std Dev" value="42.10" />
                            <StatItem label="Entropy" value="4.21" />
                            <StatItem label="Kurtosis" value="0.85" />
                            <StatItem label="Skewness" value="-0.12" />
                            <StatItem label="Max Value" value="255" />
                        </div>

                        {/* Additional Details */}
                        <div className="mt-6 space-y-3">
                            <DetailRow label="Color Space" value="RGB (sRGB)" />
                            <DetailRow label="Bit Depth" value="16-bit Unsigned" />
                            <DetailRow label="Dimensions" value="1024 x 1024" />
                        </div>
                    </div>
                </div>

                {/* Bottom Inspector Action */}
                <div className="p-4 border-t border-border-dark bg-panel-dark">
                    <button className="w-full bg-surface-dark hover:bg-border-dark border border-border-dark text-text-secondary hover:text-white text-xs font-medium py-2 rounded-sm transition-colors flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">download</span>
                        Export Statistics CSV
                    </button>
                </div>
            </aside>
        </>
    )
}

function StatItem({ label, value }: { label: string; value: string }) {
    return (
        <div className="bg-surface-dark p-3 flex flex-col gap-1">
            <span className="text-[10px] uppercase text-text-secondary">{label}</span>
            <span className="text-sm text-white font-mono">{value}</span>
        </div>
    )
}

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between items-center border-b border-border-dark pb-2">
            <span className="text-xs text-text-secondary">{label}</span>
            <span className="text-xs text-white font-medium">{value}</span>
        </div>
    )
}
