/**
 * PipelineEditor - Modal overlay for node-based pipeline configuration
 * Extracted from: design/pipeline_configuration_editor/code.html
 */

import { useAppStore } from '@/store/appStore'

export function PipelineEditor() {
    const { isPipelineEditorOpen, closePipelineEditor } = useAppStore()

    if (!isPipelineEditorOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 lg:p-10">
            {/* Main Modal Window */}
            <div className="flex flex-col w-full h-full max-w-[1400px] max-h-[900px] bg-node-bg border border-border-dark rounded-lg shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex flex-shrink-0 items-center justify-between border-b border-border-dark bg-node-bg px-6 py-4">
                    <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-primary text-2xl">hub</span>
                            <h1 className="text-xl font-bold tracking-tight text-white">Pipeline Configuration</h1>
                        </div>
                        <p className="text-zinc-400 text-xs font-mono ml-9">ID: Untitled_Pipeline_01 • Modified: Just now</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex bg-zinc-900/50 rounded-lg p-1 border border-zinc-800 mr-4">
                            <button className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors" title="Zoom In">
                                <span className="material-symbols-outlined text-[20px]">add</span>
                            </button>
                            <button className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors" title="Zoom Out">
                                <span className="material-symbols-outlined text-[20px]">remove</span>
                            </button>
                            <button className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors" title="Fit to Screen">
                                <span className="material-symbols-outlined text-[20px]">center_focus_strong</span>
                            </button>
                        </div>
                        <button className="flex items-center gap-2 bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded text-sm font-semibold transition-colors shadow-[0_0_15px_rgba(60,131,246,0.3)]">
                            <span className="material-symbols-outlined text-[20px]">add_circle</span>
                            <span>Add Node</span>
                        </button>
                        <button
                            className="ml-4 p-2 text-zinc-500 hover:text-white transition-colors"
                            onClick={closePipelineEditor}
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>

                {/* Canvas Area (Node Editor) */}
                <div className="relative flex-1 bg-canvas-bg bg-grid-pattern overflow-hidden cursor-grab active:cursor-grabbing group">
                    {/* SVG Wires Layer */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
                        <defs>
                            <linearGradient id="wireGradient" x1="0%" x2="100%" y1="0%" y2="0%">
                                <stop offset="0%" stopColor="#3c83f6" stopOpacity="0.6"></stop>
                                <stop offset="100%" stopColor="#3c83f6" stopOpacity="1"></stop>
                            </linearGradient>
                        </defs>
                        {/* Wire 1: Input to Gaussian */}
                        <path
                            className="drop-shadow-[0_0_5px_rgba(60,131,246,0.5)]"
                            d="M 330 180 C 430 180, 430 240, 530 240"
                            fill="none"
                            stroke="url(#wireGradient)"
                            strokeWidth="3"
                        />
                        {/* Wire 2: Gaussian to Otsu */}
                        <path
                            className="drop-shadow-[0_0_5px_rgba(60,131,246,0.5)]"
                            d="M 830 240 C 900 240, 900 240, 970 240"
                            fill="none"
                            stroke="#3c83f6"
                            strokeWidth="3"
                        />
                        {/* Wire 3: Otsu to Save (dashed) */}
                        <path
                            className="opacity-50"
                            d="M 1270 240 C 1320 240, 1320 380, 1370 380"
                            fill="none"
                            stroke="#52525b"
                            strokeDasharray="5,5"
                            strokeWidth="3"
                        />
                    </svg>

                    {/* Node 1: Input Image */}
                    <NodeInputImage />

                    {/* Node 2: Gaussian Blur (Active) */}
                    <NodeGaussianBlur />

                    {/* Node 3: Otsu Threshold */}
                    <NodeOtsuThreshold />

                    {/* Node 4: Save to CSV */}
                    <NodeSaveResults />

                    {/* Floating Help/Info */}
                    <div className="absolute bottom-6 left-6 pointer-events-none">
                        <div className="bg-zinc-900/80 backdrop-blur border border-zinc-700 p-3 rounded-lg max-w-xs shadow-lg">
                            <div className="flex items-start gap-2">
                                <span className="material-symbols-outlined text-primary text-sm mt-0.5">info</span>
                                <div className="flex flex-col gap-1">
                                    <p className="text-xs text-white font-medium">Auto-Save Enabled</p>
                                    <p className="text-[10px] text-zinc-400 leading-tight">Changes to the node graph are automatically saved to your local workspace config.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Action Bar */}
                <div className="flex-shrink-0 h-16 bg-node-bg border-t border-border-dark flex items-center justify-between px-6 z-20">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-green-500 text-lg">check_circle</span>
                            <span className="text-sm text-zinc-300 font-medium">Valid Configuration</span>
                        </div>
                        <span className="h-4 w-px bg-zinc-700"></span>
                        <span className="text-xs text-zinc-500">4 Nodes, 3 Connections</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                            onClick={closePipelineEditor}
                        >
                            Cancel
                        </button>
                        <button className="px-4 py-2 text-sm font-medium text-zinc-300 border border-zinc-700 rounded bg-zinc-800 hover:bg-zinc-700 hover:text-white transition-colors">
                            Save as Preset
                        </button>
                        <button className="group relative flex items-center gap-2 bg-white text-black px-5 py-2 rounded-sm text-sm font-bold hover:bg-zinc-200 transition-all active:scale-95 shadow-[0_0_15px_rgba(255,255,255,0.15)]">
                            <span className="material-symbols-outlined text-[20px] group-hover:rotate-180 transition-transform duration-500">play_arrow</span>
                            <span>Run Batch on Folder...</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

function NodeInputImage() {
    return (
        <div className="absolute top-[100px] left-[50px] w-72 rounded bg-node-bg border border-zinc-700 shadow-xl z-20 flex flex-col">
            <div className="h-10 bg-node-header border-b border-zinc-800 rounded-t flex items-center justify-between px-3">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-orange-400 text-sm">image</span>
                    <span className="text-sm font-semibold text-white">Input Image</span>
                </div>
                <span className="material-symbols-outlined text-zinc-500 text-sm cursor-pointer hover:text-white">more_vert</span>
            </div>
            <div className="p-3 flex flex-col gap-3">
                <div className="relative w-full aspect-video bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 rounded overflow-hidden border border-zinc-800">
                    <div className="absolute bottom-1 right-1 bg-black/70 px-1.5 py-0.5 rounded text-[10px] font-mono text-zinc-300">RAW</div>
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Source</label>
                    <select className="w-full bg-zinc-900 border border-zinc-700 text-xs text-white rounded p-1.5 focus:border-primary focus:ring-0 focus:outline-none">
                        <option>Camera 01 (GigE)</option>
                        <option>File System</option>
                    </select>
                </div>
            </div>
            {/* Output Socket */}
            <div className="socket output" title="Image Out"></div>
        </div>
    )
}

function NodeGaussianBlur() {
    return (
        <div className="absolute top-[140px] left-[530px] w-80 rounded bg-node-bg border border-primary shadow-[0_0_15px_rgba(60,131,246,0.15)] z-30 flex flex-col ring-1 ring-primary/30">
            <div className="h-10 bg-gradient-to-r from-primary/20 to-node-header border-b border-primary/30 rounded-t flex items-center justify-between px-3">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-sm">blur_on</span>
                    <span className="text-sm font-semibold text-white">Gaussian Blur</span>
                </div>
                <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse"></span>
            </div>
            <div className="p-4 flex flex-col gap-4">
                {/* Sigma Slider */}
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                        <label className="text-xs text-zinc-400">Sigma</label>
                        <span className="text-xs font-mono text-primary bg-primary/10 px-1.5 rounded">2.5</span>
                    </div>
                    <div className="relative flex items-center h-4">
                        <div className="absolute w-full h-1 bg-zinc-700 rounded-full"></div>
                        <div className="absolute h-1 bg-primary rounded-full" style={{ width: '45%' }}></div>
                        <div className="absolute h-4 w-4 bg-white rounded-full shadow cursor-pointer border-2 border-primary left-[45%] -ml-2"></div>
                    </div>
                </div>
                {/* Kernel Size */}
                <div className="flex flex-col gap-1">
                    <label className="text-xs text-zinc-400">Kernel Size</label>
                    <div className="grid grid-cols-3 gap-2">
                        <button className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs py-1 rounded border border-zinc-700">3x3</button>
                        <button className="bg-primary text-white text-xs py-1 rounded border border-blue-500 font-bold">5x5</button>
                        <button className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs py-1 rounded border border-zinc-700">7x7</button>
                    </div>
                </div>
            </div>
            {/* Sockets */}
            <div className="socket input" title="Image In"></div>
            <div className="socket output" title="Blurred Image Out"></div>
        </div>
    )
}

function NodeOtsuThreshold() {
    return (
        <div className="absolute top-[180px] left-[970px] w-72 rounded bg-node-bg border border-zinc-700 shadow-xl z-20 flex flex-col hover:border-zinc-500 transition-colors">
            <div className="h-10 bg-node-header border-b border-zinc-800 rounded-t flex items-center justify-between px-3">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-400 text-sm">contrast</span>
                    <span className="text-sm font-semibold text-white">Otsu Threshold</span>
                </div>
            </div>
            <div className="p-3 flex flex-col gap-3">
                <div className="flex items-center justify-between bg-black/40 p-2 rounded border border-zinc-800/50">
                    <span className="text-xs text-zinc-500">Auto-Level</span>
                    <span className="text-sm font-mono text-emerald-400 font-bold">128</span>
                </div>
                <div className="flex gap-2">
                    <div className="h-16 flex-1 bg-zinc-900 rounded border border-zinc-800 flex items-end justify-between px-1 pb-1 gap-0.5 overflow-hidden">
                        {[20, 40, 60, 30, 90, 50, 20, 10].map((h, i) => (
                            <div
                                key={i}
                                className={`w-1 ${i === 4 ? 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]' : 'bg-zinc-700'}`}
                                style={{ height: `${h}%` }}
                            ></div>
                        ))}
                    </div>
                </div>
            </div>
            {/* Sockets */}
            <div className="socket input" title="Image In"></div>
            <div className="socket output" title="Mask Out"></div>
        </div>
    )
}

function NodeSaveResults() {
    return (
        <div className="absolute top-[320px] left-[1370px] w-80 rounded bg-node-bg border border-zinc-700 shadow-xl z-20 flex flex-col">
            <div className="h-10 bg-node-header border-b border-zinc-800 rounded-t flex items-center justify-between px-3">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-purple-400 text-sm">save</span>
                    <span className="text-sm font-semibold text-white">Save Results</span>
                </div>
            </div>
            <div className="p-4 flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Output Path</label>
                    <div className="flex items-center gap-2">
                        <input
                            className="w-full bg-zinc-900 border border-zinc-700 text-xs text-zinc-300 rounded p-1.5 focus:border-primary focus:ring-0 focus:outline-none font-mono"
                            type="text"
                            defaultValue="./output/results.csv"
                        />
                        <button className="p-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded text-zinc-400">
                            <span className="material-symbols-outlined text-[16px]">folder_open</span>
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-2 mt-1">
                    <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
                    <span className="text-xs text-yellow-500">Waiting for input...</span>
                </div>
            </div>
            {/* Sockets */}
            <div className="socket input" title="Data In"></div>
        </div>
    )
}
