/**
 * SaveImageNode - Node for saving/exporting processed images
 */

import { memo } from 'react'
import { BaseNode } from './BaseNode'
import { useAppStore } from '@/store/appStore'
import type { SaveImageNodeData } from '@/types/nodeGraph'

interface SaveImageNodeProps {
    id: string
    data: SaveImageNodeData
    selected?: boolean
}

function SaveImageNodeComponent({ id, data, selected }: SaveImageNodeProps) {
    const { updateNodeData } = useAppStore()

    const handleFilenameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateNodeData(id, { filename: e.target.value })
    }

    const handleFormatChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        updateNodeData(id, { format: e.target.value as 'png' | 'jpg' | 'webp' })
    }

    return (
        <BaseNode id={id} data={data} selected={selected} headerColor="bg-blue-600">
            <div className="space-y-2">
                {/* Filename Input */}
                <div>
                    <label className="text-[10px] text-text-secondary block mb-1">
                        Filename
                    </label>
                    <input
                        type="text"
                        value={data.filename}
                        onChange={handleFilenameChange}
                        placeholder="output"
                        className="w-full bg-background-dark border border-border-dark rounded px-2 py-1.5 text-xs text-white"
                    />
                </div>

                {/* Format Selector */}
                <div>
                    <label className="text-[10px] text-text-secondary block mb-1">
                        Format
                    </label>
                    <select
                        value={data.format}
                        onChange={handleFormatChange}
                        className="w-full bg-background-dark border border-border-dark rounded px-2 py-1.5 text-xs text-white"
                    >
                        <option value="png">PNG</option>
                        <option value="jpg">JPEG</option>
                        <option value="webp">WebP</option>
                    </select>
                </div>
            </div>
        </BaseNode>
    )
}

export const SaveImageNode = memo(SaveImageNodeComponent)
