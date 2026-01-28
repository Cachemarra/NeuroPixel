/**
 * BaseNode - Shared wrapper component for all node types
 * Provides consistent styling, header, socket rendering, and resizing support
 */

import { memo, type ReactNode } from 'react'
import { Handle, Position, NodeResizer } from '@xyflow/react'
import type { NodeInput, NodeOutput, SocketType } from '@/types/plugin'

interface BaseNodeProps {
    id: string
    data: {
        label: string
        icon?: string
        inputs: NodeInput[]
        outputs: NodeOutput[]
        [key: string]: unknown
    }
    selected?: boolean
    children?: ReactNode
    headerColor?: string
    showHeader?: boolean
    resizable?: boolean
    minWidth?: number
    minHeight?: number
}

// Socket type to color mapping
const SOCKET_COLORS: Record<SocketType, string> = {
    image: '#a855f7',    // Purple
    mask: '#f97316',     // Orange
    number: '#22c55e',   // Green
    string: '#3b82f6',   // Blue
    any: '#6b7280',      // Gray
}

function BaseNodeComponent({
    data,
    selected = false,
    children,
    headerColor = 'bg-primary',
    showHeader = true,
    resizable = true,
    minWidth = 200,
    minHeight = 100,
}: BaseNodeProps) {
    const { label, icon, inputs, outputs } = data

    return (
        <>
            {/* Resizer handles */}
            {resizable && (
                <NodeResizer
                    minWidth={minWidth}
                    minHeight={minHeight}
                    isVisible={selected}
                    lineClassName="!border-primary"
                    handleClassName="!w-2 !h-2 !bg-primary !border-primary"
                />
            )}

            <div
                className={`
                    min-w-[200px] w-full h-full
                    bg-surface-dark border rounded-lg
                    transition-all duration-150 flex flex-col
                    ${selected
                        ? 'border-primary shadow-lg shadow-primary/20'
                        : 'border-border-dark shadow-md'
                    }
                `}
            >
                {/* Header */}
                {showHeader && (
                    <div className={`
                        flex items-center gap-2 px-3 py-2 
                        rounded-t-lg border-b border-border-dark
                        ${headerColor}
                    `}>
                        {icon && (
                            <span className="material-symbols-outlined text-white/90 text-[18px]">
                                {icon}
                            </span>
                        )}
                        <span className="text-sm font-semibold text-white truncate flex-1">
                            {label}
                        </span>
                    </div>
                )}

                {/* Input Handles */}
                {inputs.map((input: NodeInput, index: number) => (
                    <Handle
                        key={`input-${input.name}`}
                        type="target"
                        position={Position.Left}
                        id={input.name}
                        style={{
                            top: showHeader ? 52 + index * 28 : 20 + index * 28,
                            background: SOCKET_COLORS[input.type],
                            width: 12,
                            height: 12,
                            border: '2px solid #18181b',
                        }}
                        title={`${input.label} (${input.type})`}
                    />
                ))}

                {/* Output Handles */}
                {outputs.map((output: NodeOutput, index: number) => (
                    <Handle
                        key={`output-${output.name}`}
                        type="source"
                        position={Position.Right}
                        id={output.name}
                        style={{
                            top: showHeader ? 52 + index * 28 : 20 + index * 28,
                            background: SOCKET_COLORS[output.type],
                            width: 12,
                            height: 12,
                            border: '2px solid #18181b',
                        }}
                        title={`${output.label} (${output.type})`}
                    />
                ))}

                {/* Content Area */}
                <div className="p-3 flex-1 overflow-auto">
                    {/* Socket Labels */}
                    <div className="flex justify-between text-[10px] text-text-secondary mb-2">
                        <div className="space-y-1">
                            {inputs.map((input: NodeInput) => (
                                <div key={input.name} className="flex items-center gap-1">
                                    <div
                                        className="w-2 h-2 rounded-full"
                                        style={{ background: SOCKET_COLORS[input.type] }}
                                    />
                                    <span>{input.label}</span>
                                </div>
                            ))}
                        </div>
                        <div className="space-y-1 text-right">
                            {outputs.map((output: NodeOutput) => (
                                <div key={output.name} className="flex items-center gap-1 justify-end">
                                    <span>{output.label}</span>
                                    <div
                                        className="w-2 h-2 rounded-full"
                                        style={{ background: SOCKET_COLORS[output.type] }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Node-specific content */}
                    {children}
                </div>
            </div>
        </>
    )
}

export const BaseNode = memo(BaseNodeComponent)
