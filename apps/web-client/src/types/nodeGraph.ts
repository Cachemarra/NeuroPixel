/**
 * Node Graph Types
 * Type definitions for the ComfyUI-style node graph pipeline editor
 */

import type { Node, Edge } from '@xyflow/react'
import type { PluginSpec, NodeInput, NodeOutput } from './plugin'

// Re-export for convenience
export type { NodeInput, NodeOutput } from './plugin'

// =============================================================================
// Node Data Types
// =============================================================================

// Base data all nodes share
export interface BaseNodeData {
    label: string
    icon?: string
    inputs: NodeInput[]
    outputs: NodeOutput[]
    [key: string]: unknown // Allow additional properties for React Flow
}

// Operator node wraps a plugin
export interface OperatorNodeData extends BaseNodeData {
    nodeType: 'operator'
    pluginName: string
    params: Record<string, unknown>
    pluginSpec?: PluginSpec
}

// Load Image node
export interface LoadImageNodeData extends BaseNodeData {
    nodeType: 'load_image'
    imageId: string | null
    imageName: string
    thumbnailUrl?: string
}

// Save Image node
export interface SaveImageNodeData extends BaseNodeData {
    nodeType: 'save_image'
    filename: string
    format: 'png' | 'jpg' | 'webp'
}

// Markdown Note node
export interface MarkdownNoteNodeData extends BaseNodeData {
    nodeType: 'markdown_note'
    content: string
    width?: number
    height?: number
}

// Preview node
export interface PreviewNodeData extends BaseNodeData {
    nodeType: 'preview'
    previewUrl: string | null
}

export type NodeData =
    | OperatorNodeData
    | LoadImageNodeData
    | SaveImageNodeData
    | MarkdownNoteNodeData
    | PreviewNodeData

// =============================================================================
// React Flow Node/Edge Types
// =============================================================================

export type PipelineNode = Node<NodeData>
export type PipelineEdge = Edge

// =============================================================================
// Node Type Registry
// =============================================================================

export type NodeTypeKey = 'operator' | 'load_image' | 'save_image' | 'markdown_note' | 'preview'

export interface NodeTypeDefinition {
    type: NodeTypeKey
    label: string
    icon: string
    category: 'utility' | 'operator'
    description: string
}

export const NODE_TYPE_DEFINITIONS: Record<NodeTypeKey, NodeTypeDefinition> = {
    load_image: {
        type: 'load_image',
        label: 'Load Image',
        icon: 'image',
        category: 'utility',
        description: 'Load an image from the explorer',
    },
    save_image: {
        type: 'save_image',
        label: 'Save Image',
        icon: 'save',
        category: 'utility',
        description: 'Save/export an image',
    },
    preview: {
        type: 'preview',
        label: 'Preview',
        icon: 'visibility',
        category: 'utility',
        description: 'Preview intermediate results',
    },
    markdown_note: {
        type: 'markdown_note',
        label: 'Note',
        icon: 'sticky_note_2',
        category: 'utility',
        description: 'Add a markdown note',
    },
    operator: {
        type: 'operator',
        label: 'Operator',
        icon: 'settings',
        category: 'operator',
        description: 'Image processing operator',
    },
}
