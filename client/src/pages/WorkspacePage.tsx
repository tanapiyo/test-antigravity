import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import GameCanvas from '../components/Game/GameCanvas';
import ChatBox from '../components/Chat/ChatBox';

const WorkspacePage: React.FC = () => {
    const { user } = useAuth();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isChatFocused, setIsChatFocused] = useState(false);

    useEffect(() => {
        if (!user) return;

        const newSocket = io('/', {
            path: '/socket.io',
        });

        newSocket.on('connect', () => {
            console.log('Connected to socket server');
            newSocket.emit('join_room', {
                roomId: 'lobby',
                user: {
                    userId: user.id,
                    username: user.username,
                    avatarUrl: user.avatarUrl || '',
                },
            });
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, [user]);

    if (!user) return null;

    return (
        <div className="w-full h-screen relative">
            <GameCanvas
                socket={socket}
                isChatFocused={isChatFocused}
            />
            <ChatBox
                socket={socket}
                roomId="lobby"
                username={user.username}
                onFocusChange={setIsChatFocused}
            />
        </div>
    );
};

export default WorkspacePage;
