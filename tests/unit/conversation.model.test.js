import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import Conversation, {
  validateTwoDistinctParticipants,
} from '../../src/models/Conversation';

const RAW_ID_A = new mongoose.Types.ObjectId();
const RAW_ID_B = new mongoose.Types.ObjectId();
const RAW_ID_C = new mongoose.Types.ObjectId();

// Calculamos y garantizamos el orden lexicográfico de los IDs para la prueba.
const SORTED_PARTICIPANTS = [RAW_ID_A, RAW_ID_B].sort((a, b) =>
  a.toString().localeCompare(b.toString())
);

const PARTICIPANTS_ORDERED = SORTED_PARTICIPANTS;
const PARTICIPANTS_UNORDERED = [...SORTED_PARTICIPANTS].reverse();

// La clave esperada, usando el orden garantizado
const EXPECTED_KEY = `${PARTICIPANTS_ORDERED[0].toString()}-${PARTICIPANTS_ORDERED[1].toString()}`;

describe('Conversation Model Unit Tests', () => {
  //
  // 1) Tests de la función pura de validación
  //
  describe('Validation Logic', () => {
    it('should pass validation for two distinct participants', () => {
      expect(validateTwoDistinctParticipants(PARTICIPANTS_ORDERED)).toBe(true);
    });

    it('should fail validation for only one participant', () => {
      expect(validateTwoDistinctParticipants([RAW_ID_A])).toBe(false);
    });

    it('should fail validation for more than two participants', () => {
      expect(
        validateTwoDistinctParticipants([RAW_ID_A, RAW_ID_B, RAW_ID_C])
      ).toBe(false);
    });

    it('should fail validation for two identical participants', () => {
      expect(validateTwoDistinctParticipants([RAW_ID_A, RAW_ID_A])).toBe(false);
    });
  });

  //
  // 2) Hook pre('validate'): orden y generación de conversationKey
  //
  describe('Pre-Validate Hook Logic (Ordering and Key Generation)', () => {
    const mockLastMessage = {
      text: 'Test message',
      timestamp: new Date(),
      senderId: RAW_ID_A,
    };

    it('should order participants and generate the key when participants are unordered', async () => {
      const conversation = new Conversation({
        participants: PARTICIPANTS_UNORDERED,
        lastMessage: mockLastMessage,
        // conversationKey no hace falta, la genera el hook
      });

      await conversation.validate(); // dispara pre('validate')

      expect(conversation.participants[0].toString()).toBe(
        PARTICIPANTS_ORDERED[0].toString()
      );
      expect(conversation.participants[1].toString()).toBe(
        PARTICIPANTS_ORDERED[1].toString()
      );

      expect(conversation.conversationKey).toBe(EXPECTED_KEY);
    });

    it('should generate the correct key when participants are already ordered', async () => {
      const conversation = new Conversation({
        participants: PARTICIPANTS_ORDERED, // orden correcto
        lastMessage: mockLastMessage,
      });

      await conversation.validate();

      expect(conversation.participants[0].toString()).toBe(
        PARTICIPANTS_ORDERED[0].toString()
      );
      expect(conversation.participants[1].toString()).toBe(
        PARTICIPANTS_ORDERED[1].toString()
      );

      expect(conversation.conversationKey).toBe(EXPECTED_KEY);
    });

    it('should generate the same key for the same pair of users regardless of input order', async () => {
      const lastMessage = {
        text: 'Hello',
        timestamp: new Date(),
        senderId: RAW_ID_A,
      };

      const conv1 = new Conversation({
        participants: [RAW_ID_A, RAW_ID_B],
        lastMessage,
      });

      const conv2 = new Conversation({
        participants: [RAW_ID_B, RAW_ID_A],
        lastMessage,
      });

      await conv1.validate();
      await conv2.validate();

      expect(conv1.conversationKey).toBe(conv2.conversationKey);
    });
  });

  //
  // 3) Campos requeridos
  //
  describe('Schema Requirements (Required Fields)', () => {
    it('should throw an error if lastMessage is missing', () => {
      const conversation = new Conversation({
        participants: PARTICIPANTS_ORDERED,
        conversationKey: EXPECTED_KEY,
        // lastMessage missing
      });

      const error = conversation.validateSync();
      expect(error.errors['lastMessage']).toBeDefined();
      expect(error.errors['lastMessage'].kind).toBe('required');
    });

    it('should throw an error if participants is missing', () => {
      const conversation = new Conversation({
        lastMessage: {
          text: 'Test',
          timestamp: new Date(),
          senderId: RAW_ID_A,
        },
        conversationKey: EXPECTED_KEY,
      });

      const error = conversation.validateSync();
      expect(error.errors['participants']).toBeDefined();
      expect(error.errors['participants'].message).toBe(
        'Debe haber exactamente dos participantes distintos.'
      );
      // No comprobamos .kind porque es "user defined" (validador custom)
    });

    it('should be valid with correct participants and lastMessage', async () => {
      const conversation = new Conversation({
        participants: [RAW_ID_A, RAW_ID_B],
        lastMessage: {
          text: 'Hello',
          timestamp: new Date(),
          senderId: RAW_ID_A,
        },
      });

      await expect(conversation.validate()).resolves.toBeUndefined();
    });
  });

  //
  // 4) Validación de participants a nivel de schema (no solo la función)
  //
  describe('Participants field - schema-level validation', () => {
    it('should fail Conversation validation if participants has only one user', () => {
      const conversation = new Conversation({
        participants: [RAW_ID_A],
        lastMessage: {
          text: 'Test',
          timestamp: new Date(),
          senderId: RAW_ID_A,
        },
        conversationKey: EXPECTED_KEY, // aunque pongamos algo, el validador de participants falla
      });

      const error = conversation.validateSync();
      expect(error.errors['participants']).toBeDefined();
    });

    it('should fail Conversation validation if participants has duplicated users', () => {
      const conversation = new Conversation({
        participants: [RAW_ID_A, RAW_ID_A],
        lastMessage: {
          text: 'Test',
          timestamp: new Date(),
          senderId: RAW_ID_A,
        },
        conversationKey: EXPECTED_KEY,
      });

      const error = conversation.validateSync();
      expect(error.errors['participants']).toBeDefined();
    });
  });

  //
  // 5) Maps: valores por defecto y comportamiento básico
  //
  describe('Maps default values and behavior', () => {
    it('should initialize unreadCount and isDeletedBy as empty maps', async () => {
      const conversation = new Conversation({
        participants: [RAW_ID_A, RAW_ID_B],
        lastMessage: {
          text: 'Test',
          timestamp: new Date(),
          senderId: RAW_ID_A,
        },
      });

      await conversation.validate(); // genera conversationKey y pasa validación

      expect(conversation.unreadCount).toBeInstanceOf(Map);
      expect(conversation.unreadCount.size).toBe(0);

      expect(conversation.isDeletedBy).toBeInstanceOf(Map);
      expect(conversation.isDeletedBy.size).toBe(0);
    });

    it('should allow setting unreadCount entries per user', () => {
      const conversation = new Conversation({
        participants: [RAW_ID_A, RAW_ID_B],
        lastMessage: {
          text: 'Test',
          timestamp: new Date(),
          senderId: RAW_ID_A,
        },
      });

      conversation.unreadCount.set(RAW_ID_A.toString(), 3);
      conversation.unreadCount.set(RAW_ID_B.toString(), 1);

      expect(conversation.unreadCount.get(RAW_ID_A.toString())).toBe(3);
      expect(conversation.unreadCount.get(RAW_ID_B.toString())).toBe(1);
    });
  });
});
