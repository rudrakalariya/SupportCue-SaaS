const Chat = require('../models/Chat');
const User = require('../models/User');
const mongoose = require('mongoose');

// Create a new chat for a customer
const createChat = async (req, res) => {
  try {
    // Support both authenticated and anonymous/demo customers
    // If user is authenticated, always use their ID, ignore body data
    let customerId = req.user?._id || req.body.customerId;
    const customerName = req.user?.name || req.body.customerName || 'Customer';
    const customerEmail = req.user?.email;
    
    console.log('Creating chat with data:', { customerId, customerName, customerEmail });
    console.log('Request user:', req.user ? { id: req.user._id, name: req.user.name } : 'No authenticated user');

    // Validation: allow anonymous/demo by generating an ObjectId when invalid
    let isAnonymous = false;
    if (!customerId || !mongoose.Types.ObjectId.isValid(customerId)) {
      console.log('Invalid customer ID provided, generating anonymous ID:', customerId);
      customerId = new mongoose.Types.ObjectId();
      isAnonymous = true;
    } else if (!req.user?._id) {
      // If no authenticated user but valid ObjectId provided, mark as anonymous
      console.log('No authenticated user, marking chat as anonymous');
      isAnonymous = true;
    } else {
      console.log('Authenticated user found, chat will be associated with user:', req.user._id);
    }

    // If authenticated, ensure valid user exists; else allow demo/anonymous
    if (req.user?._id) {
      const customer = await User.findById(customerId);
      if (!customer) {
        console.log('Customer not found:', customerId);
        return res.status(404).json({ error: 'Customer not found' });
      }
      console.log('Customer found:', customer.name);
    }

    // Create new chat (allow multiple chats per customer)
    const chat = new Chat({
      customerId,
      isAnonymous,
      mode: 'ai',
      status: 'open',
      messages: [{
        senderRole: 'ai',
        text: 'Hello! I\'m your AI support assistant. How can I help you today?',
        createdAt: new Date()
      }]
    });


    await chat.save();

    res.status(201).json({
      message: 'Chat created successfully',
      chat,
      chatId: chat._id
    });

  } catch (error) {
    console.error('Create chat error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get chat by ID with messages
const getChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    
    console.log('Getting chat by ID:', chatId);

    // Validation
    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      console.log('Invalid chat ID:', chatId);
      return res.status(400).json({ error: 'Invalid chat ID' });
    }

    const chat = await Chat.findById(chatId)
      .populate('customerId', 'name email online')
      .populate('assignedAgentId', 'name email');

    if (!chat) {
      console.log('Chat not found:', chatId);
      return res.status(404).json({ error: 'Chat not found' });
    }

    console.log('Chat found:', {
      id: chat._id,
      mode: chat.mode,
      status: chat.status,
      messageCount: chat.messages.length
    });

    // Get last 15 messages
    const lastMessages = chat.getLastMessages(15);
    console.log('Last messages:', lastMessages.length);

    const response = {
      chat: {
        _id: chat._id,
        customerId: chat.customerId,
        assignedAgentId: chat.assignedAgentId,
        mode: chat.mode,
        status: chat.status,
        lastInteraction: chat.lastInteraction,
        createdAt: chat.createdAt
      },
      messages: lastMessages
    };

    console.log('Sending response:', response);

    res.json(response);

  } catch (error) {
    console.error('Get chat error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Take over chat (switch from AI to human mode)
const takeOverChat = async (req, res) => {
  try {
    const { chatId, agentId } = req.body;

    // Validation
    if (!chatId || !mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ error: 'Valid chat ID is required' });
    }

    if (!agentId || !mongoose.Types.ObjectId.isValid(agentId)) {
      return res.status(400).json({ error: 'Valid agent ID is required' });
    }

    // Check if chat exists
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

  // Check if agent exists and has proper role
  const agent = await User.findById(agentId);
  if (!agent || agent.role !== 'agent') {
      return res.status(403).json({ error: 'Invalid agent' });
    }

    // Take over the chat
    await chat.takeOver(agentId);

    // Add system message about takeover
    await chat.addMessage({
      senderRole: 'ai',
      text: `This conversation has been transferred to ${agent.name}, a human support agent. They will assist you shortly.`
    });

    res.json({
      message: 'Chat taken over successfully',
      chat: {
        _id: chat._id,
        mode: chat.mode,
        assignedAgentId: chat.assignedAgentId
      }
    });

  } catch (error) {
    console.error('Take over chat error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get active chats (for agent dashboard)
const getActiveChats = async (req, res) => {
  try {
    const chats = await Chat.find({ status: 'open', isAnonymous: { $ne: true } })
      .populate('customerId', 'name email online')
      .populate('assignedAgentId', 'name email')
      .sort({ lastInteraction: -1 })
      .limit(50);

    const formattedChats = chats.map(chat => ({
      _id: chat._id,
      customer: chat.customerId,
      assignedAgent: chat.assignedAgentId,
      mode: chat.mode,
      lastInteraction: chat.lastInteraction,
      messageCount: chat.messages.length,
      lastMessage: chat.messages[chat.messages.length - 1]?.text || 'No messages'
    }));

    res.json({
      chats: formattedChats,
      total: formattedChats.length
    });

  } catch (error) {
    console.error('Get active chats error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Close chat
const closeChat = async (req, res) => {
  try {
    const { chatId } = req.params;

    // Validation
    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ error: 'Invalid chat ID' });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    chat.status = 'closed';
    await chat.save();

    res.json({
      message: 'Chat closed successfully',
      chatId: chat._id
    });

  } catch (error) {
    console.error('Close chat error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get chats for a specific user (customer)
const getUserChats = async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log('Getting chats for user:', userId);

    // Validation
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.log('Invalid user ID:', userId);
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Check if the requesting user is the same as the userId or is an agent
    if (req.user._id.toString() !== userId && req.user.role !== 'agent') {
      console.log('Access denied for user:', req.user._id, 'requesting chats for:', userId);
      return res.status(403).json({ error: 'Access denied' });
    }

    const chats = await Chat.find({ customerId: userId })
      .populate('assignedAgentId', 'name email')
      .sort({ lastInteraction: -1 })
      .limit(20);

    console.log('Found chats for user', userId, ':', chats.length);
    chats.forEach((chat, index) => {
      console.log(`Chat ${index + 1}:`, {
        id: chat._id,
        customerId: chat.customerId,
        isAnonymous: chat.isAnonymous,
        mode: chat.mode,
        status: chat.status,
        messageCount: chat.messages.length
      });
    });

    const formattedChats = chats.map(chat => ({
      _id: chat._id,
      mode: chat.mode,
      status: chat.status,
      assignedAgent: chat.assignedAgentId,
      lastInteraction: chat.lastInteraction,
      messageCount: chat.messages.length,
      lastMessage: chat.messages[chat.messages.length - 1]?.text || 'No messages'
    }));

    console.log('Formatted chats:', formattedChats);

    res.json({
      chats: formattedChats,
      total: formattedChats.length
    });

  } catch (error) {
    console.error('Get user chats error:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  createChat,
  getChat,
  getUserChats,
  takeOverChat,
  getActiveChats,
  closeChat
};
