import React, { useEffect, useState, useRef } from 'react';
import { Socket } from 'socket.io-client';

interface ChatBoxProps {
    socket: Socket | null;
    roomId: string;
    username: string;
    onFocusChange: (isFocused: boolean) => void;
}

interface Message {
    senderId: string;
    username: string;
    message: string;
    timestamp: string;
}

const ChatBox: React.FC<ChatBoxProps> = ({ socket, roomId, username, onFocusChange }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!socket) return;

        const handleMessage = (msg: Message) => {
            setMessages((prev) => [...prev, msg]);
        };

        socket.on('chat_message', handleMessage);

        return () => {
            socket.off('chat_message', handleMessage);
        };
    }, [socket]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim() || !socket) return;

        socket.emit('chat_message', {
            message: inputValue,
            roomId,
        });

        setInputValue('');
    };

    return (
        <div className="absolute bottom-6 left-6 w-80 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-2xl ring-1 ring-white/5">
            {/* Header */}
            <div className="p-5 bg-white/5 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Comms Channel</h3>
                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
            </div>

            {/* Messages */}
            <div className="flex-1 h-72 overflow-y-auto p-5 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex flex-col ${msg.username === username ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${msg.username === username
                            ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-br-sm'
                            : 'bg-slate-800/80 text-slate-200 rounded-bl-sm border border-white/5'
                            }`}>
                            {msg.username !== username && (
                                <span className="block text-[10px] font-bold text-purple-400 mb-0.5 uppercase tracking-wide">{msg.username}</span>
                            )}
                            <p className="leading-relaxed">{msg.message}</p>
                        </div>
                        <span className="text-[10px] text-slate-500 mt-1 px-1">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-3 bg-white/5 border-t border-white/5">
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onFocus={() => onFocusChange(true)}
                    onBlur={() => onFocusChange(false)}
                    placeholder="Transmit message..."
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                />
            </form>
        </div>
    );
};

export default ChatBox;
