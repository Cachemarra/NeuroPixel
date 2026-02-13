import { memo, useCallback } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'
import { useAppStore } from '@/store/appStore'
import { SaveBatchNodeData } from '@/types/nodeGraph'
import { API_BASE } from '@/config'

export const SaveBatchNode = memo(({ id, data, isConnectable }: NodeProps) => {
    const updateNodeData = useAppStore((state) => state.updateNodeData)
    const nodeData = data as unknown as SaveBatchNodeData

    const handleFormatChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        updateNodeData(id, { format: e.target.value })
    }, [id, updateNodeData])

    const handleFilenameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        updateNodeData(id, { filename_prefix: e.target.value })
    }, [id, updateNodeData])

    return (
        <div className={`node-card min-w-[200px] ${data.headerColor || 'bg-blue-600'}`}>
            {/* Header */}
            <div className={`px-3 py-2 text-white font-medium text-xs flex items-center justify-between ${data.headerColor || 'bg-blue-600'}`}>
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px]">snippet_folder</span>
                    <span>Save Batch Images</span>
                </div>
            </div>

            {/* Content */}
            <div className="p-3 space-y-3 bg-panel-dark">
                {/* Input Handle */}
                <div className="relative flex items-center">
                    <Handle
                        type="target"
                        position={Position.Left}
                        isConnectable={isConnectable}
                        className="!bg-primary !w-3 !h-3 !border-2 !border-background-dark"
                    />
                    <span className="ml-3 text-xs text-text-secondary">Image</span>
                </div>

                {/* Controls */}
                <div className="space-y-2">
                    {/* Output Folder (Native Picker) */}
                    <div>
                        <label className="text-[10px] text-text-secondary uppercase font-bold block mb-1">
                            Output Folder
                        </label>
                        <div className="flex items-center gap-1">
                            <input
                                type="text"
                                value={nodeData.output_folder || './output'}
                                onChange={(e) => updateNodeData(id, { output_folder: e.target.value })}
                                className="flex-1 bg-background-dark border border-border-dark rounded px-2 py-1 text-xs text-white outline-none focus:border-primary"
                                placeholder="/path/to/save"
                            />
                            <button
                                onClick={async () => {
                                    try {
                                        const response = await fetch(`${API_BASE}/system/pick-directory`)
                                        const data = await response.json()
                                        if (data.success && data.path) {
                                            updateNodeData(id, { output_folder: data.path })
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

                    <div>
                        <label className="text-[10px] text-text-secondary uppercase font-bold block mb-1">
                            Filename Prefix
                        </label>
                        <input
                            type="text"
                            value={nodeData.filename_prefix || 'batch_output'}
                            onChange={handleFilenameChange}
                            className="w-full bg-background-dark border border-border-dark rounded px-2 py-1 text-xs text-white outline-none focus:border-primary"
                            placeholder="prefix (e.g. processed)"
                        />
                    </div>

                    <div>
                        <label className="text-[10px] text-text-secondary uppercase font-bold block mb-1">
                            Format
                        </label>
                        <select
                            value={nodeData.format || 'png'}
                            onChange={handleFormatChange}
                            className="w-full bg-background-dark border border-border-dark rounded px-2 py-1 text-xs text-white outline-none focus:border-primary appearance-none cursor-pointer"
                        >
                            <option value="png">PNG</option>
                            <option value="jpg">JPEG</option>
                            <option value="webp">WebP</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    )
})
