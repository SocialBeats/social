import mongoose from 'mongoose';
import Friendship from '../models/Friendship.js';
import logger from '../../logger.js';

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const getUserIdFromReq = (req) => req.user?.sub || req.user?.id;

const userExists = async (id) => {
  if (!isValidId(id)) return false;
  try {
    const obj = await mongoose.connection
      .collection('users')
      .findOne({ _id: new mongoose.Types.ObjectId(id) });
    return !!obj;
  } catch (err) {
    logger.error(`userExists error: ${err.message}`);
    return false;
  }
};

export const areFriends = async (userA, userB) => {
  if (!isValidId(userA) || !isValidId(userB)) return false;
  const existing = await Friendship.findOne({
    $or: [
      { requester: userA, recipient: userB, status: 'accepted' },
      { requester: userB, recipient: userA, status: 'accepted' },
    ],
  });
  return !!existing;
};

export const sendRequest = async (req, res) => {
  const requesterId = getUserIdFromReq(req);
  const { recipientId } = req.body;

  if (!isValidId(requesterId) || !isValidId(recipientId)) {
    return res.status(400).json({ message: 'Invalid user id' });
  }
  if (requesterId === recipientId) {
    return res.status(400).json({ message: 'Cannot send request to yourself' });
  }

  try {
    const recipientFound = await userExists(recipientId);
    if (!recipientFound)
      return res.status(404).json({ message: 'Recipient user not found' });

    const alreadyFriends = await areFriends(requesterId, recipientId);
    if (alreadyFriends)
      return res.status(409).json({ message: 'Users are already friends' });

    const existing = await Friendship.findOne({
      $or: [
        { requester: requesterId, recipient: recipientId },
        { requester: recipientId, recipient: requesterId },
      ],
    });

    if (existing) {
      if (existing.status === 'pending') {
        // If the pending request is in the reverse direction (recipient -> requester),
        // accept it and return the updated document.
        if (
          existing.requester &&
          existing.recipient &&
          existing.requester.toString() === recipientId &&
          existing.recipient.toString() === requesterId
        ) {
          existing.status = 'accepted';
          await existing.save();
          return res.status(200).json(existing);
        }
        return res.status(409).json({ message: 'Request already pending' });
      }
      if (existing.status === 'accepted') {
        return res.status(409).json({ message: 'You are already friends' });
      }
      // if previously rejected, allow new request only if the previous requester is the same as current requester
      if (
        existing.status === 'rejected' &&
        existing.requester.toString() === requesterId
      ) {
        // recreate by updating existing doc to pending (avoid duplicates)
        existing.status = 'pending';
        existing.requester = requesterId;
        existing.recipient = recipientId;
        await existing.save();
        return res.status(200).json(existing);
      }
    }

    const doc = new Friendship({
      requester: requesterId,
      recipient: recipientId,
    });
    await doc.save();
    return res.status(201).json(doc);
  } catch (err) {
    logger.error(`sendRequest error: ${err.message}`);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const listReceived = async (req, res) => {
  const userId = getUserIdFromReq(req);
  if (!isValidId(userId))
    return res.status(400).json({ message: 'Invalid user id' });

  try {
    const received = await Friendship.find({
      recipient: userId,
      status: 'pending',
    }).sort({ createdAt: -1 });
    return res.status(200).json(received);
  } catch (err) {
    logger.error(`listReceived error: ${err.message}`);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const respondRequest = async (req, res) => {
  const userId = getUserIdFromReq(req);
  const { id } = req.params;
  const { action } = req.body;

  if (!isValidId(userId) || !isValidId(id))
    return res.status(400).json({ message: 'Invalid id' });
  if (!['accept', 'reject'].includes(action))
    return res.status(400).json({ message: 'Invalid action' });

  try {
    const requestDoc = await Friendship.findById(id);
    if (!requestDoc)
      return res.status(404).json({ message: 'Request not found' });
    if (requestDoc.recipient.toString() !== userId)
      return res.status(403).json({ message: 'Not allowed' });
    if (requestDoc.status !== 'pending')
      return res.status(409).json({ message: 'Request already processed' });

    requestDoc.status = action === 'accept' ? 'accepted' : 'rejected';
    await requestDoc.save();
    return res.status(200).json(requestDoc);
  } catch (err) {
    logger.error(`respondRequest error: ${err.message}`);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const listFriends = async (req, res) => {
  const userId = getUserIdFromReq(req);
  if (!isValidId(userId))
    return res.status(400).json({ message: 'Invalid user id' });

  try {
    const friendships = await Friendship.find({
      $or: [{ requester: userId }, { recipient: userId }],
      status: 'accepted',
    });

    const friends = friendships.map((f) =>
      f.requester.toString() === userId ? f.recipient : f.requester
    );
    return res.status(200).json({ friends });
  } catch (err) {
    logger.error(`listFriends error: ${err.message}`);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const removeFriend = async (req, res) => {
  const userId = getUserIdFromReq(req);
  const { id: otherId } = req.params;
  if (!isValidId(userId) || !isValidId(otherId))
    return res.status(400).json({ message: 'Invalid id' });

  try {
    const removed = await Friendship.findOneAndDelete({
      $or: [
        { requester: userId, recipient: otherId, status: 'accepted' },
        { requester: otherId, recipient: userId, status: 'accepted' },
      ],
    });
    if (!removed)
      return res.status(404).json({ message: 'Friendship not found' });
    return res.status(200).json({ message: 'Friendship removed' });
  } catch (err) {
    logger.error(`removeFriend error: ${err.message}`);
    return res.status(500).json({ message: 'Server error' });
  }
};
