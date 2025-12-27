import { describe, it, expect, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { api } from '../setup/integration.setup.js';
import Conversation from '../../src/models/Conversation.js';
import Message from '../../src/models/Message.js';
import Friendship from '../../src/models/Friendship.js';

const oid = () => new mongoose.Types.ObjectId().toString();

async function seedFriendshipAccepted(a, b) {
  // Con areFriends basta con una dirección.
  // Evita duplicados por el índice unique requester+recipient.
  await Friendship.create({ requester: a, recipient: b, status: 'accepted' });
}

describe('Messaging integration', () => {
  let userA;
  let userB;

  beforeEach(async () => {
    userA = oid();
    userB = oid();
    await Conversation.deleteMany({});
    await Message.deleteMany({});
    await Friendship.deleteMany({});
  });

  it('401 si falta autenticación (x-user-id) en endpoints protegidos', async () => {
    // conversations/direct
    const r1 = await api
      .post('/api/v1/social/conversations/direct')
      .send({ otherUserId: userB });

    expect(r1.status).toBe(401);

    // list conversations
    const r2 = await api.get('/api/v1/social/conversations');
    expect(r2.status).toBe(401);

    // list messages (id cualquiera válido)
    const r3 = await api.get(`/api/v1/social/conversations/${oid()}/messages`);
    expect(r3.status).toBe(401);

    // send message (id cualquiera válido)
    const r4 = await api
      .post(`/api/v1/social/conversations/${oid()}/messages`)
      .send({ text: 'hola' });

    expect(r4.status).toBe(401);
  });

  it('400 si x-user-id no es un ObjectId válido', async () => {
    const r = await api
      .get('/api/v1/social/conversations')
      .set('x-user-id', 'bad-id');

    expect(r.status).toBe(400);
  });

  it('400 si otherUserId es inválido al crear conversación', async () => {
    const r = await api
      .post('/api/v1/social/conversations/direct')
      .set('x-user-id', userA)
      .send({ otherUserId: 'bad-id' });

    expect(r.status).toBe(400);
  });

  it('400 si conversationId es inválido en listMessages y sendMessage', async () => {
    const r1 = await api
      .get('/api/v1/social/conversations/bad-id/messages')
      .set('x-user-id', userA);

    expect(r1.status).toBe(400);

    const r2 = await api
      .post('/api/v1/social/conversations/bad-id/messages')
      .set('x-user-id', userA)
      .send({ text: 'hola' });

    expect(r2.status).toBe(400);
  });

  it('403 si intenta crear conversación directa con alguien que no es amigo', async () => {
    const res = await api
      .post('/api/v1/social/conversations/direct')
      .set('x-user-id', userA)
      .send({ otherUserId: userB });

    expect(res.status).toBe(403);
    expect(res.body).toHaveProperty('error', 'You can only message friends');
  });

  it('403 si usuario autenticado intenta acceder a conversación de la que no es miembro', async () => {
    await seedFriendshipAccepted(userA, userB);

    // Creamos conversación y mensajes entre A y B
    const convoRes = await api
      .post('/api/v1/social/conversations/direct')
      .set('x-user-id', userA)
      .send({ otherUserId: userB });

    expect(convoRes.status).toBe(200);
    const conversationId = convoRes.body.conversation._id;

    const sendOk = await api
      .post(`/api/v1/social/conversations/${conversationId}/messages`)
      .set('x-user-id', userA)
      .send({ text: 'hola' });

    expect(sendOk.status).toBe(201);

    // Tercer usuario intenta leer
    const userC = oid();

    const r1 = await api
      .get(`/api/v1/social/conversations/${conversationId}/messages`)
      .set('x-user-id', userC);

    expect(r1.status).toBe(403);

    // Tercer usuario intenta enviar
    const r2 = await api
      .post(`/api/v1/social/conversations/${conversationId}/messages`)
      .set('x-user-id', userC)
      .send({ text: 'intruso' });

    expect(r2.status).toBe(403);
  });

  it('400 si text está vacío o supera 1000 al enviar mensaje', async () => {
    await seedFriendshipAccepted(userA, userB);

    const convoRes = await api
      .post('/api/v1/social/conversations/direct')
      .set('x-user-id', userA)
      .send({ otherUserId: userB });

    expect(convoRes.status).toBe(200);
    const conversationId = convoRes.body.conversation._id;

    // vacío/espacios
    const r1 = await api
      .post(`/api/v1/social/conversations/${conversationId}/messages`)
      .set('x-user-id', userA)
      .send({ text: '   ' });

    expect(r1.status).toBe(400);

    // >1000
    const r2 = await api
      .post(`/api/v1/social/conversations/${conversationId}/messages`)
      .set('x-user-id', userA)
      .send({ text: 'a'.repeat(1001) });

    expect(r2.status).toBe(400);
  });

  it('lastMessageText se recorta a 200 caracteres en DB', async () => {
    await seedFriendshipAccepted(userA, userB);

    const convoRes = await api
      .post('/api/v1/social/conversations/direct')
      .set('x-user-id', userA)
      .send({ otherUserId: userB });

    expect(convoRes.status).toBe(200);
    const conversationId = convoRes.body.conversation._id;

    const longText = 'a'.repeat(250);

    const sendRes = await api
      .post(`/api/v1/social/conversations/${conversationId}/messages`)
      .set('x-user-id', userA)
      .send({ text: longText });

    expect(sendRes.status).toBe(201);

    const convo = await Conversation.findById(conversationId).lean();
    expect(convo.lastMessageText).toHaveLength(200);
  });

  it('POST /api/v1/social/conversations/direct crea conversación y es única por pareja', async () => {
    await seedFriendshipAccepted(userA, userB);

    const res1 = await api
      .post('/api/v1/social/conversations/direct')
      .set('x-user-id', userA)
      .send({ otherUserId: userB });

    expect(res1.status).toBe(200);
    expect(res1.body).toHaveProperty('conversation');
    const convoId1 = res1.body.conversation._id;

    const res2 = await api
      .post('/api/v1/social/conversations/direct')
      .set('x-user-id', userB)
      .send({ otherUserId: userA });

    expect(res2.status).toBe(200);
    expect(res2.body).toHaveProperty('conversation');
    expect(res2.body.conversation._id).toBe(convoId1);

    expect(await Conversation.countDocuments()).toBe(1);
  });

  it('POST /api/v1/social/conversations/direct rechaza conversación consigo mismo', async () => {
    const res = await api
      .post('/api/v1/social/conversations/direct')
      .set('x-user-id', userA)
      .send({ otherUserId: userA });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('POST /api/v1/social/conversations/:id/messages crea mensaje y actualiza lastMessage*', async () => {
    await seedFriendshipAccepted(userA, userB);

    const convoRes = await api
      .post('/api/v1/social/conversations/direct')
      .set('x-user-id', userA)
      .send({ otherUserId: userB });

    expect(convoRes.status).toBe(200);
    const conversationId = convoRes.body.conversation._id;

    const sendRes = await api
      .post(`/api/v1/social/conversations/${conversationId}/messages`)
      .set('x-user-id', userA)
      .send({ text: '  hola mundo  ' });

    expect(sendRes.status).toBe(201);
    expect(sendRes.body.message.text).toBe('hola mundo');

    const convo = await Conversation.findById(conversationId).lean();
    expect(convo.lastMessageText).toBe('hola mundo');
    expect(convo.lastMessageAt).toBeTruthy();
  });

  it('GET /api/v1/social/conversations/:id/messages devuelve en orden cronológico (old -> new)', async () => {
    await seedFriendshipAccepted(userA, userB);

    const convoRes = await api
      .post('/api/v1/social/conversations/direct')
      .set('x-user-id', userA)
      .send({ otherUserId: userB });

    expect(convoRes.status).toBe(200);
    const conversationId = convoRes.body.conversation._id;

    const r1 = await api
      .post(`/api/v1/social/conversations/${conversationId}/messages`)
      .set('x-user-id', userA)
      .send({ text: 'uno' });
    expect(r1.status).toBe(201);

    const r2 = await api
      .post(`/api/v1/social/conversations/${conversationId}/messages`)
      .set('x-user-id', userA)
      .send({ text: 'dos' });
    expect(r2.status).toBe(201);

    const listRes = await api
      .get(`/api/v1/social/conversations/${conversationId}/messages`)
      .set('x-user-id', userA);

    expect(listRes.status).toBe(200);
    expect(listRes.body.items.map((m) => m.text)).toEqual(['uno', 'dos']);
  });

  it('GET /api/v1/social/conversations no lista conversaciones vacías (sin mensajes)', async () => {
    await seedFriendshipAccepted(userA, userB);

    const convoRes = await api
      .post('/api/v1/social/conversations/direct')
      .set('x-user-id', userA)
      .send({ otherUserId: userB });

    expect(convoRes.status).toBe(200);

    const res = await api
      .get('/api/v1/social/conversations')
      .set('x-user-id', userA);

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(0);
  });

  it('GET /api/v1/social/conversations lista conversaciones con mensajes y devuelve otherUserId', async () => {
    await seedFriendshipAccepted(userA, userB);

    const convoRes = await api
      .post('/api/v1/social/conversations/direct')
      .set('x-user-id', userA)
      .send({ otherUserId: userB });

    expect(convoRes.status).toBe(200);
    const conversationId = convoRes.body.conversation._id;

    const sendRes = await api
      .post(`/api/v1/social/conversations/${conversationId}/messages`)
      .set('x-user-id', userA)
      .send({ text: 'hola' });

    expect(sendRes.status).toBe(201);

    const res = await api
      .get('/api/v1/social/conversations')
      .set('x-user-id', userA);

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toHaveProperty('otherUserId', userB);
    expect(res.body.items[0]).toHaveProperty('lastMessageText', 'hola');
  });

  it('GET /conversations/:id/messages pagina con limit y before (hasMore/nextCursor coherentes)', async () => {
    await seedFriendshipAccepted(userA, userB);

    // 1) Creamos conversación
    const convoRes = await api
      .post('/api/v1/social/conversations/direct')
      .set('x-user-id', userA)
      .send({ otherUserId: userB });

    expect(convoRes.status).toBe(200);
    const conversationId = convoRes.body.conversation._id;

    // 2) Insertamos 4 mensajes directamente en DB con createdAt controlado
    const t1 = new Date('2025-01-01T10:00:00.000Z');
    const t2 = new Date('2025-01-01T10:01:00.000Z');
    const t3 = new Date('2025-01-01T10:02:00.000Z');
    const t4 = new Date('2025-01-01T10:03:00.000Z');

    await Message.insertMany([
      {
        conversationId,
        senderId: userA,
        text: 'm1',
        createdAt: t1,
        updatedAt: t1,
      },
      {
        conversationId,
        senderId: userA,
        text: 'm2',
        createdAt: t2,
        updatedAt: t2,
      },
      {
        conversationId,
        senderId: userA,
        text: 'm3',
        createdAt: t3,
        updatedAt: t3,
      },
      {
        conversationId,
        senderId: userA,
        text: 'm4',
        createdAt: t4,
        updatedAt: t4,
      },
    ]);

    // 3) Primera página: limit=2 debe devolver los 2 más recientes, pero en orden cronológico (old->new)
    const page1 = await api
      .get(`/api/v1/social/conversations/${conversationId}/messages`)
      .set('x-user-id', userA)
      .query({ limit: 2 });

    expect(page1.status).toBe(200);
    expect(page1.body.hasMore).toBe(true);
    expect(page1.body.items.map((m) => m.text)).toEqual(['m3', 'm4']);

    const nextCursor1 = page1.body.nextCursor;
    expect(nextCursor1).toBeTruthy();

    // nextCursor es el createdAt del más antiguo de la página devuelta => m3 (t3)
    expect(new Date(nextCursor1).toISOString()).toBe(t3.toISOString());

    // 4) Segunda página: before=nextCursor debe devolver lo anterior a t3 => m1,m2 (orden cronológico)
    const page2 = await api
      .get(`/api/v1/social/conversations/${conversationId}/messages`)
      .set('x-user-id', userA)
      .query({ limit: 2, before: nextCursor1 });

    expect(page2.status).toBe(200);
    expect(page2.body.hasMore).toBe(false);
    expect(page2.body.items.map((m) => m.text)).toEqual(['m1', 'm2']);

    const nextCursor2 = page2.body.nextCursor;
    expect(new Date(nextCursor2).toISOString()).toBe(t1.toISOString());
  });

  it('GET /conversations pagina con limit y cursor (hasMore/nextCursor coherentes)', async () => {
    // Creamos 3 conversaciones con mensajes, y forzamos lastMessageAt distintos
    const userC = oid();
    const userD = oid();
    const userE = oid();

    await seedFriendshipAccepted(userA, userC);
    await seedFriendshipAccepted(userA, userD);
    await seedFriendshipAccepted(userA, userE);

    const c1 = await api
      .post('/api/v1/social/conversations/direct')
      .set('x-user-id', userA)
      .send({ otherUserId: userC });
    expect(c1.status).toBe(200);

    const c2 = await api
      .post('/api/v1/social/conversations/direct')
      .set('x-user-id', userA)
      .send({ otherUserId: userD });
    expect(c2.status).toBe(200);

    const c3 = await api
      .post('/api/v1/social/conversations/direct')
      .set('x-user-id', userA)
      .send({ otherUserId: userE });
    expect(c3.status).toBe(200);

    const id1 = c1.body.conversation._id;
    const id2 = c2.body.conversation._id;
    const id3 = c3.body.conversation._id;

    // Metemos un mensaje en cada conversación y controlamos createdAt
    const t1 = new Date('2025-02-01T10:00:00.000Z');
    const t2 = new Date('2025-02-01T10:01:00.000Z');
    const t3 = new Date('2025-02-01T10:02:00.000Z');

    await Message.insertMany([
      {
        conversationId: id1,
        senderId: userA,
        text: 'c1',
        createdAt: t1,
        updatedAt: t1,
      },
      {
        conversationId: id2,
        senderId: userA,
        text: 'c2',
        createdAt: t2,
        updatedAt: t2,
      },
      {
        conversationId: id3,
        senderId: userA,
        text: 'c3',
        createdAt: t3,
        updatedAt: t3,
      },
    ]);

    // Actualizamos lastMessageAt/lastMessageText para que listConversations las incluya
    await Conversation.updateOne(
      { _id: id1 },
      { $set: { lastMessageAt: t1, lastMessageText: 'c1' } }
    );
    await Conversation.updateOne(
      { _id: id2 },
      { $set: { lastMessageAt: t2, lastMessageText: 'c2' } }
    );
    await Conversation.updateOne(
      { _id: id3 },
      { $set: { lastMessageAt: t3, lastMessageText: 'c3' } }
    );

    // Página 1: limit=2 => devuelve las 2 más recientes (t3, t2)
    const page1 = await api
      .get('/api/v1/social/conversations')
      .set('x-user-id', userA)
      .query({ limit: 2 });

    expect(page1.status).toBe(200);
    expect(page1.body.items).toHaveLength(2);
    expect(page1.body.hasMore).toBe(true);

    // Orden esperado: c3 (t3) primero, luego c2 (t2)
    expect(page1.body.items[0].lastMessageText).toBe('c3');
    expect(page1.body.items[1].lastMessageText).toBe('c2');

    const cursor = page1.body.nextCursor;
    expect(cursor).toBeTruthy();
    expect(new Date(cursor).toISOString()).toBe(t2.toISOString());

    // Página 2: cursor=t2 => devuelve c1
    const page2 = await api
      .get('/api/v1/social/conversations')
      .set('x-user-id', userA)
      .query({ limit: 2, cursor });

    expect(page2.status).toBe(200);
    expect(page2.body.items).toHaveLength(1);
    expect(page2.body.hasMore).toBe(false);
    expect(page2.body.items[0].lastMessageText).toBe('c1');
  });
});
