// src/pages/Chat.tsx
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { socket } from '../socket';
import { useUser } from '../context/UserContext';

/**
 * Message interface represents a chat message.
 * It supports three channel types:
 *   - 'global' : messages visible to everyone
 *   - 'lobby'  : messages visible to users in the same lobby
 *   - 'whisper': direct messages between two friends
 */
interface Message {
    id: string;               // Unique identifier for the message
    user?: string;            // Display name of the sender (for global/lobby messages)
    from?: string;            // SteamID of the sender (for direct messages)
    to?: string;              // SteamID of the recipient (for direct messages)
    fromName?: string;        // Display name of the sender (for direct messages)
    text: string;             // Message content
    timestamp: string;        // Human‑readable timestamp (e.g. "14:32")
    channel: 'global' | 'lobby' | 'whisper'; // Channel type
}

/**
 * Friend interface represents a user in the friends list.
 */
interface Friend {
    steamId: string;   // Unique Steam identifier for the friend
    name: string;      // Friend's display name
    isOnline: boolean; // Online status flag
}

/**
 * Chat component provides three distinct chat experiences:
 *   1. Global chat – visible to all connected users.
 *   2. Lobby chat – visible only to users in the same lobby.
 *   3. Direct messages (DM) – private conversation between two friends.
 *
 * The component also displays a sidebar with channel selectors and a list of friends
 * for quick DM navigation.
 */
