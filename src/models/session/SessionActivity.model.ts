import mongoose, { Schema, Model } from 'mongoose';
import { SessionActivity } from '../interfaces/session.interface';

const SessionActivitySchema = new Schema<SessionActivity>({
  _id: { type: String, required: true },
  sessionId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  action: { 
    type: String, 
    enum: ['login', 'logout', 'refresh', 'activity', 'timeout'],
    required: true 
  },
  timestamp: { type: Date, required: true, default: Date.now },
  details: {
    route: { type: String },
    method: { type: String },
    userAgent: { type: String },
    ip: { type: String },
  },
}, {
  timestamps: true,
  collection: 'session_activities'
});

// 🎯 ÍNDICES
SessionActivitySchema.index({ sessionId: 1, timestamp: -1 });
SessionActivitySchema.index({ userId: 1, timestamp: -1 });
SessionActivitySchema.index({ timestamp: -1 });

export const SessionActivityModel: Model<SessionActivity> = mongoose.model<SessionActivity>(
  'SessionActivity', 
  SessionActivitySchema
);