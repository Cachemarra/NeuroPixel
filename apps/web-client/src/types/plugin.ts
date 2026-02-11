/**
 * Plugin Specification Types
 * Mirrors the backend Pydantic models for the plugin system.
 */

// =============================================================================
// Parameter Types
// =============================================================================

export interface BaseParam {
    name: string
    label: string
    description?: string
}

export interface FloatParam extends BaseParam {
    type: 'float'
    default: number
    min: number
    max: number
    step: number
}

export interface IntParam extends BaseParam {
    type: 'int'
    default: number
    min: number
    max: number
    step: number
}

export interface BoolParam extends BaseParam {
    type: 'bool'
    default: boolean
}

export interface SelectOption {
    value: string
    label: string
}

export interface SelectParam extends BaseParam {
    type: 'select'
    default: string
    options: SelectOption[]
}

export interface RangeParam extends BaseParam {
    type: 'range'
    default_low: number
    default_high: number
    min: number
    max: number
    step: number
}

export type PluginParam = FloatParam | IntParam | BoolParam | SelectParam | RangeParam

// =============================================================================
// Plugin Specification
// =============================================================================

export interface PluginSpec {
    name: string
    display_name: string
    description: string
    category: string
    icon: string
    params: PluginParam[]
}

// =============================================================================
// API Response Types
// =============================================================================

export interface PluginListResponse {
    plugins: PluginSpec[]
    categories: Record<string, string[]>
}

export interface PluginRunRequest {
    image_id: string
    plugin_name: string
    params: Record<string, unknown>
}

export interface PluginRunResponse {
    success: boolean
    result_id: string
    result_url: string
    thumbnail_url?: string
    execution_time_ms: number
    plugin_name: string
    params_used: Record<string, unknown>
}

// =============================================================================
// Node Graph Socket Types
// =============================================================================

export type SocketType = 'image' | 'mask' | 'number' | 'string' | 'any'

export interface NodeInput {
    name: string
    type: SocketType
    label: string
    required?: boolean
}

export interface NodeOutput {
    name: string
    type: SocketType
    label: string
}