const Chat: React.FC = () => {
    // ----- Global hooks -----------------------------------------------------
    const { user } = useUser();                     // Current logged‑in user
    const location = useLocation();                 // Router location (used for DM navigation)

    // ----- State -----------------------------------------------------------
    const [activeChannel, setActiveChannel] = useState<'global' | 'lobby'>('global'); // Currently selected channel
    const [activeFriend, setActiveFriend] = useState<Friend | null>(null);          // Currently selected DM friend
    const [message, setMessage] = useState('');                                   // Message being typed
    const [messages, setMessages] = useState<Message[]>([]);                       // All received messages (both channel and DM)
    const [friends, setFriends] = useState<Friend[]>([]);                         // Friends list for the sidebar

    // ----- Effect: initialise socket listeners & handle navigation ----------
    useEffect(() => {
        // 1️⃣ If the user arrived from the Friends page with a friend selected,
        // we automatically open a DM conversation with that friend.
        if (location.state && (location.state as any).friendSteamId) {
            const { friendSteamId, friendName } = location.state as { friendSteamId: string; friendName: string };
            setActiveFriend({ steamId: friendSteamId, name: friendName, isOnline: true }); // isOnline is a best‑guess; real status will be refreshed by the server
            setActiveChannel(`dm_${friendSteamId}` as any);
            // Request historic DM messages from the server.
            socket.emit('message:history', { friendSteamId });
        }

        // 2️⃣ Request the current friends list from the server.
        socket.emit('friends:list');

        // 3️⃣ Register socket listeners.
        // Global / lobby chat messages.
        socket.on('chat:message', (msg: Message) => {
            setMessages(prev => [...prev, msg]);
        });

        // Direct message received.
        socket.on('message:received', (msg: Message) => {
            // Normalise the message for UI consumption.
            const displayMsg: Message = {
                id: msg.id ?? Date.now().toString(),
                user: msg.from === user?.steamId ? user?.name : msg.fromName,
                from: msg.from,
                to: msg.to,
                fromName: msg.fromName,
                text: msg.text,
                timestamp: new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                channel: 'whisper',
            };
            setMessages(prev => [...prev, displayMsg]);
        });

        // History of a DM conversation.
        socket.on('message:history', (data: { friendSteamId: string; messages: any[] }) => {
            const history = data.messages.map(msg => ({
                id: msg.id,
                user: msg.from === user?.steamId ? user?.name : msg.fromName,
                from: msg.from,
                to: msg.to,
                fromName: msg.fromName,
                text: msg.text,
                timestamp: new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                channel: 'whisper' as const,
            }));
            setMessages(prev => [...prev, ...history]);
        });

        // Friends list updates.
        socket.on('friends:list', (data: { friends: Friend[] }) => {
            setFriends(data.friends);
        });

        // Cleanup listeners on component unmount.
        return () => {
            socket.off('chat:message');
            socket.off('message:received');
            socket.off('message:history');
            socket.off('friends:list');
        };
    }, [location, user]); // Re‑run only if the navigation state or user changes.

    // ----- Helper: send a message ------------------------------------------
    const handleSendMessage = () => {
        if (!message.trim()) return; // Prevent sending empty messages.

        if (activeFriend) {
            // Direct message flow.
            socket.emit('message:send', {
                to: activeFriend.steamId,
                text: message,
            });
        } else {
            // Channel message flow (global or lobby).
            const newMsg: Message = {
                id: Date.now().toString(),
                user: user?.name ?? 'Unknown Lord',
                text: message,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                channel: activeChannel,
            };
            socket.emit('chat:send', newMsg);
        }
        setMessage(''); // Clear the input field after sending.
    };

    // ----- Helper: select a friend for DM ---------------------------------
    const handleSelectFriend = (friend: Friend) => {
        setActiveFriend(friend);
        setActiveChannel(`dm_${friend.steamId}` as any);
        setMessages([]); // Reset current messages to avoid mixing channels.
        socket.emit('message:history', { friendSteamId: friend.steamId });
    };

    // ----- Helper: select a channel (global / lobby) ----------------------
    const handleSelectChannel = (channel: 'global' | 'lobby') => {
        setActiveFriend(null);
        setActiveChannel(channel);
    };

    // ----- Compute filtered messages for the UI ---------------------------
    const filteredMessages = activeFriend
        ? messages.filter(m =>
            m.channel === 'whisper' &&
            ((m.from === activeFriend.steamId && m.to === user?.steamId) ||
                (m.from === user?.steamId && m.to === activeFriend.steamId))
        )
        : messages.filter(m => m.channel === activeChannel);

    // ----- Render ----------------------------------------------------------
    return (
        <div className="flex h-full gap-4">
            {/* ------------------- Sidebar: Channels & Friends ------------------- */}
            <div className="w-48 flex flex-col gap-2">
                <h2 className="text-xl font-bold text-white mb-4">Channels</h2>
                {/* Global channel button */}
                <button
                    onClick={() => handleSelectChannel('global')}
                    className={`text-left px-4 py-2 rounded transition-colors ${activeChannel === 'global' ? 'bg-primary text-black font-bold' : 'text-gray-400 hover:bg-white/5'}`}
                >
                    # Global
                </button>
                {/* Lobby channel button */}
                <button
                    onClick={() => handleSelectChannel('lobby')}
                    className={`text-left px-4 py-2 rounded transition-colors ${activeChannel === 'lobby' ? 'bg-primary text-black font-bold' : 'text-gray-400 hover:bg-white/5'}`}
                >
                    # Lobby
                </button>

                {/* Divider and Direct Message list */}
                {friends.length > 0 && (
                    <>
                        <div className="border-t border-white/10 my-2" />
                        <h3 className="text-sm font-bold text-gray-400 px-2 mb-1">Direct Messages</h3>
                        {friends.map(friend => (
                            <button
                                key={friend.steamId}
                                onClick={() => handleSelectFriend(friend)}
                                className={`text-left px-4 py-2 rounded transition-colors flex items-center gap-2 ${activeChannel === `dm_${friend.steamId}` ? 'bg-primary text-black font-bold' : 'text-gray-400 hover:bg-white/5'}`}
                            >
                                <div className={`w-2 h-2 rounded-full ${friend.isOnline ? 'bg-green-500' : 'bg-gray-500'}`} />
                                <span className="truncate">{friend.name}</span>
                            </button>
                        ))}
                    </>
                )}
            </div>

            {/* ------------------- Main Chat Area ------------------- */}
            <div className="flex-1 flex flex-col bg-surface rounded-xl border border-white/5 overflow-hidden">
                {/* Header showing current channel or DM friend */}
                <div className="p-4 border-b border-white/10 bg-black/20">
                    <h2 className="font-bold text-white">
                        {activeFriend ? `@ ${activeFriend.name}` : `# ${activeChannel}`}
                    </h2>
                </div>

                {/* Message list */}
                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                    {filteredMessages.map(msg => (
                        <div key={msg.id} className="flex gap-3">
                            <div className="font-bold text-primary whitespace-nowrap">[{msg.timestamp}] {msg.user ?? 'Unknown'}:</div>
                            <div className="text-gray-300">{msg.text}</div>
                        </div>
                    ))}
                </div>

                {/* Input box */}
                <div className="p-4 bg-black/20 border-t border-white/5 flex gap-2">
                    <input
                        type="text"
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        placeholder={activeFriend ? `Message @${activeFriend.name}...` : `Message #${activeChannel}...`}
                        className="flex-1 bg-black/30 border border-white/10 rounded px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                        onKeyDown={e => { if (e.key === 'Enter') handleSendMessage(); }}
                    />
                    <button
                        onClick={handleSendMessage}
                        className="px-6 py-2 bg-primary text-black font-bold rounded hover:bg-primary/90 transition-colors"
                    >
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Chat;
