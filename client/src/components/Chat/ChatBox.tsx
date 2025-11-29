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
        <div className="absolute bottom-4 left-4 w-80 bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden flex flex-col shadow-2xl">
            {/* Header */}
            <div className="p-3 bg-white/5 border-b border-white/5">
                <h3 className="text-sm font-bold text-white">Chat</h3>
            </div>

            {/* Messages */}
            <div className="flex-1 h-64 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex flex-col ${msg.username === username ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${msg.username === username
                                ? 'bg-purple-600 text-white rounded-br-none'
                                : 'bg-slate-700 text-slate-200 rounded-bl-none'
                            }`}>
                            {msg.username !== username && (
                                <span className="block text-xs text-purple-300 mb-1">{msg.username}</span>
                            )}
                            {msg.message}
                        </div>
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
                    placeholder="Type a message..."
                    className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                />
            </form>
        </div>
    );
};

export default ChatBox;
