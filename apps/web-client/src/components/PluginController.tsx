/**
 * PluginController - Auto-generated UI for plugin parameters
 * Dynamically renders controls based on the PluginSpec.
 */
import { useState, useCallback, useEffect } from 'react'
import type { PluginSpec, PluginParam, FloatParam, IntParam, RangeParam, SelectParam, BoolParam } from '@/types/plugin'
import { useRunPlugin } from '@/hooks/usePlugins'
import { useAppStore } from '@/store/appStore'

interface PluginControllerProps {
    spec: PluginSpec
    onClose?: () => void
}

export function PluginController({ spec, onClose: _onClose }: PluginControllerProps) {
    const { activeImageId, images } = useAppStore()
    const { mutate: runPlugin, isPending, isError, error } = useRunPlugin()

    // Initialize parameter values from defaults
    const [params, setParams] = useState<Record<string, unknown>>(() => {
        const initial: Record<string, unknown> = {}
        spec.params.forEach((param) => {
            if (param.type === 'range') {
                initial[`${param.name}_low`] = param.default_low
                initial[`${param.name}_high`] = param.default_high
            } else {
                initial[param.name] = param.default
            }
        })
        return initial
    })

    // Reset params when spec changes
    useEffect(() => {
        const initial: Record<string, unknown> = {}
        spec.params.forEach((param) => {
            if (param.type === 'range') {
                initial[`${param.name}_low`] = param.default_low
                initial[`${param.name}_high`] = param.default_high
            } else {
                initial[param.name] = param.default
            }
        })
        setParams(initial)
    }, [spec.name])

    const updateParam = useCallback((name: string, value: unknown) => {
        setParams((prev) => ({ ...prev, [name]: value }))
    }, [])

    const handleApply = useCallback(() => {
        if (!activeImageId) return

        // Find the current image
        const currentImage = images.find(img => img.id === activeImageId)
        if (!currentImage) return

        // Push current state to history before applying new filter (enables undo)
        const { pushToHistory } = useAppStore.getState()
        pushToHistory({
            imageId: currentImage.id,
            url: currentImage.url,
            thumbnailUrl: currentImage.thumbnailUrl,
            name: currentImage.name,
        })

        // Use current active image (enables stacking edits)
        runPlugin({
            image_id: activeImageId,
            plugin_name: spec.name,
            params,
        })
    }, [activeImageId, images, spec.name, params, runPlugin])


    return (
        <div className="p-3 bg-surface-dark space-y-4 border-t border-border-dark">
            {/* Header */}
            <div className="flex justify-between items-center">
                <span className="text-xs text-primary font-medium">
                    Active: {spec.display_name}
                </span>
                <span
                    className="material-symbols-outlined text-text-secondary text-[14px] cursor-pointer hover:text-white"
                    title={spec.description}
                >
                    info
                </span>
            </div>

            {/* Dynamic Parameters */}
            {spec.params.map((param) => (
                <ParameterControl
                    key={param.name}
                    param={param}
                    value={params[param.name]}
                    valueLow={params[`${param.name}_low`]}
                    valueHigh={params[`${param.name}_high`]}
                    onChange={updateParam}
                />
            ))}

            {/* Error Display */}
            {isError && (
                <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-sm px-2 py-1">
                    {error?.message || 'Execution failed'}
                </div>
            )}

            {/* Apply Button */}
            <button
                onClick={handleApply}
                disabled={!activeImageId || isPending}
                className="w-full bg-primary hover:bg-blue-600 text-white text-xs font-medium py-1.5 rounded-sm transition-colors mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                {isPending ? (
                    <>
                        <span className="material-symbols-outlined text-[14px] animate-spin">
                            progress_activity
                        </span>
                        Processing...
                    </>
                ) : (
                    'Apply Filter'
                )}
            </button>
        </div>
    )
}

// =============================================================================
// Parameter Control Components
// =============================================================================

interface ParameterControlProps {
    param: PluginParam
    value: unknown
    valueLow?: unknown
    valueHigh?: unknown
    onChange: (name: string, value: unknown) => void
}

function ParameterControl({ param, value, valueLow, valueHigh, onChange }: ParameterControlProps) {
    switch (param.type) {
        case 'float':
        case 'int':
            return <SliderControl param={param} value={value as number} onChange={onChange} />
        case 'range':
            return (
                <RangeControl
                    param={param}
                    valueLow={valueLow as number}
                    valueHigh={valueHigh as number}
                    onChange={onChange}
                />
            )
        case 'select':
            return <SelectControl param={param} value={value as string} onChange={onChange} />
        case 'bool':
            return <BoolControl param={param} value={value as boolean} onChange={onChange} />
        default:
            return null
    }
}

// =============================================================================
// Slider Control (Float/Int) - Progress bar style
// =============================================================================

interface SliderControlProps {
    param: FloatParam | IntParam
    value: number
    onChange: (name: string, value: number) => void
}

