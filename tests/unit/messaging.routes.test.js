import { describe, it, expect, beforeEach, vi } from 'vitest';

// Vamos a capturar el "router" que devuelve Router()
let routerMock;

// Mock de express.Router
vi.mock('express', () => {
  return {
    Router: vi.fn(() => routerMock),
  };
});

// Mock del middleware y del factory del controller
vi.mock('../../src/middlewares/fakeAuth.js', () => ({
  fakeAuth: vi.fn(),
}));

vi.mock('../../src/controllers/messagingController.js', () => ({
  makeMessagingController: vi.fn(),
}));

import messagingRoutes from '../../src/routes/messagingRoutes.js';
import { makeMessagingController } from '../../src/controllers/messagingController.js';

describe('messagingRoutes unit tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    routerMock = {
      use: vi.fn(),
      post: vi.fn(),
      get: vi.fn(),
    };
  });

  it('monta /api/v1 y registra endpoints correctamente', () => {
    const ioStub = {};
    const controllerStub = {
      upsertDirectConversation: vi.fn(),
      listConversations: vi.fn(),
      listMessages: vi.fn(),
      sendMessage: vi.fn(),
    };

    vi.mocked(makeMessagingController).mockReturnValue(controllerStub);

    const appMock = {
      use: vi.fn(),
    };

    messagingRoutes(appMock, ioStub);

    // controller factory invocado con io
    expect(makeMessagingController).toHaveBeenCalledTimes(1);
    expect(makeMessagingController).toHaveBeenCalledWith(ioStub);

    // Rutas registradas (path + handler)
    expect(routerMock.post).toHaveBeenCalledWith(
      '/conversations/direct',
      controllerStub.upsertDirectConversation
    );
    expect(routerMock.get).toHaveBeenCalledWith(
      '/conversations',
      controllerStub.listConversations
    );
    expect(routerMock.get).toHaveBeenCalledWith(
      '/conversations/:id/messages',
      controllerStub.listMessages
    );
    expect(routerMock.post).toHaveBeenCalledWith(
      '/conversations/:id/messages',
      controllerStub.sendMessage
    );

    // Monta el router bajo el prefijo común
    expect(appMock.use).toHaveBeenCalledTimes(1);
    expect(appMock.use).toHaveBeenCalledWith('/api/v1', routerMock);

    // Importante: fakeAuth se aplica en main.js (a nivel app), no se fuerza aquí.
    // Si en el futuro decidís aplicarlo por router, añadid de nuevo la aserción:
    // expect(routerMock.use).toHaveBeenCalledWith(fakeAuth);
  });
});
