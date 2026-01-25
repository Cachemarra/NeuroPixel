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

export function PluginController({ spec, onClose }: PluginControllerProps) {
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

        // Find the current image to check if it's a result
        const currentImage = images.find(img => img.id === activeImageId)
        // Always use the original source to avoid recursion/stacking
        const inputImageId = currentImage?.sourceId || activeImageId

        runPlugin({
            image_id: inputImageId,
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
// Slider Control (Float/Int)
// =============================================================================

interface SliderControlProps {
    param: FloatParam | IntParam
    value: number
    onChange: (name: string, value: number) => void
}

function SliderControl({ param, value, onChange }: SliderControlProps) {
    const displayValue = param.type === 'float' ? value.toFixed(2) : value.toString()

    return (
        <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-text-secondary uppercase">
                <span>{param.label}</span>
                <span className="font-mono text-white">{displayValue}</span>
            </div>
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
                className="h-1 bg-border-dark rounded-lg appearance-none cursor-pointer w-full"
                title={param.description}
            />
        </div>
    )
}

// =============================================================================
// Range Control (Dual Slider)
// =============================================================================

interface RangeControlProps {
    param: RangeParam
    valueLow: number
    valueHigh: number
    onChange: (name: string, value: number) => void
}

function RangeControl({ param, valueLow, valueHigh, onChange }: RangeControlProps) {
    return (
        <div className="space-y-2">
            <div className="text-[10px] text-text-secondary uppercase">{param.label}</div>
            <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-text-secondary">
                        <span>Low</span>
                        <span className="font-mono text-white">{valueLow.toFixed(2)}</span>
                    </div>
                    <input
                        type="range"
                        min={param.min}
                        max={param.max}
                        step={param.step}
                        value={valueLow}
                        onChange={(e) => onChange(`${param.name}_low`, parseFloat(e.target.value))}
                        className="h-1 bg-border-dark rounded-lg appearance-none cursor-pointer w-full"
                    />
                </div>
                <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-text-secondary">
                        <span>High</span>
                        <span className="font-mono text-white">{valueHigh.toFixed(2)}</span>
                    </div>
                    <input
                        type="range"
                        min={param.min}
                        max={param.max}
                        step={param.step}
                        value={valueHigh}
                        onChange={(e) => onChange(`${param.name}_high`, parseFloat(e.target.value))}
                        className="h-1 bg-border-dark rounded-lg appearance-none cursor-pointer w-full"
                    />
                </div>
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
