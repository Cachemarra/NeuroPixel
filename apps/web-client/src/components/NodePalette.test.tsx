import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { NodePalette } from './NodePalette'

// Mock dependencies
vi.mock('@/store/appStore', () => ({
    useAppStore: () => ({
        addNode: vi.fn(),
        pipelineNodes: [],
    }),
}))

vi.mock('@/hooks/usePlugins', () => ({
    usePluginsByCategory: () => ({
        categories: {},
        isLoading: false,
    }),
}))

describe('NodePalette Accessibility', () => {
    const defaultProps = {
        isOpen: true,
        onClose: vi.fn(),
    }

    it('has accessible structure', () => {
        render(<NodePalette {...defaultProps} />)

        // 1. Should have dialog role
        // Current implementation is just a div, so this should fail
        // Using queryByRole + expect to check failure in step 5
        expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('has accessible search input', () => {
        render(<NodePalette {...defaultProps} />)

        // 2. Search input should have a label
        // Currently it only has placeholder
        expect(screen.getByRole('textbox', { name: 'Search nodes' })).toBeInTheDocument()
    })

    it('has accessible close button', () => {
        render(<NodePalette {...defaultProps} />)

        // 3. Close button should have specific label
        // Currently it relies on the "close" text ligature which is vague/visual
        expect(screen.getByRole('button', { name: 'Close node palette' })).toBeInTheDocument()
    })
})
