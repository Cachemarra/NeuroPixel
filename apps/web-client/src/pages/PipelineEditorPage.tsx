/**
 * PipelineEditorPage - Full-page node graph pipeline editor
 * ComfyUI-style workflow editor with draggable nodes, connections, and context menu
 */

import { useCallback, useState, useRef } from 'react'
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    type OnConnect,
    type Connection,
    BackgroundVariant,
    Panel,
    type NodeMouseHandler,
    useReactFlow,
    ReactFlowProvider,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { useAppStore } from '@/store/appStore'
import { usePluginsByCategory } from '@/hooks/usePlugins'
import { nodeTypes } from '@/components/nodes'
import { NodePalette } from '@/components/NodePalette'
import { ContextMenu, AddNodeSubmenu, type ContextMenuPosition, type ContextMenuItem } from '@/components/ContextMenu'
import type { PipelineEdge, PipelineNode, NodeTypeKey } from '@/types/nodeGraph'
import type { LoadImageNodeData, SaveImageNodeData, MarkdownNoteNodeData, PreviewNodeData, OperatorNodeData } from '@/types/nodeGraph'
import { NODE_TYPE_DEFINITIONS } from '@/types/nodeGraph'
import type { PluginSpec } from '@/types/plugin'

function PipelineEditorContent() {
    const {
        pipelineNodes,
        pipelineEdges,
        onNodesChange,
        onEdgesChange,
        addEdge,
        addNode,
        removeNode,
        updateNodeData,
        clearGraph,
        pipelineName,
        setPipelineName,
        setNodes,
        setEdges,
    } = useAppStore()

    const { categories } = usePluginsByCategory()
    const reactFlowInstance = useReactFlow()
    const reactFlowWrapper = useRef<HTMLDivElement>(null)

    const [isPaletteOpen, setIsPaletteOpen] = useState(false)

    // Context menu state
    const [contextMenuPosition, setContextMenuPosition] = useState<ContextMenuPosition | null>(null)
    const [contextMenuItems, setContextMenuItems] = useState<ContextMenuItem[]>([])
    const [addNodeMenuPosition, setAddNodeMenuPosition] = useState<ContextMenuPosition | null>(null)
    const [rightClickNodeId, setRightClickNodeId] = useState<string | null>(null)

    // Rename dialog state
    const [renameDialogOpen, setRenameDialogOpen] = useState(false)
    const [renameNodeId, setRenameNodeId] = useState<string | null>(null)
    const [renameValue, setRenameValue] = useState('')

    // Get position in flow from screen coordinates
    const getFlowPosition = useCallback((clientX: number, clientY: number) => {
        if (!reactFlowWrapper.current) return { x: 0, y: 0 }
        const bounds = reactFlowWrapper.current.getBoundingClientRect()
        return reactFlowInstance.screenToFlowPosition({
            x: clientX - bounds.left,
            y: clientY - bounds.top,
        })
    }, [reactFlowInstance])

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

    // Calculate position for new node
    const getNewNodePosition = useCallback((clientX?: number, clientY?: number) => {
        if (clientX !== undefined && clientY !== undefined) {
            return getFlowPosition(clientX, clientY)
        }
        const offset = pipelineNodes.length * 20
        return { x: 100 + offset, y: 100 + offset }
    }, [pipelineNodes.length, getFlowPosition])

    // Add utility node
    const handleAddUtilityNode = useCallback((type: NodeTypeKey, clientX?: number, clientY?: number) => {
        const definition = NODE_TYPE_DEFINITIONS[type]
        const position = getNewNodePosition(clientX, clientY)

        let data: LoadImageNodeData | SaveImageNodeData | MarkdownNoteNodeData | PreviewNodeData

        switch (type) {
            case 'load_image':
                data = {
                    nodeType: 'load_image',
                    label: definition.label,
                    icon: definition.icon,
                    inputs: [],
                    outputs: [{ name: 'image', type: 'image', label: 'Image' }],
                    imageId: null,
                    imageName: '',
                }
                break
            case 'save_image':
                data = {
                    nodeType: 'save_image',
                    label: definition.label,
                    icon: definition.icon,
                    inputs: [{ name: 'image', type: 'image', label: 'Image', required: true }],
                    outputs: [],
                    filename: 'output',
                    format: 'png',
                }
                break
            case 'preview':
                data = {
                    nodeType: 'preview',
                    label: definition.label,
                    icon: definition.icon,
                    inputs: [{ name: 'image', type: 'image', label: 'Image', required: true }],
                    outputs: [],
                    previewUrl: null,
                }
                break
            case 'markdown_note':
                data = {
                    nodeType: 'markdown_note',
                    label: definition.label,
                    icon: definition.icon,
                    inputs: [],
                    outputs: [],
                    content: '',
                }
                break
            default:
                return
        }

        const node: PipelineNode = {
            id: crypto.randomUUID(),
            type,
            position,
            data,
        }

        addNode(node)
    }, [addNode, getNewNodePosition])

    // Add operator node from plugin
    const handleAddOperatorNode = useCallback((plugin: PluginSpec, clientX?: number, clientY?: number) => {
        const position = getNewNodePosition(clientX, clientY)

        const defaultParams: Record<string, unknown> = {}
        for (const param of plugin.params) {
            if ('default' in param) {
                defaultParams[param.name] = param.default
            } else if (param.type === 'range') {
                defaultParams[param.name] = [param.default_low, param.default_high]
            }
        }

        const data: OperatorNodeData = {
            nodeType: 'operator',
            label: plugin.display_name,
            icon: plugin.icon,
            inputs: [{ name: 'image', type: 'image', label: 'Image', required: true }],
            outputs: [{ name: 'image', type: 'image', label: 'Image' }],
            pluginName: plugin.name,
            params: defaultParams,
            pluginSpec: plugin,
        }

        const node: PipelineNode = {
            id: crypto.randomUUID(),
            type: 'operator',
            position,
            data,
        }

        addNode(node)
    }, [addNode, getNewNodePosition])

    // Handle right-click on canvas (not on node)
    const handlePaneContextMenu = useCallback((event: React.MouseEvent) => {
        event.preventDefault()
        setRightClickNodeId(null)

        const items: ContextMenuItem[] = [
            {
                label: 'Add Node...',
                icon: 'add_circle',
                action: () => {
                    setAddNodeMenuPosition({ x: event.clientX, y: event.clientY })
                },
            },
            { label: '', action: () => { }, divider: true },
            {
                label: 'Execute Pipeline',
                icon: 'play_arrow',
                action: () => {
                    // TODO: Implement pipeline execution
                    console.log('Execute pipeline')
                },
                disabled: pipelineNodes.length === 0,
            },
            { label: '', action: () => { }, divider: true },
            {
                label: 'Save Workflow',
                icon: 'save',
                action: handleSaveWorkflow,
                disabled: pipelineNodes.length === 0,
            },
            {
                label: 'Load Workflow',
                icon: 'folder_open',
                action: handleLoadWorkflow,
            },
            { label: '', action: () => { }, divider: true },
            {
                label: 'Fit View',
                icon: 'fit_screen',
                action: () => reactFlowInstance.fitView(),
            },
            {
                label: 'Clear All Nodes',
                icon: 'delete_sweep',
                action: clearGraph,
                danger: true,
                disabled: pipelineNodes.length === 0,
            },
        ]

        setContextMenuItems(items)
        setContextMenuPosition({ x: event.clientX, y: event.clientY })
    }, [pipelineNodes.length, clearGraph, reactFlowInstance])

    // Handle right-click on node
    const handleNodeContextMenu: NodeMouseHandler = useCallback((event, node) => {
        event.preventDefault()
        setRightClickNodeId(node.id)

        const items: ContextMenuItem[] = [
            {
                label: 'Rename Node',
                icon: 'edit',
                action: () => {
                    setRenameNodeId(node.id)
                    setRenameValue(node.data.label)
                    setRenameDialogOpen(true)
                },
            },
            {
                label: 'Duplicate Node',
                icon: 'content_copy',
                action: () => {
                    const newNode: PipelineNode = {
                        ...node,
                        id: crypto.randomUUID(),
                        position: { x: node.position.x + 50, y: node.position.y + 50 },
                    }
                    addNode(newNode)
                },
            },
            { label: '', action: () => { }, divider: true },
            {
                label: 'Delete Node',
                icon: 'delete',
                action: () => removeNode(node.id),
                danger: true,
            },
        ]

        setContextMenuItems(items)
        setContextMenuPosition({ x: event.clientX, y: event.clientY })
    }, [addNode, removeNode])

    // Close context menus
    const closeContextMenus = useCallback(() => {
        setContextMenuPosition(null)
        setAddNodeMenuPosition(null)
        setRightClickNodeId(null)
    }, [])

    // Handle rename confirmation
    const handleRenameConfirm = useCallback(() => {
        if (renameNodeId && renameValue.trim()) {
            updateNodeData(renameNodeId, { label: renameValue.trim() })
        }
        setRenameDialogOpen(false)
        setRenameNodeId(null)
        setRenameValue('')
    }, [renameNodeId, renameValue, updateNodeData])

    // Save workflow as JSON
    const handleSaveWorkflow = useCallback(() => {
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
    }, [pipelineName, pipelineNodes, pipelineEdges])

    // Load workflow from JSON
    const handleLoadWorkflow = useCallback(() => {
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
    }, [clearGraph, setPipelineName, setNodes, setEdges])

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
            <div className="flex-1 relative" ref={reactFlowWrapper}>
                <ReactFlow
                    nodes={pipelineNodes}
                    edges={pipelineEdges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={handleConnect}
                    onPaneContextMenu={handlePaneContextMenu}
                    onNodeContextMenu={handleNodeContextMenu}
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
                                    Right-click anywhere to add nodes, or use the "Add Node" button
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

                {/* Context Menu */}
                <ContextMenu
                    position={contextMenuPosition}
                    items={contextMenuItems}
                    onClose={closeContextMenus}
                />

                {/* Add Node Submenu */}
                <AddNodeSubmenu
                    position={addNodeMenuPosition}
                    categories={categories}
                    onAddUtilityNode={(type) => {
                        if (addNodeMenuPosition) {
                            handleAddUtilityNode(type, addNodeMenuPosition.x, addNodeMenuPosition.y)
                        }
                    }}
                    onAddOperatorNode={(plugin) => {
                        if (addNodeMenuPosition) {
                            handleAddOperatorNode(plugin, addNodeMenuPosition.x, addNodeMenuPosition.y)
                        }
                    }}
                    onClose={closeContextMenus}
                />
            </div>

            {/* Rename Dialog */}
            {renameDialogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-surface-dark border border-border-dark rounded-lg p-6 w-80 shadow-2xl">
                        <h3 className="text-lg font-semibold text-white mb-4">Rename Node</h3>
                        <input
                            type="text"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRenameConfirm()
                                if (e.key === 'Escape') setRenameDialogOpen(false)
                            }}
                            autoFocus
                            className="w-full bg-background-dark border border-border-dark rounded px-3 py-2 text-white outline-none focus:border-primary"
                        />
                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                onClick={() => setRenameDialogOpen(false)}
                                className="px-4 py-2 text-sm text-text-secondary hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRenameConfirm}
                                className="px-4 py-2 text-sm font-semibold bg-primary text-white rounded hover:bg-blue-600 transition-colors"
                            >
                                Rename
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export function PipelineEditorPage() {
    return (
        <ReactFlowProvider>
            <PipelineEditorContent />
        </ReactFlowProvider>
    )
}
