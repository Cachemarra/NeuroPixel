/**
 * PipelineEditorPage - Full-page node graph pipeline editor
 * ComfyUI-style workflow editor with draggable nodes, connections, and context menu
 */

import { useCallback, useState, useRef, useEffect } from 'react'
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
// Note: The above CSS import may need bundler configuration if TypeScript errors appear

import { useAppStore } from '@/store/appStore'
import { usePluginsByCategory } from '@/hooks/usePlugins'
import { nodeTypes } from '@/components/nodes'
import { NodePalette } from '@/components/NodePalette'
import { ContextMenu, AddNodeSubmenu, type ContextMenuPosition, type ContextMenuItem } from '@/components/ContextMenu'
import type { PipelineEdge, PipelineNode, NodeTypeKey } from '@/types/nodeGraph'
import type { LoadImageNodeData, SaveImageNodeData, MarkdownNoteNodeData, PreviewNodeData, OperatorNodeData } from '@/types/nodeGraph'
import { NODE_TYPE_DEFINITIONS } from '@/types/nodeGraph'
import type { PluginSpec } from '@/types/plugin'
import { API_BASE } from '@/config'

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
        undoPipeline,
        redoPipeline,
        canUndoPipeline,
        canRedoPipeline,
        toggleNodeDisabled,
        isPipelineExecuting,
        pipelineExecutionProgress,
        pipelineExecutionStatus,
        startPipelineExecution,
        updatePipelineProgress,
        stopPipelineExecution,
        images,
    } = useAppStore()

    const { categories } = usePluginsByCategory()
    const reactFlowInstance = useReactFlow()
    const reactFlowWrapper = useRef<HTMLDivElement>(null)
    const executionAbortRef = useRef<AbortController | null>(null)

    const [isPaletteOpen, setIsPaletteOpen] = useState(false)

    // Context menu state
    const [contextMenuPosition, setContextMenuPosition] = useState<ContextMenuPosition | null>(null)
    const [contextMenuItems, setContextMenuItems] = useState<ContextMenuItem[]>([])
    const [addNodeMenuPosition, setAddNodeMenuPosition] = useState<ContextMenuPosition | null>(null)

    // Rename dialog state
    const [renameDialogOpen, setRenameDialogOpen] = useState(false)
    const [renameNodeId, setRenameNodeId] = useState<string | null>(null)
    const [renameValue, setRenameValue] = useState('')

    // Save Workflow dialog state
    const [saveWorkflowDialogOpen, setSaveWorkflowDialogOpen] = useState(false)
    const [saveWorkflowName, setSaveWorkflowName] = useState('')

    // Node color picker state
    const [colorPickerNodeId, setColorPickerNodeId] = useState<string | null>(null)
    const [colorPickerOpen, setColorPickerOpen] = useState(false)
    const NODE_COLORS = [
        { name: 'Default', value: '' },
        { name: 'Red', value: 'bg-red-600' },
        { name: 'Orange', value: 'bg-orange-600' },
        { name: 'Amber', value: 'bg-amber-600' },
        { name: 'Green', value: 'bg-emerald-600' },
        { name: 'Teal', value: 'bg-teal-600' },
        { name: 'Blue', value: 'bg-blue-600' },
        { name: 'Indigo', value: 'bg-indigo-600' },
        { name: 'Purple', value: 'bg-purple-600' },
        { name: 'Pink', value: 'bg-pink-600' },
    ]

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't intercept keys when user is typing in an input or textarea
            const tag = (e.target as HTMLElement)?.tagName
            const isEditing = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable

            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !isEditing) {
                e.preventDefault()
                undoPipeline()
            }
            if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'Z' && e.shiftKey)) && !isEditing) {
                e.preventDefault()
                redoPipeline()
            }
            if ((e.key === 'Delete' || e.key === 'Backspace') && !isEditing) {
                const selectedNodes = reactFlowInstance.getNodes().filter(n => n.selected)
                const selectedEdges = reactFlowInstance.getEdges().filter(e => e.selected)
                if (selectedNodes.length > 0 || selectedEdges.length > 0) {
                    selectedNodes.forEach(n => removeNode(n.id))
                }
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [undoPipeline, redoPipeline, removeNode, reactFlowInstance])

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

    // Build topological execution order from the graph edges
    const getExecutionOrder = useCallback((): PipelineNode[] => {
        // Build adjacency list from edges
        const adjacency = new Map<string, string[]>()
        const inDegree = new Map<string, number>()

        for (const node of pipelineNodes) {
            adjacency.set(node.id, [])
            inDegree.set(node.id, 0)
        }

        for (const edge of pipelineEdges) {
            const targets = adjacency.get(edge.source)
            if (targets) targets.push(edge.target)
            inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1)
        }

        // Kahn's algorithm for topological sort
        const queue: string[] = []
        for (const [nodeId, degree] of inDegree) {
            if (degree === 0) queue.push(nodeId)
        }

        // Sort roots by X-position for deterministic ordering
        const nodeMap = new Map(pipelineNodes.map(n => [n.id, n]))
        queue.sort((a, b) => (nodeMap.get(a)?.position.x ?? 0) - (nodeMap.get(b)?.position.x ?? 0))

        const sorted: PipelineNode[] = []
        while (queue.length > 0) {
            const current = queue.shift()!
            const node = nodeMap.get(current)
            if (node) sorted.push(node)

            for (const neighbor of adjacency.get(current) || []) {
                const newDegree = (inDegree.get(neighbor) || 1) - 1
                inDegree.set(neighbor, newDegree)
                if (newDegree === 0) queue.push(neighbor)
            }
        }

        // If there are disconnected nodes not reached by edges, fall back to X-sort for those
        if (sorted.length < pipelineNodes.length) {
            const inSorted = new Set(sorted.map(n => n.id))
            const remaining = pipelineNodes
                .filter(n => !inSorted.has(n.id))
                .sort((a, b) => a.position.x - b.position.x)
            sorted.push(...remaining)
        }

        return sorted
    }, [pipelineNodes, pipelineEdges])

    // Execute pipeline with actual backend calls
    const handleExecutePipeline = useCallback(async () => {
        if (isPipelineExecuting) {
            // Cancel in-flight execution
            executionAbortRef.current?.abort()
            stopPipelineExecution()
            return
        }

        if (pipelineNodes.length === 0) return

        const abortController = new AbortController()
        executionAbortRef.current = abortController

        startPipelineExecution()

        try {
            // Use topological order based on edges
            const executableNodes = getExecutionOrder()

            // Find initial image from the first load_image node
            const loadNode = executableNodes.find(n => n.type === 'load_image') as PipelineNode | undefined
            let currentImageId = loadNode?.data?.nodeType === 'load_image' ? loadNode.data.imageId : null

            if (!currentImageId && images.length > 0) {
                currentImageId = images[0].id
            }

            if (!currentImageId) {
                updatePipelineProgress(0, null, 'Error: No source image selected')
                setTimeout(stopPipelineExecution, 2000)
                return
            }

            let stepCount = 0
            const totalSteps = executableNodes.filter(n => n.type === 'operator' || n.type === 'save_image' || n.type === 'preview').length || 1

            for (const node of executableNodes) {
                // Check for cancellation between steps
                if (abortController.signal.aborted) {
                    updatePipelineProgress(0, null, 'Pipeline cancelled')
                    return
                }

                if (node.data.disabled) continue

                if (node.type === 'operator') {
                    const data = node.data as OperatorNodeData
                    updatePipelineProgress(
                        (stepCount / totalSteps) * 100,
                        node.id,
                        `Running: ${data.label}`
                    )

                    const response = await fetch(`${API_BASE}/plugins/run`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        signal: abortController.signal,
                        body: JSON.stringify({
                            image_id: currentImageId,
                            plugin_name: data.pluginName,
                            params: data.params
                        })
                    })

                    if (response.ok) {
                        const result = await response.json()
                        currentImageId = result.result_id
                    } else {
                        const errBody = await response.json().catch(() => ({ detail: response.statusText }))
                        const errMsg = errBody.detail || `HTTP ${response.status}`
                        updatePipelineProgress(
                            (stepCount / totalSteps) * 100,
                            node.id,
                            `Error in ${data.label}: ${errMsg}`
                        )
                        // Continue with existing image — skip this node's output
                    }
                    stepCount++
                } else if (node.type === 'preview') {
                    updatePipelineProgress(
                        (stepCount / totalSteps) * 100,
                        node.id,
                        'Updating preview...'
                    )

                    if (currentImageId) {
                        const imgResponse = await fetch(
                            `${API_BASE}/images/${currentImageId}/metadata`,
                            { signal: abortController.signal }
                        )
                        if (imgResponse.ok) {
                            const imgData = await imgResponse.json()
                            updateNodeData(node.id, { previewUrl: imgData.url || `${API_BASE}/images/${currentImageId}/preview` })
                        }
                    }
                    stepCount++
                } else if (node.type === 'save_image') {
                    const saveData = node.data as SaveImageNodeData
                    updatePipelineProgress(
                        (stepCount / totalSteps) * 100,
                        node.id,
                        'Saving image...'
                    )

                    const response = await fetch(`${API_BASE}/plugins/run`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        signal: abortController.signal,
                        body: JSON.stringify({
                            image_id: currentImageId,
                            plugin_name: 'save_image',
                            params: {
                                output_path: saveData.outputPath || './output',
                                filename: saveData.filename || 'result',
                                format: saveData.format || 'png'
                            }
                        })
                    })

                    if (!response.ok) {
                        const errBody = await response.json().catch(() => ({ detail: response.statusText }))
                        updatePipelineProgress(
                            (stepCount / totalSteps) * 100,
                            node.id,
                            `Save error: ${errBody.detail || `HTTP ${response.status}`}`
                        )
                    }
                    stepCount++
                }
            }

            updatePipelineProgress(100, null, 'Pipeline completed!')
        } catch (err: any) {
            if (err.name === 'AbortError') {
                updatePipelineProgress(0, null, 'Pipeline cancelled')
            } else {
                updatePipelineProgress(0, null, `Error: ${err.message}`)
            }
        } finally {
            executionAbortRef.current = null
            setTimeout(stopPipelineExecution, 1500)
        }
    }, [isPipelineExecuting, pipelineNodes, pipelineEdges, images, startPipelineExecution, updatePipelineProgress, stopPipelineExecution, updateNodeData, getExecutionOrder])

    // Open Save Workflow dialog
    const handleSaveWorkflow = useCallback(() => {
        setSaveWorkflowName(pipelineName || 'Untitled Workflow')
        setSaveWorkflowDialogOpen(true)
    }, [pipelineName])

    // Load workflow from JSON with validation
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

                // Validate workflow structure
                if (typeof workflow !== 'object' || workflow === null) {
                    throw new Error('Invalid workflow: not an object')
                }
                if (workflow.nodes && !Array.isArray(workflow.nodes)) {
                    throw new Error('Invalid workflow: nodes must be an array')
                }
                if (workflow.edges && !Array.isArray(workflow.edges)) {
                    throw new Error('Invalid workflow: edges must be an array')
                }
                // Validate each node has required fields
                if (workflow.nodes) {
                    for (const node of workflow.nodes) {
                        if (!node.id || !node.type || !node.position || !node.data) {
                            throw new Error('Invalid workflow: node missing required fields (id, type, position, data)')
                        }
                    }
                }

                clearGraph()
                if (typeof workflow.name === 'string') {
                    setPipelineName(workflow.name)
                }
                if (workflow.nodes) {
                    setNodes(workflow.nodes)
                }
                if (workflow.edges) {
                    setEdges(workflow.edges)
                }
            } catch (err: any) {
                console.error('Failed to load workflow:', err)
                alert(`Failed to load workflow: ${err.message}`)
            }
        }
        input.click()
    }, [clearGraph, setPipelineName, setNodes, setEdges])

    // Clear graph with confirmation
    const handleClearGraph = useCallback(() => {
        if (pipelineNodes.length === 0) return
        if (window.confirm(`Clear all ${pipelineNodes.length} node(s)? This cannot be undone.`)) {
            clearGraph()
        }
    }, [pipelineNodes.length, clearGraph])

    // Handle right-click on canvas (not on node)
    const handlePaneContextMenu = useCallback((event: React.MouseEvent | MouseEvent) => {
        event.preventDefault()

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
                label: isPipelineExecuting ? 'Stop Pipeline' : 'Execute Pipeline',
                icon: isPipelineExecuting ? 'stop' : 'play_arrow',
                action: handleExecutePipeline,
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
                action: handleClearGraph,
                danger: true,
                disabled: pipelineNodes.length === 0,
            },
        ]

        setContextMenuItems(items)
        setContextMenuPosition({ x: event.clientX, y: event.clientY })
    }, [pipelineNodes.length, clearGraph, handleClearGraph, reactFlowInstance, isPipelineExecuting, handleExecutePipeline, handleSaveWorkflow, handleLoadWorkflow])

    // Handle right-click on node
    const handleNodeContextMenu: NodeMouseHandler = useCallback((event, node) => {
        event.preventDefault()

        const items: ContextMenuItem[] = [
            {
                label: 'Rename Node',
                icon: 'edit',
                action: () => {
                    setRenameNodeId(node.id)
                    setRenameValue((node.data.label as string) || '')
                    setRenameDialogOpen(true)
                },
            },
            {
                label: 'Set Node Color',
                icon: 'palette',
                action: () => {
                    setColorPickerNodeId(node.id)
                    setColorPickerOpen(true)
                },
            },
            {
                label: 'Duplicate Node',
                icon: 'content_copy',
                action: () => {
                    const newNode: PipelineNode = {
                        ...(node as PipelineNode),
                        id: crypto.randomUUID(),
                        position: { x: node.position.x + 50, y: node.position.y + 50 },
                        data: JSON.parse(JSON.stringify(node.data)),
                    }
                    addNode(newNode)
                },
            },
            { label: '', action: () => { }, divider: true },
            {
                label: node.data.disabled ? 'Enable Node' : 'Disable Node',
                icon: node.data.disabled ? 'visibility' : 'visibility_off',
                action: () => toggleNodeDisabled(node.id),
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
    }, [addNode, removeNode, toggleNodeDisabled])

    // Close context menus
    const closeContextMenus = useCallback(() => {
        setContextMenuPosition(null)
        setAddNodeMenuPosition(null)
    }, [])

    // Close only the main context menu (keeps AddNodeSubmenu open if trigger)
    const closeMainContextMenu = useCallback(() => {
        setContextMenuPosition(null)
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

    // Confirm save workflow
    const confirmSaveWorkflow = useCallback(() => {
        const workflow = {
            name: saveWorkflowName || 'Untitled Workflow',
            nodes: pipelineNodes,
            edges: pipelineEdges,
        }
        const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${saveWorkflowName || 'workflow'}.json`
        a.click()
        URL.revokeObjectURL(url)
        setSaveWorkflowDialogOpen(false)
        setPipelineName(saveWorkflowName)
    }, [saveWorkflowName, pipelineNodes, pipelineEdges, setPipelineName])

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
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 ml-8 bg-background-dark/50 rounded-md border border-border-dark p-1">
                    <button
                        onClick={undoPipeline}
                        disabled={!canUndoPipeline()}
                        className="p-1.5 hover:bg-panel-dark text-text-secondary hover:text-white rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Undo (Ctrl+Z)"
                    >
                        <span className="material-symbols-outlined text-[20px]">undo</span>
                    </button>
                    <button
                        onClick={redoPipeline}
                        disabled={!canRedoPipeline()}
                        className="p-1.5 hover:bg-panel-dark text-text-secondary hover:text-white rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Redo (Ctrl+Y)"
                    >
                        <span className="material-symbols-outlined text-[20px]">redo</span>
                    </button>
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
                            onClick={handleClearGraph}
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
                        onClick={handleExecutePipeline}
                        disabled={pipelineNodes.length === 0}
                        className={`group flex items-center gap-2 px-5 py-2 rounded text-sm font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${isPipelineExecuting
                            ? 'bg-red-500 text-white hover:bg-red-600'
                            : 'bg-white text-black hover:bg-zinc-200'
                            }`}
                    >
                        <span className={`material-symbols-outlined text-[20px] transition-transform duration-500 ${isPipelineExecuting ? 'animate-spin' : 'group-hover:rotate-180'}`}>
                            {isPipelineExecuting ? 'stop' : 'play_arrow'}
                        </span>
                        <span>{isPipelineExecuting ? 'Stop' : 'Execute'}</span>
                    </button>
                </div>
            </div>

            {/* Main Content Area with Sidebar */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar */}
                <aside className="w-[300px] bg-surface-dark border-r border-border-dark flex flex-col shrink-0 z-10">
                    <div className="px-4 py-3 border-b border-border-dark bg-panel-dark">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                            Input & Summary
                        </h3>
                    </div>

                    {/* Input Folder Selection - For Pipeline Context */}
                    <div className="p-4 border-b border-border-dark space-y-2">
                        <label className="text-xs text-text-secondary font-medium block">
                            Input Context
                        </label>
                        <div className="flex items-center gap-2 p-2 bg-background-dark rounded border border-border-dark">
                            <span className="material-symbols-outlined text-text-secondary">folder_open</span>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-white truncate">Use Active Image</p>
                                <p className="text-[10px] text-text-secondary">or connect Load Image node</p>
                            </div>
                        </div>
                    </div>

                    {/* Pipeline Summary / Node List */}
                    <div className="flex-1 overflow-y-auto p-2">
                        <h4 className="px-2 text-[10px] uppercase font-bold text-text-secondary mb-2 mt-2">Pipeline Steps</h4>
                        {pipelineNodes.length === 0 ? (
                            <div className="text-center py-8 text-text-secondary/50">
                                <p className="text-xs">No nodes added</p>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {[...pipelineNodes]
                                    .sort((a, b) => a.position.x - b.position.x) // Sort visually by X (non-mutating copy)
                                    .map((node, index) => (
                                        <div
                                            key={node.id}
                                            className="flex items-center gap-2 p-2 bg-panel-dark hover:bg-white/5 rounded border border-border-dark transition-colors group"
                                            onMouseEnter={() => {
                                                // Highlight node on hover (optional enhancement)
                                                // This would require state like "hoveredNodeId"
                                            }}
                                        >
                                            <div className="text-xs font-mono text-text-secondary w-4 text-center">{index + 1}</div>
                                            <span className={`material-symbols-outlined text-[16px] ${node.type === 'load_image' ? 'text-green-500' :
                                                node.type === 'save_image' ? 'text-blue-500' :
                                                    node.type === 'operator' ? 'text-indigo-500' : 'text-text-secondary'
                                                }`}>
                                                {node.data.icon as string || 'circle'}
                                            </span>
                                            <span className={`text-xs truncate flex-1 ${node.data.disabled ? 'text-text-secondary line-through' : 'text-white'}`}>
                                                {node.data.label as string}
                                            </span>
                                            <button
                                                onClick={() => removeNode(node.id)}
                                                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 text-text-secondary transition-opacity"
                                            >
                                                <span className="material-symbols-outlined text-[14px]">close</span>
                                            </button>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>
                </aside>

                {/* React Flow Canvas Container */}
                <div className="flex-1 relative flex flex-col h-full min-w-0">
                    {/* Progress Bar (moved here inside canvas container) */}
                    {isPipelineExecuting && (
                        <div className="px-4 py-2 bg-panel-dark border-b border-border-dark">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-primary animate-spin text-[18px]">progress_activity</span>
                                <div className="flex-1">
                                    <div className="text-xs text-white mb-1">{pipelineExecutionStatus}</div>
                                    <div className="w-full bg-background-dark rounded-full h-1.5 overflow-hidden">
                                        <div
                                            className="bg-primary h-full rounded-full transition-all duration-300"
                                            style={{ width: `${pipelineExecutionProgress}%` }}
                                        />
                                    </div>
                                </div>
                                <span className="text-xs text-text-secondary font-mono">{Math.round(pipelineExecutionProgress)}%</span>
                            </div>
                        </div>
                    )}

                    {/* Actual Canvas */}
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
                            onClose={closeMainContextMenu}
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

                    {/* Save Workflow Dialog */}
                    {saveWorkflowDialogOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                            <div className="bg-surface-dark border border-border-dark rounded-lg p-6 w-96 shadow-2xl">
                                <h3 className="text-lg font-semibold text-white mb-2">Save Workflow</h3>
                                <p className="text-sm text-text-secondary mb-4">Enter a name for your workflow. It will be downloaded as a JSON file.</p>
                                <input
                                    type="text"
                                    value={saveWorkflowName}
                                    onChange={(e) => setSaveWorkflowName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') confirmSaveWorkflow()
                                        if (e.key === 'Escape') setSaveWorkflowDialogOpen(false)
                                    }}
                                    autoFocus
                                    placeholder="Workflow name..."
                                    className="w-full bg-background-dark border border-border-dark rounded px-3 py-2 text-white outline-none focus:border-primary"
                                />
                                <div className="flex justify-end gap-2 mt-4">
                                    <button
                                        onClick={() => setSaveWorkflowDialogOpen(false)}
                                        className="px-4 py-2 text-sm text-text-secondary hover:text-white transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmSaveWorkflow}
                                        className="px-4 py-2 text-sm font-semibold bg-primary text-white rounded hover:bg-blue-600 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-[16px] mr-1 align-middle">save</span>
                                        Save
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Node Color Picker Dialog */}
                    {colorPickerOpen && colorPickerNodeId && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                            <div className="bg-surface-dark border border-border-dark rounded-lg p-6 w-80 shadow-2xl">
                                <h3 className="text-lg font-semibold text-white mb-4">Set Node Color</h3>
                                <div className="grid grid-cols-5 gap-2 mb-4">
                                    {NODE_COLORS.map((color) => (
                                        <button
                                            key={color.name}
                                            onClick={() => {
                                                updateNodeData(colorPickerNodeId, { headerColor: color.value || undefined })
                                                setColorPickerOpen(false)
                                                setColorPickerNodeId(null)
                                            }}
                                            className={`w-10 h-10 rounded-lg border-2 border-border-dark hover:border-white transition-colors ${color.value || 'bg-primary'}`}
                                            title={color.name}
                                        />
                                    ))}
                                </div>
                                <div className="flex justify-end">
                                    <button
                                        onClick={() => {
                                            setColorPickerOpen(false)
                                            setColorPickerNodeId(null)
                                        }}
                                        className="px-4 py-2 text-sm text-text-secondary hover:text-white transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
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
