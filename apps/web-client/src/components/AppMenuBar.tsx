/**
 * AppMenuBar - Functional menu bar with dropdown menus
 * Replaces static menu links with command-connected menus
 */

import { useState, useRef, useEffect } from 'react'
import { commands } from '@/lib/commands'
import { useAppStore } from '@/store/appStore'

interface MenuItem {
    label: string
    action?: () => void
    shortcut?: string
    separator?: boolean
    disabled?: boolean
}

interface Menu {
    label: string
    items: MenuItem[]
}

export function AppMenuBar() {
    const [openMenu, setOpenMenu] = useState<string | null>(null)
    const menuRef = useRef<HTMLDivElement>(null)

    // Subscribe to undo/redo state reactively
    const undoStackLength = useAppStore((state) => state.undoStack.length)
    const redoStackLength = useAppStore((state) => state.redoStack.length)

    const handleUndo = () => {
        const state = useAppStore.getState()
        const currentImage = state.images.find(img => img.id === state.activeImageId)
        if (!currentImage) return
        const currentSnapshot = {
            imageId: currentImage.id,
            url: currentImage.url,
            thumbnailUrl: currentImage.thumbnailUrl,
            name: currentImage.name,
        }
        const entry = state.undo(currentSnapshot)
        if (entry) {
            useAppStore.getState().updateImage(entry.imageId, {
                url: entry.url + (entry.url.includes('?') ? '&' : '?') + 't=' + Date.now(),
                thumbnailUrl: entry.thumbnailUrl + (entry.thumbnailUrl.includes('?') ? '&' : '?') + 't=' + Date.now(),
                name: entry.name,
            })
        }
    }

    const handleRedo = () => {
        const state = useAppStore.getState()
        const currentImage = state.images.find(img => img.id === state.activeImageId)
        if (!currentImage) return
        const currentSnapshot = {
            imageId: currentImage.id,
            url: currentImage.url,
            thumbnailUrl: currentImage.thumbnailUrl,
            name: currentImage.name,
        }
        const entry = state.redo(currentSnapshot)
        if (entry) {
            useAppStore.getState().updateImage(entry.imageId, {
                url: entry.url + (entry.url.includes('?') ? '&' : '?') + 't=' + Date.now(),
                thumbnailUrl: entry.thumbnailUrl + (entry.thumbnailUrl.includes('?') ? '&' : '?') + 't=' + Date.now(),
                name: entry.name,
            })
        }
    }

    // Build menus inside the component body so they can access store state
    const menus: Menu[] = [
        {
            label: 'File',
            items: [
                { label: 'Open Image...', action: commands.file.openImage, shortcut: 'Ctrl+O' },
                { label: 'Open Folder...', action: commands.file.openFolder, shortcut: 'Ctrl+Shift+O' },
                { separator: true, label: '' },
                { label: 'Export Result...', action: commands.file.exportResult, shortcut: 'Ctrl+E' },
                { separator: true, label: '' },
                { label: 'Exit', action: commands.file.exit },
            ],
        },
        {
            label: 'Edit',
            items: [
                { label: 'Undo', action: handleUndo, shortcut: 'Ctrl+Z', disabled: undoStackLength === 0 },
                { label: 'Redo', action: handleRedo, shortcut: 'Ctrl+Y', disabled: redoStackLength === 0 },
                { separator: true, label: '' },
                { label: 'Copy Metrics', action: commands.edit.copyMetrics },
            ],
        },
        {
            label: 'View',
            items: [
                { label: 'Zoom In', action: commands.view.zoomIn, shortcut: 'Ctrl++' },
                { label: 'Zoom Out', action: commands.view.zoomOut, shortcut: 'Ctrl+-' },
                { label: 'Fit to View', action: commands.view.fit, shortcut: 'Ctrl+0' },
                { separator: true, label: '' },
                { label: 'Toggle Comparison', action: commands.view.toggleComparison },
            ],
        },
        {
            label: 'Pipeline',
            items: [
                { label: 'Open Editor', action: commands.pipeline.openEditor },
                { label: 'Run Batch...', action: commands.pipeline.runBatch },
                { separator: true, label: '' },
                { label: 'Reload Plugins', action: commands.pipeline.reloadPlugins },
                { label: 'Open Plugins Folder', action: commands.pipeline.openPluginsFolder },
            ],
        },
        {
            label: 'Help',
            items: [
                { label: 'Keyboard Shortcuts', action: commands.help.shortcuts },
                { separator: true, label: '' },
                { label: 'About LumaGraph', action: commands.help.about },
            ],
        },
    ]

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpenMenu(null)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleMenuClick = (label: string) => {
        setOpenMenu(openMenu === label ? null : label)
    }

    const handleItemClick = (item: MenuItem) => {
        if (item.disabled || item.separator) return
        item.action?.()
        setOpenMenu(null)
    }

    return (
        <div ref={menuRef} className="flex items-center gap-1">
            {menus.map((menu) => (
                <div key={menu.label} className="relative">
                    <button
                        className={`px-2 py-1 text-xs font-medium rounded-sm transition-colors ${openMenu === menu.label
                            ? 'bg-primary/20 text-white'
                            : 'text-text-secondary hover:text-white hover:bg-panel-dark'
                            }`}
                        onClick={() => handleMenuClick(menu.label)}
                        onMouseEnter={() => openMenu && setOpenMenu(menu.label)}
                    >
                        {menu.label}
                    </button>

                    {/* Dropdown */}
                    {openMenu === menu.label && (
                        <div className="absolute top-full left-0 mt-1 min-w-[200px] bg-surface-dark border border-border-dark rounded-md shadow-xl z-50 py-1">
                            {menu.items.map((item, idx) =>
                                item.separator ? (
                                    <div key={idx} className="h-px bg-border-dark my-1 mx-2" />
                                ) : (
                                    <button
                                        key={item.label}
                                        className={`w-full flex items-center justify-between px-3 py-1.5 text-xs transition-colors ${item.disabled
                                            ? 'text-text-secondary/50 cursor-not-allowed'
                                            : 'text-white hover:bg-primary/20'
                                            }`}
                                        onClick={() => handleItemClick(item)}
                                        disabled={item.disabled}
                                    >
                                        <span>{item.label}</span>
                                        {item.shortcut && (
                                            <span className="text-text-secondary text-[10px] font-mono ml-4">
                                                {item.shortcut}
                                            </span>
                                        )}
                                    </button>
                                )
                            )}
                        </div>
                    )}
                </div>
            ))}
        </div>
    )
}

