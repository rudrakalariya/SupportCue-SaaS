const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return this.senderRole !== 'ai';
    }
  },
  senderRole: {
    type: String,
    enum: ['customer', 'agent', 'ai'],
    required: true
  },
  text: {
    type: String,
    required: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const chatSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    default: null,
    index: true
  },
  isAnonymous: {
    type: Boolean,
    default: false,
    index: true
  },
  assignedAgentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  mode: {
    type: String,
    enum: ['ai', 'human'],
    default: 'ai',
    index: true
  },
  messages: [messageSchema],
  lastInteraction: {
    type: Date,
    default: Date.now,
    index: true
  },
  status: {
    type: String,
    enum: ['open', 'closed'],
    default: 'open'
  }
}, {
  timestamps: true
});

// Method to add message and update lastInteraction
chatSchema.methods.addMessage = function(messageData) {
  this.messages.push(messageData);
  this.lastInteraction = new Date();
  // Auto-open chat on any new message
  this.status = 'open';
  return this.save();
};

// Method to get last N messages
chatSchema.methods.getLastMessages = function(count = 15) {
  return this.messages.slice(-count);
};

// Method to check if chat is active
chatSchema.methods.isActive = function() {
  return this.status === 'open';
};

// Method to take over by agent
chatSchema.methods.takeOver = function(agentId) {
  this.mode = 'human';
  this.assignedAgentId = agentId;
  this.lastInteraction = new Date();
  return this.save();
};

module.exports = mongoose.model('Chat', chatSchema);
