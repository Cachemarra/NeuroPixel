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

    const handleOutputPathChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateNodeData(id, { outputPath: e.target.value })
    }

    const handleToggleCollapse = () => {
        updateNodeData(id, { collapsed: !data.collapsed })
    }

    const handleFolderSelect = (path: string) => {
        updateNodeData(id, { outputPath: path })
    }

    return (
        <BaseNode id={id} data={data} selected={selected} headerColor="bg-blue-600" onToggleCollapse={handleToggleCollapse}>
            <div className="space-y-2">
                {/* Output Path Input */}
                <div>
                    <label className="text-[10px] text-text-secondary block mb-1">
                        Output Folder
                    </label>
                    <div className="flex gap-1">
                        <input
                            type="text"
                            data-node-id={id}
                            value={data.outputPath || ''}
                            onChange={handleOutputPathChange}
                            placeholder="./output"
                            className="flex-1 bg-background-dark border border-border-dark rounded px-2 py-1.5 text-xs text-white"
                        />
                        <button
                            onClick={async () => {
                                try {
                                    const response = await fetch('http://localhost:8005/system/pick-directory')
                                    const data = await response.json()
                                    if (data.success && data.path) {
                                        handleFolderSelect(data.path)
                                    } else if (data.message) {
                                        alert(data.message)
                                    }
                                } catch (err) {
                                    console.log('Error picking directory:', err)
                                    alert('Could not open native dialog. Is the backend running?')
                                }
                            }}
                            className="px-2 py-1.5 bg-panel-dark border border-border-dark rounded text-[10px] text-white hover:bg-border-dark transition-colors flex items-center h-full"
                            title="Select Output Folder"
                        >
                            <span className="material-symbols-outlined text-[14px]">folder_open</span>
                        </button>
                    </div>
                </div>

                {/* Filename Input */}
                <div>
                    <label className="text-[10px] text-text-secondary block mb-1">
                        Filename
                    </label>
                    <input
                        type="text"
                        value={data.filename}
                        onChange={handleFilenameChange}
                        placeholder="result"
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
