import { useEffect, useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';

interface WebRTCProps {
    socket: Socket | null;
    userId: string;
}

interface PeerConnection {
    connection: RTCPeerConnection;
    stream?: MediaStream;
}

export const useWebRTC = ({ socket, userId }: WebRTCProps) => {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [peers, setPeers] = useState<{ [key: string]: PeerConnection }>({});
    const peersRef = useRef<{ [key: string]: PeerConnection }>({});
    const localStreamRef = useRef<MediaStream | null>(null);

    // Initialize Microphone
    useEffect(() => {
        const initMic = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                localStreamRef.current = stream;
                setLocalStream(stream);
            } catch (err) {
                console.error('Error accessing microphone:', err);
            }
        };

        initMic();

        return () => {
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // Handle Socket Events
    useEffect(() => {
        if (!socket || !localStream) return;

        // Handle new user joining - Create Offer
        const handleUserJoined = async (newUser: any) => {
            if (newUser.userId === userId) return;
            console.log('WebRTC: User joined, creating offer for', newUser.userId);
            createPeerConnection(newUser.userId, socket, localStream, true);
        };

        // Handle Offer - Create Answer
        const handleOffer = async ({ senderId, offer }: { senderId: string, offer: RTCSessionDescriptionInit }) => {
            console.log('WebRTC: Received offer from', senderId);
            const pc = createPeerConnection(senderId, socket, localStream, false);
            await pc.connection.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pc.connection.createAnswer();
            await pc.connection.setLocalDescription(answer);
            socket.emit('answer', { targetId: senderId, answer });
        };

        // Handle Answer
        const handleAnswer = async ({ senderId, answer }: { senderId: string, answer: RTCSessionDescriptionInit }) => {
            console.log('WebRTC: Received answer from', senderId);
            const pc = peersRef.current[senderId];
            if (pc) {
                await pc.connection.setRemoteDescription(new RTCSessionDescription(answer));
            }
        };

        // Handle ICE Candidate
        const handleIceCandidate = async ({ senderId, candidate }: { senderId: string, candidate: RTCIceCandidateInit }) => {
            const pc = peersRef.current[senderId];
            if (pc) {
                await pc.connection.addIceCandidate(new RTCIceCandidate(candidate));
            }
        };

        // Handle User Left
        const handleUserLeft = ({ socketId }: { socketId: string }) => {
            if (peersRef.current[socketId]) {
                peersRef.current[socketId].connection.close();
                delete peersRef.current[socketId];
                setPeers({ ...peersRef.current });
            }
        };

        socket.on('user_joined', handleUserJoined);
        socket.on('offer', handleOffer);
        socket.on('answer', handleAnswer);
        socket.on('ice-candidate', handleIceCandidate);
        socket.on('user_left', handleUserLeft);

        return () => {
            socket.off('user_joined', handleUserJoined);
            socket.off('offer', handleOffer);
            socket.off('answer', handleAnswer);
            socket.off('ice-candidate', handleIceCandidate);
            socket.off('user_left', handleUserLeft);
        };
    }, [socket, localStream, userId]);

    const createPeerConnection = (targetId: string, socket: Socket, stream: MediaStream, isInitiator: boolean) => {
        if (peersRef.current[targetId]) return peersRef.current[targetId];

        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:global.stun.twilio.com:3478' }
            ]
        });

        // Add local tracks
        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('ice-candidate', { targetId, candidate: event.candidate });
            }
        };

        // Handle remote stream
        pc.ontrack = (event) => {
            console.log('WebRTC: Received remote stream from', targetId);
            peersRef.current[targetId] = { ...peersRef.current[targetId], stream: event.streams[0] };
            setPeers({ ...peersRef.current });
        };

        // Create Offer if initiator
        if (isInitiator) {
            pc.onnegotiationneeded = async () => {
                try {
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    socket.emit('offer', { targetId, offer });
                } catch (err) {
                    console.error('Error creating offer:', err);
                }
            };
        }

        peersRef.current[targetId] = { connection: pc };
        setPeers({ ...peersRef.current });
        return { connection: pc };
    };

    const toggleMute = useCallback(() => {
        if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
            setLocalStream(localStreamRef.current); // Trigger re-render if needed
            return !localStreamRef.current.getAudioTracks()[0].enabled; // Return isMuted
        }
        return true;
    }, []);

    return { localStream, peers, toggleMute };
};
