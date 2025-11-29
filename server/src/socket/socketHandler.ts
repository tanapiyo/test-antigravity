import { Server, Socket } from 'socket.io';

interface UserState {
    x: number;
    y: number;
    userId: string;
    username: string;
    avatarUrl: string;
    roomId: string;
    direction?: number;
    isMoving?: boolean;
}

interface ServerToClientEvents {
    user_joined: (user: UserState) => void;
    user_moved: (data: { socketId: string; x: number; y: number; direction: number; isMoving: boolean }) => void;
    user_left: (data: { socketId: string }) => void;
    existing_users: (users: { [key: string]: UserState }) => void;
    signal: (data: { senderId: string; signalData: any }) => void;
    chat_message: (data: { senderId: string; username: string; message: string; timestamp: string }) => void;
}

interface ClientToServerEvents {
    join_room: (data: { roomId: string; user: { userId: string; username: string; avatarUrl: string } }) => void;
    move: (data: { x: number; y: number; direction: number; isMoving: boolean }) => void;
    signal: (data: { targetId: string; signalData: any }) => void;
    chat_message: (data: { message: string; roomId: string }) => void;
}

interface InterServerEvents { }

interface SocketData {
    user: UserState;
}

// In-memory state
const users: { [socketId: string]: UserState } = {};

export const setupSocket = (io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>) => {
    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);

        socket.on('join_room', ({ roomId, user }) => {
            // Initialize user state
            const newUser: UserState = {
                x: 400, // Default start position
                y: 300,
                userId: user.userId,
                username: user.username,
                avatarUrl: user.avatarUrl,
                roomId,
            };

            users[socket.id] = newUser;
            socket.join(roomId);

            // Broadcast to others in the room
            socket.to(roomId).emit('user_joined', newUser);

            // Send existing users to the new user
            const roomUsers = Object.entries(users).reduce((acc, [id, u]) => {
                if (u.roomId === roomId && id !== socket.id) {
                    acc[id] = u;
                }
                return acc;
            }, {} as { [key: string]: UserState });

            socket.emit('existing_users', roomUsers);

            console.log(`User ${user.username} joined room ${roomId}`);
        });

        socket.on('move', ({ x, y, direction, isMoving }) => {
            const user = users[socket.id];
            if (user) {
                user.x = x;
                user.y = y;
                user.direction = direction;
                user.isMoving = isMoving;
                socket.to(user.roomId).emit('user_moved', { socketId: socket.id, x, y, direction, isMoving });
            }
        });

        socket.on('chat_message', ({ message, roomId }) => {
            const user = users[socket.id];
            if (user) {
                const timestamp = new Date().toISOString();
                io.to(roomId).emit('chat_message', {
                    senderId: socket.id,
                    username: user.username,
                    message,
                    timestamp
                });
            }
        });

        socket.on('signal', ({ targetId, signalData }) => {
            io.to(targetId).emit('signal', { senderId: socket.id, signalData });
        });

        socket.on('disconnect', () => {
            const user = users[socket.id];
            if (user) {
                socket.to(user.roomId).emit('user_left', { socketId: socket.id });
                delete users[socket.id];
                console.log(`User ${user.username} disconnected`);
            }
        });
    });
};
