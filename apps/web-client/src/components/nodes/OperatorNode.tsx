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

        if (param.type === 'int' || param.type === 'float') {
            const currentValue = Number(params[param.name] ?? param.default ?? 0)
            return (
                <div key={param.name} className="space-y-1">
                    <div className="flex justify-between items-center">
                        <label className="text-[10px] text-text-secondary">
                            {param.label}
                        </label>
                        <span className="text-[10px] font-mono text-primary bg-primary/10 px-1 rounded">
                            {param.type === 'float' ? Number(currentValue).toFixed(2) : String(currentValue)}
                        </span>
                    </div>
                    <input
                        type="range"
                        min={param.min}
                        max={param.max}
                        step={param.step ?? (param.type === 'float' ? 0.1 : 1)}
                        value={currentValue}
                        onChange={(e) => {
                            e.stopPropagation()
                            const newValue = param.type === 'float'
                                ? parseFloat(e.target.value)
                                : parseInt(e.target.value, 10)
                            handleParamChange(param.name, newValue)
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="w-full h-1 nodrag nopan"
                    />
                </div>
            )
        }

        if (param.type === 'select') {
            const currentValue = (params[param.name] ?? param.default ?? '') as string
            return (
                <div key={param.name} className="space-y-1">
                    <label className="text-[10px] text-text-secondary">
                        {param.label}
                    </label>
                    <select
                        value={currentValue}
                        onChange={(e) => handleParamChange(param.name, e.target.value)}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="w-full bg-background-dark border border-border-dark rounded px-2 py-1 text-[11px] text-white nodrag"
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
            const currentValue = (params[param.name] ?? param.default ?? false) as boolean
            return (
                <div key={param.name} className="flex items-center justify-between">
                    <label className="text-[10px] text-text-secondary">
                        {param.label}
                    </label>
                    <input
                        type="checkbox"
                        checked={currentValue}
                        onChange={(e) => handleParamChange(param.name, e.target.checked)}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="accent-primary w-4 h-4 nodrag"
                    />
                </div>
            )
        }

        return null
    }

    const handleToggleCollapse = () => {
        updateNodeData(id, { collapsed: !data.collapsed })
    }

    return (
        <BaseNode id={id} data={data} selected={selected} headerColor="bg-indigo-600" onToggleCollapse={handleToggleCollapse}>
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
