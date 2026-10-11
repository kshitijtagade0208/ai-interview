'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Room, RoomEvent, RemoteTrack, RemoteTrackPublication, RemoteParticipant, Track } from 'livekit-client';

export interface UseLiveKitRoomOptions {
  roomName?: string;
  candidateName?: string;
  autoConnect?: boolean;
  onAgentAudioStarted?: () => void;
  onAgentAudioEnded?: () => void;
  onDataReceived?: (data: Uint8Array, participant?: RemoteParticipant) => void;
}

export function useLiveKitRoom({
  roomName = 'skillbridge-interview-room',
  candidateName = 'Candidate',
  autoConnect = true,
  onAgentAudioStarted,
  onAgentAudioEnded,
  onDataReceived,
}: UseLiveKitRoomOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [participantCount, setParticipantCount] = useState(0);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);

  const roomRef = useRef<Room | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const isConnectingRef = useRef(false);

  // Store callbacks in refs to prevent useEffect re-triggering on every render
  const callbacksRef = useRef({ onAgentAudioStarted, onAgentAudioEnded, onDataReceived });
  useEffect(() => {
    callbacksRef.current = { onAgentAudioStarted, onAgentAudioEnded, onDataReceived };
  });

  const connectToRoom = useCallback(async () => {
    if (isConnectingRef.current) return;
    if (roomRef.current && roomRef.current.state === 'connected') return;

    try {
      isConnectingRef.current = true;
      setIsConnecting(true);
      setError(null);

      const res = await fetch(
        `/api/livekit/token?room=${encodeURIComponent(roomName)}&username=${encodeURIComponent(candidateName)}`
      );
      if (!res.ok) {
        throw new Error(`Token API failed with status ${res.status}`);
      }
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Clean up previous room if any
      if (roomRef.current) {
        try {
          await roomRef.current.disconnect();
        } catch {}
      }

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });
      roomRef.current = room;

      room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication: RemoteTrackPublication) => {
        if (track.kind === Track.Kind.Audio) {
          if (!audioElRef.current) {
            audioElRef.current = document.createElement('audio');
            audioElRef.current.autoplay = true;
            document.body.appendChild(audioElRef.current);
          }
          track.attach(audioElRef.current);
          setIsAgentSpeaking(true);
          callbacksRef.current.onAgentAudioStarted?.();
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
        if (track.kind === Track.Kind.Audio && audioElRef.current) {
          track.detach(audioElRef.current);
          setIsAgentSpeaking(false);
          callbacksRef.current.onAgentAudioEnded?.();
        }
      });

      room.on(RoomEvent.ParticipantConnected, () => {
        setParticipantCount(room.numParticipants);
      });

      room.on(RoomEvent.ParticipantDisconnected, () => {
        setParticipantCount(room.numParticipants);
      });

      room.on(RoomEvent.DataReceived, (payload: Uint8Array, participant?: RemoteParticipant) => {
        callbacksRef.current.onDataReceived?.(payload, participant);
      });

      room.on(RoomEvent.Disconnected, () => {
        setIsConnected(false);
        setIsAgentSpeaking(false);
        setParticipantCount(0);
      });

      await room.connect(data.url, data.token);
      setIsConnected(true);
      setParticipantCount(room.numParticipants);

      // Initialize microphone state
      try {
        await room.localParticipant.setMicrophoneEnabled(true);
        setIsMicMuted(false);
      } catch (micErr) {
        console.warn('[LiveKit] Local mic notice:', micErr);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to connect to LiveKit room';
      setError(msg);
      console.warn('[LiveKit Connect Notice]:', msg);
    } finally {
      isConnectingRef.current = false;
      setIsConnecting(false);
    }
  }, [roomName, candidateName]);

  const disconnectRoom = useCallback(async () => {
    if (roomRef.current) {
      try {
        await roomRef.current.disconnect();
      } catch {}
      roomRef.current = null;
      setIsConnected(false);
      setIsAgentSpeaking(false);
      setParticipantCount(0);
    }
  }, []);

  const setMicrophoneEnabled = useCallback(async (enabled: boolean) => {
    if (roomRef.current && roomRef.current.localParticipant) {
      try {
        await roomRef.current.localParticipant.setMicrophoneEnabled(enabled);
        setIsMicMuted(!enabled);
      } catch (err) {
        console.warn('[LiveKit Mic Toggle Error]:', err);
      }
    }
  }, []);

  useEffect(() => {
    if (autoConnect) {
      connectToRoom();
    }
    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect();
      }
      if (audioElRef.current) {
        audioElRef.current.remove();
        audioElRef.current = null;
      }
    };
  }, [autoConnect, connectToRoom]);

  return {
    isConnected,
    isConnecting,
    error,
    participantCount,
    isAgentSpeaking,
    isMicMuted,
    setMicrophoneEnabled,
    connectToRoom,
    disconnectRoom,
    getRoom: () => roomRef.current,
  };
}
