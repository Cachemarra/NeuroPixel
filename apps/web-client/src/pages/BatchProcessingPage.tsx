/**
 * BatchProcessingPage - Full batch processing screen
 * Features:
 * - Left sidebar with folder selection and image thumbnails
 * - Center workflow viewer (read-only)
 * - Image preview on click
 * - Execute button for batch processing
 */

import { useState, useRef, useEffect } from 'react'
import { ReactFlow, Background, BackgroundVariant, ReactFlowProvider } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useAppStore } from '@/store/appStore'
import { nodeTypes } from '@/components/nodes'

const API_BASE = 'http://localhost:8001'
const WS_URL = 'ws://localhost:8001/batch/ws/progress'

interface BatchImage {
    id: string
    name: string
    file: File
    thumbnailUrl: string
}

interface BatchProgress {
    current: number
    total: number
    filename?: string
    status: 'idle' | 'running' | 'completed' | 'failed'
    elapsedSeconds: number
}

function BatchProcessingContent() {
    const {
        pipelineNodes,
        pipelineEdges,
        pipelineName,
        pipelineSteps,
    } = useAppStore()

    const [batchImages, setBatchImages] = useState<BatchImage[]>([])
    const [selectedImageId, setSelectedImageId] = useState<string | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [outputFolder, setOutputFolder] = useState('/tmp/neuropixel_batch_output')
    const [progress, setProgress] = useState<BatchProgress>({
        current: 0,
        total: 0,
        status: 'idle',
        elapsedSeconds: 0
    })
    const [error, setError] = useState<string | null>(null)

    const folderInputRef = useRef<HTMLInputElement>(null)
    const wsRef = useRef<WebSocket | null>(null)

    // Generate thumbnail from File
    const createThumbnail = (file: File): Promise<string> => {
        return new Promise((resolve) => {
            const reader = new FileReader()
            reader.onload = (e) => {
                resolve(e.target?.result as string)
            }
            reader.readAsDataURL(file)
        })
    }

    // Handle folder selection
    const handleFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0) return

        const imageFiles = Array.from(files).filter(file =>
            /\.(jpg|jpeg|png|tif|tiff|bmp|webp)$/i.test(file.name)
        )

        const newImages: BatchImage[] = []
        for (const file of imageFiles) {
            const thumbnailUrl = await createThumbnail(file)
            newImages.push({
                id: crypto.randomUUID(),
                name: file.name,
                file,
                thumbnailUrl
            })
        }

        setBatchImages(newImages)
        setSelectedImageId(null)
        setPreviewUrl(null)
    }

    // Handle image selection for preview
    const handleImageClick = async (image: BatchImage) => {
        setSelectedImageId(image.id)
        const url = await createThumbnail(image.file)
        setPreviewUrl(url)
    }

    // Clear all images
    const handleClear = () => {
        setBatchImages([])
        setSelectedImageId(null)
        setPreviewUrl(null)
        if (folderInputRef.current) {
            folderInputRef.current.value = ''
        }
    }

    // Execute batch processing
    const handleExecute = async () => {
        if (batchImages.length === 0) {
            setError('No images loaded')
            return
        }
        if (pipelineNodes.length === 0 && pipelineSteps.length === 0) {
            setError('No workflow defined. Create a pipeline in the Pipeline view first.')
            return
        }

        setError(null)
        setProgress({ current: 0, total: batchImages.length, status: 'running', elapsedSeconds: 0 })

        // Connect WebSocket for progress updates
        try {
            const ws = new WebSocket(WS_URL)
            wsRef.current = ws

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data)
                setProgress(prev => ({
                    ...prev,
                    current: data.current || prev.current,
                    total: data.total || prev.total,
                    filename: data.filename,
                    status: data.status === 'completed' ? 'completed' :
                        data.status === 'failed' ? 'failed' : 'running',
                    elapsedSeconds: data.elapsed_seconds || prev.elapsedSeconds
                }))
            }

            ws.onclose = () => {
                wsRef.current = null
            }
        } catch (e) {
            console.error('WebSocket connection failed:', e)
        }

        // Upload images to backend first
        const uploadedIds: string[] = []
        for (let i = 0; i < batchImages.length; i++) {
            const image = batchImages[i]
            setProgress(prev => ({
                ...prev,
                current: i,
                filename: `Uploading ${image.name}...`
            }))

            const formData = new FormData()
            formData.append('file', image.file)

            try {
                const res = await fetch(`${API_BASE}/images/upload`, {
                    method: 'POST',
                    body: formData
                })
                if (res.ok) {
                    const data = await res.json()
                    uploadedIds.push(data.id)
                }
            } catch (e) {
                console.error('Upload failed for', image.name, e)
            }
        }

        // Now run batch processing
        const backendSteps = pipelineSteps
            .filter(s => s.active)
            .map(s => ({
                plugin_name: s.pluginName,
                params: s.params,
                active: true
            }))

        try {
            const response = await fetch(`${API_BASE}/batch/run`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    source_image_ids: uploadedIds,
                    pipeline_steps: backendSteps,
                    output_folder: outputFolder
                })
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.detail || 'Batch processing failed')
            }

            setProgress(prev => ({ ...prev, status: 'completed' }))
        } catch (e: any) {
            setError(e.message)
            setProgress(prev => ({ ...prev, status: 'failed' }))
        } finally {
            wsRef.current?.close()
        }
    }

    // Cleanup WebSocket on unmount
    useEffect(() => {
        return () => {
            wsRef.current?.close()
        }
    }, [])

    const hasWorkflow = pipelineNodes.length > 0 || pipelineSteps.length > 0

    return (
        <div className="flex-1 flex overflow-hidden">
            {/* Left Sidebar - Image Selection */}
            <aside className="w-72 bg-surface-dark border-r border-border-dark flex flex-col shrink-0">
                {/* Header */}
                <div className="px-4 py-3 border-b border-border-dark bg-panel-dark">
                    <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-[20px]">folder_open</span>
                        Batch Images
                    </h2>
                </div>

                {/* Folder Selection */}
                <div className="p-3 border-b border-border-dark">
                    <input
                        ref={folderInputRef}
                        type="file"
                        // @ts-ignore - webkitdirectory is a non-standard but widely supported attribute
                        webkitdirectory=""
                        multiple
                        onChange={handleFolderSelect}
                        className="hidden"
                        id="batch-folder-input"
                    />
                    <label
                        htmlFor="batch-folder-input"
                        className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-primary hover:bg-blue-600 text-white text-sm font-medium rounded cursor-pointer transition-colors"
                    >
                        <span className="material-symbols-outlined text-[18px]">create_new_folder</span>
                        Select Folder
                    </label>
                    {batchImages.length > 0 && (
                        <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-text-secondary">
                                {batchImages.length} images loaded
                            </span>
                            <button
                                onClick={handleClear}
                                className="text-xs text-red-400 hover:text-red-300 transition-colors"
                            >
                                Clear
                            </button>
                        </div>
                    )}
                </div>

                {/* Image List */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {batchImages.length === 0 ? (
                        <div className="text-center py-8 text-text-secondary/60">
                            <span className="material-symbols-outlined text-4xl mb-2 block">photo_library</span>
                            <p className="text-sm">No images loaded</p>
                            <p className="text-xs mt-1">Select a folder to begin</p>
                        </div>
                    ) : (
                        batchImages.map((img) => (
                            <button
                                key={img.id}
                                onClick={() => handleImageClick(img)}
                                className={`w-full flex items-center gap-2 p-2 rounded transition-colors ${selectedImageId === img.id
                                        ? 'bg-primary/20 border border-primary/50'
                                        : 'hover:bg-panel-dark border border-transparent'
                                    }`}
                            >
                                <img
                                    src={img.thumbnailUrl}
                                    alt={img.name}
                                    className="w-10 h-10 rounded object-cover bg-panel-dark"
                                />
                                <span className="text-xs text-white truncate flex-1 text-left">
                                    {img.name}
                                </span>
                            </button>
                        ))
                    )}
                </div>

                {/* Action Bar */}
                <div className="p-3 border-t border-border-dark space-y-3">
                    {/* Output folder */}
                    <div>
                        <label className="text-xs text-text-secondary block mb-1">Output Folder</label>
                        <input
                            type="text"
                            value={outputFolder}
                            onChange={(e) => setOutputFolder(e.target.value)}
                            className="w-full bg-background-dark border border-border-dark rounded px-3 py-2 text-xs text-white font-mono"
                            placeholder="/path/to/output"
                        />
                    </div>

                    {/* Execute button */}
                    <button
                        onClick={handleExecute}
                        disabled={batchImages.length === 0 || !hasWorkflow || progress.status === 'running'}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:opacity-50 text-white font-bold rounded transition-colors"
                    >
                        {progress.status === 'running' ? (
                            <>
                                <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                                Processing...
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                                Execute Batch
                            </>
                        )}
                    </button>

                    {/* Progress */}
                    {progress.status === 'running' && (
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs text-text-secondary">
                                <span>{progress.filename || 'Processing...'}</span>
                                <span>{progress.current}/{progress.total}</span>
                            </div>
                            <div className="w-full h-1.5 bg-background-dark rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-green-500 transition-all duration-300"
                                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Status */}
                    {progress.status === 'completed' && (
                        <div className="flex items-center gap-2 text-green-400 text-sm">
                            <span className="material-symbols-outlined text-[18px]">check_circle</span>
                            Batch processing complete!
                        </div>
                    )}

                    {error && (
                        <div className="text-red-400 text-xs p-2 bg-red-500/10 rounded border border-red-500/30">
                            {error}
                        </div>
                    )}
                </div>
            </aside>

            {/* Main Area - Split View */}
            <div className="flex-1 flex flex-col">
                {/* Workflow Viewer */}
                <div className="flex-1 relative">
                    <div className="absolute top-3 left-3 z-10 bg-surface-dark/90 backdrop-blur-sm px-3 py-1.5 rounded border border-border-dark">
                        <span className="text-xs text-text-secondary">Workflow: </span>
                        <span className="text-xs text-white font-medium">{pipelineName || 'Untitled'}</span>
                        <span className="text-xs text-text-secondary ml-2">(Read-only)</span>
                    </div>

                    {hasWorkflow ? (
                        <ReactFlow
                            nodes={pipelineNodes}
                            edges={pipelineEdges}
                            nodeTypes={nodeTypes}
                            nodesDraggable={false}
                            nodesConnectable={false}
                            elementsSelectable={false}
                            panOnDrag={true}
                            zoomOnScroll={true}
                            fitView
                            proOptions={{ hideAttribution: true }}
                        >
                            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#333" />
                        </ReactFlow>
                    ) : (
                        <div className="flex-1 flex items-center justify-center h-full bg-background-dark">
                            <div className="text-center">
                                <span className="material-symbols-outlined text-6xl text-text-secondary/40">account_tree</span>
                                <p className="text-text-secondary mt-4">No workflow defined</p>
                                <p className="text-text-secondary/60 text-sm mt-1">
                                    Create a pipeline in the Pipeline view first
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Preview Panel */}
                {previewUrl && (
                    <div className="h-64 border-t border-border-dark bg-panel-dark p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs text-text-secondary">Preview:</span>
                            <span className="text-xs text-white">
                                {batchImages.find(img => img.id === selectedImageId)?.name}
                            </span>
                            <button
                                onClick={() => { setSelectedImageId(null); setPreviewUrl(null) }}
                                className="ml-auto text-text-secondary hover:text-white"
                            >
                                <span className="material-symbols-outlined text-[16px]">close</span>
                            </button>
                        </div>
                        <div className="h-48 flex items-center justify-center">
                            <img
                                src={previewUrl}
                                alt="Preview"
                                className="max-h-full max-w-full object-contain rounded"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export function BatchProcessingPage() {
    return (
        <ReactFlowProvider>
            <BatchProcessingContent />
        </ReactFlowProvider>
    )
}
