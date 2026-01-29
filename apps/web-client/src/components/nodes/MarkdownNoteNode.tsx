/**
 * MarkdownNoteNode - Sticky note node for documentation
 */

import { memo, useState } from 'react'
import { NodeResizer } from '@xyflow/react'
import { useAppStore } from '@/store/appStore'
import type { MarkdownNoteNodeData } from '@/types/nodeGraph'

interface MarkdownNoteNodeProps {
    id: string
    data: MarkdownNoteNodeData
    selected?: boolean
}

function MarkdownNoteNodeComponent({ id, data, selected }: MarkdownNoteNodeProps) {
    const { updateNodeData } = useAppStore()
    const [isEditing, setIsEditing] = useState(false)

    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        updateNodeData(id, { content: e.target.value })
    }

    return (
        <>
            {/* Resizer handles */}
            <NodeResizer
                minWidth={180}
                minHeight={100}
                isVisible={selected}
                lineClassName="!border-amber-400"
                handleClassName="!w-2 !h-2 !bg-amber-400 !border-amber-400"
            />

            <div
                className={`
                    min-w-[180px] min-h-[100px] w-full h-full
                    bg-amber-500/20 border-2 rounded-lg
                    transition-all duration-150 flex flex-col
                    ${selected
                        ? 'border-amber-400 shadow-lg shadow-amber-500/20'
                        : 'border-amber-500/50'
                    }
                `}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-amber-500/30">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-amber-400 text-[18px]">
                            sticky_note_2
                        </span>
                        <span className="text-sm font-semibold text-amber-300">
                            Note
                        </span>
                    </div>
                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        className="p-1 hover:bg-amber-500/20 rounded transition-colors"
                    >
                        <span className="material-symbols-outlined text-amber-400 text-[16px]">
                            {isEditing ? 'check' : 'edit'}
                        </span>
                    </button>
                </div>

                {/* Content */}
                <div className="p-3 flex-1 overflow-auto">
                    {isEditing ? (
                        <textarea
                            value={data.content}
                            onChange={handleContentChange}
                            placeholder="Write your note here..."
                            className="w-full h-full min-h-[80px] bg-transparent border-none outline-none resize-none text-sm text-amber-100 placeholder:text-amber-500/50"
                            autoFocus
                        />
                    ) : (
                        <div
                            className="text-sm text-amber-100 whitespace-pre-wrap min-h-[40px]"
                            onDoubleClick={() => setIsEditing(true)}
                        >
                            {data.content || (
                                <span className="text-amber-500/50 italic">
                                    Double-click to edit...
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}

export const MarkdownNoteNode = memo(MarkdownNoteNodeComponent)

