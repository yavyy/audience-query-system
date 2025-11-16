import { Schema, model } from "mongoose";
import bcrypt from 'bcryptjs'

const userSchema = new Schema({
  name: {
    type: String,
    required: [true, 'username is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'password is required'],
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    enum: ['admin', 'manager', 'agent'],
    default: 'agent'
  },
  department: {
    type: String,
    enum: ['support', 'sales', 'technical', 'billing', 'general'],
    default: 'general'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  avatar: {
    type: String,
    default: null
  }
}, { timestamps: true })

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
})
// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password)
}

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password
  return obj
}

export const User = model("User", userSchema);