/**
 * LoadImageNode - Node for loading images from the explorer
 */

import { memo } from 'react'
import { BaseNode } from './BaseNode'
import { useAppStore } from '@/store/appStore'
import type { LoadImageNodeData } from '@/types/nodeGraph'

interface LoadImageNodeProps {
    id: string
    data: LoadImageNodeData
    selected?: boolean
}

function LoadImageNodeComponent({ id, data, selected }: LoadImageNodeProps) {
    const { images, updateNodeData } = useAppStore()

    const handleImageSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const imageId = e.target.value || null
        const selectedImage = images.find(img => img.id === imageId)
        updateNodeData(id, {
            imageId,
            imageName: selectedImage?.name || '',
            thumbnailUrl: selectedImage?.thumbnailUrl,
        })
    }

    const handleToggleCollapse = () => {
        updateNodeData(id, { collapsed: !data.collapsed })
    }

    return (
        <BaseNode id={id} data={data} selected={selected} headerColor="bg-emerald-600" onToggleCollapse={handleToggleCollapse}>
            <div className="space-y-2">
                {/* Image Selector */}
                <select
                    value={data.imageId || ''}
                    onChange={handleImageSelect}
                    className="w-full bg-background-dark border border-border-dark rounded px-2 py-1.5 text-xs text-white"
                >
                    <option value="">Select image...</option>
                    {images.filter(img => !img.isResult).map((image) => (
                        <option key={image.id} value={image.id}>
                            {image.name}
                        </option>
                    ))}
                </select>

                {/* Thumbnail Preview */}
                {data.thumbnailUrl && (
                    <div className="relative aspect-video bg-background-dark rounded overflow-hidden">
                        <img
                            src={data.thumbnailUrl}
                            alt={data.imageName}
                            className="w-full h-full object-contain"
                        />
                    </div>
                )}

                {/* Selected Image Name */}
                {data.imageName && (
                    <p className="text-[10px] text-text-secondary truncate">
                        {data.imageName}
                    </p>
                )}
            </div>
        </BaseNode>
    )
}

export const LoadImageNode = memo(LoadImageNodeComponent)
