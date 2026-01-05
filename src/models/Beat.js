import mongoose from 'mongoose';

const { Schema } = mongoose;

const beatSchema = new Schema(
  {
    beatId: { type: Schema.Types.ObjectId, required: true, unique: true },
    title: { type: String, required: true },
    artist: { type: String },
    thumbnailUrl: { type: String },
    isPublic: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('Beat', beatSchema);
