/**
 * LoadBatchNode - Node for loading images from a folder for batch processing
 */

import { memo } from 'react'
import { BaseNode } from './BaseNode'
import { useAppStore } from '@/store/appStore'
import type { LoadBatchNodeData } from '@/types/nodeGraph'

interface LoadBatchNodeProps {
    id: string
    data: LoadBatchNodeData
    selected?: boolean
}

function LoadBatchNodeComponent({ id, data, selected }: LoadBatchNodeProps) {
    const { updateNodeData } = useAppStore()

    const handleFolderPathChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateNodeData(id, { folderPath: e.target.value })
    }

    const handlePatternChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        updateNodeData(id, { filePattern: e.target.value })
    }

    const handleToggleCollapse = () => {
        updateNodeData(id, { collapsed: !data.collapsed })
    }

    const handleBrowseFolder = async () => {
        // Use file input with webkitdirectory for browser folder selection
        const input = document.createElement('input')
        input.type = 'file'
        input.webkitdirectory = true
        input.onchange = (e) => {
            const files = (e.target as HTMLInputElement).files
            if (files && files.length > 0) {
                // Get folder path from first file
                const firstFile = files[0]
                const pathParts = firstFile.webkitRelativePath.split('/')
                const folderName = pathParts[0]
                updateNodeData(id, {
                    folderPath: folderName,
                    imageCount: files.length
                })
            }
        }
        input.click()
    }

    return (
        <BaseNode
            id={id}
            data={data}
            selected={selected}
            headerColor="bg-amber-600"
            onToggleCollapse={handleToggleCollapse}
        >
            <div className="space-y-3">
                {/* Folder Path Input */}
                <div className="space-y-1">
                    <label className="text-[10px] text-text-secondary">Folder Path</label>
                    <div className="flex gap-1">
                        <input
                            type="text"
                            value={data.folderPath || ''}
                            onChange={handleFolderPathChange}
                            placeholder="Enter folder path..."
                            className="flex-1 bg-background-dark border border-border-dark rounded px-2 py-1.5 text-xs text-white"
                        />
                        <button
                            onClick={handleBrowseFolder}
                            className="px-2 py-1.5 bg-panel-dark border border-border-dark rounded text-[10px] text-white hover:bg-border-dark transition-colors"
                            title="Browse folder"
                        >
                            <span className="material-symbols-outlined text-[14px]">folder_open</span>
                        </button>
                    </div>
                </div>

                {/* File Pattern */}
                <div className="space-y-1">
                    <label className="text-[10px] text-text-secondary">File Pattern</label>
                    <input
                        type="text"
                        value={data.filePattern || '*.png,*.jpg,*.jpeg'}
                        onChange={handlePatternChange}
                        placeholder="*.png,*.jpg"
                        className="w-full bg-background-dark border border-border-dark rounded px-2 py-1.5 text-xs text-white font-mono"
                    />
                </div>

                {/* Image Count Display */}
                {data.imageCount > 0 && (
                    <div className="flex items-center gap-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded">
                        <span className="material-symbols-outlined text-amber-400 text-[16px]">photo_library</span>
                        <span className="text-xs text-amber-300">
                            {data.imageCount} image{data.imageCount !== 1 ? 's' : ''} found
                        </span>
                    </div>
                )}
            </div>
        </BaseNode>
    )
}

export const LoadBatchNode = memo(LoadBatchNodeComponent)
