import { Schema, model } from "mongoose";

const querySchema = new Schema({
  //Basic info
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true
  },
  message: {
    type: String,
    required: [true, 'Message is required']
  },
  //Source Information
  channel: {
    type: String,
    enum: ['email', 'twitter', 'facebook', 'instagram', 'chat', 'phone', 'website'],
    required: true
  },
  customerName: {
    type: String,
    required: true,
    trim: true
  },
  customerEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  customerPhone: {
    type: String,
    default: null
  },
  //AI-Generated fields
  category: {
    type: String,
    enum: ['question', 'request', 'complaint', 'feedback', 'technical', 'billing', 'other'],
    default: 'other'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  sentiment: {
    type: String,
    enum: ['positive', 'neutral', 'negative'],
    default: 'neutral'
  },
  tags: [{
    type: String,
    trim: true
  }],
  aiSummary: {
    type: String,
    default: null
  },
  suggestedResponse: {
    type: String,
    default: null
  },
  //Assignment & status
  status: {
    type: String,
    enum: ['new', 'assigned', 'in-progress', 'pending', 'resolved', 'closed'],
    default: 'new'
  },
  assignedTo: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  assignedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  assignedAt: {
    type: Date,
    default: null
  },
  //Response tracking
  firstResponseAt: {
    type: Date,
    default: null
  },
  resolvedAt: {
    type: Date,
    default: null
  },
  closedAt: {
    type: Date,
    default: null
  },
  //Response time metrics (in minutes)
  responseTime: {
    type: Number,
    default: null
  },
  resolutionTime: {
    type: Number,
    default: null
  },
  //Notes & History
  internalNotes: [{
    note: String,
    addedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  //Responses
  responses: [{
    message: String,
    respondedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    respondedAt: {
      type: Date,
      default: Date.now
    }
  }],
  //Flags
  isEscalated: {
    type: Boolean,
    default: false
  },
  isSpam: {
    type: Boolean,
    default: false
  }
}, { timestamps: true })

// Indexes for faster queries
querySchema.index({ status: 1, priority: -1, createdAt: -1 })
querySchema.index({ assignedTo: 1, status: 1 })
querySchema.index({ channel: 1 })
querySchema.index({ category: 1 })
querySchema.index({ customerEmail: 1 })


// Calculate response time when first response is added
querySchema.pre('save', function (next) {
  if (this.isModified('firstResponseAt') && this.firstResponseAt && !this.responseTime) {
    this.responseTime = Math.round((this.firstResponseAt - this.createdAt) / 60000) // in minutes
  }

  if (this.isModified('resolvedAt') && this.resolvedAt && !this.resolutionTime) {
    this.resolutionTime = Math.round((this.resolvedAt - this.createdAt) / 60000) // in minutes
  }

  next();
})


export const Query = model("Query", querySchema)