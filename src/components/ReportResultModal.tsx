import React from 'react'
import Button from './Button'

interface ReportResultModalProps {
    isOpen: boolean
    onClose: () => void
    gameCode: number
}

const ReportResultModal: React.FC<ReportResultModalProps> = ({ isOpen, onClose, gameCode }) => {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-surface border border-white/10 rounded-xl p-8 max-w-md w-full shadow-2xl transform transition-all scale-100">
                <h2 className="text-2xl font-bold text-white mb-4">Game Finished</h2>
                <p className="text-gray-300 mb-6">
                    The game process has exited (Code: {gameCode}). Please report the result of the match.
                </p>

                <div className="space-y-3 mb-8">
                    <button className="w-full p-4 bg-green-500/10 border border-green-500/30 rounded-lg hover:bg-green-500/20 transition-colors text-left flex items-center gap-3">
                        <span className="text-2xl">🏆</span>
                        <div>
                            <div className="font-bold text-green-400">Victory</div>
                            <div className="text-xs text-gray-400">I won the match</div>
                        </div>
                    </button>

                    <button className="w-full p-4 bg-red-500/10 border border-red-500/30 rounded-lg hover:bg-red-500/20 transition-colors text-left flex items-center gap-3">
                        <span className="text-2xl">💀</span>
                        <div>
                            <div className="font-bold text-red-400">Defeat</div>
                            <div className="text-xs text-gray-400">I lost the match</div>
                        </div>
                    </button>
                </div>

                <div className="flex justify-end gap-3">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button variant="primary" onClick={onClose}>Submit Result</Button>
                </div>
            </div>
        </div>
    )
}

export default ReportResultModal
