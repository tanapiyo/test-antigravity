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

interface WorldObject {
    id: string;
    type: 'desk' | 'chair' | 'plant';
    x: number;
    y: number;
}

interface ServerToClientEvents {
    user_joined: (user: UserState) => void;
    user_moved: (data: { socketId: string; x: number; y: number; direction?: number; isMoving?: boolean }) => void;
    user_left: (data: { socketId: string }) => void;
    existing_users: (users: { [key: string]: UserState }) => void;
    signal: (data: { senderId: string; signalData: any }) => void;
    chat_message: (data: { senderId: string; username: string; message: string; timestamp: string }) => void;
    offer: (data: { senderId: string; offer: any }) => void;
    answer: (data: { senderId: string; answer: any }) => void;
    'ice-candidate': (data: { senderId: string; candidate: any }) => void;
    object_placed: (object: WorldObject) => void;
    existing_objects: (objects: WorldObject[]) => void;
}

interface ClientToServerEvents {
    join_room: (data: { roomId: string; user: Omit<UserState, 'x' | 'y' | 'roomId'> }) => void;
    move: (data: { x: number; y: number; direction?: number; isMoving?: boolean }) => void;
    signal: (data: { targetId: string; signalData: any }) => void;
    chat_message: (data: { message: string; roomId: string }) => void;
    offer: (data: { targetId: string; offer: any }) => void;
    answer: (data: { targetId: string; answer: any }) => void;
    'ice-candidate': (data: { targetId: string; candidate: any }) => void;
    place_object: (data: { type: 'desk' | 'chair' | 'plant'; x: number; y: number; roomId: string }) => void;
    get_objects: (data: { roomId: string }) => void;
}

interface InterServerEvents { }

interface SocketData { }

// In-memory state
const users: { [socketId: string]: UserState } = {};
const objects: { [key: string]: WorldObject[] } = {}; // RoomId -> Objects

export const setupSocket = (io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>) => {
    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);

        socket.on('join_room', ({ roomId, user }) => {
            socket.join(roomId);

            // Initialize user state
            users[socket.id] = {
                x: 400, // Default start position
                y: 300,
                userId: user.userId,
                username: user.username,
                avatarUrl: user.avatarUrl,
                roomId
            };

            // Broadcast to others in the room
            socket.to(roomId).emit('user_joined', users[socket.id]);

            // Send existing users to the new user
            const roomUsers = Object.values(users).filter(u => u.roomId === roomId).reduce((acc, u) => {
                // Find socket ID for this user
                const socketId = Object.keys(users).find(key => users[key] === u);
                if (socketId && socketId !== socket.id) acc[socketId] = u;
                return acc;
            }, {} as { [key: string]: UserState });

            socket.emit('existing_users', roomUsers);

            // Send existing objects
            if (!objects[roomId]) objects[roomId] = [];
            socket.emit('existing_objects', objects[roomId]);

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

        // Object Placement
        socket.on('place_object', ({ type, x, y, roomId }) => {
            if (!objects[roomId]) objects[roomId] = [];

            const newObject: WorldObject = {
                id: Math.random().toString(36).substr(2, 9),
                type,
                x,
                y
            };

            objects[roomId].push(newObject);
            io.to(roomId).emit('object_placed', newObject);
        });

        socket.on('get_objects', ({ roomId }) => {
            if (!objects[roomId]) objects[roomId] = [];
            socket.emit('existing_objects', objects[roomId]);
        });

        // WebRTC Signaling
        socket.on('offer', ({ targetId, offer }) => {
            io.to(targetId).emit('offer', {
                senderId: socket.id,
                offer
            });
        });

        socket.on('answer', ({ targetId, answer }) => {
            io.to(targetId).emit('answer', {
                senderId: socket.id,
                answer
            });
        });

        socket.on('ice-candidate', ({ targetId, candidate }) => {
            io.to(targetId).emit('ice-candidate', {
                senderId: socket.id,
                candidate
            });
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
