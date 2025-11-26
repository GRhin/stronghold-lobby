import React, { useState } from 'react'
import Button from './Button'

/**
 * Props for the CreateLobbyModal component
 */
interface CreateLobbyModalProps {
    isOpen: boolean                                     // Controls modal visibility
    onClose: () => void                                 // Callback when modal is closed
    onCreate: (name: string, isRated: boolean) => void  // Callback when lobby is created with name and rated status
    defaultName?: string                                // Optional default lobby name
}

/**
 * CreateLobbyModal component provides a styled modal for creating a new lobby
 * Matches the design of ReportResultModal for consistency
 * 
 * @param isOpen - Controls whether the modal is visible
 * @param onClose - Function to call when closing the modal
 * @param onCreate - Function to call when creating the lobby
 * @param defaultName - Optional default name for the lobby
 */
const CreateLobbyModal: React.FC<CreateLobbyModalProps> = ({ isOpen, onClose, onCreate, defaultName = '' }) => {
    // State for lobby name input (initialized with defaultName)
    const [lobbyName, setLobbyName] = useState<string>(defaultName)

    // State for ranked checkbox (defaults to false/unranked)
    const [isRated, setIsRated] = useState<boolean>(false)

    // Don't render anything if modal is not open
    if (!isOpen) return null

    /**
     * Handles form submission when user clicks "Create Lobby"
     * Validates lobby name and calls onCreate callback
     */
    const handleSubmit = () => {
        // Validate that lobby name is not empty
        if (!lobbyName.trim()) {
            alert('Please enter a lobby name')
            return
        }

        // Call the onCreate callback with lobby details
        onCreate(lobbyName, isRated)

        // Close the modal
        onClose()
    }

    return (
        // Modal backdrop - covers entire screen with semi-transparent black
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            {/* Modal container with styling matching ReportResultModal */}
            <div className="bg-surface border border-white/10 rounded-xl p-8 max-w-md w-full shadow-2xl transform transition-all scale-100">
                {/* Modal header */}
                <h2 className="text-2xl font-bold text-white mb-4">Create Lobby</h2>
                <p className="text-gray-300 mb-6">
                    Set up your lobby and invite players to join your kingdom.
                </p>

                {/* Form fields */}
                <div className="space-y-4 mb-8">
                    {/* Lobby name input */}
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

                    {/* Ranked checkbox */}
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

                {/* Action buttons */}
                <div className="flex justify-end gap-3">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button variant="primary" onClick={handleSubmit}>Create Lobby</Button>
                </div>
            </div>
        </div>
    )
}

export default CreateLobbyModal
