import React, { useState, useEffect } from 'react'
import Button from './Button'

interface UCPSetupGuideProps {
    onClose?: () => void
}

const UCPSetupGuide: React.FC<UCPSetupGuideProps> = ({ onClose }) => {
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        const hasSeenGuide = localStorage.getItem('ucp_setup_guide_seen')
        if (!hasSeenGuide) {
            setIsVisible(true)
        }
    }, [])

    const handleDismiss = () => {
        localStorage.setItem('ucp_setup_guide_seen', 'true')
        setIsVisible(false)
        if (onClose) onClose()
    }

    if (!isVisible) return null

    return (
        <div className="relative overflow-hidden bg-surface/40 backdrop-blur-xl border border-primary/20 rounded-2xl p-6 mb-6 group animate-in fade-in slide-in-from-top-4 duration-500">
            {/* Background Glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 blur-[80px] rounded-full group-hover:bg-primary/20 transition-all duration-700" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/10 blur-[80px] rounded-full group-hover:bg-blue-500/20 transition-all duration-700" />

            <div className="relative flex flex-col md:flex-row gap-6 items-start">
                <div className="flex-shrink-0 p-3 bg-primary/10 rounded-xl border border-primary/20 text-3xl">
                    🛡️
                </div>

                <div className="flex-grow space-y-3">
                    <div className="flex justify-between items-start">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            UCP3 Recommended Setup
                            <span className="text-[10px] px-2 py-0.5 bg-primary/20 text-primary border border-primary/30 rounded-full font-bold uppercase tracking-wider">
                                Important
                            </span>
                        </h3>
                        <button
                            onClick={handleDismiss}
                            className="p-1 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-all text-xl leading-none"
                        >
                            ×
                        </button>
                    </div>

                    <p className="text-gray-400 text-sm leading-relaxed max-w-2xl">
                        To ensure full compatibility and all modern features, we strongly recommend installing the official
                        <span className="text-white font-medium mx-1">UCP3 GUI</span>.
                        It correctly initializes all core dependencies and manages the foundation for modded play.
                    </p>

                    <div className="flex flex-wrap gap-3 pt-2">
                        <Button
                            variant="primary"
                            className="flex items-center gap-2 px-6 shadow-lg shadow-primary/20"
                            onClick={() => window.open('https://github.com/UnofficialCrusaderPatch/UnofficialCrusaderPatch/releases/download/alpha-v1.0.14/UCP3-GUI_1.0.14_x64-setup.exe', '_blank')}
                        >
                            <span>📥</span>
                            Download UCP3 GUI
                        </Button>

                        <Button
                            variant="outline"
                            className="flex items-center gap-2 border-white/10 hover:border-white/20 text-gray-300 hover:text-white"
                            onClick={() => window.open('https://unofficialcrusaderpatch.com/', '_blank')}
                        >
                            <span>🌐</span>
                            Official Website
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default UCPSetupGuide
