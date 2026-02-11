/**
 * ShortcutsModal - Displays keyboard shortcuts in a styled modal.
 */
import { useEffect } from 'react'
import { useAppStore } from '@/store/appStore'

export function ShortcutsModal() {
    const { isShortcutsOpen, toggleShortcuts } = useAppStore()

    // Close on Escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isShortcutsOpen && e.key === 'Escape') {
                toggleShortcuts()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isShortcutsOpen, toggleShortcuts])

    if (!isShortcutsOpen) return null

    const shortcuts = [
        // General
        { key: '?', desc: 'Toggle shortcuts popup' },
        { key: 'Cmd/Ctrl + K', desc: 'Command palette (future)' },
        { key: 'Space', desc: 'Pan mode (hold)' },
        { key: 'Mouse Wheel', desc: 'Zoom in/out' },
        { key: 'Cmd/Ctrl + Click', desc: 'Reset zoom' },
        { key: 'Arrow Keys', desc: 'Nudge view' },
        // Compare mode
        { key: 'S', desc: 'Side-by-Side mode (Compare)' },
        { key: 'W', desc: 'Swipe mode (Compare)' },
        { key: 'B', desc: 'Swap Box mode (Compare)' },
        { key: 'D', desc: 'Difference mode (Compare)' },
        { key: '1 / 2 / 3', desc: 'Cycle images for slot A / B / C' },
    ]

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={toggleShortcuts}>
            <div className="w-full max-w-md bg-surface-dark border border-border-dark rounded-lg shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border-dark bg-panel-dark">
                    <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary text-2xl">keyboard</span>
                        <h2 className="text-lg font-bold text-white">Keyboard Shortcuts</h2>
                    </div>
                    <button
                        onClick={toggleShortcuts}
                        className="p-1 text-text-secondary hover:text-white transition-colors"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <div className="space-y-2">
                        {shortcuts.map((s, i) => (
                            <div key={i} className="flex justify-between items-center py-2 border-b border-border-dark last:border-0">
                                <span className="text-text-secondary text-sm">{s.desc}</span>
                                <span className="px-2 py-1 bg-background-dark border border-border-dark rounded text-xs font-mono text-primary font-bold shadow-sm">
                                    {s.key}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-4 bg-panel-dark border-t border-border-dark text-center">
                    <p className="text-xs text-text-secondary">
                        Press <span className="font-mono text-white">?</span> anywhere to toggle this menu.
                    </p>
                </div>
            </div>
        </div>
    )
}
