/**
 * ComparisonEngine - Multi-mode image comparison viewer
 * Supports: Side-by-Side, Swipe (curtain), and Difference blend modes
 */
import { useState, useCallback, useRef, MouseEvent, useLayoutEffect } from 'react'
import { useAppStore } from '@/store/appStore'
import { ImageViewer } from './ImageViewer'

export function ComparisonEngine() {
    const {
        images,
        compareSourceA,
        compareSourceB,
        compareMode,
        setCompareSourceA,
        setCompareSourceB,
        setCompareMode,
        viewportState,
        setViewportState,
        resetViewport,
    } = useAppStore()

    // Swipe handle position (0-100%)
    const [swipePosition, setSwipePosition] = useState(50)
    const isDraggingHandle = useRef(false)
    const containerRef = useRef<HTMLDivElement>(null)

    // Get image data
    const imageA = images.find((img) => img.id === compareSourceA)
    const imageB = images.find((img) => img.id === compareSourceB)

    // Handle swipe drag
    const handleSwipeMouseDown = useCallback((e: MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        isDraggingHandle.current = true
    }, [])

    const handleSwipeMouseMove = useCallback(
        (e: MouseEvent) => {
            if (!isDraggingHandle.current || !containerRef.current) return

            const rect = containerRef.current.getBoundingClientRect()
            const x = e.clientX - rect.left
            const percentage = Math.min(Math.max((x / rect.width) * 100, 0), 100)
            setSwipePosition(percentage)
        },
        []
    )

    const handleSwipeMouseUp = useCallback(() => {
        isDraggingHandle.current = false
    }, [])

    // Synchronized viewport handlers for layered modes
    const handleWheel = useCallback(
        (e: React.WheelEvent<HTMLDivElement>) => {
            e.preventDefault()
            const delta = e.deltaY > 0 ? 0.9 : 1.1
            const newZoom = Math.min(Math.max(viewportState.zoom * delta, 0.1), 10)

            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect()
                const cursorX = e.clientX - rect.left - rect.width / 2
                const cursorY = e.clientY - rect.top - rect.height / 2

                const zoomRatio = newZoom / viewportState.zoom
                const newX = viewportState.x - cursorX * (zoomRatio - 1)
                const newY = viewportState.y - cursorY * (zoomRatio - 1)

                setViewportState({ x: newX, y: newY, zoom: newZoom })
            } else {
                setViewportState({ zoom: newZoom })
            }
        },
        [viewportState, setViewportState]
    )

    const lastPanPosition = useRef({ x: 0, y: 0 })
    const isPanning = useRef(false)

    const handlePanStart = useCallback((e: MouseEvent) => {
        if (isDraggingHandle.current) return
        isPanning.current = true
        lastPanPosition.current = { x: e.clientX, y: e.clientY }
    }, [])

    const handlePanMove = useCallback(
        (e: MouseEvent) => {
            if (isDraggingHandle.current) {
                handleSwipeMouseMove(e)
                return
            }
            if (!isPanning.current) return

            const dx = e.clientX - lastPanPosition.current.x
            const dy = e.clientY - lastPanPosition.current.y
            lastPanPosition.current = { x: e.clientX, y: e.clientY }

            setViewportState({
                x: viewportState.x + dx,
                y: viewportState.y + dy,
            })
        },
        [viewportState, setViewportState, handleSwipeMouseMove]
    )

    const handlePanEnd = useCallback(() => {
        isPanning.current = false
        isDraggingHandle.current = false
    }, [])

    return (
        <div className="flex-1 flex flex-col bg-[#101012]">
            {/* Comparison Header Bar - ALWAYS VISIBLE */}
            <div className="h-12 border-b border-border-dark bg-surface-dark px-4 flex items-center justify-between shrink-0">
                {/* Image Selectors */}
                <div className="flex items-center gap-4">
                    {/* Source A Selector */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-cyan-400 font-medium">A:</span>
                        <select
                            value={compareSourceA || ''}
                            onChange={(e) => setCompareSourceA(e.target.value || null)}
                            className="bg-background-dark border border-border-dark rounded px-2 py-1 text-xs text-white focus:border-primary focus:outline-none min-w-[150px]"
                        >
                            <option value="">Select image...</option>
                            {images.map((img) => (
                                <option key={img.id} value={img.id}>
                                    {img.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={() => {
                            const temp = compareSourceA;
                            setCompareSourceA(compareSourceB);
                            setCompareSourceB(temp);
                        }}
                        className="p-1 hover:bg-panel-dark text-text-secondary hover:text-white rounded transition-colors"
                        title="Swap Images"
                    >
                        <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
                    </button>

                    {/* Source B Selector */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-orange-400 font-medium">B:</span>
                        <select
                            value={compareSourceB || ''}
                            onChange={(e) => setCompareSourceB(e.target.value || null)}
                            className="bg-background-dark border border-border-dark rounded px-2 py-1 text-xs text-white focus:border-primary focus:outline-none min-w-[150px]"
                        >
                            <option value="">Select image...</option>
                            {images.map((img) => (
                                <option key={img.id} value={img.id}>
                                    {img.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Mode Switcher */}
                <div className="flex items-center gap-1 bg-background-dark border border-border-dark rounded-md p-0.5">
                    <button
                        onClick={() => setCompareMode('side-by-side')}
                        className={`px-3 py-1 text-xs font-medium rounded transition-colors ${compareMode === 'side-by-side'
                            ? 'bg-primary text-white'
                            : 'text-text-secondary hover:text-white hover:bg-panel-dark'
                            }`}
                    >
                        Side-by-Side
                    </button>
                    <button
                        onClick={() => setCompareMode('swipe')}
                        className={`px-3 py-1 text-xs font-medium rounded transition-colors ${compareMode === 'swipe'
                            ? 'bg-primary text-white'
                            : 'text-text-secondary hover:text-white hover:bg-panel-dark'
                            }`}
                    >
                        Swipe
                    </button>
                    <button
                        onClick={() => setCompareMode('diff')}
                        className={`px-3 py-1 text-xs font-medium rounded transition-colors ${compareMode === 'diff'
                            ? 'bg-primary text-white'
                            : 'text-text-secondary hover:text-white hover:bg-panel-dark'
                            }`}
                    >
                        Difference
                    </button>
                </div>

                {/* Reset Button */}
                <button
                    onClick={resetViewport}
                    className="p-2 hover:bg-panel-dark text-text-secondary hover:text-white rounded transition-colors"
                    title="Reset View"
                >
                    <span className="material-symbols-outlined text-[18px]">refresh</span>
                </button>
            </div>

            {/* Comparison Viewport */}
            <div className="flex-1 relative overflow-hidden">
                {/* Empty state when no images selected */}
                {!imageA && !imageB ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                            <span className="material-symbols-outlined text-6xl text-text-secondary/30">compare</span>
                            <p className="text-text-secondary/50 text-sm mt-2">Select images to compare</p>
                            <p className="text-text-secondary/30 text-xs mt-1">Use the dropdowns above</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {compareMode === 'side-by-side' && (
                            <SideBySideView imageA={imageA} imageB={imageB} />
                        )}

                        {compareMode === 'swipe' && (
                            <SwipeView
                                imageA={imageA}
                                imageB={imageB}
                                swipePosition={swipePosition}
                                containerRef={containerRef}
                                onWheel={handleWheel}
                                onMouseDown={handlePanStart}
                                onMouseMove={handlePanMove}
                                onMouseUp={handlePanEnd}
                                onMouseLeave={handlePanEnd}
                                onHandleMouseDown={handleSwipeMouseDown}
                                viewportState={viewportState}
                            />
                        )}

                        {compareMode === 'diff' && (
                            <DifferenceView
                                imageA={imageA}
                                imageB={imageB}
                                containerRef={containerRef}
                                onWheel={handleWheel}
                                onMouseDown={handlePanStart}
                                onMouseMove={handlePanMove}
                                onMouseUp={handlePanEnd}
                                onMouseLeave={handlePanEnd}
                                viewportState={viewportState}
                            />
                        )}
                    </>
                )}
            </div>
        </div>
    )
}

// =============================================================================
// Side-by-Side View
// =============================================================================

interface SideBySideViewProps {
    imageA?: { url: string; name: string } | null
    imageB?: { url: string; name: string } | null
}

function SideBySideView({ imageA, imageB }: SideBySideViewProps) {
    return (
        <div className="absolute inset-0 flex">
            {/* Left Panel (Image A) */}
            <div className="flex-1 border-r border-border-dark relative">
                <div className="absolute top-3 left-3 z-10 bg-cyan-500/20 border border-cyan-500/40 rounded px-2 py-0.5">
                    <span className="text-xs text-cyan-400 font-medium">A</span>
                </div>
                {imageA ? (
                    <ImageViewer
                        imageUrl={imageA.url}
                        imageName={imageA.name}
                        synchronized={true}
                        className="h-full w-full"
                        showControls={false}
                    />
                ) : (
                    <div className="h-full w-full flex items-center justify-center">
                        <span className="text-text-secondary/50 text-sm">No image selected</span>
                    </div>
                )}
            </div>

            {/* Right Panel (Image B) */}
            <div className="flex-1 relative">
                <div className="absolute top-3 left-3 z-10 bg-orange-500/20 border border-orange-500/40 rounded px-2 py-0.5">
                    <span className="text-xs text-orange-400 font-medium">B</span>
                </div>
                {imageB ? (
                    <ImageViewer
                        imageUrl={imageB.url}
                        imageName={imageB.name}
                        synchronized={true}
                        className="h-full w-full"
                        showControls={false}
                    />
                ) : (
                    <div className="h-full w-full flex items-center justify-center">
                        <span className="text-text-secondary/50 text-sm">No image selected</span>
                    </div>
                )}
            </div>

            {/* Centered zoom controls */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-surface-dark/90 backdrop-blur-md border border-border-dark rounded-md shadow-lg p-1 flex gap-1 z-20">
                <ZoomControls />
            </div>
        </div>
    )
}

// =============================================================================
// Swipe (Curtain) View
// =============================================================================

interface SwipeViewProps {
    imageA?: { url: string; name: string } | null
    imageB?: { url: string; name: string } | null
    swipePosition: number
    containerRef: React.RefObject<HTMLDivElement>
    onWheel: (e: React.WheelEvent<HTMLDivElement>) => void
    onMouseDown: (e: MouseEvent) => void
    onMouseMove: (e: MouseEvent) => void
    onMouseUp: () => void
    onMouseLeave: () => void
    onHandleMouseDown: (e: MouseEvent) => void
    viewportState: { x: number; y: number; zoom: number }
}

function SwipeView({
    imageA,
    imageB,
    swipePosition,
    containerRef,
    onWheel,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onMouseLeave,
    onHandleMouseDown,
    viewportState,
}: SwipeViewProps) {
    return (
        <div
            ref={containerRef}
            className="absolute inset-0 select-none"
            style={{ cursor: 'grab' }}
            onWheel={onWheel}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseLeave}
        >
            {/* Image A (Bottom layer - full width) */}
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                <div className="absolute top-3 left-3 z-10 bg-cyan-500/20 border border-cyan-500/40 rounded px-2 py-0.5">
                    <span className="text-xs text-cyan-400 font-medium">A</span>
                </div>
                {imageA && (
                    <img
                        src={imageA.url}
                        alt={imageA.name}
                        className="max-w-none pointer-events-none"
                        style={{
                            transform: `translate(${viewportState.x}px, ${viewportState.y}px) scale(${viewportState.zoom})`,
                            transformOrigin: 'center center',
                        }}
                        draggable={false}
                    />
                )}
            </div>

            {/* Image B (Top layer - clipped from left) */}
            <div
                className="absolute inset-0 flex items-center justify-center overflow-hidden"
                style={{
                    clipPath: `inset(0 0 0 ${swipePosition}%)`,
                }}
            >
                <div
                    className="absolute top-3 z-10 bg-orange-500/20 border border-orange-500/40 rounded px-2 py-0.5"
                    style={{ left: `${swipePosition + 1}%` }}
                >
                    <span className="text-xs text-orange-400 font-medium">B</span>
                </div>
                {imageB && (
                    <img
                        src={imageB.url}
                        alt={imageB.name}
                        className="max-w-none pointer-events-none"
                        style={{
                            transform: `translate(${viewportState.x}px, ${viewportState.y}px) scale(${viewportState.zoom})`,
                            transformOrigin: 'center center',
                        }}
                        draggable={false}
                    />
                )}
            </div>

            {/* Swipe Handle */}
            <div
                className="absolute top-0 bottom-0 w-1 bg-white/80 cursor-ew-resize z-20 shadow-lg"
                style={{ left: `${swipePosition}%`, transform: 'translateX(-50%)' }}
                onMouseDown={onHandleMouseDown}
            >
                {/* Handle grip */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-10 bg-white rounded-full shadow-lg flex items-center justify-center">
                    <div className="flex gap-0.5">
                        <div className="w-0.5 h-4 bg-gray-400 rounded-full"></div>
                        <div className="w-0.5 h-4 bg-gray-400 rounded-full"></div>
                    </div>
                </div>
            </div>

            {/* Zoom indicator */}
            <div className="absolute top-3 right-3 bg-surface-dark/80 backdrop-blur-sm border border-border-dark rounded px-2 py-1 z-10">
                <span className="text-xs text-text-secondary font-mono">
                    {Math.round(viewportState.zoom * 100)}%
                </span>
            </div>

            {/* Zoom controls */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
                <div className="bg-surface-dark/90 backdrop-blur-md border border-border-dark rounded-md shadow-lg p-1 flex gap-1">
                    <ZoomControls />
                </div>
            </div>
        </div>
    )
}

// =============================================================================
// Difference View
// =============================================================================

interface DifferenceViewProps {
    imageA?: { url: string; name: string } | null
    imageB?: { url: string; name: string } | null
    containerRef: React.RefObject<HTMLDivElement>
    onWheel: (e: React.WheelEvent<HTMLDivElement>) => void
    onMouseDown: (e: MouseEvent) => void
    onMouseMove: (e: MouseEvent) => void
    onMouseUp: () => void
    onMouseLeave: () => void
    viewportState: { x: number; y: number; zoom: number }
}

function DifferenceView({
    imageA,
    imageB,
    containerRef,
    onWheel,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onMouseLeave,
    viewportState,
}: DifferenceViewProps) {
    return (
        <div
            ref={containerRef}
            className="absolute inset-0 select-none"
            style={{ cursor: 'grab' }}
            onWheel={onWheel}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseLeave}
        >
            {/* Image A (Base layer) */}
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                {imageA && (
                    <img
                        src={imageA.url}
                        alt={imageA.name}
                        className="max-w-none pointer-events-none"
                        style={{
                            transform: `translate(${viewportState.x}px, ${viewportState.y}px) scale(${viewportState.zoom})`,
                            transformOrigin: 'center center',
                        }}
                        draggable={false}
                    />
                )}
            </div>

            {/* Image B (Difference blend) */}
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                {imageB && (
                    <img
                        src={imageB.url}
                        alt={imageB.name}
                        className="max-w-none pointer-events-none"
                        style={{
                            transform: `translate(${viewportState.x}px, ${viewportState.y}px) scale(${viewportState.zoom})`,
                            transformOrigin: 'center center',
                            mixBlendMode: 'difference',
                        }}
                        draggable={false}
                    />
                )}
            </div>

            {/* Labels */}
            <div className="absolute top-3 left-3 z-10 flex gap-2">
                <div className="bg-cyan-500/20 border border-cyan-500/40 rounded px-2 py-0.5">
                    <span className="text-xs text-cyan-400 font-medium">A</span>
                </div>
                <div className="bg-orange-500/20 border border-orange-500/40 rounded px-2 py-0.5">
                    <span className="text-xs text-orange-400 font-medium">B (diff)</span>
                </div>
            </div>

            {/* Mode indicator */}
            <div className="absolute top-3 right-3 bg-purple-500/20 border border-purple-500/40 rounded px-2 py-1 z-10">
                <span className="text-xs text-purple-400 font-medium">Difference Mode</span>
            </div>

            {/* Zoom indicator */}
            <div className="absolute bottom-16 right-3 bg-surface-dark/80 backdrop-blur-sm border border-border-dark rounded px-2 py-1 z-10">
                <span className="text-xs text-text-secondary font-mono">
                    {Math.round(viewportState.zoom * 100)}%
                </span>
            </div>

            {/* Zoom controls */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
                <div className="bg-surface-dark/90 backdrop-blur-md border border-border-dark rounded-md shadow-lg p-1 flex gap-1">
                    <ZoomControls />
                </div>
            </div>
        </div>
    )
}

// =============================================================================
// Shared Zoom Controls
// =============================================================================

function ZoomControls() {
    const { viewportState, setViewportState, resetViewport } = useAppStore()

    return (
        <>
            <button
                onClick={() => setViewportState({ zoom: Math.max(viewportState.zoom * 0.8, 0.1) })}
                className="p-1.5 hover:bg-panel-dark text-text-secondary hover:text-white rounded-sm transition-colors"
                title="Zoom Out"
            >
                <span className="material-symbols-outlined text-[18px]">remove</span>
            </button>
            <button
                onClick={resetViewport}
                className="p-1.5 hover:bg-panel-dark text-text-secondary hover:text-white rounded-sm transition-colors"
                title="Fit to Screen"
            >
                <span className="material-symbols-outlined text-[18px]">fit_screen</span>
            </button>
            <button
                onClick={() => setViewportState({ zoom: Math.min(viewportState.zoom * 1.25, 10) })}
                className="p-1.5 hover:bg-panel-dark text-text-secondary hover:text-white rounded-sm transition-colors"
                title="Zoom In"
            >
                <span className="material-symbols-outlined text-[18px]">add</span>
            </button>
        </>
    )
}
