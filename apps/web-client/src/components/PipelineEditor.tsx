/**
 * PipelineEditor - Functional pipeline step editor
 * Phase 5: Refactored from static mockup to dynamic step-list editor
 */

import { useState } from 'react'
import { useAppStore, PipelineStep } from '@/store/appStore'
import { usePluginsByCategory } from '@/hooks/usePlugins'
import type { PluginSpec, PluginParam, SelectOption } from '@/types/plugin'

export function PipelineEditor() {
    const {
        isPipelineEditorOpen,
        closePipelineEditor,
        pipelineSteps,
        addPipelineStep,
        removePipelineStep,
        updatePipelineStep,
        reorderPipelineSteps,
        clearPipeline,
        openBatchModal,
        images,
    } = useAppStore()

    const { categories, isLoading: pluginsLoading } = usePluginsByCategory()
    const [addStepDropdownOpen, setAddStepDropdownOpen] = useState(false)
    const [expandedStepId, setExpandedStepId] = useState<string | null>(null)

    // Flatten all plugins for selection
    const allPlugins = Object.values(categories).flat()

    const handleAddStep = (plugin: PluginSpec) => {
        const newStep: PipelineStep = {
            id: crypto.randomUUID(),
            pluginName: plugin.name,
            params: getDefaultParams(plugin),
            active: true,
        }
        addPipelineStep(newStep)
        setAddStepDropdownOpen(false)
        setExpandedStepId(newStep.id)
    }

    const handleToggleActive = (stepId: string, active: boolean) => {
        updatePipelineStep(stepId, { active })
    }

    const handleParamChange = (stepId: string, paramName: string, value: any) => {
        const step = pipelineSteps.find((s) => s.id === stepId)
        if (step) {
            updatePipelineStep(stepId, {
                params: { ...step.params, [paramName]: value },
            })
        }
    }

    const handleMoveStep = (index: number, direction: 'up' | 'down') => {
        const newIndex = direction === 'up' ? index - 1 : index + 1
        if (newIndex >= 0 && newIndex < pipelineSteps.length) {
            reorderPipelineSteps(index, newIndex)
        }
    }

    const handleRunBatch = () => {
        if (pipelineSteps.length === 0 || images.length === 0) return
        openBatchModal()
    }

    const handleSavePreset = () => {
        const preset = JSON.stringify(pipelineSteps, null, 2)
        const blob = new Blob([preset], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'pipeline_preset.json'
        a.click()
        URL.revokeObjectURL(url)
    }

    const handleLoadPreset = () => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.json'
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0]
            if (!file) return

            try {
                const text = await file.text()
                const loadedSteps = JSON.parse(text) as PipelineStep[]
                clearPipeline()
                loadedSteps.forEach((step) => {
                    addPipelineStep({ ...step, id: crypto.randomUUID() })
                })
            } catch (err) {
                console.error('Failed to load preset:', err)
            }
        }
        input.click()
    }

    if (!isPipelineEditorOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 lg:p-10">
            {/* Main Modal Window */}
            <div className="flex flex-col w-full h-full max-w-[1000px] max-h-[700px] bg-surface-dark border border-border-dark rounded-lg shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex flex-shrink-0 items-center justify-between border-b border-border-dark bg-panel-dark px-6 py-4">
                    <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-primary text-2xl">hub</span>
                            <h1 className="text-xl font-bold tracking-tight text-white">Pipeline Configuration</h1>
                        </div>
                        <p className="text-text-secondary text-xs font-mono ml-9">
                            {pipelineSteps.length} steps configured
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Add Step Button */}
                        <div className="relative">
                            <button
                                onClick={() => setAddStepDropdownOpen(!addStepDropdownOpen)}
                                className="flex items-center gap-2 bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded text-sm font-semibold transition-colors"
                            >
                                <span className="material-symbols-outlined text-[20px]">add_circle</span>
                                <span>Add Step</span>
                            </button>

                            {/* Plugin Selection Dropdown */}
                            {addStepDropdownOpen && (
                                <div className="absolute top-full right-0 mt-2 w-64 bg-surface-dark border border-border-dark rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto">
                                    {pluginsLoading ? (
                                        <div className="p-4 text-center">
                                            <span className="material-symbols-outlined animate-spin text-text-secondary">progress_activity</span>
                                        </div>
                                    ) : (
                                        Object.entries(categories).map(([category, plugins]) => (
                                            <div key={category}>
                                                <div className="px-3 py-2 text-[10px] font-bold uppercase text-text-secondary bg-panel-dark sticky top-0">
                                                    {category}
                                                </div>
                                                {plugins.map((plugin) => (
                                                    <button
                                                        key={plugin.name}
                                                        onClick={() => handleAddStep(plugin)}
                                                        className="w-full px-3 py-2 text-left text-sm text-white hover:bg-primary/20 transition-colors"
                                                    >
                                                        {plugin.display_name}
                                                    </button>
                                                ))}
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>

                        <button
                            className="ml-4 p-2 text-text-secondary hover:text-white transition-colors"
                            onClick={closePipelineEditor}
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>

                {/* Step List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {pipelineSteps.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <span className="material-symbols-outlined text-6xl text-text-secondary/30">layers</span>
                            <p className="text-text-secondary mt-4">No steps configured</p>
                            <p className="text-text-secondary/60 text-sm mt-1">Click "Add Step" to begin building your pipeline</p>
                        </div>
                    ) : (
                        pipelineSteps.map((step, index) => {
                            const plugin = allPlugins.find((p) => p.name === step.pluginName)
                            const isExpanded = expandedStepId === step.id

                            return (
                                <div
                                    key={step.id}
                                    className={`rounded-lg border transition-all ${step.active
                                        ? 'bg-surface-dark border-border-dark'
                                        : 'bg-surface-dark/50 border-border-dark/50 opacity-60'
                                        } ${isExpanded ? 'ring-1 ring-primary/30' : ''}`}
                                >
                                    {/* Step Header */}
                                    <div
                                        className="flex items-center justify-between px-4 py-3 cursor-pointer"
                                        onClick={() => setExpandedStepId(isExpanded ? null : step.id)}
                                    >
                                        <div className="flex items-center gap-3">
                                            {/* Step Number */}
                                            <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">
                                                {index + 1}
                                            </span>

                                            {/* Plugin Name */}
                                            <span className="text-white font-medium">
                                                {plugin?.display_name || step.pluginName}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {/* Active Toggle */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleToggleActive(step.id, !step.active)
                                                }}
                                                className={`p-1 rounded transition-colors ${step.active ? 'text-green-500' : 'text-text-secondary'
                                                    }`}
                                                title={step.active ? 'Disable step' : 'Enable step'}
                                            >
                                                <span className="material-symbols-outlined text-[18px]">
                                                    {step.active ? 'check_circle' : 'cancel'}
                                                </span>
                                            </button>

                                            {/* Move Up */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleMoveStep(index, 'up')
                                                }}
                                                disabled={index === 0}
                                                className="p-1 text-text-secondary hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
                                            </button>

                                            {/* Move Down */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleMoveStep(index, 'down')
                                                }}
                                                disabled={index === pipelineSteps.length - 1}
                                                className="p-1 text-text-secondary hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">arrow_downward</span>
                                            </button>

                                            {/* Delete */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    removePipelineStep(step.id)
                                                }}
                                                className="p-1 text-text-secondary hover:text-red-500 transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">delete</span>
                                            </button>

                                            {/* Expand Arrow */}
                                            <span
                                                className={`material-symbols-outlined text-text-secondary transition-transform ${isExpanded ? 'rotate-180' : ''
                                                    }`}
                                            >
                                                expand_more
                                            </span>
                                        </div>
                                    </div>

                                    {/* Parameter Controls (Expanded) */}
                                    {isExpanded && plugin && (
                                        <div className="border-t border-border-dark px-4 py-3">
                                            <PluginControllerInline
                                                spec={plugin}
                                                params={step.params}
                                                onParamChange={(name, value) => handleParamChange(step.id, name, value)}
                                            />
                                        </div>
                                    )}
                                </div>
                            )
                        })
                    )}
                </div>

                {/* Footer Action Bar */}
                <div className="flex-shrink-0 h-16 bg-panel-dark border-t border-border-dark flex items-center justify-between px-6">
                    <div className="flex items-center gap-4">
                        {pipelineSteps.length > 0 ? (
                            <>
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-green-500 text-lg">check_circle</span>
                                    <span className="text-sm text-white font-medium">
                                        {pipelineSteps.filter((s) => s.active).length} active steps
                                    </span>
                                </div>
                                <span className="h-4 w-px bg-border-dark"></span>
                                <button
                                    onClick={clearPipeline}
                                    className="text-xs text-text-secondary hover:text-red-500 transition-colors"
                                >
                                    Clear All
                                </button>
                            </>
                        ) : (
                            <span className="text-xs text-text-secondary">Add steps to create a pipeline</span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-white transition-colors"
                            onClick={closePipelineEditor}
                        >
                            Cancel
                        </button>
                        <button
                            className="px-4 py-2 text-sm font-medium text-white border border-border-dark rounded bg-surface-dark hover:bg-panel-dark transition-colors"
                            onClick={handleLoadPreset}
                        >
                            Load Preset
                        </button>
                        <button
                            className="px-4 py-2 text-sm font-medium text-white border border-border-dark rounded bg-surface-dark hover:bg-panel-dark transition-colors"
                            onClick={handleSavePreset}
                            disabled={pipelineSteps.length === 0}
                        >
                            Save Preset
                        </button>
                        <button
                            className="group flex items-center gap-2 bg-white text-black px-5 py-2 rounded text-sm font-bold hover:bg-zinc-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={handleRunBatch}
                            disabled={pipelineSteps.length === 0 || images.length === 0}
                        >
                            <span className="material-symbols-outlined text-[20px] group-hover:rotate-180 transition-transform duration-500">
                                play_arrow
                            </span>
                            <span>Run Batch...</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

// Inline plugin controller that uses external param state
function PluginControllerInline({
    spec,
    params,
    onParamChange,
}: {
    spec: PluginSpec
    params: Record<string, any>
    onParamChange: (name: string, value: any) => void
}) {
    return (
        <div className="space-y-3">
            {spec.params.map((param: PluginParam) => {
                // RangeParam has default_low/default_high instead of default
                const defaultValue = 'default' in param ? param.default : undefined
                const value = params[param.name] ?? defaultValue

                if (param.type === 'int' || param.type === 'float') {
                    return (
                        <div key={param.name} className="flex flex-col gap-1">
                            <div className="flex justify-between items-center">
                                <label className="text-xs text-text-secondary">{param.label}</label>
                                <span className="text-xs font-mono text-primary bg-primary/10 px-1.5 rounded">
                                    {param.type === 'float' ? value.toFixed(2) : value}
                                </span>
                            </div>
                            <input
                                type="range"
                                min={param.min}
                                max={param.max}
                                step={param.step ?? (param.type === 'float' ? 0.1 : 1)}
                                value={value}
                                onChange={(e) =>
                                    onParamChange(
                                        param.name,
                                        param.type === 'float' ? parseFloat(e.target.value) : parseInt(e.target.value)
                                    )
                                }
                                className="w-full accent-primary"
                            />
                        </div>
                    )
                }

                if (param.type === 'select') {
                    return (
                        <div key={param.name} className="flex flex-col gap-1">
                            <label className="text-xs text-text-secondary">{param.label}</label>
                            <select
                                value={value}
                                onChange={(e) => onParamChange(param.name, e.target.value)}
                                className="bg-background-dark border border-border-dark rounded px-2 py-1 text-xs text-white"
                            >
                                {param.options?.map((opt: SelectOption) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )
                }

                if (param.type === 'bool') {
                    return (
                        <div key={param.name} className="flex items-center justify-between">
                            <label className="text-xs text-text-secondary">{param.label}</label>
                            <input
                                type="checkbox"
                                checked={value}
                                onChange={(e) => onParamChange(param.name, e.target.checked)}
                                className="accent-primary"
                            />
                        </div>
                    )
                }

                return null
            })}
        </div>
    )
}

// Helper to get default params from a plugin spec
function getDefaultParams(plugin: PluginSpec): Record<string, any> {
    const params: Record<string, any> = {}
    for (const param of plugin.params) {
        // Handle RangeParam differently
        if ('default' in param) {
            params[param.name] = param.default
        } else if (param.type === 'range') {
            params[param.name] = [param.default_low, param.default_high]
        }
    }
    return params
}
