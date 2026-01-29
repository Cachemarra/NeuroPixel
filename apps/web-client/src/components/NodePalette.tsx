/**
 * NodePalette - Sidebar for adding nodes to the workflow
 * Shows categorized list of available nodes and plugins
 * Now with draggable functionality
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { useAppStore } from '@/store/appStore'
import { usePluginsByCategory } from '@/hooks/usePlugins'
import { NODE_TYPE_DEFINITIONS, type NodeTypeKey, type PipelineNode } from '@/types/nodeGraph'
import type { LoadImageNodeData, LoadBatchNodeData, SaveImageNodeData, MarkdownNoteNodeData, PreviewNodeData, OperatorNodeData } from '@/types/nodeGraph'
import type { PluginSpec } from '@/types/plugin'

interface NodePaletteProps {
    isOpen: boolean
    onClose: () => void
}

// Utility nodes that are always available
const UTILITY_NODES: NodeTypeKey[] = ['load_image', 'load_batch', 'save_image', 'preview', 'markdown_note']

export function NodePalette({ isOpen, onClose }: NodePaletteProps) {
    const { addNode, pipelineNodes } = useAppStore()
    const { categories, isLoading } = usePluginsByCategory()
    const [searchQuery, setSearchQuery] = useState('')

    // Dragging state
    const [position, setPosition] = useState({ x: 16, y: 64 })
    const [isDragging, setIsDragging] = useState(false)
    const dragStartPos = useRef({ x: 0, y: 0 })
    const initialPos = useRef({ x: 0, y: 0 })

    const handleDragStart = useCallback((e: React.MouseEvent) => {
        e.preventDefault()
        setIsDragging(true)
        dragStartPos.current = { x: e.clientX, y: e.clientY }
        initialPos.current = position
    }, [position])

    useEffect(() => {
        if (!isDragging) return

        const handleMouseMove = (e: MouseEvent) => {
            const dx = e.clientX - dragStartPos.current.x
            const dy = e.clientY - dragStartPos.current.y
            setPosition({
                x: Math.max(0, initialPos.current.x + dx),
                y: Math.max(0, initialPos.current.y + dy),
            })
        }

        const handleMouseUp = () => {
            setIsDragging(false)
        }

        document.addEventListener('mousemove', handleMouseMove)
        document.addEventListener('mouseup', handleMouseUp)
        return () => {
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
        }
    }, [isDragging])

    // Calculate position for new node (offset from existing nodes)
    const getNewNodePosition = () => {
        const offset = pipelineNodes.length * 20
        return { x: 100 + offset, y: 100 + offset }
    }

    // Create and add a utility node
    const handleAddUtilityNode = (type: NodeTypeKey) => {
        const definition = NODE_TYPE_DEFINITIONS[type]
        const position = getNewNodePosition()

        let data: LoadImageNodeData | LoadBatchNodeData | SaveImageNodeData | MarkdownNoteNodeData | PreviewNodeData

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
            case 'load_batch':
                data = {
                    nodeType: 'load_batch',
                    label: definition.label,
                    icon: definition.icon,
                    inputs: [],
                    outputs: [{ name: 'images', type: 'image', label: 'Images' }],
                    folderPath: '',
                    filePattern: '*.png,*.jpg,*.jpeg',
                    imageCount: 0,
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
        onClose()
    }

    // Create and add an operator node from a plugin
    const handleAddOperatorNode = (plugin: PluginSpec) => {
        const position = getNewNodePosition()

        // Get default params from plugin spec
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
        onClose()
    }

    // Filter nodes and plugins by search query
    const filteredUtilityNodes = UTILITY_NODES.filter((type) =>
        NODE_TYPE_DEFINITIONS[type].label.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const filteredCategories = Object.entries(categories).reduce(
        (acc, [category, plugins]) => {
            const filtered = plugins.filter(
                (p) =>
                    p.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    p.description.toLowerCase().includes(searchQuery.toLowerCase())
            )
            if (filtered.length > 0) {
                acc[category] = filtered
            }
            return acc
        },
        {} as Record<string, PluginSpec[]>
    )

    if (!isOpen) return null

    return (
        <div
            className={`absolute w-64 bg-surface-dark border border-border-dark rounded-lg shadow-xl z-10 flex flex-col overflow-hidden ${isDragging ? 'cursor-grabbing' : ''}`}
            style={{ left: position.x, top: position.y, maxHeight: 'calc(100vh - 150px)' }}
        >
            {/* Draggable Header */}
            <div
                className="flex items-center justify-between px-4 py-3 border-b border-border-dark cursor-grab select-none"
                onMouseDown={handleDragStart}
            >
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-text-secondary text-[16px]">drag_indicator</span>
                    <h3 className="text-sm font-semibold text-white">Add Node</h3>
                </div>
                <button
                    onClick={onClose}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="p-1 text-text-secondary hover:text-white transition-colors"
                >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
            </div>

            {/* Search */}
            <div className="px-3 py-2 border-b border-border-dark">
                <div className="relative">
                    <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-text-secondary text-[18px]">
                        search
                    </span>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search nodes..."
                        className="w-full bg-background-dark border border-border-dark rounded pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-text-secondary"
                    />
                </div>
            </div>

            {/* Node List */}
            <div className="flex-1 overflow-y-auto">
                {/* Utility Nodes */}
                {filteredUtilityNodes.length > 0 && (
                    <div>
                        <div className="px-3 py-2 text-[10px] font-bold uppercase text-text-secondary bg-panel-dark sticky top-0">
                            Utility
                        </div>
                        {filteredUtilityNodes.map((type) => {
                            const def = NODE_TYPE_DEFINITIONS[type]
                            return (
                                <button
                                    key={type}
                                    onClick={() => handleAddUtilityNode(type)}
                                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-primary/20 transition-colors text-left"
                                >
                                    <span className="material-symbols-outlined text-primary text-[18px]">
                                        {def.icon}
                                    </span>
                                    <div>
                                        <p className="text-sm text-white">{def.label}</p>
                                        <p className="text-[10px] text-text-secondary leading-tight">
                                            {def.description}
                                        </p>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                )}

                {/* Operator Nodes by Category */}
                {isLoading ? (
                    <div className="p-4 text-center">
                        <span className="material-symbols-outlined animate-spin text-text-secondary">
                            progress_activity
                        </span>
                    </div>
                ) : (
                    Object.entries(filteredCategories).map(([category, plugins]) => (
                        <div key={category}>
                            <div className="px-3 py-2 text-[10px] font-bold uppercase text-text-secondary bg-panel-dark sticky top-0">
                                {category}
                            </div>
                            {plugins.map((plugin) => (
                                <button
                                    key={plugin.name}
                                    onClick={() => handleAddOperatorNode(plugin)}
                                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-primary/20 transition-colors text-left"
                                >
                                    <span className="material-symbols-outlined text-indigo-400 text-[18px]">
                                        {plugin.icon}
                                    </span>
                                    <div>
                                        <p className="text-sm text-white">{plugin.display_name}</p>
                                        <p className="text-[10px] text-text-secondary leading-tight line-clamp-1">
                                            {plugin.description}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
