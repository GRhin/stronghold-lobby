import React, { useState } from 'react'
import Button from '../components/Button'
import { useSettings } from '../context/SettingsContext'

const Settings: React.FC = () => {
    const { crusaderPath, setCrusaderPath, extremePath, setExtremePath } = useSettings()
    const [launchArgs, setLaunchArgs] = useState('-nointro')

    const handleBrowseCrusader = async () => {
        // @ts-ignore
        const path = await window.electron.selectGamePath()
        if (path) setCrusaderPath(path)
    }

    const handleBrowseExtreme = async () => {
        // @ts-ignore
        const path = await window.electron.selectGamePath()
        if (path) setExtremePath(path)
    }

    const handleSave = () => {
        console.log('Saving settings:', { crusaderPath, extremePath, launchArgs })
        // In a real app we might save args too, but for now just path is global
        alert('Settings saved!')
    }

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
                <p className="text-gray-400">Configure your game and lobby preferences.</p>
            </div>

            <div className="bg-surface p-6 rounded-xl border border-white/5 space-y-6">
                <h2 className="text-xl font-bold text-primary border-b border-white/10 pb-2">Game Configuration</h2>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300">Stronghold Crusader Path</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={crusaderPath}
                                onChange={(e) => setCrusaderPath(e.target.value)}
                                placeholder="C:\...\Stronghold Crusader.exe"
                                className="flex-1 bg-black/30 border border-white/10 rounded px-4 py-2 text-white focus:outline-none focus:border-primary"
                            />
                            <Button variant="secondary" onClick={handleBrowseCrusader}>Browse</Button>
                        </div>
                        <p className="text-xs text-gray-500">Select the main executable (Stronghold Crusader.exe)</p>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300">Stronghold Crusader Extreme Path</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={extremePath}
                                onChange={(e) => setExtremePath(e.target.value)}
                                placeholder="C:\...\Stronghold_Crusader_Extreme.exe"
                                className="flex-1 bg-black/30 border border-white/10 rounded px-4 py-2 text-white focus:outline-none focus:border-primary"
                            />
                            <Button variant="secondary" onClick={handleBrowseExtreme}>Browse</Button>
                        </div>
                        <p className="text-xs text-gray-500">Select the Extreme executable (Stronghold_Crusader_Extreme.exe)</p>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-300">Launch Arguments</label>
                    <input
                        type="text"
                        value={launchArgs}
                        onChange={(e) => setLaunchArgs(e.target.value)}
                        placeholder="-nointro -highres"
                        className="w-full bg-black/30 border border-white/10 rounded px-4 py-2 text-white focus:outline-none focus:border-primary"
                    />
                </div>
            </div>

            <div className="bg-surface p-6 rounded-xl border border-white/5 space-y-6">
                <h2 className="text-xl font-bold text-primary border-b border-white/10 pb-2">Content Management</h2>

                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-white">Unofficial Crusader Patch (UCP)</h3>
                        <p className="text-sm text-gray-400">Essential bug fixes and balance changes.</p>
                    </div>
                    <Button variant="outline" onClick={() => console.log('Download UCP')}>
                        Download / Update
                    </Button>
                </div>

                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-white">Community Map Pack</h3>
                        <p className="text-sm text-gray-400">Top rated maps from the community.</p>
                    </div>
                    <Button variant="outline" onClick={() => console.log('Download Maps')}>
                        Download Pack
                    </Button>
                </div>
            </div>

            <div className="flex justify-end">
                <Button variant="primary" onClick={handleSave} className="px-8">
                    Save Changes
                </Button>
            </div>
        </div>
    )
}

export default Settings
