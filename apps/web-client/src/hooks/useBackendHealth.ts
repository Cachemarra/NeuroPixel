import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useAppStore } from '@/store/appStore'

interface HealthResponse {
    status: string
    gpu_active: boolean
    version: string
}

async function fetchHealth(): Promise<HealthResponse> {
    const response = await fetch('http://localhost:8005/health')
    if (!response.ok) {
        throw new Error('Backend not available')
    }
    return response.json()
}

export function useBackendHealth() {
    const setBackendConnected = useAppStore((state) => state.setBackendConnected)

    const query = useQuery({
        queryKey: ['health'],
        queryFn: fetchHealth,
        refetchInterval: 10000, // Poll every 10 seconds
        retry: false,
    })

    useEffect(() => {
        setBackendConnected(query.isSuccess)
    }, [query.isSuccess, setBackendConnected])

    return {
        isConnected: query.isSuccess,
        isLoading: query.isLoading,
        gpuActive: query.data?.gpu_active ?? false,
        version: query.data?.version,
        error: query.error,
    }
}
