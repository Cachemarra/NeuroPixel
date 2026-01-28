/**
 * FolderPickerModal - Directory browser using the backend API.
 */
import { useState, useEffect } from 'react'
const API_BASE = 'http://localhost:8000'

interface FolderPickerModalProps {
    isOpen: boolean
    onClose: () => void
    onSelect: (path: string) => void
    initialPath?: string
    title?: string
}

interface BrowseResponse {
    current_path: string
    parent_path: string | null
    entries: {
        name: string
        path: string
        is_dir: boolean
    }[]
}

export function FolderPickerModal({
    isOpen,
    onClose,
    onSelect,
    initialPath = '/mnt/HDD/data',
    title = 'Select Folder'
}: FolderPickerModalProps) {
    const [currentPath, setCurrentPath] = useState(initialPath)
    const [entries, setEntries] = useState<BrowseResponse['entries']>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [parentPath, setParentPath] = useState<string | null>(null)

    // Load directory contents
    const loadDir = async (path: string) => {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch(`${API_BASE}/system/browse`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // Allow empty path to resolve home/default on backend
                body: JSON.stringify({ path: path.trim() ? path : undefined })
            })

            if (!res.ok) throw new Error('Failed to list directory')

            const data: BrowseResponse = await res.json()
            setCurrentPath(data.current_path)
            setParentPath(data.parent_path)
            setEntries(data.entries)

        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    // Load initial
    useEffect(() => {
        if (isOpen) {
            loadDir(initialPath)
        }
    }, [isOpen])

    const handleNavigate = (path: string) => {
        loadDir(path)
    }

    const handleSelect = () => {
        // If an entry is selected, it's a subdir, maybe we want to select THAT
        // But usually we select the 'currentPath' or the highlighted subdir.
        // Let's assume the button selects the CURRENT path shown.
        // Or if we picked a subfolder, we navigate to it.
        // Actually typical folder pickers work by navigating to the desired folder then clicking "Select"
        onSelect(currentPath)
        onClose()
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="w-full max-w-2xl bg-surface-dark border border-border-dark rounded-lg shadow-2xl flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border-dark bg-panel-dark shrink-0">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">folder_open</span>
                        {title}
                    </h2>
                    <button onClick={onClose} className="p-1 text-text-secondary hover:text-white transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Path Bar */}
                <div className="px-6 py-3 border-b border-border-dark bg-surface-dark flex gap-2">
                    <button
                        onClick={() => parentPath && handleNavigate(parentPath)}
                        disabled={!parentPath}
                        className="p-1 text-text-secondary hover:text-white disabled:opacity-30"
                        title="Up one level"
                    >
                        <span className="material-symbols-outlined">arrow_upward</span>
                    </button>
                    <input
                        type="text"
                        value={currentPath}
                        onChange={(e) => setCurrentPath(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && loadDir(currentPath)}
                        className="flex-1 bg-background-dark border border-border-dark rounded px-3 py-1 text-sm text-white font-mono"
                    />
                    <button
                        onClick={() => loadDir(currentPath)}
                        className="p-1 text-text-secondary hover:text-white"
                        title="Go"
                    >
                        <span className="material-symbols-outlined">arrow_forward</span>
                    </button>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 min-h-[300px]">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full text-text-secondary">
                            <span className="material-symbols-outlined animate-spin text-3xl mb-2">progress_activity</span>
                            Loading...
                        </div>
                    ) : error ? (
                        <div className="flex items-center justify-center h-full text-red-500 gap-2">
                            <span className="material-symbols-outlined">error</span>
                            {error}
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-2">
                            {entries.length === 0 && (
                                <div className="col-span-3 text-center text-text-secondary py-10 opacity-50">
                                    Empty Directory
                                </div>
                            )}
                            {entries.map((entry) => (
                                <div
                                    key={entry.path}
                                    onClick={() => handleNavigate(entry.path)}
                                    className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors hover:bg-white/5 border border-transparent hover:border-white/10`}
                                >
                                    <span className="material-symbols-outlined text-yellow-500">folder</span>
                                    <span className="text-sm text-white truncate" title={entry.name}>{entry.name}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border-dark bg-panel-dark flex justify-end gap-3 shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-text-secondary hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSelect}
                        className="px-6 py-2 bg-primary hover:bg-blue-600 text-white text-sm font-bold rounded transition-colors"
                    >
                        Select Folder
                    </button>
                </div>
            </div>
        </div>
    )
}
