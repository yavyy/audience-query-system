import { Schema, model } from "mongoose";

const tagSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  color: {
    type: String,
    default: '#3B82F6' // default blue color
  },
  description: {
    type: String,
    default: null
  },
  usageCount: {
    type: Number,
    default: null
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: "User"
  }
}, {timestamps: true})

tagSchema.index({name: 1})

export const Tag = model("Tag", tagSchema)