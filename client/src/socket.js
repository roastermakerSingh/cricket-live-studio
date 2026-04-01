import { io } from 'socket.io-client';

const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:3001';

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(SERVER_URL, { transports: ['websocket'], reconnectionAttempts: 10 });
  }
  return socket;
}

export default getSocket;
