// src/services/friendshipService.js
import mongoose from 'mongoose';

/**
 * Minimal fake implementation for V1.
 * - Same signature as the real service: areFriends(userA, userB) -> boolean
 * - Validates ObjectId format to avoid hiding bugs
 * - If both ids are valid, allows messaging (returns true)
 */
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

export const areFriends = async (userA, userB) => {
  if (!isValidId(userA) || !isValidId(userB)) return false;
  return true;
};
