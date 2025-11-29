
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

// Furniture object types
type FurnitureType = 'desk' | 'chair' | 'plant';

interface FurnitureObject {
    id: string;
    type: FurnitureType;
    x: number;
    y: number;
    width: number;
    height: number;
    // Collision box (relative to x, y which is bottom-center)
    collisionBox?: {
        offsetX: number;
        offsetY: number;
        width: number;
        height: number;
    };
}

// Renderable entity for Z-sorting
interface RenderableEntity {
    type: 'avatar' | 'furniture';
    y: number; // Used for depth sorting
    data: UserState | FurnitureObject;
    isLocal?: boolean;
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

    // Furniture Assets
    const furnitureImagesRef = useRef<{ [key in FurnitureType]?: HTMLImageElement }>({});

    // Furniture Objects (initial placement - can be extended with server sync later)
    const furnitureObjectsRef = useRef<FurnitureObject[]>([
        { id: 'desk-1', type: 'desk', x: 300, y: 250, width: 96, height: 64, collisionBox: { offsetX: -48, offsetY: -20, width: 96, height: 40 } },
        { id: 'desk-2', type: 'desk', x: 500, y: 250, width: 96, height: 64, collisionBox: { offsetX: -48, offsetY: -20, width: 96, height: 40 } },
        { id: 'chair-1', type: 'chair', x: 300, y: 310, width: 48, height: 48, collisionBox: { offsetX: -24, offsetY: -16, width: 48, height: 32 } },
        { id: 'chair-2', type: 'chair', x: 500, y: 310, width: 48, height: 48, collisionBox: { offsetX: -24, offsetY: -16, width: 48, height: 32 } },
        { id: 'plant-1', type: 'plant', x: 150, y: 200, width: 48, height: 64, collisionBox: { offsetX: -16, offsetY: -16, width: 32, height: 32 } },
        { id: 'plant-2', type: 'plant', x: 650, y: 400, width: 48, height: 64, collisionBox: { offsetX: -16, offsetY: -16, width: 32, height: 32 } },
    ]);

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

        // Load furniture assets
        const furnitureTypes: FurnitureType[] = ['desk', 'chair', 'plant'];
        furnitureTypes.forEach(type => {
            const img = new Image();
            img.src = `/assets/${type}.png`;
            img.onload = () => { furnitureImagesRef.current[type] = img; };
        });
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

            // Collision detection helper
            const checkCollision = (x: number, y: number): boolean => {
                const AVATAR_RADIUS = 16; // Avatar collision radius
                for (const furniture of furnitureObjectsRef.current) {
                    if (!furniture.collisionBox) continue;
                    const box = furniture.collisionBox;
                    const boxLeft = furniture.x + box.offsetX;
                    const boxRight = boxLeft + box.width;
                    const boxTop = furniture.y + box.offsetY;
                    const boxBottom = boxTop + box.height;

                    // Circle-rectangle collision
                    const closestX = Math.max(boxLeft, Math.min(x, boxRight));
                    const closestY = Math.max(boxTop, Math.min(y, boxBottom));
                    const distanceX = x - closestX;
                    const distanceY = y - closestY;
                    const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);

                    if (distanceSquared < (AVATAR_RADIUS * AVATAR_RADIUS)) {
                        return true; // Collision detected
                    }
                }
                return false;
            };

            // Update Local Movement
            if (localUserRef.current && !isChatFocused) {
                const speed = 5;
                let moved = false;
                let direction = localUserRef.current.direction || 0; // 0: Down, 1: Left, 2: Right, 3: Up
                const prevX = localUserRef.current.x;
                const prevY = localUserRef.current.y;

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

                // Check collision and revert if necessary
                if (moved && checkCollision(localUserRef.current.x, localUserRef.current.y)) {
                    // Try sliding along axes
                    localUserRef.current.x = prevX;
                    if (checkCollision(localUserRef.current.x, localUserRef.current.y)) {
                        localUserRef.current.y = prevY;
                        localUserRef.current.x = prevX + (localUserRef.current.x - prevX);
                        if (checkCollision(localUserRef.current.x, localUserRef.current.y)) {
                            // Full revert if still colliding
                            localUserRef.current.x = prevX;
                            localUserRef.current.y = prevY;
                            moved = false;
                        }
                    }
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

            // Collect all renderable entities for Z-sorting
            const renderables: RenderableEntity[] = [];

            // Add furniture to renderables
            furnitureObjectsRef.current.forEach(furniture => {
                renderables.push({
                    type: 'furniture',
                    y: furniture.y, // Use bottom of furniture for depth sorting
                    data: furniture,
                });
            });

            // Add local user to renderables
            if (localUserRef.current) {
                renderables.push({
                    type: 'avatar',
                    y: localUserRef.current.y,
                    data: localUserRef.current,
                    isLocal: true,
                });
            }

            // Add other users to renderables
            Object.values(usersRef.current).forEach(u => {
                renderables.push({
                    type: 'avatar',
                    y: u.y,
                    data: u,
                    isLocal: false,
                });
            });

            // Sort by Y position (lower Y renders first, so objects with higher Y appear in front)
            renderables.sort((a, b) => a.y - b.y);

            // Render all entities in sorted order
            renderables.forEach(entity => {
                if (entity.type === 'avatar') {
                    drawAvatar(ctx, entity.data as UserState, entity.isLocal || false);
                } else if (entity.type === 'furniture') {
                    drawFurniture(ctx, entity.data as FurnitureObject);
                }
            });

            animationFrameId = requestAnimationFrame(render);
        };

        // Draw furniture object
        const drawFurniture = (ctx: CanvasRenderingContext2D, furniture: FurnitureObject) => {
            const img = furnitureImagesRef.current[furniture.type];
            if (!img) return;

            ctx.save();
            // Draw furniture centered horizontally at x, with bottom at y
            ctx.drawImage(
                img,
                furniture.x - furniture.width / 2,
                furniture.y - furniture.height,
                furniture.width,
                furniture.height
            );
            ctx.restore();
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
