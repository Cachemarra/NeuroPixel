/**
 * PreviewNode - Node for displaying intermediate image results
 */

import { memo } from 'react'
import { BaseNode } from './BaseNode'
import type { PreviewNodeData } from '@/types/nodeGraph'

interface PreviewNodeProps {
    id: string
    data: PreviewNodeData
    selected?: boolean
}

function PreviewNodeComponent({ id, data, selected }: PreviewNodeProps) {
    return (
        <BaseNode id={id} data={data} selected={selected} headerColor="bg-violet-600">
            <div className="space-y-2">
                {/* Preview Display */}
                <div className="relative aspect-video bg-background-dark rounded overflow-hidden min-h-[100px] flex items-center justify-center">
                    {data.previewUrl ? (
                        <img
                            src={data.previewUrl}
                            alt="Preview"
                            className="w-full h-full object-contain"
                        />
                    ) : (
                        <div className="text-center">
                            <span className="material-symbols-outlined text-3xl text-text-secondary/30">
                                image
                            </span>
                            <p className="text-[10px] text-text-secondary mt-1">
                                No preview
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </BaseNode>
    )
}

export const PreviewNode = memo(PreviewNodeComponent)
