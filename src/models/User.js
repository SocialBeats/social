import mongoose from 'mongoose';

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    _id: { type: Schema.Types.ObjectId, required: true },
    userId: { type: Schema.Types.ObjectId, required: true },
    username: { type: String, required: true, trim: true },
    full_name: { type: String, default: '', trim: true },
    avatar: { type: String, default: '', trim: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'users' }
);

// Indexes for search and consistency
userSchema.index({ userId: 1 }, { unique: true });
userSchema.index({ username: 1 });
userSchema.index({ full_name: 1 });
userSchema.index({ username: 'text', full_name: 'text' });

export default mongoose.model('User', userSchema);
