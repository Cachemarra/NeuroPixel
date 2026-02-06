/**
 * ComparisonEngine - Multi-mode image comparison viewer
 * Supports: Side-by-Side, Swipe (curtain), Swap Box, and Difference blend modes
 */
import { useState, useCallback, useRef, MouseEvent, useEffect } from 'react'
import { useAppStore } from '@/store/appStore'
import { ImageViewer } from './ImageViewer'

export function ComparisonEngine() {
    const {
        images,
        compareSourceA,
        compareSourceB,
        compareSourceC,
        compareMode,
        setCompareSourceA,
        setCompareSourceB,
        setCompareSourceC,
        setCompareMode,
        viewportState,
        setViewportState,
        resetViewport,
    } = useAppStore()

    // Swipe handle positions (0-100%) - two handles for 3-image swipe
    const [swipePosition, setSwipePosition] = useState(33)
    const [swipePosition2, setSwipePosition2] = useState(66)
    const isDraggingHandle = useRef<1 | 2 | false>(false)
    const containerRef = useRef<HTMLDivElement>(null)

    // Get image data
    const imageA = images.find((img) => img.id === compareSourceA)
    const imageB = images.find((img) => img.id === compareSourceB)
    const imageC = images.find((img) => img.id === compareSourceC)

    // Handle swipe drag - supports two handles
    const handleSwipeMouseDown = useCallback((handleNum: 1 | 2) => (e: MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        isDraggingHandle.current = handleNum
    }, [])

    const handleSwipeMouseMove = useCallback(
        (e: MouseEvent) => {
            if (!isDraggingHandle.current || !containerRef.current) return

            const rect = containerRef.current.getBoundingClientRect()
            const x = e.clientX - rect.left
            const percentage = Math.min(Math.max((x / rect.width) * 100, 0), 100)

            if (isDraggingHandle.current === 1) {
                // Limit handle 1 to not go past handle 2
                setSwipePosition(Math.min(percentage, swipePosition2 - 5))
            } else {
                // Limit handle 2 to not go before handle 1
                setSwipePosition2(Math.max(percentage, swipePosition + 5))
            }
        },
        [swipePosition, swipePosition2]
    )

    // Note: Swipe handle release is handled by handlePanEnd below

    // Keyboard shortcuts for Compare mode
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Skip if user is typing in an input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
                return
            }

            switch (e.key.toLowerCase()) {
                // Mode switching
                case 's':
                    if (!e.ctrlKey && !e.metaKey) {
                        e.preventDefault()
                        setCompareMode('side-by-side')
                    }
                    break
                case 'w':
                    if (!e.ctrlKey && !e.metaKey) {
                        e.preventDefault()
                        setCompareMode('swipe')
                    }
                    break
                case 'b':
                    if (!e.ctrlKey && !e.metaKey) {
                        e.preventDefault()
                        setCompareMode('swapbox')
                    }
                    break
                case 'd':
                    if (!e.ctrlKey && !e.metaKey) {
                        e.preventDefault()
                        setCompareMode('diff')
                    }
                    break
                // Image cycling (cycle through available images for slot)
                case '1':
                    cycleImage('A')
                    break
                case '2':
                    cycleImage('B')
                    break
                case '3':
                    cycleImage('C')
                    break
            }
        }

        const cycleImage = (slot: 'A' | 'B' | 'C') => {
            const currentId = slot === 'A' ? compareSourceA : slot === 'B' ? compareSourceB : compareSourceC
            const setter = slot === 'A' ? setCompareSourceA : slot === 'B' ? setCompareSourceB : setCompareSourceC

            if (images.length === 0) return

            const currentIndex = currentId ? images.findIndex(img => img.id === currentId) : -1
            const nextIndex = (currentIndex + 1) % images.length
            setter(images[nextIndex].id)
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [images, compareSourceA, compareSourceB, compareSourceC, setCompareSourceA, setCompareSourceB, setCompareSourceC, setCompareMode])

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
                <div className="flex items-center gap-3">
                    {/* Source A Selector */}
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs text-cyan-400 font-medium">A:</span>
                        <select
                            value={compareSourceA || ''}
                            onChange={(e) => setCompareSourceA(e.target.value || null)}
                            className="bg-background-dark border border-border-dark rounded px-2 py-1 text-xs text-white focus:border-primary focus:outline-none min-w-[120px]"
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
                        title="Swap A ↔ B"
                    >
                        <span className="material-symbols-outlined text-[14px]">swap_horiz</span>
                    </button>

                    {/* Source B Selector */}
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs text-orange-400 font-medium">B:</span>
                        <select
                            value={compareSourceB || ''}
                            onChange={(e) => setCompareSourceB(e.target.value || null)}
                            className="bg-background-dark border border-border-dark rounded px-2 py-1 text-xs text-white focus:border-primary focus:outline-none min-w-[120px]"
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
                            const temp = compareSourceB;
                            setCompareSourceB(compareSourceC);
                            setCompareSourceC(temp);
                        }}
                        className="p-1 hover:bg-panel-dark text-text-secondary hover:text-white rounded transition-colors"
                        title="Swap B ↔ C"
                    >
                        <span className="material-symbols-outlined text-[14px]">swap_horiz</span>
                    </button>

                    {/* Source C Selector */}
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs text-violet-400 font-medium">C:</span>
                        <select
                            value={compareSourceC || ''}
                            onChange={(e) => setCompareSourceC(e.target.value || null)}
                            className="bg-background-dark border border-border-dark rounded px-2 py-1 text-xs text-white focus:border-primary focus:outline-none min-w-[120px]"
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

                {/* Mode Switcher - Compact layout */}
                <div className="flex items-center bg-background-dark border border-border-dark rounded-md p-0.5">
                    <button
                        onClick={() => setCompareMode('side-by-side')}
                        className={`px-2 py-1 text-[11px] font-medium rounded transition-colors whitespace-nowrap ${compareMode === 'side-by-side'
                            ? 'bg-primary text-white'
                            : 'text-text-secondary hover:text-white hover:bg-panel-dark'
                            }`}
                    >
                        Side
                    </button>
                    <button
                        onClick={() => setCompareMode('swipe')}
                        className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${compareMode === 'swipe'
                            ? 'bg-primary text-white'
                            : 'text-text-secondary hover:text-white hover:bg-panel-dark'
                            }`}
                    >
                        Swipe
                    </button>
                    <button
                        onClick={() => setCompareMode('swapbox')}
                        className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${compareMode === 'swapbox'
                            ? 'bg-primary text-white'
                            : 'text-text-secondary hover:text-white hover:bg-panel-dark'
                            }`}
                    >
                        Box
                    </button>
                    <button
                        onClick={() => setCompareMode('diff')}
                        className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${compareMode === 'diff'
                            ? 'bg-primary text-white'
                            : 'text-text-secondary hover:text-white hover:bg-panel-dark'
                            }`}
                    >
                        Diff
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
                            <SideBySideView imageA={imageA} imageB={imageB} imageC={imageC} />
                        )}

                        {compareMode === 'swipe' && (
                            <SwipeView
                                imageA={imageA}
                                imageB={imageB}
                                imageC={imageC}
                                swipePosition={swipePosition}
                                swipePosition2={swipePosition2}
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

                        {compareMode === 'swapbox' && (
                            <SwapBoxView
                                imageA={imageA}
                                imageB={imageB}
                                imageC={imageC}
                                containerRef={containerRef}
                                onWheel={handleWheel}
                                onMouseDown={handlePanStart}
                                onMouseMove={handlePanMove}
                                onMouseUp={handlePanEnd}
                                onMouseLeave={handlePanEnd}
                                viewportState={viewportState}
                            />
                        )}

                        {compareMode === 'diff' && (
                            <DifferenceView
                                imageA={imageA}
                                imageB={imageB}
                                imageC={imageC}
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
// Side-by-Side View (3 columns when imageC is present)
// =============================================================================

interface SideBySideViewProps {
    imageA?: { url: string; name: string } | null
    imageB?: { url: string; name: string } | null
    imageC?: { url: string; name: string } | null
}

function SideBySideView({ imageA, imageB, imageC }: SideBySideViewProps) {
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

            {/* Center Panel (Image B) */}
            <div className={`flex-1 relative ${imageC ? 'border-r border-border-dark' : ''}`}>
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

            {/* Right Panel (Image C) - Only shown if imageC exists */}
            {imageC && (
                <div className="flex-1 relative">
                    <div className="absolute top-3 left-3 z-10 bg-violet-500/20 border border-violet-500/40 rounded px-2 py-0.5">
                        <span className="text-xs text-violet-400 font-medium">C</span>
                    </div>
                    <ImageViewer
                        imageUrl={imageC.url}
                        imageName={imageC.name}
                        synchronized={true}
                        className="h-full w-full"
                        showControls={false}
                    />
                </div>
            )}

            {/* Centered zoom controls */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-surface-dark/90 backdrop-blur-md border border-border-dark rounded-md shadow-lg p-1 flex gap-1 z-20">
                <ZoomControls />
            </div>
        </div>
    )
}

// =============================================================================
// Swipe (Curtain) View - supports 2 handles for 3 images
// =============================================================================

interface SwipeViewProps {
    imageA?: { url: string; name: string } | null
    imageB?: { url: string; name: string } | null
    imageC?: { url: string; name: string } | null
    swipePosition: number
    swipePosition2: number
    containerRef: React.RefObject<HTMLDivElement>
    onWheel: (e: React.WheelEvent<HTMLDivElement>) => void
    onMouseDown: (e: MouseEvent) => void
    onMouseMove: (e: MouseEvent) => void
    onMouseUp: () => void
    onMouseLeave: () => void
    onHandleMouseDown: (handleNum: 1 | 2) => (e: MouseEvent) => void
    viewportState: { x: number; y: number; zoom: number }
}

function SwipeView({
    imageA,
    imageB,
    imageC,
    swipePosition,
    swipePosition2,
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
            {/* Image A (Bottom layer - visible from 0% to swipePosition) */}
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

            {/* Image B (Middle layer - visible from swipePosition to swipePosition2 when C exists, or swipePosition to 100% otherwise) */}
            <div
                className="absolute inset-0 flex items-center justify-center overflow-hidden"
                style={{
                    clipPath: imageC
                        ? `inset(0 ${100 - swipePosition2}% 0 ${swipePosition}%)`
                        : `inset(0 0 0 ${swipePosition}%)`,
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

            {/* Image C (Top layer - visible from swipePosition2 to 100%) - only if C exists */}
            {imageC && (
                <div
                    className="absolute inset-0 flex items-center justify-center overflow-hidden"
                    style={{
                        clipPath: `inset(0 0 0 ${swipePosition2}%)`,
                    }}
                >
                    <div
                        className="absolute top-3 z-10 bg-violet-500/20 border border-violet-500/40 rounded px-2 py-0.5"
                        style={{ left: `${swipePosition2 + 1}%` }}
                    >
                        <span className="text-xs text-violet-400 font-medium">C</span>
                    </div>
                    <img
                        src={imageC.url}
                        alt={imageC.name}
                        className="max-w-none pointer-events-none"
                        style={{
                            transform: `translate(${viewportState.x}px, ${viewportState.y}px) scale(${viewportState.zoom})`,
                            transformOrigin: 'center center',
                        }}
                        draggable={false}
                    />
                </div>
            )}

            {/* Swipe Handle 1 (between A and B) */}
            <div
                className="absolute top-0 bottom-0 w-1 bg-orange-400/80 cursor-ew-resize z-20 shadow-lg"
                style={{ left: `${swipePosition}%`, transform: 'translateX(-50%)' }}
                onMouseDown={onHandleMouseDown(1)}
            >
                {/* Handle grip */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-10 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-orange-400">
                    <div className="flex gap-0.5">
                        <div className="w-0.5 h-4 bg-orange-400 rounded-full"></div>
                        <div className="w-0.5 h-4 bg-orange-400 rounded-full"></div>
                    </div>
                </div>
            </div>

            {/* Swipe Handle 2 (between B and C) - only if C exists */}
            {imageC && (
                <div
                    className="absolute top-0 bottom-0 w-1 bg-violet-400/80 cursor-ew-resize z-20 shadow-lg"
                    style={{ left: `${swipePosition2}%`, transform: 'translateX(-50%)' }}
                    onMouseDown={onHandleMouseDown(2)}
                >
                    {/* Handle grip */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-10 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-violet-400">
                        <div className="flex gap-0.5">
                            <div className="w-0.5 h-4 bg-violet-400 rounded-full"></div>
                            <div className="w-0.5 h-4 bg-violet-400 rounded-full"></div>
                        </div>
                    </div>
                </div>
            )}

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
// Difference View - Split view for 3 images (A vs B | A vs C)
// =============================================================================

interface DifferenceViewProps {
    imageA?: { url: string; name: string } | null
    imageB?: { url: string; name: string } | null
    imageC?: { url: string; name: string } | null
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
    imageC,
    containerRef,
    onWheel,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onMouseLeave,
    viewportState,
}: DifferenceViewProps) {
    // If no Image C, use single difference view; otherwise use split
    if (!imageC) {
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
                    <span className="text-xs text-purple-400 font-medium">A vs B Difference</span>
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

    // Split view: Left = A vs B, Right = A vs C
    return (
        <div className="absolute inset-0 flex">
            {/* Left Panel: A vs B */}
            <div
                ref={containerRef}
                className="flex-1 border-r border-border-dark relative select-none overflow-hidden"
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
            </div>

            {/* Right Panel: A vs C */}
            <div
                className="flex-1 relative select-none overflow-hidden"
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

                {/* Image C (Difference blend) */}
                <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                    <img
                        src={imageC.url}
                        alt={imageC.name}
                        className="max-w-none pointer-events-none"
                        style={{
                            transform: `translate(${viewportState.x}px, ${viewportState.y}px) scale(${viewportState.zoom})`,
                            transformOrigin: 'center center',
                            mixBlendMode: 'difference',
                        }}
                        draggable={false}
                    />
                </div>

                {/* Labels */}
                <div className="absolute top-3 left-3 z-10 flex gap-2">
                    <div className="bg-cyan-500/20 border border-cyan-500/40 rounded px-2 py-0.5">
                        <span className="text-xs text-cyan-400 font-medium">A</span>
                    </div>
                    <div className="bg-violet-500/20 border border-violet-500/40 rounded px-2 py-0.5">
                        <span className="text-xs text-violet-400 font-medium">C (diff)</span>
                    </div>
                </div>
            </div>

            {/* Mode indicator */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-purple-500/20 border border-purple-500/40 rounded px-2 py-1 z-10">
                <span className="text-xs text-purple-400 font-medium">Split Difference Mode</span>
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
// Swap Box View - Draggable/resizable boxes showing B and C over A
// =============================================================================

interface SwapBoxViewProps {
    imageA?: { url: string; name: string } | null
    imageB?: { url: string; name: string } | null
    imageC?: { url: string; name: string } | null
    containerRef: React.RefObject<HTMLDivElement>
    onWheel: (e: React.WheelEvent<HTMLDivElement>) => void
    onMouseDown: (e: MouseEvent) => void
    onMouseMove: (e: MouseEvent) => void
    onMouseUp: () => void
    onMouseLeave: () => void
    viewportState: { x: number; y: number; zoom: number }
}

interface BoxState {
    x: number
    y: number
    width: number
    height: number
}

function SwapBoxView({
    imageA,
    imageB,
    imageC,
    containerRef,
    onWheel,
    onMouseDown,
    onMouseMove: onMouseMoveBG,
    onMouseUp: onMouseUpBG,
    onMouseLeave: onMouseLeaveBG,
    viewportState,
}: SwapBoxViewProps) {
    // Box states - position as percentage of container
    const [boxB, setBoxB] = useState<BoxState>({ x: 10, y: 10, width: 30, height: 30 })
    const [boxC, setBoxC] = useState<BoxState>({ x: 60, y: 60, width: 30, height: 30 })

    // Drag state
    const dragRef = useRef<{
        box: 'B' | 'C' | null
        action: 'move' | 'resize' | null
        corner?: 'nw' | 'ne' | 'sw' | 'se'
        startX: number
        startY: number
        startBox: BoxState
    }>({ box: null, action: null, startX: 0, startY: 0, startBox: { x: 0, y: 0, width: 0, height: 0 } })

    const handleMouseDown = useCallback((
        box: 'B' | 'C',
        action: 'move' | 'resize',
        corner?: 'nw' | 'ne' | 'sw' | 'se'
    ) => (e: MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        dragRef.current = {
            box,
            action,
            corner,
            startX: e.clientX,
            startY: e.clientY,
            startBox: box === 'B' ? { ...boxB } : { ...boxC }
        }
    }, [boxB, boxC])

    const handleMouseMove = useCallback((e: MouseEvent) => {
        const drag = dragRef.current
        if (!drag.box || !drag.action || !containerRef.current) return

        const rect = containerRef.current.getBoundingClientRect()
        const dx = ((e.clientX - drag.startX) / rect.width) * 100
        const dy = ((e.clientY - drag.startY) / rect.height) * 100
        const setBox = drag.box === 'B' ? setBoxB : setBoxC

        if (drag.action === 'move') {
            setBox({
                ...drag.startBox,
                x: Math.max(0, Math.min(100 - drag.startBox.width, drag.startBox.x + dx)),
                y: Math.max(0, Math.min(100 - drag.startBox.height, drag.startBox.y + dy)),
            })
        } else if (drag.action === 'resize' && drag.corner) {
            let newBox = { ...drag.startBox }

            if (drag.corner.includes('e')) {
                newBox.width = Math.max(10, Math.min(100 - newBox.x, drag.startBox.width + dx))
            }
            if (drag.corner.includes('w')) {
                const newWidth = Math.max(10, drag.startBox.width - dx)
                newBox.x = drag.startBox.x + drag.startBox.width - newWidth
                newBox.width = newWidth
            }
            if (drag.corner.includes('s')) {
                newBox.height = Math.max(10, Math.min(100 - newBox.y, drag.startBox.height + dy))
            }
            if (drag.corner.includes('n')) {
                const newHeight = Math.max(10, drag.startBox.height - dy)
                newBox.y = drag.startBox.y + drag.startBox.height - newHeight
                newBox.height = newHeight
            }

            setBox(newBox)
        }
    }, [containerRef])

    const handleMouseUp = useCallback(() => {
        dragRef.current = { box: null, action: null, startX: 0, startY: 0, startBox: { x: 0, y: 0, width: 0, height: 0 } }
    }, [])

    const renderBox = (
        box: BoxState,
        image: { url: string; name: string } | null | undefined,
        label: 'B' | 'C'
    ) => {
        if (!image) return null

        const colorClasses = label === 'B'
            ? { bg: 'bg-orange-500/20', border: 'border-orange-400', text: 'text-orange-400' }
            : { bg: 'bg-violet-500/20', border: 'border-violet-400', text: 'text-violet-400' }

        return (
            <div
                className={`absolute overflow-hidden border-2 ${colorClasses.border} shadow-lg cursor-move`}
                style={{
                    left: `${box.x}%`,
                    top: `${box.y}%`,
                    width: `${box.width}%`,
                    height: `${box.height}%`,
                }}
                onMouseDown={handleMouseDown(label, 'move')}
            >
                {/* Image content - clipped to box */}
                <div
                    className="absolute inset-0 overflow-hidden pointer-events-none"
                    style={{
                        left: `-${(box.x / box.width) * 100}%`,
                        top: `-${(box.y / box.height) * 100}%`,
                        width: `${100 / box.width * 100}%`,
                        height: `${100 / box.height * 100}%`,
                    }}
                >
                    <div className="absolute inset-0 flex items-center justify-center">
                        <img
                            src={image.url}
                            alt={image.name}
                            className="max-w-none pointer-events-none"
                            style={{
                                transform: `translate(${viewportState.x}px, ${viewportState.y}px) scale(${viewportState.zoom})`,
                                transformOrigin: 'center center',
                            }}
                            draggable={false}
                        />
                    </div>
                </div>

                {/* Label indicator - semi-transparent overlay at top */}
                <div
                    className={`absolute top-0 left-0 right-0 h-5 ${colorClasses.bg} flex items-center justify-center pointer-events-none`}
                >
                    <span className={`text-[10px] ${colorClasses.text} font-bold`}>{label}</span>
                </div>

                {/* Resize corners */}
                {(['nw', 'ne', 'sw', 'se'] as const).map((corner) => (
                    <div
                        key={corner}
                        className={`absolute w-4 h-4 ${colorClasses.bg} ${colorClasses.border} border rounded-sm z-10`}
                        style={{
                            top: corner.includes('n') ? -2 : 'auto',
                            bottom: corner.includes('s') ? -2 : 'auto',
                            left: corner.includes('w') ? -2 : 'auto',
                            right: corner.includes('e') ? -2 : 'auto',
                            cursor: corner === 'nw' || corner === 'se' ? 'nwse-resize' : 'nesw-resize',
                        }}
                        onMouseDown={(e) => {
                            e.stopPropagation()
                            handleMouseDown(label, 'resize', corner)(e as unknown as MouseEvent)
                        }}
                    />
                ))}
            </div>
        )
    }

    return (
        <div
            ref={containerRef}
            className="absolute inset-0 select-none"
            style={{ cursor: dragRef.current.box ? 'move' : 'grab' }}
            onWheel={onWheel}
            onMouseDown={onMouseDown}
            onMouseMove={(e) => {
                handleMouseMove(e) // Box drag logic
                onMouseMoveBG(e) // Background pan logic
            }}
            onMouseUp={() => {
                handleMouseUp()
                onMouseUpBG()
            }}
            onMouseLeave={() => {
                handleMouseUp()
                onMouseLeaveBG()
            }}
        >
            {/* Image A (Background - full) */}
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                <div className="absolute top-3 left-3 z-10 bg-cyan-500/20 border border-cyan-500/40 rounded px-2 py-0.5">
                    <span className="text-xs text-cyan-400 font-medium">A (Background)</span>
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

            {/* Box B */}
            {renderBox(boxB, imageB, 'B')}

            {/* Box C - only if imageC exists */}
            {imageC && renderBox(boxC, imageC, 'C')}

            {/* Mode indicator */}
            <div className="absolute top-3 right-3 bg-purple-500/20 border border-purple-500/40 rounded px-2 py-1 z-10">
                <span className="text-xs text-purple-400 font-medium">Swap Box Mode</span>
            </div>

            {/* Instructions */}
            <div className="absolute bottom-16 right-3 bg-surface-dark/80 backdrop-blur-sm border border-border-dark rounded px-2 py-1 z-10">
                <span className="text-xs text-text-secondary">Drag boxes to move, corners to resize</span>
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
