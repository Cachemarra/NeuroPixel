/**
 * ContextMenu - Right-click context menu for the pipeline editor
 * Shows different options based on what was clicked (canvas vs node)
 */

import { useCallback, useEffect, useRef } from 'react'
import { NODE_TYPE_DEFINITIONS, type NodeTypeKey } from '@/types/nodeGraph'
import type { PluginSpec } from '@/types/plugin'

export interface ContextMenuPosition {
    x: number
    y: number
}

export interface ContextMenuItem {
    label: string
    icon?: string
    action: () => void
    danger?: boolean
    disabled?: boolean
    divider?: boolean
}

interface ContextMenuProps {
    position: ContextMenuPosition | null
    items: ContextMenuItem[]
    onClose: () => void
}

export function ContextMenu({ position, items, onClose }: ContextMenuProps) {
    const menuRef = useRef<HTMLDivElement>(null)

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose()
            }
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose()
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        document.addEventListener('keydown', handleKeyDown)

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [onClose])

    if (!position) return null

    return (
        <div
            ref={menuRef}
            className="fixed z-50 min-w-[200px] bg-surface-dark border border-border-dark rounded-lg shadow-2xl py-1 animate-in fade-in zoom-in-95 duration-100"
            style={{
                left: position.x,
                top: position.y,
            }}
        >
            {items.map((item, index) => {
                if (item.divider) {
                    return (
                        <div
                            key={`divider-${index}`}
                            className="h-px bg-border-dark my-1"
                        />
                    )
                }

                return (
                    <button
                        key={item.label}
                        onClick={() => {
                            if (!item.disabled) {
                                item.action()
                                onClose()
                            }
                        }}
                        disabled={item.disabled}
                        className={`
                            w-full flex items-center gap-3 px-3 py-2 text-left text-sm
                            transition-colors
                            ${item.disabled
                                ? 'text-text-secondary/50 cursor-not-allowed'
                                : item.danger
                                    ? 'text-red-400 hover:bg-red-500/20'
                                    : 'text-white hover:bg-primary/20'
                            }
                        `}
                    >
                        {item.icon && (
                            <span className={`material-symbols-outlined text-[18px] ${item.danger ? 'text-red-400' : 'text-text-secondary'}`}>
                                {item.icon}
                            </span>
                        )}
                        <span>{item.label}</span>
                    </button>
                )
            })}
        </div>
    )
}

// Submenu for adding nodes
export interface AddNodeSubmenuProps {
    position: ContextMenuPosition | null
    categories: Record<string, PluginSpec[]>
    onAddUtilityNode: (type: NodeTypeKey) => void
    onAddOperatorNode: (plugin: PluginSpec) => void
    onClose: () => void
}

const UTILITY_NODES: NodeTypeKey[] = ['load_image', 'save_image', 'preview', 'markdown_note']

export function AddNodeSubmenu({
    position,
    categories,
    onAddUtilityNode,
    onAddOperatorNode,
    onClose,
}: AddNodeSubmenuProps) {
    const menuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose()
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [onClose])

    if (!position) return null

    return (
        <div
            ref={menuRef}
            className="fixed z-50 w-72 max-h-[70vh] overflow-y-auto bg-surface-dark border border-border-dark rounded-lg shadow-2xl py-1 animate-in fade-in zoom-in-95 duration-100"
            style={{
                left: position.x,
                top: position.y,
            }}
        >
            {/* Utility Nodes */}
            <div className="px-3 py-2 text-[10px] font-bold uppercase text-text-secondary/70 bg-panel-dark sticky top-0">
                Utility
            </div>
            {UTILITY_NODES.map((type) => {
                const def = NODE_TYPE_DEFINITIONS[type]
                return (
                    <button
                        key={type}
                        onClick={() => {
                            onAddUtilityNode(type)
                            onClose()
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-primary/20 transition-colors text-left"
                    >
                        <span className="material-symbols-outlined text-primary text-[18px]">
                            {def.icon}
                        </span>
                        <span className="text-sm text-white">{def.label}</span>
                    </button>
                )
            })}

            {/* Operator Nodes by Category */}
            {Object.entries(categories).map(([category, plugins]) => (
                <div key={category}>
                    <div className="px-3 py-2 text-[10px] font-bold uppercase text-text-secondary/70 bg-panel-dark sticky top-0">
                        {category}
                    </div>
                    {plugins.map((plugin) => (
                        <button
                            key={plugin.name}
                            onClick={() => {
                                onAddOperatorNode(plugin)
                                onClose()
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-primary/20 transition-colors text-left"
                        >
                            <span className="material-symbols-outlined text-indigo-400 text-[18px]">
                                {plugin.icon}
                            </span>
                            <span className="text-sm text-white">{plugin.display_name}</span>
                        </button>
                    ))}
                </div>
            ))}
        </div>
    )
}
