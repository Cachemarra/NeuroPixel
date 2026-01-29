/**
 * Hooks for interacting with the plugin system
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAppStore } from '@/store/appStore'
import type {
    PluginListResponse,
    PluginRunRequest,
    PluginRunResponse,
    PluginSpec,
} from '@/types/plugin'

const API_BASE = 'http://localhost:8001'

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
 */
export function usePluginsByCategory() {
    const { data, isLoading, error } = usePlugins()

    const categorized = data?.plugins.reduce<Record<string, PluginSpec[]>>(
        (acc, plugin) => {
            if (!acc[plugin.category]) {
                acc[plugin.category] = []
            }
            acc[plugin.category].push(plugin)
            return acc
        },
        {}
    )

    return {
        categories: categorized || {},
        isLoading,
        error,
    }
}

/**
 * Hook for running a plugin
 */
export function useRunPlugin() {
    const queryClient = useQueryClient()
    const { addImage, images } = useAppStore()

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
            // Find the root image ID (original source)
            const inputImage = images.find((img) => img.id === variables.image_id)
            const rootId = inputImage?.sourceId || variables.image_id

            // Construct name: SourceName_modified.png
            const baseName = inputImage?.name.replace(/\.[^/.]+$/, "") || variables.image_id
            const newName = `${baseName}_modified.png`

            // Add/Update the result image in the store
            addImage({
                id: data.result_id,
                name: newName,
                url: data.result_url,
                thumbnailUrl: `${API_BASE}/images/${data.result_id}/thumbnail`,
                isResult: true,
                sourceId: rootId,
                metadata: {
                    width: 0,
                    height: 0,
                    channels: 3,
                    bitDepth: '8-bit',
                    fileSize: 0,
                },
            })

            queryClient.invalidateQueries({ queryKey: ['images'] })
        },
    })
}

