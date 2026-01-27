/**
 * ImageViewer - Synchronized image viewer with pan/zoom capabilities
 * Supports both controlled (from store) and uncontrolled (internal state) modes.
 */
import { useRef, useCallback, useLayoutEffect, useState, MouseEvent, WheelEvent } from 'react'
import { useAppStore, ViewportState } from '@/store/appStore'

interface ImageViewerProps {
    imageUrl: string
    imageName?: string
    /** If true, uses global viewportState from store (for synchronized viewing) */
    synchronized?: boolean
    /** Optional CSS class for the container */
    className?: string
    /** Show zoom/pan controls overlay */
    showControls?: boolean
}

export function ImageViewer({
    imageUrl,
    imageName = 'Image',
    synchronized = false,
    className = '',
    showControls = true,
}: ImageViewerProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const imageRef = useRef<HTMLImageElement>(null)
    const isDragging = useRef(false)
    const lastPosition = useRef({ x: 0, y: 0 })

    // Global state for synchronized mode
    const { viewportState, setViewportState } = useAppStore()

    // Local state for uncontrolled mode
    const [localViewport, setLocalViewport] = useState<ViewportState>({ x: 0, y: 0, zoom: 1 })

    // Use global or local viewport based on mode
    const viewport = synchronized ? viewportState : localViewport
    const updateViewport = synchronized
        ? (updates: Partial<ViewportState>) => setViewportState(updates)
        : (updates: Partial<ViewportState>) => setLocalViewport((prev) => ({ ...prev, ...updates }))

    // Handle wheel zoom
    const handleWheel = useCallback(
        (e: WheelEvent<HTMLDivElement>) => {
            e.preventDefault()
            const delta = e.deltaY > 0 ? 0.9 : 1.1
            const newZoom = Math.min(Math.max(viewport.zoom * delta, 0.1), 10)

            // Zoom towards cursor position
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect()
                const cursorX = e.clientX - rect.left - rect.width / 2
                const cursorY = e.clientY - rect.top - rect.height / 2

                const zoomRatio = newZoom / viewport.zoom
                const newX = viewport.x - cursorX * (zoomRatio - 1)
                const newY = viewport.y - cursorY * (zoomRatio - 1)

                updateViewport({ x: newX, y: newY, zoom: newZoom })
            } else {
                updateViewport({ zoom: newZoom })
            }
        },
        [viewport, updateViewport]
    )

    // Handle pan start
    const handleMouseDown = useCallback((e: MouseEvent<HTMLDivElement>) => {
        if (e.button !== 0) return // Only left click
        isDragging.current = true
        lastPosition.current = { x: e.clientX, y: e.clientY }
        e.currentTarget.style.cursor = 'grabbing'
    }, [])

    // Handle pan move
    const handleMouseMove = useCallback(
        (e: MouseEvent<HTMLDivElement>) => {
            if (!isDragging.current) return

            const dx = e.clientX - lastPosition.current.x
            const dy = e.clientY - lastPosition.current.y
            lastPosition.current = { x: e.clientX, y: e.clientY }

            updateViewport({
                x: viewport.x + dx,
                y: viewport.y + dy,
            })
        },
        [viewport, updateViewport]
    )

    // Handle pan end
    const handleMouseUp = useCallback((e: MouseEvent<HTMLDivElement>) => {
        isDragging.current = false
        e.currentTarget.style.cursor = 'grab'
    }, [])

    const handleMouseLeave = useCallback((e: MouseEvent<HTMLDivElement>) => {
        isDragging.current = false
        e.currentTarget.style.cursor = 'grab'
    }, [])

    // Zoom controls
    const zoomIn = useCallback(() => {
        updateViewport({ zoom: Math.min(viewport.zoom * 1.25, 10) })
    }, [viewport.zoom, updateViewport])

    const zoomOut = useCallback(() => {
        updateViewport({ zoom: Math.max(viewport.zoom * 0.8, 0.1) })
    }, [viewport.zoom, updateViewport])

    const fitToScreen = useCallback(() => {
        updateViewport({ x: 0, y: 0, zoom: 1 })
    }, [updateViewport])

    // Apply transform using layout effect for smoother updates
    useLayoutEffect(() => {
        if (imageRef.current) {
            imageRef.current.style.transform = `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`
        }
    }, [viewport])

    return (
        <div
            ref={containerRef}
            className={`relative overflow-hidden bg-[#101012] select-none ${className}`}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            style={{ cursor: 'grab' }}
        >
            {/* Image container */}
            <div className="absolute inset-0 flex items-center justify-center">
                <img
                    ref={imageRef}
                    src={imageUrl}
                    alt={imageName}
                    className="max-w-none pointer-events-none"
                    style={{
                        transformOrigin: 'center center',
                        willChange: 'transform',
                    }}
                    draggable={false}
                />
            </div>

            {/* Zoom indicator */}
            <div className="absolute top-3 left-3 bg-surface-dark/80 backdrop-blur-sm border border-border-dark rounded px-2 py-1">
                <span className="text-xs text-text-secondary font-mono">
                    {Math.round(viewport.zoom * 100)}%
                </span>
            </div>

            {/* Controls overlay */}
            {showControls && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-surface-dark/90 backdrop-blur-md border border-border-dark rounded-md shadow-lg p-1 flex gap-1">
                    <button
                        onClick={zoomOut}
                        className="p-1.5 hover:bg-panel-dark text-text-secondary hover:text-white rounded-sm transition-colors"
                        title="Zoom Out"
                    >
                        <span className="material-symbols-outlined text-[18px]">remove</span>
                    </button>
                    <button
                        onClick={fitToScreen}
                        className="p-1.5 hover:bg-panel-dark text-text-secondary hover:text-white rounded-sm transition-colors"
                        title="Fit to Screen"
                    >
                        <span className="material-symbols-outlined text-[18px]">fit_screen</span>
                    </button>
                    <button
                        onClick={zoomIn}
                        className="p-1.5 hover:bg-panel-dark text-text-secondary hover:text-white rounded-sm transition-colors"
                        title="Zoom In"
                    >
                        <span className="material-symbols-outlined text-[18px]">add</span>
                    </button>
                </div>
            )}
        </div>
    )
}
