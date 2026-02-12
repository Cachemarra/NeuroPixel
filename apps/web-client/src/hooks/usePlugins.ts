/**
 * Hooks for interacting with the plugin system
 */
import { useQuery, useMutation } from '@tanstack/react-query'
import { useAppStore } from '@/store/appStore'
import type {
    PluginListResponse,
    PluginRunRequest,
    PluginRunResponse,
    PluginSpec,
} from '@/types/plugin'

const API_BASE = 'http://localhost:8005'

/**
 * Fetch all available plugins
 */
export function usePlugins() {
    return useQuery<PluginListResponse>({
        queryKey: ['plugins'],
        queryFn: async () => {
            const response = await fetch(`${API_BASE}/plugins`)
            if (!response.ok) {
                throw new Error('Failed to fetch plugins')
            }
            return response.json()
        },
        staleTime: 5 * 60 * 1000, // 5 minutes - plugins don't change often
    })
}

/**
 * Get plugins grouped by category for the accordion
 * Applies custom category remapping and sorting for better organization
 */
export function usePluginsByCategory() {
    const { data, isLoading, error } = usePlugins()

    // Remap old categories to new organized categories
    const categoryRemap: Record<string, string> = {
        'Preprocessing': 'Adjustments',
        'Edge Detection': 'Filters',
        'Segmentation': 'Analysis',
        'Morphology': 'Transform',
    }

    // Plugin-specific category overrides (more granular control)
    const pluginCategoryMap: Record<string, string> = {
        // Adjustments (color/exposure)
        'brightness_contrast': 'Adjustments',
        'exposure': 'Adjustments',
        'saturation': 'Adjustments',
        'temperature': 'Adjustments',
        'hsl_adjust': 'Adjustments',
        'shadows_highlights': 'Adjustments',

        // Filters (blur, sharpen, edge)
        'gaussian_blur': 'Filters',
        'denoise': 'Filters',
        'sharpen': 'Filters',
        'unsharp_mask': 'Filters',
        'laplacian': 'Filters',
        'canny': 'Filters',

        // Transform (geometry)
        'resize': 'Transform',
        'rotate_flip': 'Transform',
        'crop': 'Transform',
        'morphology': 'Transform',

        // Analysis (segmentation, conversion)
        'otsu_threshold': 'Analysis',
        'rgb_to_grayscale': 'Analysis',
    }

    // Category sort order
    const categoryOrder = ['Adjustments', 'Filters', 'Transform', 'Analysis']

    const categorized = data?.plugins.reduce<Record<string, PluginSpec[]>>(
        (acc, plugin) => {
            // Determine category: specific override > remap > original
            const category = pluginCategoryMap[plugin.name]
                || categoryRemap[plugin.category]
                || plugin.category

            if (!acc[category]) {
                acc[category] = []
            }
            acc[category].push(plugin)
            return acc
        },
        {}
    )

    // Sort categories according to preferred order
    const sortedCategories: Record<string, PluginSpec[]> = {}
    if (categorized) {
        categoryOrder.forEach(cat => {
            if (categorized[cat]) {
                sortedCategories[cat] = categorized[cat]
            }
        })
        // Add any remaining categories not in our order
        Object.keys(categorized).forEach(cat => {
            if (!sortedCategories[cat]) {
                sortedCategories[cat] = categorized[cat]
            }
        })
    }

    return {
        categories: sortedCategories,
        isLoading,
        error,
    }
}

/**
 * Hook for running a plugin
 * Implements copy-on-first-edit: First operation creates ImageName_copy,
 * subsequent operations REPLACE the copy with updated version, preserving the original.
 */
export function useRunPlugin() {
    const { addImage, removeImage, images, setActiveImage } = useAppStore()

    return useMutation<PluginRunResponse, Error, PluginRunRequest>({
        mutationFn: async (request) => {
            const response = await fetch(`${API_BASE}/plugins/run`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request),
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.detail || 'Plugin execution failed')
            }

            return response.json()
        },
        onSuccess: (data, variables) => {
            const inputImage = images.find((img) => img.id === variables.image_id)

            if (!inputImage) return

            // Determine if this is an original or already a working copy
            const isOriginal = !inputImage.sourceId && !inputImage.isResult

            // Get the base name (without extension and _copy suffix)
            const baseName = inputImage.name.replace(/\.[^/.]+$/, "").replace(/_copy$/, "")
            const originalId = inputImage.sourceId || inputImage.id

            if (isOriginal) {
                // FIRST OPERATION on original: Create a new "_copy" image
                const copyName = `${baseName}_copy.png`

                addImage({
                    id: data.result_id,
                    name: copyName,
                    url: data.result_url,
                    thumbnailUrl: `${API_BASE}/images/${data.result_id}/thumbnail`,
                    isResult: true,
                    sourceId: inputImage.id,
                    metadata: {
                        width: inputImage.metadata.width,
                        height: inputImage.metadata.height,
                        channels: inputImage.metadata.channels,
                        bitDepth: inputImage.metadata.bitDepth,
                        fileSize: 0,
                    },
                })

                // Auto-select the new copy
                setActiveImage(data.result_id)
            } else {
                // SUBSEQUENT OPERATIONS on a copy: REPLACE the old copy
                // Remove the old copy entry
                removeImage(inputImage.id)

                // Add the new result with the same _copy name
                addImage({
                    id: data.result_id,
                    name: inputImage.name, // Keep the _copy name
                    url: data.result_url,
                    thumbnailUrl: `${API_BASE}/images/${data.result_id}/thumbnail`,
                    isResult: true,
                    sourceId: originalId,
                    metadata: {
                        width: inputImage.metadata.width,
                        height: inputImage.metadata.height,
                        channels: inputImage.metadata.channels,
                        bitDepth: inputImage.metadata.bitDepth,
                        fileSize: 0,
                    },
                })

                // Select the new replacement
                setActiveImage(data.result_id)
            }

            // State managed directly in zustand, no query invalidation needed
        },
    })
}
