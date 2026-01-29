import { useState, useEffect } from 'react'

interface FileEntry {
    name: string
    path: string
    is_dir: boolean
}

interface BrowseResponse {
    current_path: string
    parent_path: string | null
    entries: FileEntry[]
}

interface FolderPickerModalProps {
    isOpen: boolean
    onClose: () => void
    onSelect: (path: string) => void
    initialPath?: string
}

export function FolderPickerModal({ isOpen, onClose, onSelect, initialPath }: FolderPickerModalProps) {
    const [currentPath, setCurrentPath] = useState(initialPath || '')
    const [parentPath, setParentPath] = useState<string | null>(null)
    const [entries, setEntries] = useState<FileEntry[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchPath = async (path: string) => {
        setLoading(true)
        setError(null)
        try {
            const response = await fetch('http://localhost:8001/system/browse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path })
            })
            if (!response.ok) throw new Error('Failed to browse folder')
            const data: BrowseResponse = await response.json()
            setCurrentPath(data.current_path)
            setParentPath(data.parent_path)
            setEntries(data.entries)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (isOpen) {
            fetchPath(currentPath)
        }
    }, [isOpen])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-surface-dark border border-border-dark rounded-xl w-full max-w-2xl h-[500px] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-border-dark flex items-center justify-between bg-panel-dark/50">
                    <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">folder_open</span>
                            Select Folder
                        </h3>
                        <p className="text-xs text-text-secondary mt-0.5 truncate max-w-md font-mono">
                            {currentPath}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <span className="material-symbols-outlined text-text-secondary hover:text-white">close</span>
                    </button>
                </div>

                {/* Explorer */}
                <div className="flex-1 overflow-y-auto p-4 bg-background-dark/30">
                    {loading && (
                        <div className="flex items-center justify-center h-full">
                            <span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span>
                        </div>
                    )}

                    {error && (
                        <div className="flex flex-col items-center justify-center h-full text-red-400">
                            <span className="material-symbols-outlined text-4xl mb-2">error</span>
                            <p>{error}</p>
                            <button onClick={() => fetchPath(currentPath)} className="mt-4 text-xs underline">Retry</button>
                        </div>
                    )}

                    {!loading && !error && (
                        <div className="space-y-1">
                            {parentPath && (
                                <button
                                    onClick={() => fetchPath(parentPath)}
                                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 text-text-secondary transition-colors group"
                                >
                                    <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform">arrow_upward</span>
                                    <span className="text-sm font-medium">.. (Parent Directory)</span>
                                </button>
                            )}

                            {entries.length === 0 ? (
                                <div className="text-center py-20 text-text-secondary/40">
                                    <span className="material-symbols-outlined text-5xl mb-3">folder_open</span>
                                    <p>No subfolders found</p>
                                </div>
                            ) : (
                                entries.map((entry) => (
                                    <button
                                        key={entry.path}
                                        onClick={() => fetchPath(entry.path)}
                                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-primary/10 hover:border-primary/30 border border-transparent text-white transition-all group"
                                    >
                                        <span className="material-symbols-outlined text-primary/80 group-hover:text-primary transition-colors">folder</span>
                                        <span className="text-sm font-medium truncate">{entry.name}</span>
                                    </button>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-border-dark flex items-center justify-between bg-panel-dark/30">
                    <div className="flex-1 mr-4">
                        <span className="text-[10px] text-text-secondary uppercase tracking-wider font-bold">Selection</span>
                        <div className="text-sm text-white truncate font-medium">{currentPath}</div>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-5 py-2 text-sm font-semibold text-text-secondary hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                onSelect(currentPath)
                                onClose()
                            }}
                            className="px-6 py-2 text-sm font-bold bg-primary hover:bg-blue-600 text-white rounded-lg shadow-lg shadow-primary/20 transition-all active:scale-95"
                        >
                            Select Folder
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
