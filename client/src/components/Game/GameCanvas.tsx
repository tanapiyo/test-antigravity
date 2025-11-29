import React, { useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import { useWebRTC } from '../../hooks/useWebRTC';
import BuildMenu from './BuildMenu';

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

interface WorldObject {
    id: string;
    type: 'desk' | 'chair' | 'plant';
    x: number;
    y: number;
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
    const objectsRef = useRef<WorldObject[]>([]);

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

    // Build Mode State
    const [isBuildMode, setIsBuildMode] = React.useState(false);
    const [selectedObject, setSelectedObject] = React.useState<'desk' | 'chair' | 'plant' | null>(null);

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

        socket.on('user_joined', (data: { socketId: string; user: UserState }) => {
            console.log('User joined:', data);
            if (data.user.userId === user.id) {
                localUserRef.current = data.user;
            } else {
                usersRef.current[data.socketId] = data.user;
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

    // Handle Object Events
    useEffect(() => {
        if (!socket) return;

        socket.on('object_placed', (newObject: WorldObject) => {
            objectsRef.current.push(newObject);
        });

        socket.on('existing_objects', (objects: WorldObject[]) => {
            objectsRef.current = objects;
        });

        return () => {
            socket.off('object_placed');
            socket.off('existing_objects');
        };
    }, [socket]);

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

    // Handle Canvas Click for Placement
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !socket) return;

        const handleClick = (e: MouseEvent) => {
            if (!isBuildMode || !selectedObject) return;

            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            socket.emit('place_object', {
                type: selectedObject,
                x,
                y,
                roomId: 'lobby' // Should be dynamic
            });
        };

        canvas.addEventListener('click', handleClick);
        return () => canvas.removeEventListener('click', handleClick);
    }, [isBuildMode, selectedObject, socket]);

    // Window Resize Handling
    useEffect(() => {
        const handleResize = () => {
            if (canvasRef.current) {
                canvasRef.current.width = window.innerWidth;
                canvasRef.current.height = window.innerHeight;
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // WebRTC & Spatial Audio
    const { peers, toggleMute } = useWebRTC({
        socket,
        userId: user?.id || ''
    });
    const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});
    const [isMuted, setIsMuted] = React.useState(false);

    const handleToggleMute = () => {
        const muted = toggleMute();
        setIsMuted(muted);
    };

    // Game Loop
    useEffect(() => {
        if (!canvasRef.current || !socket) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Create offscreen canvas for scaled background pattern
        let bgPattern: CanvasPattern | null = null;
        if (bgGridRef.current) {
            const offscreen = document.createElement('canvas');
            const GRID_SCALE = 64; // Smaller grid size
            offscreen.width = GRID_SCALE;
            offscreen.height = GRID_SCALE;
            const offCtx = offscreen.getContext('2d');
            if (offCtx) {
                offCtx.drawImage(bgGridRef.current, 0, 0, GRID_SCALE, GRID_SCALE);
                bgPattern = ctx.createPattern(offscreen, 'repeat');
            }
        }

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
            if (bgPattern) {
                ctx.fillStyle = bgPattern;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
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

            // Spatial Audio Calculation
            if (localUserRef.current) {
                Object.values(usersRef.current).forEach(u => {
                    if (u.userId === localUserRef.current?.userId) return;

                    const audioElement = audioRefs.current[u.userId];
                    if (audioElement) {
                        const dx = u.x - localUserRef.current!.x;
                        const dy = u.y - localUserRef.current!.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        const MAX_DISTANCE = 600;

                        // Volume decreases linearly with distance
                        let volume = 1 - (distance / MAX_DISTANCE);
                        volume = Math.max(0, Math.min(1, volume)); // Clamp between 0 and 1

                        audioElement.volume = volume;
                    }
                });
            }

            // Collect all renderable entities (Local User, Other Users, Objects)
            const entities: Array<{
                y: number;
                type: 'user' | 'object';
                data: any;
                isLocal?: boolean;
            }> = [];

            if (localUserRef.current) {
                entities.push({
                    y: localUserRef.current.y,
                    type: 'user',
                    data: localUserRef.current,
                    isLocal: true
                });
            }

            Object.values(usersRef.current).forEach(u => {
                entities.push({
                    y: u.y,
                    type: 'user',
                    data: u,
                    isLocal: false
                });
            });

            objectsRef.current.forEach(obj => {
                entities.push({
                    y: obj.y,
                    type: 'object',
                    data: obj
                });
            });

            // Y-Sort entities
            entities.sort((a, b) => a.y - b.y);

            // Render Entities
            entities.forEach(entity => {
                if (entity.type === 'user') {
                    drawAvatar(ctx, entity.data, entity.isLocal || false);
                } else {
                    drawObject(ctx, entity.data);
                }
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
                const DISPLAY_SIZE = 96; // Increased size for better visibility

                // Render full frame without cropping to avoid cutting off the avatar
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
            ctx.fillText(u.username, 0, 55); // Adjusted Y offset for larger sprite

            ctx.restore();
        };

        const drawObject = (ctx: CanvasRenderingContext2D, obj: WorldObject) => {
            ctx.save();
            ctx.translate(obj.x, obj.y);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '40px serif';

            let emoji = '📦';
            switch (obj.type) {
                case 'desk': emoji = '🪑'; break;
                case 'chair': emoji = '🛋️'; break;
                case 'plant': emoji = '🪴'; break;
            }

            ctx.fillText(emoji, 0, 0);
            ctx.restore();
        };

        render();

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [socket, isChatFocused, peers]); // Added peers dependency for spatial audio updates

    return (
        <div className="flex items-center justify-center h-screen bg-black overflow-hidden relative">
            <canvas
                ref={canvasRef}
                width={window.innerWidth}
                height={window.innerHeight}
                className={'cursor-crosshair ' + (isBuildMode ? 'cursor-cell' : '')}
            />

            {/* Hidden Audio Elements for Peers */}
            {Object.entries(peers).map(([peerId, peer]) => (
                peer.stream && (
                    <audio
                        key={peerId}
                        ref={(el) => {
                            if (el) {
                                el.srcObject = peer.stream!;
                                audioRefs.current[peerId] = el;
                            } else {
                                delete audioRefs.current[peerId];
                            }
                        }}
                        autoPlay
                        playsInline
                    />
                )
            ))}

            {/* Build Menu */}
            <BuildMenu
                isBuildMode={isBuildMode}
                onToggleBuildMode={() => setIsBuildMode(!isBuildMode)}
                selectedObject={selectedObject}
                onSelectObject={setSelectedObject}
            />

            {/* UI Overlay */}
            <div className="absolute top-6 left-6 pointer-events-none">
                <div className="bg-slate-900/80 backdrop-blur-xl p-5 rounded-2xl border border-white/10 shadow-2xl ring-1 ring-white/5 pointer-events-auto">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                            <div className="w-3 h-3 rounded-full bg-purple-500 animate-pulse shadow-[0_0_10px_rgba(168,85,247,0.5)]"></div>
                            <h2 className="font-black text-lg text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tight">
                                VIRTUAL WORKSPACE
                            </h2>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center space-x-2 text-xs text-slate-400 font-medium bg-black/20 px-3 py-1.5 rounded-lg border border-white/5">
                            <span className="bg-white/10 px-1.5 py-0.5 rounded text-white">WASD</span>
                            <span>to move</span>
                        </div>

                        <button
                            onClick={handleToggleMute}
                            className={`w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${isMuted
                                ? 'bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30'
                                : 'bg-green-500/20 text-green-400 border border-green-500/50 hover:bg-green-500/30'
                                }`}
                        >
                            <div className={`w-2 h-2 rounded-full ${isMuted ? 'bg-red-500' : 'bg-green-500'}`}></div>
                            <span>{isMuted ? 'MIC MUTED' : 'MIC ACTIVE'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GameCanvas;
