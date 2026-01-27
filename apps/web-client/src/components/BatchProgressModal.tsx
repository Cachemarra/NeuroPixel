/**
 * BatchProgressModal - Real-time batch processing progress display
 * Phase 5: Connects to WebSocket for live updates
 */

import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '@/store/appStore'

const API_BASE = 'http://localhost:8000'
const WS_URL = 'ws://localhost:8000/batch/ws/progress'

export function BatchProgressModal() {
    const {
        isBatchModalOpen,
        closeBatchModal,
        batchProgress,
        setBatchProgress,
        pipelineSteps,
        images,
    } = useAppStore()

    const [isRunning, setIsRunning] = useState(false)
    const [jobId, setJobId] = useState<string | null>(null)
    const [outputFolder, setOutputFolder] = useState('/tmp/neuropixel_batch_output')
    const [error, setError] = useState<string | null>(null)
    const wsRef = useRef<WebSocket | null>(null)
    const startTimeRef = useRef<number | null>(null)

    // Connect to WebSocket when modal opens
    useEffect(() => {
        if (!isBatchModalOpen) return

        const ws = new WebSocket(WS_URL)
        wsRef.current = ws

        ws.onopen = () => {
            console.log('Batch progress WebSocket connected')
        }

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data)

                // Check if this is a progress update for our job
                if (data.job_id && data.job_id === jobId) {
                    setBatchProgress({
                        jobId: data.job_id,
                        status: data.status,
                        current: data.current,
                        total: data.total,
                        filename: data.filename || undefined,
                        elapsedSeconds: data.elapsed_seconds || 0,
                    })

                    // Check if completed
                    if (data.status === 'completed' || data.status === 'failed') {
                        setIsRunning(false)
                    }
                }
            } catch (e) {
                console.error('Error parsing WebSocket message:', e)
            }
        }

        ws.onerror = (e) => {
            console.error('WebSocket error:', e)
        }

        ws.onclose = () => {
            console.log('Batch progress WebSocket closed')
        }

        return () => {
            ws.close()
            wsRef.current = null
        }
    }, [isBatchModalOpen, jobId, setBatchProgress])

    const handleStartBatch = async () => {
        if (pipelineSteps.length === 0 || images.length === 0) return

        setError(null)
        setIsRunning(true)
        startTimeRef.current = Date.now()

        // Convert frontend steps to backend format
        const backendSteps = pipelineSteps
            .filter((s) => s.active)
            .map((s) => ({
                plugin_name: s.pluginName,
                params: s.params,
                active: true,
            }))

        const imageIds = images.map((img) => img.id)

        try {
            const response = await fetch(`${API_BASE}/batch/run`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    source_image_ids: imageIds,
                    pipeline_steps: backendSteps,
                    output_folder: outputFolder,
                }),
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.detail || 'Failed to start batch job')
            }

            const data = await response.json()
            setJobId(data.job_id)

            // Initialize progress
            setBatchProgress({
                jobId: data.job_id,
                status: 'pending',
                current: 0,
                total: imageIds.length,
                elapsedSeconds: 0,
            })
        } catch (e: any) {
            setError(e.message)
            setIsRunning(false)
        }
    }

    const handleClose = () => {
        setJobId(null)
        setIsRunning(false)
        setError(null)
        closeBatchModal()
    }

    if (!isBatchModalOpen) return null

    const progressPercent = batchProgress
        ? Math.round((batchProgress.current / batchProgress.total) * 100)
        : 0

    const isComplete = batchProgress?.status === 'completed' || batchProgress?.status === 'failed'

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-surface-dark border border-border-dark rounded-lg shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border-dark">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary text-2xl">batch_prediction</span>
                        <h2 className="text-lg font-bold text-white">Batch Processing</h2>
                    </div>
                    {!isRunning && (
                        <button
                            onClick={handleClose}
                            className="p-1 text-text-secondary hover:text-white transition-colors"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Before Running: Show configuration */}
                    {!isRunning && !isComplete && (
                        <>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 bg-panel-dark rounded border border-border-dark">
                                    <span className="text-sm text-text-secondary">Images to Process</span>
                                    <span className="text-sm font-mono text-white">{images.length}</span>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-panel-dark rounded border border-border-dark">
                                    <span className="text-sm text-text-secondary">Pipeline Steps</span>
                                    <span className="text-sm font-mono text-white">
                                        {pipelineSteps.filter((s) => s.active).length}
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs text-text-secondary">Output Folder</label>
                                    <input
                                        type="text"
                                        value={outputFolder}
                                        onChange={(e) => setOutputFolder(e.target.value)}
                                        className="w-full bg-background-dark border border-border-dark rounded px-3 py-2 text-sm text-white font-mono"
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm">
                                    {error}
                                </div>
                            )}

                            <button
                                onClick={handleStartBatch}
                                disabled={pipelineSteps.length === 0 || images.length === 0}
                                className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-3 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Start Batch Processing
                            </button>
                        </>
                    )}

                    {/* While Running: Show progress */}
                    {isRunning && batchProgress && (
                        <div className="space-y-4">
                            <div className="text-center">
                                <span className="material-symbols-outlined text-5xl text-primary animate-pulse">
                                    hourglass_top
                                </span>
                            </div>

                            {/* Progress Bar */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs text-text-secondary">
                                    <span>Processing...</span>
                                    <span>{progressPercent}%</span>
                                </div>
                                <div className="w-full h-3 bg-background-dark rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-primary to-blue-400 transition-all duration-300"
                                        style={{ width: `${progressPercent}%` }}
                                    />
                                </div>
                            </div>

                            {/* Current File */}
                            {batchProgress.filename && (
                                <div className="text-center">
                                    <span className="text-xs text-text-secondary">Current: </span>
                                    <span className="text-xs text-white font-mono">
                                        {batchProgress.filename}
                                    </span>
                                </div>
                            )}

                            {/* Stats */}
                            <div className="flex justify-center gap-8 text-center">
                                <div>
                                    <p className="text-2xl font-bold text-white">
                                        {batchProgress.current} / {batchProgress.total}
                                    </p>
                                    <p className="text-xs text-text-secondary">Images</p>
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-white">
                                        {batchProgress.elapsedSeconds.toFixed(1)}s
                                    </p>
                                    <p className="text-xs text-text-secondary">Elapsed</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Complete: Show summary */}
                    {isComplete && batchProgress && (
                        <div className="space-y-4">
                            <div className="text-center">
                                <span
                                    className={`material-symbols-outlined text-5xl ${batchProgress.status === 'completed' ? 'text-green-500' : 'text-red-500'
                                        }`}
                                >
                                    {batchProgress.status === 'completed' ? 'check_circle' : 'error'}
                                </span>
                                <h3 className="text-lg font-bold text-white mt-2">
                                    {batchProgress.status === 'completed' ? 'Processing Complete!' : 'Processing Failed'}
                                </h3>
                            </div>

                            {/* Summary Stats */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-panel-dark rounded border border-border-dark text-center">
                                    <p className="text-2xl font-bold text-white">{batchProgress.current}</p>
                                    <p className="text-xs text-text-secondary">Images Processed</p>
                                </div>
                                <div className="p-3 bg-panel-dark rounded border border-border-dark text-center">
                                    <p className="text-2xl font-bold text-white">
                                        {batchProgress.elapsedSeconds.toFixed(1)}s
                                    </p>
                                    <p className="text-xs text-text-secondary">Total Time</p>
                                </div>
                            </div>

                            {/* Output Folder */}
                            <div className="p-3 bg-panel-dark rounded border border-border-dark">
                                <p className="text-xs text-text-secondary mb-1">Output saved to:</p>
                                <p className="text-sm font-mono text-white break-all">{outputFolder}</p>
                            </div>

                            <button
                                onClick={handleClose}
                                className="w-full bg-surface-dark hover:bg-panel-dark border border-border-dark text-white font-medium py-3 rounded transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
