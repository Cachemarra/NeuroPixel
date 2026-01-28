/**
 * OperatorNode - Node wrapper for image processing plugins
 */

import { memo } from 'react'
import { BaseNode } from './BaseNode'
import { useAppStore } from '@/store/appStore'
import type { OperatorNodeData } from '@/types/nodeGraph'
import type { PluginParam, SelectOption } from '@/types/plugin'

interface OperatorNodeProps {
    id: string
    data: OperatorNodeData
    selected?: boolean
}

function OperatorNodeComponent({ id, data, selected }: OperatorNodeProps) {
    const { updateNodeData } = useAppStore()
    const { pluginSpec, params } = data

    const handleParamChange = (paramName: string, value: unknown) => {
        updateNodeData(id, {
            params: { ...params, [paramName]: value },
        })
    }

    // Render parameter control based on type
    const renderParamControl = (param: PluginParam) => {
        const value = params[param.name] ?? ('default' in param ? param.default : undefined)

        if (param.type === 'int' || param.type === 'float') {
            return (
                <div key={param.name} className="space-y-1">
                    <div className="flex justify-between items-center">
                        <label className="text-[10px] text-text-secondary">
                            {param.label}
                        </label>
                        <span className="text-[10px] font-mono text-primary bg-primary/10 px-1 rounded">
                            {param.type === 'float' ? Number(value ?? 0).toFixed(2) : String(value ?? 0)}
                        </span>
                    </div>
                    <input
                        type="range"
                        min={param.min}
                        max={param.max}
                        step={param.step ?? (param.type === 'float' ? 0.1 : 1)}
                        value={value as number}
                        onChange={(e) =>
                            handleParamChange(
                                param.name,
                                param.type === 'float'
                                    ? parseFloat(e.target.value)
                                    : parseInt(e.target.value)
                            )
                        }
                        className="w-full h-1"
                    />
                </div>
            )
        }

        if (param.type === 'select') {
            return (
                <div key={param.name} className="space-y-1">
                    <label className="text-[10px] text-text-secondary">
                        {param.label}
                    </label>
                    <select
                        value={value as string}
                        onChange={(e) => handleParamChange(param.name, e.target.value)}
                        className="w-full bg-background-dark border border-border-dark rounded px-2 py-1 text-[11px] text-white"
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
                    <label className="text-[10px] text-text-secondary">
                        {param.label}
                    </label>
                    <input
                        type="checkbox"
                        checked={value as boolean}
                        onChange={(e) => handleParamChange(param.name, e.target.checked)}
                        className="accent-primary w-4 h-4"
                    />
                </div>
            )
        }

        return null
    }

    return (
        <BaseNode id={id} data={data} selected={selected} headerColor="bg-indigo-600">
            <div className="space-y-2">
                {/* Plugin Description */}
                {pluginSpec?.description && (
                    <p className="text-[10px] text-text-secondary/70 leading-tight">
                        {pluginSpec.description}
                    </p>
                )}

                {/* Parameters */}
                {pluginSpec?.params && pluginSpec.params.length > 0 && (
                    <div className="space-y-2 pt-1 border-t border-border-dark/50">
                        {pluginSpec.params.map(renderParamControl)}
                    </div>
                )}
            </div>
        </BaseNode>
    )
}

export const OperatorNode = memo(OperatorNodeComponent)
