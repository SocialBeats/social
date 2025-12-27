import { Server } from 'socket.io';
import mongoose from 'mongoose';

export function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  io.on('connection', (socket) => {
    // V1: identificamos por query/header (lo más simple en dev)
    const userId =
      socket.handshake.auth?.userId || socket.handshake.query?.userId;

    if (!userId || !mongoose.isValidObjectId(userId)) {
      socket.disconnect(true);
      return;
    }

    // Room por usuario
    socket.join(String(userId));
  });

  return io;
}

// helper para emitir a un usuario
export function emitToUser(io, userId, event, payload) {
  io.to(String(userId)).emit(event, payload);
}
