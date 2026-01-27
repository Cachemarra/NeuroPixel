/**
 * AnalysisWorkspace - Main analysis view with file explorer, operations, and inspector panels
 * PHASE 3: Dynamic plugin system with auto-generated UI
 */

import { useRef, useState, useEffect } from 'react'
import { useAppStore } from '@/store/appStore'
import { useImageUpload } from '@/hooks/useImageUpload'
import { usePluginsByCategory } from '@/hooks/usePlugins'
import { PluginController } from '@/components/PluginController'
import type { PluginSpec } from '@/types/plugin'

const API_BASE = 'http://localhost:8000'

export function AnalysisWorkspace() {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const { images, activeImageId, setActiveImage, addImage, isUploading } = useAppStore()
    const { uploadImage } = useImageUpload()
    const { categories, isLoading: pluginsLoading } = usePluginsByCategory()

    // Poll for images every 3 seconds to sync across tabs
    useEffect(() => {
        const fetchImages = async () => {
            try {
                const response = await fetch(`${API_BASE}/images`)
                if (!response.ok) return
                const data = await response.json()

                // Get current image IDs to avoid duplicates
                const currentState = useAppStore.getState()
                const existingIds = new Set(currentState.images.map(img => img.id))

                // Only add images that don't already exist
                data.forEach((img: any) => {
                    if (!existingIds.has(img.id)) {
                        addImage({
                            id: img.id,
                            name: img.name,
                            url: img.url,
                            thumbnailUrl: img.thumbnail_url,
                            sourceId: img.source_id,
                            isResult: !!img.source_id,
                            metadata: {
                                width: img.metadata.width,
                                height: img.metadata.height,
                                channels: img.metadata.channels,
                                bitDepth: img.metadata.bit_depth,
                                fileSize: img.metadata.file_size,
                            }
                        })
                    }
                })
            } catch (error) {
                // Silent error on polling
            }
        }

        fetchImages() // Initial fetch
        const interval = setInterval(fetchImages, 3000)
        return () => clearInterval(interval)
    }, [])

    // Track which plugin is currently selected
    const [activePlugin, setActivePlugin] = useState<PluginSpec | null>(null)
    const [openCategory, setOpenCategory] = useState<string | null>(null)

    // Get active image data
    const activeImage = images.find(img => img.id === activeImageId)

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0) return

        for (const file of Array.from(files)) {
            await uploadImage(file)
        }
        e.target.value = ''
    }

    // Drag and Drop Handlers
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
    }

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()

        const files = e.dataTransfer.files
        if (!files || files.length === 0) return

        for (const file of Array.from(files)) {
            await uploadImage(file)
        }
    }


    const handleImportClick = () => {
        fileInputRef.current?.click()
    }

    const handleCategoryToggle = (category: string) => {
        if (openCategory === category) {
            setOpenCategory(null)
        } else {
            setOpenCategory(category)
            // Auto-select first plugin in category
            const plugins = categories[category]
            if (plugins && plugins.length > 0) {
                setActivePlugin(plugins[0])
            }
        }
    }

    const handlePluginSelect = (plugin: PluginSpec) => {
        setActivePlugin(plugin)
    }

    // Category icon mapping
    const categoryIcons: Record<string, string> = {
        'Preprocessing': 'tune',
        'Edge Detection': 'line_curve',
        'Segmentation': 'category',
        'Morphology': 'blur_on',
    }

    return (
        <div
            className="flex h-screen w-screen overflow-hidden"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,.tif,.tiff,.bmp"
                multiple
                onChange={handleFileSelect}
                className="hidden"
            />

            {/* Left Sidebar: Toolbox (300px) */}
            <aside className="w-[300px] flex flex-col border-r border-border-dark bg-surface-dark shrink-0 z-10">
                {/* File Explorer Section */}
                <div className="flex flex-col border-b border-border-dark h-1/3 min-h-[200px]">
                    <div className="px-4 py-2 border-b border-border-dark flex justify-between items-center bg-panel-dark">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Explorer</h3>
                        <div className="flex gap-2">
                            <button
                                onClick={handleImportClick}
                                className="material-symbols-outlined text-text-secondary text-[16px] cursor-pointer hover:text-white hover:text-primary transition-colors"
                                title="Import Images"
                            >
                                add_photo_alternate
                            </button>
                            <span className="material-symbols-outlined text-text-secondary text-[16px] cursor-pointer hover:text-white">folder_open</span>
                            <span className="material-symbols-outlined text-text-secondary text-[16px] cursor-pointer hover:text-white">refresh</span>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {/* Upload indicator */}
                        {isUploading && (
                            <div className="flex items-center gap-3 bg-primary/10 border border-primary/20 px-2 py-2 rounded-sm animate-pulse">
                                <div className="size-10 shrink-0 bg-primary/20 rounded-sm flex items-center justify-center">
                                    <span className="material-symbols-outlined text-primary text-[18px] animate-spin">progress_activity</span>
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <p className="text-primary text-xs font-medium">Uploading...</p>
                                </div>
                            </div>
                        )}

                        {/* Empty state */}
                        {images.length === 0 && !isUploading && (
                            <div
                                className="flex flex-col items-center justify-center py-8 text-center cursor-pointer hover:bg-panel-dark rounded-sm transition-colors"
                                onClick={handleImportClick}
                            >
                                <span className="material-symbols-outlined text-text-secondary/50 text-4xl mb-2">add_photo_alternate</span>
                                <p className="text-text-secondary/50 text-xs">Click to import images</p>
                                <p className="text-text-secondary/30 text-[10px] mt-1">PNG, JPG, TIFF supported</p>
                            </div>
                        )}

                        {/* Dynamic file list from store */}
                        {images.map((image) => {
                            const isActive = image.id === activeImageId
                            return (
                                <div
                                    key={image.id}
                                    onClick={() => setActiveImage(image.id)}
                                    className={`flex items-center gap-3 px-2 py-2 rounded-sm cursor-pointer transition-colors ${isActive
                                        ? 'bg-primary/20 border border-primary/30'
                                        : 'hover:bg-panel-dark border border-transparent'
                                        }`}
                                >
                                    {/* Thumbnail */}
                                    <div
                                        className="rounded-sm size-10 shrink-0 bg-cover bg-center border border-border-dark"
                                        style={{ backgroundImage: `url(${image.thumbnailUrl})` }}
                                    />
                                    <div className="flex flex-col min-w-0">
                                        <p className={`text-xs font-medium truncate font-mono ${isActive ? 'text-white' : 'text-text-secondary'}`}>
                                            {image.name}
                                        </p>
                                        <p className={`text-[10px] truncate ${isActive ? 'text-primary' : 'text-text-secondary/60'}`}>
                                            {isActive ? 'Active • ' : ''}{image.metadata.width}x{image.metadata.height} • {image.metadata.bitDepth}
                                        </p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Operations Accordion - DYNAMIC */}
                <div className="flex-1 overflow-y-auto border-b border-border-dark flex flex-col">
                    <div className="px-4 py-2 border-b border-border-dark bg-panel-dark">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Operations</h3>
                    </div>
                    <div className="p-2 space-y-2">
                        {pluginsLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <span className="material-symbols-outlined text-text-secondary animate-spin">progress_activity</span>
                            </div>
                        ) : (
                            Object.entries(categories).map(([category, plugins]) => {
                                const isOpen = openCategory === category
                                const icon = categoryIcons[category] || 'extension'
                                const hasActivePlugin = activePlugin && plugins.some(p => p.name === activePlugin.name)

                                return (
                                    <div key={category} className="flex flex-col rounded-sm border border-border-dark bg-surface-dark">
                                        {/* Category Header */}
                                        <button
                                            onClick={() => handleCategoryToggle(category)}
                                            className={`flex cursor-pointer items-center justify-between px-3 py-2 select-none transition-colors ${isOpen ? 'bg-panel-dark' : 'bg-surface-dark hover:bg-panel-dark'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className={`material-symbols-outlined text-[18px] ${hasActivePlugin ? 'text-primary' : 'text-text-secondary'}`}>
                                                    {icon}
                                                </span>
                                                <p className={`text-xs font-medium ${hasActivePlugin ? 'text-white' : 'text-text-secondary'}`}>
                                                    {category}
                                                </p>
                                                <span className="text-[10px] text-text-secondary/50">({plugins.length})</span>
                                            </div>
                                            <span className={`material-symbols-outlined text-text-secondary transition-transform text-[18px] ${isOpen ? 'rotate-180' : ''}`}>
                                                expand_more
                                            </span>
                                        </button>

                                        {/* Plugin List & Controller */}
                                        {isOpen && (
                                            <div className="border-t border-border-dark">
                                                {/* Plugin selector tabs */}
                                                {plugins.length > 1 && (
                                                    <div className="flex border-b border-border-dark">
                                                        {plugins.map((plugin) => {
                                                            const isActive = activePlugin?.name === plugin.name
                                                            return (
                                                                <button
                                                                    key={plugin.name}
                                                                    onClick={() => handlePluginSelect(plugin)}
                                                                    className={`flex-1 px-2 py-1.5 text-[10px] font-medium transition-colors ${isActive
                                                                        ? 'text-primary border-b-2 border-primary bg-primary/5'
                                                                        : 'text-text-secondary hover:text-white hover:bg-panel-dark'
                                                                        }`}
                                                                    title={plugin.description}
                                                                >
                                                                    {plugin.display_name}
                                                                </button>
                                                            )
                                                        })}
                                                    </div>
                                                )}

                                                {/* Plugin Controller */}
                                                {activePlugin && plugins.some(p => p.name === activePlugin.name) && (
                                                    <PluginController spec={activePlugin} />
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )
                            })
                        )}
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
                        <span className="text-xs text-text-secondary font-mono">100% Zoom</span>
                        <div className="h-4 w-px bg-border-dark"></div>
                        <span className="text-xs text-text-secondary font-mono">
                            {activeImage ? `${activeImage.metadata.width}x${activeImage.metadata.height}px` : 'No image'}
                        </span>
                    </div>
                </div>

                {/* Canvas Area */}
                <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-[#101012] bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px]">
                    {/* Dynamic Image or Placeholder */}
                    <div className="relative shadow-2xl shadow-black/50 border border-border-dark">
                        {activeImage ? (
                            /* Display the active image */
                            <img
                                src={activeImage.url}
                                alt={activeImage.name}
                                className="max-w-[80vw] max-h-[70vh] object-contain"
                                style={{ imageRendering: 'auto' }}
                            />
                        ) : (
                            /* Placeholder when no image */
                            <div
                                className="w-[500px] h-[500px] bg-gradient-to-br from-blue-900/20 via-cyan-800/20 to-green-900/20 flex items-center justify-center cursor-pointer hover:bg-white/5 transition-colors"
                                onClick={handleImportClick}
                            >
                                <div className="text-center">
                                    <span className="material-symbols-outlined text-6xl text-white/30">add_photo_alternate</span>
                                    <p className="text-white/50 text-sm mt-2">Click to import an image</p>
                                    <p className="text-white/30 text-xs mt-1">or drag & drop</p>
                                </div>
                            </div>
                        )}
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
                            <StatItem label="Mean Intensity" value={activeImage ? "124.52" : "--"} />
                            <StatItem label="Std Dev" value={activeImage ? "42.10" : "--"} />
                            <StatItem label="Entropy" value={activeImage ? "4.21" : "--"} />
                            <StatItem label="Kurtosis" value={activeImage ? "0.85" : "--"} />
                            <StatItem label="Skewness" value={activeImage ? "-0.12" : "--"} />
                            <StatItem label="Max Value" value={activeImage ? "255" : "--"} />
                        </div>

                        {/* Additional Details - Dynamic from metadata */}
                        <div className="mt-6 space-y-3">
                            <DetailRow
                                label="Color Space"
                                value={activeImage ? (activeImage.metadata.channels === 1 ? "Grayscale" : "RGB (sRGB)") : "--"}
                            />
                            <DetailRow
                                label="Bit Depth"
                                value={activeImage?.metadata.bitDepth || "--"}
                            />
                            <DetailRow
                                label="Dimensions"
                                value={activeImage ? `${activeImage.metadata.width} x ${activeImage.metadata.height}` : "--"}
                            />
                            <DetailRow
                                label="File Size"
                                value={activeImage ? formatFileSize(activeImage.metadata.fileSize) : "--"}
                            />
                        </div>
                    </div>
                </div>

                {/* Bottom Inspector Action */}
                <div className="p-4 border-t border-border-dark bg-panel-dark">
                    <button
                        className="w-full bg-surface-dark hover:bg-border-dark border border-border-dark text-text-secondary hover:text-white text-xs font-medium py-2 rounded-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!activeImage}
                    >
                        <span className="material-symbols-outlined text-[16px]">download</span>
                        Export Statistics CSV
                    </button>
                </div>
            </aside>
        </div>
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

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
