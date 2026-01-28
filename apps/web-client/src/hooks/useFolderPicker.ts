/**
 * useFolderPicker.ts
 * Hook to handle folder selection logic, abstracting between Tauri native dialog
 * and the custom simulated browser modal.
 */
import { useState } from 'react'

// Define the Tauri dialog type (simplified)
interface TauriDialog {
    open: (options?: {
        directory?: boolean
        multiple?: boolean
        defaultPath?: string
        title?: string
    }) => Promise<string | string[] | null>
}

declare global {
    interface Window {
        __TAURI__?: {
            dialog: TauriDialog
        }
    }
}

interface UseFolderPickerResult {
    openFolderPicker: () => Promise<void>
    isModalOpen: boolean
    closeModal: () => void
    handleModalSelect: (path: string) => void
}

export function useFolderPicker(
    onSelect: (path: string) => void,
    defaultPath?: string
): UseFolderPickerResult {
    const [isModalOpen, setIsModalOpen] = useState(false)

    const openFolderPicker = async () => {
        // Check for Tauri environment
        if (window.__TAURI__) {
            try {
                const selected = await window.__TAURI__.dialog.open({
                    directory: true,
                    multiple: false,
                    defaultPath: defaultPath,
                    title: 'Select Folder',
                })

                if (selected && typeof selected === 'string') {
                    onSelect(selected)
                }
            } catch (err) {
                console.error('Failed to open native dialog:', err)
                // Fallback to modal on error
                setIsModalOpen(true)
            }
        } else {
            // Web environment - use custom modal
            setIsModalOpen(true)
        }
    }

    const closeModal = () => {
        setIsModalOpen(false)
    }

    const handleModalSelect = (path: string) => {
        onSelect(path)
        setIsModalOpen(false)
    }

    return {
        openFolderPicker,
        isModalOpen,
        closeModal,
        handleModalSelect,
    }
}
