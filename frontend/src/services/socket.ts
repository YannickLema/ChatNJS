import { io, type Socket } from 'socket.io-client';

export function createSocket(token: string): Socket {
  return io(import.meta.env.VITE_WS_URL, {
    auth: { token: `Bearer ${token}` },
  });
}

