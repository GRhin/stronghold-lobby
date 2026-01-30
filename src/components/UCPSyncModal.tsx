import React from 'react'
import Button from './Button'
import type { FileDiff } from '../utils/ucp'

interface UCPSyncModalProps {
    isOpen: boolean
    diffs: FileDiff[]
    onConfirm: () => void
    onCancel: () => void
    isLoading: boolean
    status: string | null
}

const UCPSyncModal: React.FC<UCPSyncModalProps> = ({ isOpen, diffs, onConfirm, onCancel, isLoading, status }) => {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-surface border border-white/10 rounded-xl p-6 max-w-lg w-full shadow-2xl">
                <h2 className="text-xl font-bold text-white mb-4">UCP Sync Required</h2>

                {isLoading ? (
                    <div className="flex flex-col items-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                        <p className="text-gray-300">{status || 'Syncing...'}</p>
                    </div>
                ) : (
                    <>
                        <p className="text-gray-300 mb-4">
                            The host has a different UCP configuration. You need to sync to play.
                            Original files will be backed up and restored when you leave.
                        </p>

                        <div className="bg-black/30 rounded p-3 mb-6 max-h-60 overflow-y-auto">
                            {diffs.map((diff, i) => (
                                <div key={i} className="flex justify-between text-sm py-1 border-b border-white/5 last:border-0">
                                    <span className="text-white font-mono">{diff.file}</span>
                                    <span className={`px-2 rounded text-xs ${diff.reason === 'missing' ? 'bg-red-500/20 text-red-400' :
                                        diff.reason === 'version_mismatch' ? 'bg-yellow-500/20 text-yellow-400' :
                                            'bg-blue-500/20 text-blue-400'
                                        }`}>
                                        {diff.reason}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-end gap-3">
                            <Button variant="secondary" onClick={onCancel}>Leave Lobby</Button>
                            <Button variant="primary" onClick={onConfirm}>Sync & Play</Button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

export default UCPSyncModal
