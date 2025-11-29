
import React, { useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';

interface UserState {
    x: number;
    y: number;
    userId: string;
    username: string;
    avatarUrl: string;
    roomId: string;
    direction?: number; // 0: Down, 1: Left, 2: Right, 3: Up
    isMoving?: boolean;
    wasMoving?: boolean;
}

interface GameCanvasProps {
    socket: Socket | null;
    isChatFocused: boolean;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ socket, isChatFocused }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { user } = useAuth();
    const usersRef = useRef<{ [key: string]: UserState }>({});
    const localUserRef = useRef<UserState | null>(null);

    // Movement state
    const keysPressed = useRef<{ [key: string]: boolean }>({});

    // Sprite Sheet Configuration
    const ANIMATION_SPEED = 10; // Frames per update (lower is faster)

    // Assets
    const spriteSheetRef = useRef<HTMLImageElement | null>(null);
    const bgGridRef = useRef<HTMLImageElement | null>(null);

    // Animation State
    const frameCountRef = useRef(0);
    const currentFrameRef = useRef(0);

    useEffect(() => {
        // Load assets
        const sprite = new Image();
        sprite.src = '/assets/character_spritesheet.png';
        sprite.onload = () => { spriteSheetRef.current = sprite; };

        const bg = new Image();
        bg.src = '/assets/bg_grid.png';
        bg.onload = () => { bgGridRef.current = bg; };
    }, []);

    useEffect(() => {
        if (!socket || !user) return;

        socket.on('existing_users', (existingUsers: { [key: string]: UserState }) => {
            usersRef.current = existingUsers;
        });

        socket.on('user_joined', (newUser: UserState) => {
            console.log('User joined:', newUser);
            if (newUser.userId === user.id) {
                localUserRef.current = newUser;
            } else {
                usersRef.current[newUser.userId] = newUser;
            }
        });

        socket.on('user_moved', ({ socketId, x, y, direction, isMoving }) => {
            if (usersRef.current[socketId]) {
                usersRef.current[socketId].x = x;
                usersRef.current[socketId].y = y;
                usersRef.current[socketId].direction = direction;
                usersRef.current[socketId].isMoving = isMoving;
            }
        });

        socket.on('user_left', ({ socketId }) => {
            delete usersRef.current[socketId];
        });

        return () => {
            socket.off('existing_users');
            socket.off('user_joined');
            socket.off('user_moved');
            socket.off('user_left');
        };
    }, [socket, user]);

    // Input handling
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isChatFocused) return; // Disable movement when chat is focused
            keysPressed.current[e.key] = true;
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            keysPressed.current[e.key] = false;
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [isChatFocused]);

    // Game Loop
    useEffect(() => {
        if (!canvasRef.current || !socket) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;

        const render = () => {
            frameCountRef.current++;
            if (frameCountRef.current >= ANIMATION_SPEED) {
                frameCountRef.current = 0;
                currentFrameRef.current = (currentFrameRef.current + 1) % 4; // 4 frames animation
            }

            // Clear canvas
            ctx.fillStyle = '#0f172a'; // Slate 900
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw Background
            if (bgGridRef.current) {
                const pattern = ctx.createPattern(bgGridRef.current, 'repeat');
                if (pattern) {
                    ctx.fillStyle = pattern;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
            } else {
                // Fallback Grid
                ctx.strokeStyle = '#1e293b';
                ctx.lineWidth = 1;
                const gridSize = 50;
                for (let x = 0; x < canvas.width; x += gridSize) {
                    ctx.beginPath();
                    ctx.moveTo(x, 0);
                    ctx.lineTo(x, canvas.height);
                    ctx.stroke();
                }
                for (let y = 0; y < canvas.height; y += gridSize) {
                    ctx.beginPath();
                    ctx.moveTo(0, y);
                    ctx.lineTo(canvas.width, y);
                    ctx.stroke();
                }
            }

            // Update Local Movement
            if (localUserRef.current && !isChatFocused) {
                const speed = 5;
                let moved = false;
                let direction = localUserRef.current.direction || 0; // 0: Down, 1: Left, 2: Right, 3: Up

                if (keysPressed.current['ArrowUp'] || keysPressed.current['w']) {
                    localUserRef.current.y -= speed;
                    moved = true;
                    direction = 3;
                }
                if (keysPressed.current['ArrowDown'] || keysPressed.current['s']) {
                    localUserRef.current.y += speed;
                    moved = true;
                    direction = 0;
                }
                if (keysPressed.current['ArrowLeft'] || keysPressed.current['a']) {
                    localUserRef.current.x -= speed;
                    moved = true;
                    direction = 1;
                }
                if (keysPressed.current['ArrowRight'] || keysPressed.current['d']) {
                    localUserRef.current.x += speed;
                    moved = true;
                    direction = 2;
                }

                localUserRef.current.direction = direction;
                localUserRef.current.isMoving = moved;

                if (moved) {
                    socket.emit('move', {
                        x: localUserRef.current.x,
                        y: localUserRef.current.y,
                        direction: direction,
                        isMoving: moved
                    });
                } else {
                    if (localUserRef.current.wasMoving) {
                        socket.emit('move', {
                            x: localUserRef.current.x,
                            y: localUserRef.current.y,
                            direction: direction,
                            isMoving: false
                        });
                    }
                }
                localUserRef.current.wasMoving = moved;
            }

            // Draw Local User
            if (localUserRef.current) {
                drawAvatar(ctx, localUserRef.current, true);
            }

            // Draw Other Users
            Object.values(usersRef.current).forEach(u => {
                drawAvatar(ctx, u, false);
            });

            animationFrameId = requestAnimationFrame(render);
        };

        const drawAvatar = (ctx: CanvasRenderingContext2D, u: UserState, isLocal: boolean) => {
            ctx.save();
            ctx.translate(u.x, u.y);

            // Draw Sprite
            if (spriteSheetRef.current) {
                const direction = u.direction || 0;
                const isMoving = u.isMoving || false;

                // Row: 0=Down, 1=Left, 2=Right, 3=Up
                const row = direction;

                // Column: Animation frame. If not moving, use frame 0 (standing)
                const col = isMoving ? currentFrameRef.current : 0;

                // Sprite Configuration
                const SOURCE_SIZE = 256; // Assumed frame size from 1024x1024 sheet (4x4)
                const DISPLAY_SIZE = 64; // Size to render on canvas

                ctx.drawImage(
                    spriteSheetRef.current,
                    col * SOURCE_SIZE, row * SOURCE_SIZE, SOURCE_SIZE, SOURCE_SIZE, // Source
                    -DISPLAY_SIZE / 2, -DISPLAY_SIZE / 2, DISPLAY_SIZE, DISPLAY_SIZE // Destination (centered)
                );
            } else {
                // Fallback Circle
                ctx.shadowBlur = 15;
                ctx.shadowColor = isLocal ? '#a855f7' : '#6366f1';
                ctx.beginPath();
                ctx.arc(0, 0, 20, 0, Math.PI * 2);
                ctx.fillStyle = isLocal ? '#a855f7' : '#6366f1';
                ctx.fill();
            }

            // Name
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'white';
            ctx.font = '12px Inter';
            ctx.textAlign = 'center';
            ctx.fillText(u.username, 0, 35);

            ctx.restore();
        };

        render();

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [socket, isChatFocused]);

    return (
        <div className="flex items-center justify-center h-screen bg-black overflow-hidden">
            <canvas
                ref={canvasRef}
                width={window.innerWidth}
                height={window.innerHeight}
                className="cursor-crosshair"
            />

            {/* UI Overlay */}
            <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md p-4 rounded-xl border border-white/10 text-white">
                <h2 className="font-bold">Virtual Workspace</h2>
                <p className="text-sm text-slate-300">Use WASD to move</p>
            </div>
        </div>
    );
};

export default GameCanvas;