function SliderControl({ param, value, onChange }: SliderControlProps) {
    if (value === undefined || value === null) return null
    const displayValue = param.type === 'float' ? value.toFixed(2) : value.toString()

    // Calculate progress percentage for blue fill
    const progress = ((value - param.min) / (param.max - param.min)) * 100

    return (
        <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-text-secondary uppercase">
                <span>{param.label}</span>
                <span className="font-mono text-white">{displayValue}</span>
            </div>
            {/* Wrapper with progress fill background */}
            <div className="relative h-4 flex items-center">
                <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-1 rounded-full bg-primary"
                    style={{ width: `${progress}%` }}
                />
                <div
                    className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 rounded-full bg-border-dark"
                    style={{
                        marginLeft: `${progress}%`,
                        width: `${100 - progress}%`
                    }}
                />
                <input
                    type="range"
                    min={param.min}
                    max={param.max}
                    step={param.step}
                    value={value}
                    onChange={(e) => {
                        const newValue = param.type === 'int'
                            ? parseInt(e.target.value, 10)
                            : parseFloat(e.target.value)
                        onChange(param.name, newValue)
                    }}
                    className="relative w-full z-10 appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background-dark [&::-webkit-slider-thumb]:shadow-[0_0_6px_rgba(60,131,246,0.5)] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-runnable-track]:h-1"
                    title={param.description}
                />
            </div>
        </div>
    )
}

// =============================================================================
// Range Control (Dual Slider) - Blue fill between thumbs
// =============================================================================

interface RangeControlProps {
    param: RangeParam
    valueLow: number
    valueHigh: number
    onChange: (name: string, value: number) => void
}

function RangeControl({ param, valueLow, valueHigh, onChange }: RangeControlProps) {
    // Calculate positions for the fill between thumbs
    const lowPercent = ((valueLow - param.min) / (param.max - param.min)) * 100
    const highPercent = ((valueHigh - param.min) / (param.max - param.min)) * 100

    return (
        <div className="space-y-2">
            <div className="flex justify-between text-[10px] text-text-secondary uppercase">
                <span>{param.label}</span>
                <span className="font-mono text-white">
                    {valueLow.toFixed(1)} - {valueHigh.toFixed(1)}
                </span>
            </div>
            {/* Dual slider track */}
            <div className="relative h-5 flex items-center">
                {/* Background track */}
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 rounded-full bg-border-dark" />
                {/* Blue fill between thumbs */}
                <div
                    className="absolute top-1/2 -translate-y-1/2 h-1 bg-primary rounded-full"
                    style={{
                        left: `${lowPercent}%`,
                        width: `${highPercent - lowPercent}%`
                    }}
                />
                {/* Low slider */}
                <input
                    type="range"
                    min={param.min}
                    max={param.max}
                    step={param.step}
                    value={valueLow}
                    onChange={(e) => {
                        const newVal = parseFloat(e.target.value)
                        if (newVal <= valueHigh) {
                            onChange(`${param.name}_low`, newVal)
                        }
                    }}
                    className="absolute left-0 right-0 w-full z-10 appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background-dark [&::-webkit-slider-thumb]:shadow-[0_0_4px_rgba(60,131,246,0.5)] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-runnable-track]:h-1"
                    title="Low threshold"
                />
                {/* High slider */}
                <input
                    type="range"
                    min={param.min}
                    max={param.max}
                    step={param.step}
                    value={valueHigh}
                    onChange={(e) => {
                        const newVal = parseFloat(e.target.value)
                        if (newVal >= valueLow) {
                            onChange(`${param.name}_high`, newVal)
                        }
                    }}
                    className="absolute left-0 right-0 w-full z-20 appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background-dark [&::-webkit-slider-thumb]:shadow-[0_0_4px_rgba(60,131,246,0.5)] [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-runnable-track]:h-1"
                    title="High threshold"
                />
            </div>
            {/* Min/Max labels */}
            <div className="flex justify-between text-[9px] text-text-secondary font-mono">
                <span>{param.min}</span>
                <span>{param.max}</span>
            </div>
        </div>
    )
}

// =============================================================================
// Select Control (Dropdown)
// =============================================================================

interface SelectControlProps {
    param: SelectParam
    value: string
    onChange: (name: string, value: string) => void
}

function SelectControl({ param, value, onChange }: SelectControlProps) {
    return (
        <div className="space-y-1">
            <label className="text-[10px] text-text-secondary uppercase block">
                {param.label}
            </label>
            <select
                value={value}
                onChange={(e) => onChange(param.name, e.target.value)}
                className="w-full bg-background-dark border border-border-dark rounded-sm px-2 py-1.5 text-xs text-white focus:border-primary focus:outline-none transition-colors cursor-pointer"
                title={param.description}
            >
                {param.options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    )
}

// =============================================================================
// Bool Control (Toggle Switch)
// =============================================================================

interface BoolControlProps {
    param: BoolParam
    value: boolean
    onChange: (name: string, value: boolean) => void
}

function BoolControl({ param, value, onChange }: BoolControlProps) {
    return (
        <div className="flex items-center justify-between">
            <label className="text-[10px] text-text-secondary uppercase" title={param.description}>
                {param.label}
            </label>
            <button
                type="button"
                role="switch"
                aria-checked={value}
                onClick={() => onChange(param.name, !value)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${value ? 'bg-primary' : 'bg-border-dark'
                    }`}
            >
                <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${value ? 'translate-x-5' : 'translate-x-1'
                        }`}
                />
            </button>
        </div>
    )
}
