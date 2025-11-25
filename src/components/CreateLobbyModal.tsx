import React, { useState } from 'react'
import Button from './Button'

interface CreateLobbyModalProps {
    isOpen: boolean
    onClose: () => void
    onCreate: (name: string, isRated: boolean) => void
    defaultName?: string
}

const CreateLobbyModal: React.FC<CreateLobbyModalProps> = ({ isOpen, onClose, onCreate, defaultName = '' }) => {
    const [lobbyName, setLobbyName] = useState<string>(defaultName)
    const [isRated, setIsRated] = useState<boolean>(false)

    if (!isOpen) return null

    const handleSubmit = () => {
        if (!lobbyName.trim()) {
            alert('Please enter a lobby name')
            return
        }

        onCreate(lobbyName, isRated)
        onClose()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-surface border border-white/10 rounded-xl p-8 max-w-md w-full shadow-2xl transform transition-all scale-100">
                <h2 className="text-2xl font-bold text-white mb-4">Create Lobby</h2>
                <p className="text-gray-300 mb-6">
                    Set up your lobby and invite players to join your kingdom.
                </p>

                <div className="space-y-4 mb-8">
                    <div>
                        <label className="block text-sm font-bold text-gray-400 mb-2">Lobby Name</label>
                        <input
                            type="text"
                            className="w-full bg-black/30 border border-white/10 rounded px-4 py-2 text-white focus:outline-none focus:border-primary"
                            value={lobbyName}
                            onChange={(e) => setLobbyName(e.target.value)}
                            placeholder="Enter lobby name"
                            autoFocus
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            id="isRated"
                            className="w-4 h-4 bg-black/30 border border-white/10 rounded focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                            checked={isRated}
                            onChange={(e) => setIsRated(e.target.checked)}
                        />
                        <label htmlFor="isRated" className="text-sm font-bold text-gray-400 cursor-pointer select-none">
                            Ranked Match <span className="text-xs text-gray-500">(Affects Elo ratings)</span>
                        </label>
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button variant="primary" onClick={handleSubmit}>Create Lobby</Button>
                </div>
            </div>
        </div>
    )
}

export default CreateLobbyModal
