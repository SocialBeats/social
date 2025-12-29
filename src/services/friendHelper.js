import mongoose from 'mongoose';
import Friendship from '../models/Friendship.js';

/**
 * Get list of friend IDs for a given user
 * @param {string|ObjectId} userId
 * @returns {Promise<string[]>} Array of friend IDs as strings
 */
export async function getFriendIds(userId) {
  const userObjId = asObjectId(userId);
  if (!userObjId) return [];

  const friendships = await Friendship.find(
    {
      $or: [{ requester: userObjId }, { recipient: userObjId }],
      status: 'accepted',
    },
    { requester: 1, recipient: 1 }
  ).lean();

  const friendIds = new Set();
  friendships.forEach((f) => {
    const requester = f?.requester?.toString?.();
    const recipient = f?.recipient?.toString?.();
    if (requester && recipient) {
      if (requester === userObjId.toString()) {
        friendIds.add(recipient);
      } else {
        friendIds.add(requester);
      }
    }
  });

  return Array.from(friendIds);
}

/**
 * Convert ID to ObjectId if valid, else return null
 * @param {string|ObjectId} id
 * @returns {ObjectId|null}
 */
export function asObjectId(id) {
  if (!id || !mongoose.isValidObjectId(id)) return null;
  return new mongoose.Types.ObjectId(String(id));
}
