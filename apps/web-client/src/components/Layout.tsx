import { ReactNode, useState, useEffect } from 'react'
import { useBackendHealth } from '@/hooks/useBackendHealth'
import { useAppStore, ViewMode } from '@/store/appStore'
import { AppMenuBar } from '@/components/AppMenuBar'

const API_BASE = 'http://localhost:8000'

interface ComputeDevice {
    id: string
    name: string
    type: 'cpu' | 'gpu'
    is_active: boolean
}

interface LayoutProps {
    children: ReactNode
}

export function Layout({ children }: LayoutProps) {
    const { isConnected, gpuActive } = useBackendHealth()
    const { activeView, setActiveView } = useAppStore()

    return (
        <div className="flex flex-col h-screen overflow-hidden">
            {/* Top Navigation Bar */}
            <Header
                isConnected={isConnected}
                gpuActive={gpuActive}
                activeView={activeView}
                setActiveView={setActiveView}
            />

            {/* Main Content */}
            <div className="flex flex-1 overflow-hidden">
                {children}
            </div>
        </div>
    )
}

interface HeaderProps {
    isConnected: boolean
    gpuActive: boolean
    activeView: ViewMode
    setActiveView: (view: ViewMode) => void
}

function Header({ isConnected, gpuActive, activeView, setActiveView }: HeaderProps) {
    const [devices, setDevices] = useState<ComputeDevice[]>([])
    const [activeDevice, setActiveDevice] = useState<string>('cpu')
    const [deviceDropdownOpen, setDeviceDropdownOpen] = useState(false)

    // Fetch devices on mount
    useEffect(() => {
        const fetchDevices = async () => {
            try {
                const response = await fetch(`${API_BASE}/system/devices`)
                if (response.ok) {
                    const data = await response.json()
                    setDevices(data.devices)
                    setActiveDevice(data.active_device)
                }
            } catch (err) {
                // Fallback to CPU only
                setDevices([{ id: 'cpu', name: 'CPU', type: 'cpu', is_active: true }])
            }
        }
        fetchDevices()
    }, [])

    const currentDevice = devices.find(d => d.id === activeDevice) || devices[0]
    const statusText = currentDevice?.type === 'gpu' ? currentDevice.name : 'CPU'
    const statusColor = isConnected && gpuActive ? 'bg-green-500' : 'bg-yellow-500'

    return (
        <header className="flex shrink-0 items-center justify-between border-b border-border-dark bg-surface-dark px-4 py-2 h-12 z-20">
            <div className="flex items-center gap-4 text-white">
                {/* Logo */}
                <div
                    className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-all active:scale-95"
                    onClick={() => setActiveView('single')}
                >
                    <div className="size-5 text-primary">
                        <svg fill="currentColor" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                            <path d="M4 4H17.3334V17.3334H30.6666V30.6666H44V44H4V4Z"></path>
                        </svg>
                    </div>
                    <h2 className="text-white text-base font-bold tracking-tight select-none">NeuroPixel</h2>
                </div>

                <div className="h-4 w-px bg-border-dark mx-2"></div>

                {/* Menu Bar */}
                <AppMenuBar />
            </div>

            <div className="flex items-center gap-4">
                {/* View Mode Switcher */}
                <div className="bg-background-dark p-1 rounded-md border border-border-dark flex gap-1">
                    <button
                        className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors ${activeView === 'single'
                            ? 'bg-primary text-white shadow-sm'
                            : 'text-text-secondary hover:text-white hover:bg-panel-dark'
                            }`}
                        onClick={() => setActiveView('single')}
                    >
                        Single
                    </button>
                    <button
                        className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors ${activeView === 'compare'
                            ? 'bg-primary text-white shadow-sm'
                            : 'text-text-secondary hover:text-white hover:bg-panel-dark'
                            }`}
                        onClick={() => setActiveView('compare')}
                    >
                        Compare
                    </button>
                    <button
                        className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors ${activeView === 'batch'
                            ? 'bg-primary text-white shadow-sm'
                            : 'text-text-secondary hover:text-white hover:bg-panel-dark'
                            }`}
                        onClick={() => setActiveView('batch')}
                    >
                        Batch
                    </button>
                    <button
                        className={`px-3 py-1 text-xs font-medium rounded-sm transition-colors ${activeView === 'pipeline'
                            ? 'bg-primary text-white shadow-sm'
                            : 'text-text-secondary hover:text-white hover:bg-panel-dark'
                            }`}
                        onClick={() => setActiveView('pipeline')}
                    >
                        Pipeline
                    </button>
                </div>

                {/* Device Selector */}
                <div className="relative">
                    <button
                        onClick={() => setDeviceDropdownOpen(!deviceDropdownOpen)}
                        className="flex items-center gap-2 text-text-secondary text-xs font-mono hover:text-white transition-colors px-2 py-1 rounded hover:bg-panel-dark"
                    >
                        <span className={`w-2 h-2 rounded-full ${statusColor}`}></span>
                        <span>{statusText}</span>
                        <span className="material-symbols-outlined text-[14px]">expand_more</span>
                    </button>

                    {/* Device Dropdown */}
                    {deviceDropdownOpen && (
                        <div className="absolute top-full right-0 mt-1 min-w-[180px] bg-surface-dark border border-border-dark rounded-md shadow-xl z-50 py-1">
                            <div className="px-3 py-1.5 text-[10px] font-bold uppercase text-text-secondary border-b border-border-dark">
                                Compute Device
                            </div>
                            {devices.map((device) => (
                                <button
                                    key={device.id}
                                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors ${device.id === activeDevice
                                        ? 'text-primary bg-primary/10'
                                        : 'text-white hover:bg-panel-dark'
                                        }`}
                                    onClick={() => {
                                        setActiveDevice(device.id)
                                        setDeviceDropdownOpen(false)
                                    }}
                                >
                                    <span className={`w-1.5 h-1.5 rounded-full ${device.type === 'gpu' ? 'bg-green-500' : 'bg-yellow-500'
                                        }`}></span>
                                    <span>{device.name}</span>
                                    {device.id === activeDevice && (
                                        <span className="material-symbols-outlined text-[14px] ml-auto">check</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* User Avatar */}
                <div
                    className="bg-center bg-no-repeat bg-cover rounded-full size-8 border border-border-dark bg-panel-dark flex items-center justify-center"
                >
                    <span className="material-symbols-outlined text-text-secondary text-base">person</span>
                </div>
            </div>
        </header>
    )
}
