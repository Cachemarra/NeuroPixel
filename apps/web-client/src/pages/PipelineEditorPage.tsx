/**
 * PipelineEditorPage - Full-page node graph pipeline editor
 * ComfyUI-style workflow editor with draggable nodes and connections
 */

import { useCallback, useState } from 'react'
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    type OnConnect,
    type Connection,
    BackgroundVariant,
    Panel,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { useAppStore } from '@/store/appStore'
import { nodeTypes } from '@/components/nodes'
import { NodePalette } from '@/components/NodePalette'
import type { PipelineEdge } from '@/types/nodeGraph'

export function PipelineEditorPage() {
    const {
        pipelineNodes,
        pipelineEdges,
        onNodesChange,
        onEdgesChange,
        addEdge,
        clearGraph,
        pipelineName,
        setPipelineName,
    } = useAppStore()

    const [isPaletteOpen, setIsPaletteOpen] = useState(false)

    // Handle new connections
    const handleConnect: OnConnect = useCallback(
        (connection: Connection) => {
            if (!connection.source || !connection.target) return

            const newEdge: PipelineEdge = {
                id: `${connection.source}-${connection.sourceHandle}-${connection.target}-${connection.targetHandle}`,
                source: connection.source,
                target: connection.target,
                sourceHandle: connection.sourceHandle,
                targetHandle: connection.targetHandle,
                type: 'smoothstep',
                animated: true,
                style: { stroke: '#6366f1', strokeWidth: 2 },
            }
            addEdge(newEdge)
        },
        [addEdge]
    )

    // Save workflow as JSON
    const handleSaveWorkflow = () => {
        const workflow = {
            name: pipelineName || 'Untitled Workflow',
            nodes: pipelineNodes,
            edges: pipelineEdges,
        }
        const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${pipelineName || 'workflow'}.json`
        a.click()
        URL.revokeObjectURL(url)
    }

    // Load workflow from JSON
    const handleLoadWorkflow = () => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.json'
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0]
            if (!file) return

            try {
                const text = await file.text()
                const workflow = JSON.parse(text)
                clearGraph()
                if (workflow.name) {
                    setPipelineName(workflow.name)
                }
                // Load nodes and edges
                const { setNodes, setEdges } = useAppStore.getState()
                if (workflow.nodes) {
                    setNodes(workflow.nodes)
                }
                if (workflow.edges) {
                    setEdges(workflow.edges)
                }
            } catch (err) {
                console.error('Failed to load workflow:', err)
            }
        }
        input.click()
    }

    return (
        <div className="flex-1 flex flex-col bg-background-dark overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border-dark bg-surface-dark px-6 py-3 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary text-2xl">hub</span>
                        <div>
                            <input
                                type="text"
                                value={pipelineName}
                                onChange={(e) => setPipelineName(e.target.value)}
                                placeholder="Untitled Workflow"
                                className="bg-transparent text-lg font-bold text-white border-none outline-none focus:border-b focus:border-primary"
                            />
                            <p className="text-text-secondary text-xs font-mono">
                                {pipelineNodes.length} nodes • {pipelineEdges.length} connections
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Add Node Button */}
                    <button
                        onClick={() => setIsPaletteOpen(!isPaletteOpen)}
                        className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-semibold transition-colors ${isPaletteOpen
                            ? 'bg-primary text-white'
                            : 'bg-primary/20 text-primary hover:bg-primary/30'
                            }`}
                    >
                        <span className="material-symbols-outlined text-[20px]">add_circle</span>
                        <span>Add Node</span>
                    </button>

                    {/* Clear Button */}
                    {pipelineNodes.length > 0 && (
                        <button
                            onClick={clearGraph}
                            className="px-3 py-2 text-sm text-text-secondary hover:text-red-400 transition-colors"
                        >
                            Clear All
                        </button>
                    )}

                    {/* Load/Save */}
                    <button
                        onClick={handleLoadWorkflow}
                        className="px-4 py-2 text-sm font-medium text-white border border-border-dark rounded bg-panel-dark hover:bg-surface-dark transition-colors"
                    >
                        Load
                    </button>
                    <button
                        onClick={handleSaveWorkflow}
                        disabled={pipelineNodes.length === 0}
                        className="px-4 py-2 text-sm font-medium text-white border border-border-dark rounded bg-panel-dark hover:bg-surface-dark transition-colors disabled:opacity-50"
                    >
                        Save
                    </button>

                    {/* Run Button */}
                    <button
                        disabled={pipelineNodes.length === 0}
                        className="group flex items-center gap-2 bg-white text-black px-5 py-2 rounded text-sm font-bold hover:bg-zinc-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span className="material-symbols-outlined text-[20px] group-hover:rotate-180 transition-transform duration-500">
                            play_arrow
                        </span>
                        <span>Execute</span>
                    </button>
                </div>
            </div>

            {/* React Flow Canvas */}
            <div className="flex-1 relative">
                <ReactFlow
                    nodes={pipelineNodes}
                    edges={pipelineEdges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={handleConnect}
                    nodeTypes={nodeTypes}
                    fitView
                    snapToGrid
                    snapGrid={[20, 20]}
                    defaultEdgeOptions={{
                        type: 'smoothstep',
                        animated: true,
                        style: { stroke: '#6366f1', strokeWidth: 2 },
                    }}
                    proOptions={{ hideAttribution: true }}
                    className="bg-background-dark"
                >
                    <Background
                        variant={BackgroundVariant.Dots}
                        gap={20}
                        size={1}
                        color="#3f3f46"
                    />
                    <Controls
                        className="!bg-surface-dark !border-border-dark !shadow-lg"
                        showZoom
                        showFitView
                        showInteractive
                    />
                    <MiniMap
                        className="!bg-surface-dark !border-border-dark"
                        nodeColor={(node) => {
                            switch (node.type) {
                                case 'load_image':
                                    return '#10b981'
                                case 'save_image':
                                    return '#3b82f6'
                                case 'preview':
                                    return '#8b5cf6'
                                case 'markdown_note':
                                    return '#f59e0b'
                                case 'operator':
                                    return '#6366f1'
                                default:
                                    return '#6b7280'
                            }
                        }}
                        maskColor="rgba(0, 0, 0, 0.7)"
                    />

                    {/* Empty State */}
                    {pipelineNodes.length === 0 && (
                        <Panel position="top-center" className="mt-20">
                            <div className="text-center bg-surface-dark/90 backdrop-blur-sm border border-border-dark rounded-lg px-8 py-6">
                                <span className="material-symbols-outlined text-5xl text-text-secondary/30">
                                    account_tree
                                </span>
                                <p className="text-white mt-3 font-medium">Start building your workflow</p>
                                <p className="text-text-secondary text-sm mt-1">
                                    Click "Add Node" to add nodes to the canvas
                                </p>
                                <button
                                    onClick={() => setIsPaletteOpen(true)}
                                    className="mt-4 flex items-center gap-2 mx-auto bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded text-sm font-semibold transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[18px]">add_circle</span>
                                    <span>Add Node</span>
                                </button>
                            </div>
                        </Panel>
                    )}
                </ReactFlow>

                {/* Node Palette */}
                <NodePalette isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} />
            </div>
        </div>
    )
}
