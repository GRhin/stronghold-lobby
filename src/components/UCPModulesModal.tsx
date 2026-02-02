import React from 'react'

interface UCPModule {
    name: string
    version: string
    type: 'module' | 'plugin'
    size?: number
}

interface UCPModulesModalProps {
    isOpen: boolean
    onClose: () => void
    modules: UCPModule[]
}

const UCPModulesModal: React.FC<UCPModulesModalProps> = ({ isOpen, onClose, modules }) => {
    if (!isOpen) return null

    const modulesList = modules.filter(m => m.type === 'module')
    const pluginsList = modules.filter(m => m.type === 'plugin')

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-surface border border-white/10 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="p-6 border-b border-white/10">
                    <h2 className="text-2xl font-bold text-white mb-1">🎮 Custom UCP Configuration</h2>
                    <p className="text-gray-400 text-sm">Modules and plugins installed in this lobby</p>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {modules.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            No UCP modules detected
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Modules */}
                            {modulesList.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-bold text-primary mb-3 flex items-center gap-2">
                                        <span className="text-xl">📦</span>
                                        Modules ({modulesList.length})
                                    </h3>
                                    <div className="space-y-2">
                                        {modulesList.map((mod, idx) => (
                                            <div key={idx} className="bg-black/30 border border-white/5 rounded-lg p-3 hover:border-primary/30 transition-colors">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-bold text-white">{mod.name}</p>
                                                        <p className="text-sm text-gray-400">Version {mod.version}</p>
                                                    </div>
                                                    {mod.size && (
                                                        <span className="text-xs text-gray-500 bg-black/50 px-2 py-1 rounded">
                                                            {(mod.size / 1024 / 1024).toFixed(2)} MB
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Plugins */}
                            {pluginsList.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-bold text-primary mb-3 flex items-center gap-2">
                                        <span className="text-xl">🔌</span>
                                        Plugins ({pluginsList.length})
                                    </h3>
                                    <div className="space-y-2">
                                        {pluginsList.map((plugin, idx) => (
                                            <div key={idx} className="bg-black/30 border border-white/5 rounded-lg p-3 hover:border-primary/30 transition-colors">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-bold text-white">{plugin.name}</p>
                                                        <p className="text-sm text-gray-400">Version {plugin.version}</p>
                                                    </div>
                                                    {plugin.size && (
                                                        <span className="text-xs text-gray-500 bg-black/50 px-2 py-1 rounded">
                                                            {(plugin.size / 1024 / 1024).toFixed(2)} MB
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/10 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-primary text-black font-bold rounded-lg hover:bg-primary/80 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}

export default UCPModulesModal
