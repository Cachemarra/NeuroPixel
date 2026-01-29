/**
 * MarkdownNoteNode - Sticky note node for documentation
 */

import { memo, useState, useMemo } from 'react'
import { NodeResizer } from '@xyflow/react'
import { useAppStore } from '@/store/appStore'
import type { MarkdownNoteNodeData } from '@/types/nodeGraph'
import { marked } from 'marked'

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

    // Configure marked for security (optional but good practice)
    const htmlContent = useMemo(() => {
        if (!data.content) return ''
        return marked.parse(data.content)
    }, [data.content])

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
                    bg-amber-500/10 border-2 rounded-lg backdrop-blur-sm
                    transition-all duration-150 flex flex-col
                    ${selected
                        ? 'border-amber-400 shadow-lg shadow-amber-500/20'
                        : 'border-amber-500/30'
                    }
                `}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-amber-500/30 bg-amber-500/10">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-amber-500 text-[18px]">
                            sticky_note_2
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">
                            Note
                        </span>
                    </div>
                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        className="p-1 hover:bg-amber-500/20 rounded transition-colors"
                    >
                        <span className="material-symbols-outlined text-amber-500 text-[16px]">
                            {isEditing ? 'check' : 'edit'}
                        </span>
                    </button>
                </div>

                {/* Content */}
                <div className="p-3 flex-1 overflow-auto custom-scrollbar">
                    {isEditing ? (
                        <textarea
                            value={data.content}
                            onChange={handleContentChange}
                            placeholder="Write your note here (Markdown supported)..."
                            className="w-full h-full min-h-[80px] bg-transparent border-none outline-none resize-none text-sm text-amber-100 placeholder:text-amber-500/40 font-mono"
                            autoFocus
                        />
                    ) : (
                        <div
                            className="text-sm text-amber-100 prose prose-invert prose-amber max-w-none break-words min-h-[40px] markdown-content"
                            onDoubleClick={() => setIsEditing(true)}
                            dangerouslySetInnerHTML={{ __html: htmlContent as string }}
                        />
                    )}
                    {!isEditing && !data.content && (
                        <div
                            className="text-sm text-amber-500/40 italic flex items-center justify-center h-full cursor-text"
                            onDoubleClick={() => setIsEditing(true)}
                        >
                            Double-click to edit...
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}

export const MarkdownNoteNode = memo(MarkdownNoteNodeComponent)

