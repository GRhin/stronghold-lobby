import React, { useState } from 'react'
import Button from './Button'
import { socket } from '../socket'

interface Player {
    id: string
    name: string
    isHost: boolean
}

interface ReportResultModalProps {
    isOpen: boolean
    onClose: () => void
    lobbyId: string
    players: Player[]
}

const ReportResultModal: React.FC<ReportResultModalProps> = ({ isOpen, onClose, lobbyId, players = [] }) => {
    const [winnerId, setWinnerId] = useState<string>('')
    const [loserId, setLoserId] = useState<string>('')

    if (!isOpen) return null

    const handleSubmit = () => {
        if (!winnerId) {
            alert('Please select a winner')
            return
        }

        let finalLoserId = loserId

        // If only 2 players, infer loser
        if (players.length === 2) {
            const loser = players.find(p => p.id !== winnerId)
            if (loser) finalLoserId = loser.id
        }

        if (!finalLoserId) {
            alert('Please select a loser')
            return
        }

        if (winnerId === finalLoserId) {
            alert('Winner and Loser cannot be the same person')
            return
        }

        socket.emit('game:report_result', {
            lobbyId,
            winnerId,
            loserId: finalLoserId
        })
        onClose()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-surface border border-white/10 rounded-xl p-8 max-w-md w-full shadow-2xl transform transition-all scale-100">
                <h2 className="text-2xl font-bold text-white mb-4">Report Game Result</h2>
                <p className="text-gray-300 mb-6">
                    Please report the result of the match to update Elo ratings.
                </p>

                <div className="space-y-4 mb-8">
                    <div>
                        <label className="block text-sm font-bold text-gray-400 mb-2">Winner</label>
                        <select
                            className="w-full bg-black/30 border border-white/10 rounded px-4 py-2 text-white focus:outline-none focus:border-primary"
                            value={winnerId}
                            onChange={(e) => setWinnerId(e.target.value)}
                        >
                            <option value="">Select Winner</option>
                            {players.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    {players.length > 2 && (
                        <div>
                            <label className="block text-sm font-bold text-gray-400 mb-2">Loser</label>
                            <select
                                className="w-full bg-black/30 border border-white/10 rounded px-4 py-2 text-white focus:outline-none focus:border-primary"
                                value={loserId}
                                onChange={(e) => setLoserId(e.target.value)}
                            >
                                <option value="">Select Loser</option>
                                {players.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button variant="primary" onClick={handleSubmit}>Submit Result</Button>
                </div>
            </div>
        </div>
    )
}

export default ReportResultModal
