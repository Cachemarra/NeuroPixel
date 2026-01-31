/**
 * Node Components Index
 * Exports all node types and the nodeTypes registry for React Flow
 */

import { LoadImageNode } from './LoadImageNode'
import { LoadBatchNode } from './LoadBatchNode'
import { SaveImageNode } from './SaveImageNode'
import { SaveBatchNode } from './SaveBatchNode'
import { PreviewNode } from './PreviewNode'
import { MarkdownNoteNode } from './MarkdownNoteNode'
import { OperatorNode } from './OperatorNode'

// Export individual node components
export { BaseNode } from './BaseNode'
export { LoadImageNode } from './LoadImageNode'
export { LoadBatchNode } from './LoadBatchNode'
export { SaveImageNode } from './SaveImageNode'
export { SaveBatchNode } from './SaveBatchNode'
export { PreviewNode } from './PreviewNode'
export { MarkdownNoteNode } from './MarkdownNoteNode'
export { OperatorNode } from './OperatorNode'

// Node types registry for React Flow
// Using 'any' here because React Flow's NodeTypes expects a generic component type
// and our custom node components have specific prop types
export const nodeTypes = {
    load_image: LoadImageNode,
    load_batch: LoadBatchNode,
    save_image: SaveImageNode,
    save_batch: SaveBatchNode,
    preview: PreviewNode,
    markdown_note: MarkdownNoteNode,
    operator: OperatorNode,
} as const
