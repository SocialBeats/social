import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import Message from '../../src/models/Message';

const RAW_CONVERSATION_ID = new mongoose.Types.ObjectId();
const RAW_SENDER_ID = new mongoose.Types.ObjectId();

describe('Message Model Unit Tests', () => {
  //
  // 1) Campos requeridos
  //
  describe('Schema Requirements (Required Fields)', () => {
    it('should be valid with conversationId, senderId and non-empty text', async () => {
      const msg = new Message({
        conversationId: RAW_CONVERSATION_ID,
        senderId: RAW_SENDER_ID,
        text: 'Hola, este es un mensaje válido',
      });

      await expect(msg.validate()).resolves.toBeUndefined();
    });

    it('should throw an error if conversationId is missing', () => {
      const msg = new Message({
        // conversationId missing
        senderId: RAW_SENDER_ID,
        text: 'Mensaje sin conversationId',
      });

      const error = msg.validateSync();
      expect(error.errors['conversationId']).toBeDefined();
      expect(error.errors['conversationId'].kind).toBe('required');
    });

    it('should throw an error if senderId is missing', () => {
      const msg = new Message({
        conversationId: RAW_CONVERSATION_ID,
        // senderId missing
        text: 'Mensaje sin senderId',
      });

      const error = msg.validateSync();
      expect(error.errors['senderId']).toBeDefined();
      expect(error.errors['senderId'].kind).toBe('required');
    });

    it('should throw an error if text is missing', () => {
      const msg = new Message({
        conversationId: RAW_CONVERSATION_ID,
        senderId: RAW_SENDER_ID,
        // text missing
      });

      const error = msg.validateSync();
      expect(error.errors['text']).toBeDefined();
      expect(error.errors['text'].kind).toBe('required');
      expect(error.errors['text'].message).toBe(
        'El mensaje no puede estar vacío.'
      );
    });
  });

  //
  // 2) Validación de text (trim + custom validator)
  //
  describe('Text field - trimming and required validation', () => {
    it('should trim text automatically', async () => {
      const msg = new Message({
        conversationId: RAW_CONVERSATION_ID,
        senderId: RAW_SENDER_ID,
        text: '   Hola con espacios   ',
      });

      await msg.validate(); // dispara la validación pero no guarda en BD

      expect(msg.text).toBe('Hola con espacios');
    });

    it('should fail validation if text is only whitespace', () => {
      const msg = new Message({
        conversationId: RAW_CONVERSATION_ID,
        senderId: RAW_SENDER_ID,
        text: '     ', // solo espacios
      });

      const error = msg.validateSync();

      expect(error.errors['text']).toBeDefined();
      expect(error.errors['text'].kind).toBe('required');
      expect(error.errors['text'].message).toBe(
        'El mensaje no puede estar vacío.'
      );
    });

    it('should pass validation for a minimal non-empty text', async () => {
      const msg = new Message({
        conversationId: RAW_CONVERSATION_ID,
        senderId: RAW_SENDER_ID,
        text: 'a',
      });

      await expect(msg.validate()).resolves.toBeUndefined();
    });
  });

  //
  // 3) Tipos de ObjectId en conversationId y senderId
  //
  describe('ObjectId fields (conversationId and senderId)', () => {
    it('should accept valid ObjectId values for conversationId and senderId', async () => {
      const msg = new Message({
        conversationId: RAW_CONVERSATION_ID,
        senderId: RAW_SENDER_ID,
        text: 'Mensaje con IDs válidos',
      });

      await expect(msg.validate()).resolves.toBeUndefined();
    });

    it('should cast string ObjectId values correctly', async () => {
      const msg = new Message({
        conversationId: RAW_CONVERSATION_ID.toString(),
        senderId: RAW_SENDER_ID.toString(),
        text: 'Mensaje con IDs como string',
      });

      await expect(msg.validate()).resolves.toBeUndefined();

      expect(msg.conversationId).toBeInstanceOf(mongoose.Types.ObjectId);
      expect(msg.senderId).toBeInstanceOf(mongoose.Types.ObjectId);
    });
  });
});
