import { useAppStore, ImageData } from '@/store/appStore'

const API_BASE = 'http://localhost:8001'

interface UploadResponse {
    id: string
    name: string
    url: string
    thumbnail_url: string
    metadata: {
        width: number
        height: number
        channels: number
        bit_depth: string
        file_size: number
    }
}

export function useImageUpload() {
    const { addImage, setUploading, isUploading } = useAppStore()

    const uploadImage = async (file: File): Promise<ImageData | null> => {
        setUploading(true)

        try {
            const formData = new FormData()
            formData.append('file', file)

            const response = await fetch(`${API_BASE}/images/upload`, {
                method: 'POST',
                body: formData,
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.detail || 'Upload failed')
            }

            const data: UploadResponse = await response.json()

            // Transform to our ImageData format
            const imageData: ImageData = {
                id: data.id,
                name: data.name,
                url: data.url,
                thumbnailUrl: data.thumbnail_url,
                metadata: {
                    width: data.metadata.width,
                    height: data.metadata.height,
                    channels: data.metadata.channels,
                    bitDepth: data.metadata.bit_depth,
                    fileSize: data.metadata.file_size,
                },
            }

            // Add to store
            addImage(imageData)

            // Explicitly set as active for manual uploads
            useAppStore.getState().setActiveImage(imageData.id)

            return imageData
        } catch (error) {
            console.error('Upload error:', error)
            return null
        } finally {
            setUploading(false)
        }
    }

    return { uploadImage, isUploading }
}
