import { describe, it, expect, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';

// Mock del constructor Server de socket.io (ESM-safe)
vi.mock('socket.io', () => ({
  Server: vi.fn(),
}));

import { Server } from 'socket.io';
import { initSocket, emitToUser } from '../../src/services/socketService.js';

function oid() {
  return new mongoose.Types.ObjectId().toString();
}

describe('socketService unit tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initSocket', () => {
    it('crea Server con CORS esperado y devuelve io', () => {
      const httpServer = {};
      const ioMock = { on: vi.fn() };

      vi.mocked(Server).mockImplementation(() => ioMock);

      const io = initSocket(httpServer);

      expect(Server).toHaveBeenCalledTimes(1);
      expect(Server).toHaveBeenCalledWith(httpServer, {
        cors: { origin: '*', methods: ['GET', 'POST'] },
      });

      expect(io).toBe(ioMock);
      expect(ioMock.on).toHaveBeenCalledWith(
        'connection',
        expect.any(Function)
      );
    });

    it('disconnect(true) si no hay userId en auth ni en query', () => {
      const httpServer = {};

      let onConnection;
      const ioMock = {
        on: vi.fn((event, cb) => {
          if (event === 'connection') onConnection = cb;
        }),
      };

      vi.mocked(Server).mockImplementation(() => ioMock);

      initSocket(httpServer);

      const socket = {
        handshake: { auth: {}, query: {} },
        disconnect: vi.fn(),
        join: vi.fn(),
      };

      onConnection(socket);

      expect(socket.disconnect).toHaveBeenCalledWith(true);
      expect(socket.join).not.toHaveBeenCalled();
    });

    it('disconnect(true) si userId existe pero es inválido', () => {
      const httpServer = {};

      let onConnection;
      const ioMock = {
        on: vi.fn((event, cb) => {
          if (event === 'connection') onConnection = cb;
        }),
      };

      vi.mocked(Server).mockImplementation(() => ioMock);

      initSocket(httpServer);

      const socket = {
        handshake: { auth: { userId: 'bad-id' }, query: {} },
        disconnect: vi.fn(),
        join: vi.fn(),
      };

      onConnection(socket);

      expect(socket.disconnect).toHaveBeenCalledWith(true);
      expect(socket.join).not.toHaveBeenCalled();
    });

    it('join a la room del usuario si userId es válido (auth)', () => {
      const httpServer = {};

      let onConnection;
      const ioMock = {
        on: vi.fn((event, cb) => {
          if (event === 'connection') onConnection = cb;
        }),
      };

      vi.mocked(Server).mockImplementation(() => ioMock);

      initSocket(httpServer);

      const userId = oid();
      const socket = {
        handshake: { auth: { userId }, query: {} },
        disconnect: vi.fn(),
        join: vi.fn(),
      };

      onConnection(socket);

      expect(socket.disconnect).not.toHaveBeenCalled();
      expect(socket.join).toHaveBeenCalledWith(String(userId));
    });

    it('usa query.userId si auth.userId no está (y es válido)', () => {
      const httpServer = {};

      let onConnection;
      const ioMock = {
        on: vi.fn((event, cb) => {
          if (event === 'connection') onConnection = cb;
        }),
      };

      vi.mocked(Server).mockImplementation(() => ioMock);

      initSocket(httpServer);

      const userId = oid();
      const socket = {
        handshake: { auth: undefined, query: { userId } },
        disconnect: vi.fn(),
        join: vi.fn(),
      };

      onConnection(socket);

      expect(socket.disconnect).not.toHaveBeenCalled();
      expect(socket.join).toHaveBeenCalledWith(String(userId));
    });
  });

  describe('emitToUser', () => {
    it('emite al room del userId (string) con el evento y payload', () => {
      const emit = vi.fn();
      const to = vi.fn(() => ({ emit }));
      const io = { to };

      const userId = oid();
      const payload = { a: 1 };

      emitToUser(io, userId, 'message:new', payload);

      expect(to).toHaveBeenCalledWith(String(userId));
      expect(emit).toHaveBeenCalledWith('message:new', payload);
    });
  });
});
