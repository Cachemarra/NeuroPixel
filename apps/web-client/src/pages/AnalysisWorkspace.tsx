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

const API_BASE = 'http://localhost:8001'

export function AnalysisWorkspace() {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const { images, activeImageId, setActiveImage, addImage, isUploading, viewportState, setViewportState, resetViewport } = useAppStore()
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

    // UI State
    const [leftSidebarOpen, setLeftSidebarOpen] = useState(true)
    const [rightSidebarOpen, setRightSidebarOpen] = useState(true)

    // Histogram and statistics state
    const [histogramData, setHistogramData] = useState<Record<string, number[]> | null>(null)
    const [statisticsData, setStatisticsData] = useState<{
        mean: number
        std: number
        min: number
        max: number
        entropy: number
        skewness: number
        kurtosis: number
    } | null>(null)
    const [visibleChannels, setVisibleChannels] = useState<Set<string>>(new Set(['red', 'green', 'blue', 'gray']))

    // Rotation preview state for real-time preview
    const [rotationPreview, setRotationPreview] = useState(0)

    // Interaction state
    const [isDragging, setIsDragging] = useState(false)
    const lastMousePos = useRef<{ x: number, y: number } | null>(null)

    // Pan/Zoom handlers
    const handleWheel = (e: React.WheelEvent) => {
        if (!activeImageId) return
        e.preventDefault()
        const delta = -e.deltaY * 0.001
        const newZoom = Math.min(Math.max(viewportState.zoom + delta, 0.1), 10)

        // TODO: Zoom towards mouse pointer (currently center)
        setViewportState({ zoom: newZoom })
    }

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!activeImageId) return
        setIsDragging(true)
        lastMousePos.current = { x: e.clientX, y: e.clientY }
    }

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !lastMousePos.current) return

        const dx = e.clientX - lastMousePos.current.x
        const dy = e.clientY - lastMousePos.current.y

        setViewportState({
            x: viewportState.x + dx,
            y: viewportState.y + dy
        })

        lastMousePos.current = { x: e.clientX, y: e.clientY }
    }

    const handleMouseUp = () => {
        setIsDragging(false)
        lastMousePos.current = null
    }
    // Fetch histogram and statistics when activeImageId changes
    useEffect(() => {
        if (!activeImageId) {
            setHistogramData(null)
            setStatisticsData(null)
            return
        }

        const fetchData = async () => {
            try {
                // Fetch histogram
                const histResponse = await fetch(`${API_BASE}/images/${activeImageId}/histogram?bins=64`)
                if (histResponse.ok) {
                    const histData = await histResponse.json()
                    setHistogramData(histData.channels)
                }

                // Fetch statistics
                const statsResponse = await fetch(`${API_BASE}/images/${activeImageId}/statistics`)
                if (statsResponse.ok) {
                    const statsData = await statsResponse.json()
                    setStatisticsData(statsData)
                }
            } catch (err) {
                console.error('Failed to fetch image data:', err)
            }
        }

        fetchData()
    }, [activeImageId])

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
            {leftSidebarOpen && (
                <aside className="w-[300px] flex flex-col border-r border-border-dark bg-surface-dark shrink-0 z-10 relative">
                    {/* Collapse Button */}
                    <button
                        onClick={() => setLeftSidebarOpen(false)}
                        className="absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-6 h-12 bg-surface-dark border border-border-dark rounded-r-md flex items-center justify-center text-text-secondary hover:text-white hover:bg-panel-dark cursor-pointer shadow-md"
                        title="Collapse Sidebar"
                    >
                        <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                    </button>
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
                                                    {/* Plugin selector tabs - horizontally scrollable */}
                                                    {plugins.length > 1 && (
                                                        <div className="flex overflow-x-auto border-b border-border-dark scrollbar-thin scrollbar-thumb-border-dark scrollbar-track-transparent">
                                                            {plugins.map((plugin) => {
                                                                const isActive = activePlugin?.name === plugin.name
                                                                return (
                                                                    <button
                                                                        key={plugin.name}
                                                                        onClick={() => handlePluginSelect(plugin)}
                                                                        className={`shrink-0 px-3 py-1.5 text-[10px] font-medium transition-colors whitespace-nowrap ${isActive
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
            )}

            {!leftSidebarOpen && (
                <div className="w-10 border-r border-border-dark bg-surface-dark flex flex-col items-center py-4 gap-4 z-10 shrink-0">
                    <button
                        onClick={() => setLeftSidebarOpen(true)}
                        className="p-2 hover:bg-panel-dark text-text-secondary hover:text-white rounded-sm transition-colors"
                        title="Show Sidebar"
                    >
                        <span className="material-symbols-outlined text-[20px]">dock_to_right</span>
                    </button>
                    <div className="w-6 h-px bg-border-dark"></div>
                    <button onClick={handleImportClick} className="p-2 hover:bg-panel-dark text-text-secondary hover:text-white rounded-sm">
                        <span className="material-symbols-outlined text-[20px]">add_photo_alternate</span>
                    </button>
                </div>
            )}

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

                        {/* Undo / Redo */}
                        <div className="flex items-center gap-1 ml-4 bg-background-dark rounded-sm border border-border-dark p-0.5">
                            <button
                                onClick={() => {
                                    const entry = useAppStore.getState().undo()
                                    if (entry) {
                                        // Restore the image to its previous state
                                        useAppStore.getState().updateImage(entry.imageId, {
                                            url: entry.url,
                                            thumbnailUrl: entry.thumbnailUrl,
                                            name: entry.name,
                                        })
                                    }
                                }}
                                disabled={!useAppStore.getState().canUndo()}
                                className="p-1 hover:bg-panel-dark text-text-secondary hover:text-white rounded-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                title="Undo"
                            >
                                <span className="material-symbols-outlined text-[16px]">undo</span>
                            </button>
                            <button
                                onClick={() => {
                                    const entry = useAppStore.getState().redo()
                                    if (entry) {
                                        // Apply the redo state
                                        useAppStore.getState().updateImage(entry.imageId, {
                                            url: entry.url,
                                            thumbnailUrl: entry.thumbnailUrl,
                                            name: entry.name,
                                        })
                                    }
                                }}
                                disabled={!useAppStore.getState().canRedo()}
                                className="p-1 hover:bg-panel-dark text-text-secondary hover:text-white rounded-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                title="Redo"
                            >
                                <span className="material-symbols-outlined text-[16px]">redo</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Canvas Area */}
                <div
                    className="flex-1 relative overflow-hidden flex items-center justify-center bg-[#101012] bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px] cursor-move"
                    onWheel={handleWheel}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    {/* Dynamic Image or Placeholder */}
                    <div
                        className="relative shadow-2xl shadow-black/50 border border-border-dark"
                        style={{
                            transform: `translate(${viewportState.x}px, ${viewportState.y}px) scale(${viewportState.zoom})`,
                            transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                        }}
                    >
                        {activeImage ? (
                            /* Display the active image */
                            <img
                                src={activeImage.url}
                                alt={activeImage.name}
                                className="max-w-[none] pointer-events-none select-none"
                                draggable={false}
                                style={{
                                    imageRendering: 'auto',
                                    transform: rotationPreview !== 0 ? `rotate(${rotationPreview}deg)` : undefined,
                                    transition: 'transform 0.2s ease-out',
                                }}
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
                        <button
                            className="p-2 hover:bg-panel-dark text-text-secondary hover:text-white rounded-sm transition-colors"
                            title="Pan (drag image)"
                        >
                            <span className="material-symbols-outlined text-[20px]">pan_tool</span>
                        </button>
                        <div className="w-px bg-border-dark my-1"></div>
                        <button
                            onClick={() => setViewportState({ zoom: Math.min(viewportState.zoom * 1.25, 10) })}
                            className="p-2 hover:bg-panel-dark text-text-secondary hover:text-white rounded-sm transition-colors"
                            title="Zoom In"
                        >
                            <span className="material-symbols-outlined text-[20px]">add</span>
                        </button>
                        <button
                            onClick={() => setViewportState({ zoom: Math.max(viewportState.zoom / 1.25, 0.1) })}
                            className="p-2 hover:bg-panel-dark text-text-secondary hover:text-white rounded-sm transition-colors"
                            title="Zoom Out"
                        >
                            <span className="material-symbols-outlined text-[20px]">remove</span>
                        </button>
                        <button
                            onClick={() => resetViewport()}
                            className="p-2 hover:bg-panel-dark text-text-secondary hover:text-white rounded-sm transition-colors"
                            title="Fit to Screen"
                        >
                            <span className="material-symbols-outlined text-[20px]">fit_screen</span>
                        </button>
                        <div className="w-px bg-border-dark my-1"></div>
                        <button className="p-2 hover:bg-panel-dark text-primary hover:text-blue-400 bg-primary/10 rounded-sm transition-colors" title="ROI Selection">
                            <span className="material-symbols-outlined text-[20px]">crop_free</span>
                        </button>
                        <div className="w-px bg-border-dark my-1"></div>
                        {/* Flip Transform Buttons */}
                        <button
                            onClick={async () => {
                                if (!activeImageId) return
                                // Push to history before transform
                                const currentImage = useAppStore.getState().images.find(img => img.id === activeImageId)
                                if (currentImage) {
                                    useAppStore.getState().pushToHistory({
                                        imageId: activeImageId,
                                        url: currentImage.url,
                                        thumbnailUrl: currentImage.thumbnailUrl,
                                        name: currentImage.name,
                                    })
                                }
                                try {
                                    const res = await fetch(`http://localhost:8001/plugins/apply`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            image_id: activeImageId,
                                            plugin_name: 'rotate_flip',
                                            params: { flip_horizontal: true }
                                        })
                                    })
                                    if (res.ok) {
                                        const data = await res.json()
                                        useAppStore.getState().updateImage(activeImageId, {
                                            url: data.result_url + '?t=' + Date.now(),
                                            thumbnailUrl: data.thumbnail_url + '?t=' + Date.now(),
                                        })
                                    }
                                } catch (err) {
                                    console.error('Flip H failed:', err)
                                }
                            }}
                            disabled={!activeImageId}
                            className="p-2 hover:bg-panel-dark text-text-secondary hover:text-white rounded-sm transition-colors disabled:opacity-50"
                            title="Flip Horizontal"
                        >
                            <span className="material-symbols-outlined text-[20px]">flip</span>
                        </button>
                        <button
                            onClick={async () => {
                                if (!activeImageId) return
                                // Push to history before transform
                                const currentImage = useAppStore.getState().images.find(img => img.id === activeImageId)
                                if (currentImage) {
                                    useAppStore.getState().pushToHistory({
                                        imageId: activeImageId,
                                        url: currentImage.url,
                                        thumbnailUrl: currentImage.thumbnailUrl,
                                        name: currentImage.name,
                                    })
                                }
                                try {
                                    const res = await fetch(`http://localhost:8001/plugins/apply`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            image_id: activeImageId,
                                            plugin_name: 'rotate_flip',
                                            params: { flip_vertical: true }
                                        })
                                    })
                                    if (res.ok) {
                                        const data = await res.json()
                                        useAppStore.getState().updateImage(activeImageId, {
                                            url: data.result_url + '?t=' + Date.now(),
                                            thumbnailUrl: data.thumbnail_url + '?t=' + Date.now(),
                                        })
                                    }
                                } catch (err) {
                                    console.error('Flip V failed:', err)
                                }
                            }}
                            disabled={!activeImageId}
                            className="p-2 hover:bg-panel-dark text-text-secondary hover:text-white rounded-sm transition-colors disabled:opacity-50"
                            title="Flip Vertical"
                        >
                            <span className="material-symbols-outlined text-[20px]" style={{ transform: 'rotate(90deg)' }}>flip</span>
                        </button>
                        <div className="w-px bg-border-dark my-1"></div>
                        {/* Rotation Controls */}
                        <button
                            onClick={() => setRotationPreview(prev => prev - 90)}
                            disabled={!activeImageId}
                            className="p-2 hover:bg-panel-dark text-text-secondary hover:text-white rounded-sm transition-colors disabled:opacity-50"
                            title="Rotate 90° Counter-clockwise (Preview)"
                        >
                            <span className="material-symbols-outlined text-[20px]">rotate_left</span>
                        </button>
                        <button
                            onClick={() => setRotationPreview(prev => prev + 90)}
                            disabled={!activeImageId}
                            className="p-2 hover:bg-panel-dark text-text-secondary hover:text-white rounded-sm transition-colors disabled:opacity-50"
                            title="Rotate 90° Clockwise (Preview)"
                        >
                            <span className="material-symbols-outlined text-[20px]">rotate_right</span>
                        </button>
                        {rotationPreview !== 0 && (
                            <>
                                <button
                                    onClick={() => setRotationPreview(0)}
                                    className="p-2 hover:bg-panel-dark text-text-secondary hover:text-white rounded-sm transition-colors"
                                    title="Cancel Rotation Preview"
                                >
                                    <span className="material-symbols-outlined text-[20px]">close</span>
                                </button>
                                <button
                                    onClick={async () => {
                                        if (!activeImageId) return
                                        // Push to history before transform
                                        const currentImage = useAppStore.getState().images.find(img => img.id === activeImageId)
                                        if (currentImage) {
                                            useAppStore.getState().pushToHistory({
                                                imageId: activeImageId,
                                                url: currentImage.url,
                                                thumbnailUrl: currentImage.thumbnailUrl,
                                                name: currentImage.name,
                                            })
                                        }
                                        try {
                                            const res = await fetch(`http://localhost:8001/plugins/apply`, {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                    image_id: activeImageId,
                                                    plugin_name: 'rotate_flip',
                                                    params: { angle: rotationPreview }
                                                })
                                            })
                                            if (res.ok) {
                                                const data = await res.json()
                                                useAppStore.getState().updateImage(activeImageId, {
                                                    url: data.result_url + '?t=' + Date.now(),
                                                    thumbnailUrl: data.thumbnail_url + '?t=' + Date.now(),
                                                })
                                                setRotationPreview(0)
                                            }
                                        } catch (err) {
                                            console.error('Rotation failed:', err)
                                        }
                                    }}
                                    className="p-2 hover:bg-primary/30 text-primary hover:text-white rounded-sm transition-colors bg-primary/10"
                                    title={`Apply Rotation (${rotationPreview}°)`}
                                >
                                    <span className="material-symbols-outlined text-[20px]">check</span>
                                </button>
                            </>
                        )}
                    </div>
                </div >
            </main >

            {/* Right Sidebar: Inspector (350px) */}
            {
                rightSidebarOpen ? (
                    <aside className="w-[350px] flex flex-col border-l border-border-dark bg-surface-dark shrink-0 z-10 relative">
                        {/* Collapse Button */}
                        <button
                            onClick={() => setRightSidebarOpen(false)}
                            className="absolute -left-3 top-1/2 -translate-y-1/2 z-20 w-6 h-12 bg-surface-dark border border-border-dark rounded-l-md flex items-center justify-center text-text-secondary hover:text-white hover:bg-panel-dark cursor-pointer shadow-md"
                            title="Collapse Inspector"
                        >
                            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                        </button>

                        {/* Histogram Section */}
                        <div className="flex flex-col h-1/3 min-h-[250px] border-b border-border-dark">
                            <div className="px-4 py-2 border-b border-border-dark bg-panel-dark flex justify-between items-center">
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Histogram</h3>
                                {/* Channel toggle buttons */}
                                <div className="flex gap-1">
                                    {histogramData && Object.keys(histogramData).map(channel => {
                                        const colors: Record<string, string> = {
                                            red: 'bg-red-500',
                                            green: 'bg-green-500',
                                            blue: 'bg-blue-500',
                                            gray: 'bg-zinc-400'
                                        }
                                        const isVisible = visibleChannels.has(channel)
                                        return (
                                            <button
                                                key={channel}
                                                onClick={() => {
                                                    const newChannels = new Set(visibleChannels)
                                                    if (isVisible) {
                                                        newChannels.delete(channel)
                                                    } else {
                                                        newChannels.add(channel)
                                                    }
                                                    setVisibleChannels(newChannels)
                                                }}
                                                className={`w-4 h-4 rounded-sm border border-border-dark ${isVisible ? colors[channel] : 'bg-panel-dark'}`}
                                                title={`Toggle ${channel} channel`}
                                            />
                                        )
                                    })}
                                </div>
                            </div>
                            <div className="p-4 flex-1 relative bg-surface-dark overflow-hidden">
                                {/* Histogram visualization */}
                                {histogramData ? (
                                    <div className="absolute inset-x-4 bottom-6 top-2 flex items-end">
                                        {(() => {
                                            // Get max value across all visible channels for normalization
                                            const allValues = Object.entries(histogramData)
                                                .filter(([ch]) => visibleChannels.has(ch))
                                                .flatMap(([, vals]) => vals)
                                            const maxVal = Math.max(...allValues, 1)

                                            // Render all visible channels overlaid
                                            return Object.entries(histogramData)
                                                .filter(([ch]) => visibleChannels.has(ch))
                                                .map(([channel, values]) => {
                                                    const colors: Record<string, string> = {
                                                        red: 'bg-red-500/60',
                                                        green: 'bg-green-500/60',
                                                        blue: 'bg-blue-500/60',
                                                        gray: 'bg-zinc-400/60'
                                                    }
                                                    return (
                                                        <div key={channel} className="absolute inset-0 flex items-end gap-px">
                                                            {values.map((val, i) => (
                                                                <div
                                                                    key={i}
                                                                    className={`flex-1 ${colors[channel]} rounded-t-sm`}
                                                                    style={{ height: `${(val / maxVal) * 100}%` }}
                                                                />
                                                            ))}
                                                        </div>
                                                    )
                                                })
                                        })()}
                                    </div>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-text-secondary text-sm">
                                        {activeImage ? 'Loading...' : 'No image selected'}
                                    </div>
                                )}
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
                                    <StatItem label="Mean Intensity" value={statisticsData ? statisticsData.mean.toString() : "--"} />
                                    <StatItem label="Std Dev" value={statisticsData ? statisticsData.std.toString() : "--"} />
                                    <StatItem label="Entropy" value={statisticsData ? statisticsData.entropy.toString() : "--"} />
                                    <StatItem label="Kurtosis" value={statisticsData ? statisticsData.kurtosis.toString() : "--"} />
                                    <StatItem label="Skewness" value={statisticsData ? statisticsData.skewness.toString() : "--"} />
                                    <StatItem label="Max Value" value={statisticsData ? statisticsData.max.toString() : "--"} />
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
                ) : (
                    <div className="w-10 border-l border-border-dark bg-surface-dark flex flex-col items-center py-4 gap-4 z-10 shrink-0">
                        <button
                            onClick={() => setRightSidebarOpen(true)}
                            className="p-2 hover:bg-panel-dark text-text-secondary hover:text-white rounded-sm transition-colors"
                            title="Show Inspector"
                        >
                            <span className="material-symbols-outlined text-[20px]">dock_to_left</span>
                        </button>
                    </div>
                )
            }
        </div >
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
