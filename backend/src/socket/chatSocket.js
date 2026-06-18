const Chat = require('../models/Chat');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Company = require('../models/Company');
const geminiService = require('../services/geminiService');
const ragService = require('../services/ragService');
const config = require('../config/env');

class ChatSocketHandler {
  constructor(io) {
    this.io = io;
    this.setupSocketHandlers();
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`User connected: ${socket.id}`);

      // Handle user joining chat
      socket.on('joinChat', async (data) => {
        try {
          const { chatId, userId } = data;
          
          if (!chatId || !userId) {
            socket.emit('error', { message: 'Chat ID and User ID are required' });
            return;
          }

          // Join the chat room
          socket.join(chatId);
          console.log(`User ${userId} joined chat ${chatId}`);

          // Get chat history and send to client
          const chat = await Chat.findById(chatId);
          if (chat) {
            const lastMessages = chat.getLastMessages(15);
            socket.emit('chatHistory', {
              chatId,
              messages: lastMessages,
              mode: chat.mode,
              assignedAgentId: chat.assignedAgentId
            });
          }

        } catch (error) {
          console.error('Join chat error:', error.message);
          socket.emit('error', { message: 'Failed to join chat' });
        }
      });

      // Handle user leaving chat
      socket.on('leaveChat', async (data) => {
        try {
          const { chatId, userId } = data;
          
          if (!chatId || !userId) {
            socket.emit('error', { message: 'Chat ID and User ID are required' });
            return;
          }

          // Leave the chat room
          socket.leave(chatId);
          console.log(`User ${userId} left chat ${chatId}`);

        } catch (error) {
          console.error('Leave chat error:', error.message);
          socket.emit('error', { message: 'Failed to leave chat' });
        }
      });

      // Handle user joining agents room
      socket.on('joinAgents', async (data) => {
        try {
          const { userId } = data;
          
          if (!userId) {
            socket.emit('error', { message: 'User ID is required' });
            return;
          }

          // Check if user is an agent
          const user = await User.findById(userId);
          if (user && user.role === 'agent') {
            socket.join('agents');
            console.log(`Agent ${userId} joined agents room`);
            socket.emit('joinedAgents', { message: 'Joined agents room' });
          } else {
            socket.emit('error', { message: 'Access denied. Agent role required.' });
          }

        } catch (error) {
          console.error('Join agents error:', error.message);
          socket.emit('error', { message: 'Failed to join agents room' });
        }
      });

      // Handle user joining customer room
      socket.on('joinCustomer', async (data) => {
        try {
          const { userId } = data;
          
          if (!userId) {
            socket.emit('error', { message: 'User ID is required' });
            return;
          }

          // Check if user exists
          const user = await User.findById(userId);
          if (user) {
            socket.join(`customer_${userId}`);
            console.log(`Customer ${userId} joined customer room`);
            socket.emit('joinedCustomer', { message: 'Joined customer room' });
          } else {
            socket.emit('error', { message: 'User not found.' });
          }

        } catch (error) {
          console.error('Join customer error:', error.message);
          socket.emit('error', { message: 'Failed to join customer room' });
        }
      });

      // Handle sending messages
      socket.on('sendMessage', async (payload) => {
        try {
          const { chatId, senderId, senderRole, text } = payload;

          // Validation
          if (!chatId || !senderRole || !text) {
            socket.emit('error', { message: 'Chat ID, sender role, and text are required' });
            return;
          }

          if (senderRole !== 'ai' && !senderId) {
            socket.emit('error', { message: 'Sender ID is required for non-AI messages' });
            return;
          }

          // Get chat
          const chat = await Chat.findById(chatId);
          if (!chat) {
            socket.emit('error', { message: 'Chat not found' });
            return;
          }

          // Create message data
          const effectiveSenderId = senderRole === 'customer' ? chat.customerId : senderId;

          // If non-AI and role is agent/customer, ensure we have an ObjectId for sender
          if (senderRole !== 'ai' && !effectiveSenderId) {
            socket.emit('error', { message: 'Sender ID is required for non-AI messages' });
            return;
          }

          const messageData = {
            senderId: senderRole === 'ai' ? undefined : effectiveSenderId,
            senderRole,
            text,
            createdAt: new Date()
          };
          
          // Add message to chat
          await chat.addMessage(messageData);

          // Only explicit escalation is supported now; no auto-frustration detection

          // Emit message to chat room
          this.io.to(chatId).emit('receiveMessage', {
            chatId,
            message: messageData
          });
          
          // Also emit to customer room for backup
          this.io.to(`customer_${chat.customerId}`).emit('receiveMessage', {
            chatId,
            message: messageData
          });
          
          console.log(`Customer message broadcasted to chat room ${chatId} and customer room customer_${chat.customerId}`);

          // If customer explicitly asks for a human in the message text, auto-escalate
          if (senderRole === 'customer') {
            const lower = (text || '').toLowerCase();
            const escalationPhrases = [
              // Common requests to reach a human
              'pass me to human',
              'pass me to a human',
              'pass me to human agent',
              'pass me to a human agent',
              'transfer me to human',
              'transfer me to a human',
              'transfer to human',
              'transfer to a human',
              'human agent',
              'talk to human',
              'talk to a human',
              'talk to an agent',
              'speak to human',
              'speak with a human',
              'speak to an agent',
              'connect me to human',
              'connect me to a human',
              'connect me to an agent',
              'escalate',
              'escalation',
              'operator',
              'live agent',
              'real agent',
              'customer support',
              'real person',
              'human please',
              // Additional common variants
              'switch me to human',
              'switch me to a human',
              'switch to human',
              'switch to a human',
              'switch me to agent',
              'switch to agent',
              'hand off to human',
              'handoff to human',
              'speak to representative',
              'talk to representative',
              'customer representative'
            ];

            const shouldEscalateByPhrase = escalationPhrases.some((phrase) => lower.includes(phrase));
            // Heuristic: mention of "switch" together with "human" or "agent"
            const shouldEscalateByHeuristic = (lower.includes('switch') && (lower.includes('human') || lower.includes('agent')));
            const shouldEscalate = shouldEscalateByPhrase || shouldEscalateByHeuristic;
            if (shouldEscalate) {
              try {
                const notification = new Notification({
                  chatId: chat._id,
                  type: 'escalation_request',
                  payload: {
                    message: 'Customer requested a human agent',
                    customerId: senderId
                  }
                });
                await notification.save();

                // Notify all agents immediately
                this.io.to('agents').emit('escalationRequest', {
                  chatId: chat._id,
                  customerId: senderId,
                  message: notification.payload.message,
                  notificationId: notification._id
                });
              } catch (err) {
                console.error('Auto-escalation notification failed:', err.message);
              }
            }
          }

          // If AI mode and customer message, generate AI reply
          if (chat.mode === 'ai' && senderRole === 'customer') {
            // Send typing indicator immediately
            this.io.to(chatId).emit('aiTyping', { chatId, isTyping: true });

            // Fetch RAG context and company system prompt (if company is set)
            let ragContext = null;
            let companySystemPrompt = null;
            if (chat.companyId) {
              try {
                const [context, company] = await Promise.all([
                  ragService.buildRAGContext(chat.companyId.toString(), text),
                  Company.findById(chat.companyId, 'systemPrompt name')
                ]);
                ragContext = context;
                companySystemPrompt = company?.systemPrompt || null;
                if (ragContext) {
                  console.log(`[RAG] Context retrieved for company ${company?.name}`);
                } else {
                  console.log(`[RAG] No relevant context found for query: "${text.slice(0, 60)}"`);
                }
              } catch (ragErr) {
                console.error('[RAG] Context retrieval failed:', ragErr.message);
              }
            }

            // Generate AI reply asynchronously
            setImmediate(async () => {
              try {
                const aiReply = await geminiService.getGeminiReply(
                  chatId,
                  chat.messages,
                  ragContext,
                  companySystemPrompt
                );
                
                const aiMessageData = {
                  senderRole: 'ai',
                  text: aiReply,
                  createdAt: new Date()
                };

                // Add AI reply to chat
                await chat.addMessage(aiMessageData);

                // Stop typing indicator
                this.io.to(chatId).emit('aiTyping', { chatId, isTyping: false });

                // Emit AI reply to chat room
                const messagePayload = {
                  chatId,
                  message: aiMessageData
                };
                
                this.io.to(chatId).emit('receiveMessage', messagePayload);
                
                // Also emit to customer room for backup
                this.io.to(`customer_${chat.customerId}`).emit('receiveMessage', messagePayload);

              } catch (error) {
                console.error('AI reply generation failed:', error.message);
                
                // Stop typing indicator
                this.io.to(chatId).emit('aiTyping', { chatId, isTyping: false });
                
                // Send fallback message
                const fallbackMessage = {
                  senderRole: 'ai',
                  text: 'I apologize, but I\'m having trouble processing your request. Let me connect you with a human agent.',
                  createdAt: new Date()
                };
                
                await chat.addMessage(fallbackMessage);
                
                const fallbackPayload = {
                  chatId,
                  message: fallbackMessage
                };
                
                this.io.to(chatId).emit('receiveMessage', fallbackPayload);
                this.io.to(`customer_${chat.customerId}`).emit('receiveMessage', fallbackPayload);
                
                console.log(`Fallback message sent for chat ${chatId}`);
              }
            });
          }

        } catch (error) {
          console.error('Send message error:', error.message);
          socket.emit('error', { message: 'Failed to send message' });
        }
      });

      // Handle chat takeover
      socket.on('takeOver', async (data) => {
        try {
          const { chatId, agentId } = data;

          if (!chatId || !agentId) {
            socket.emit('error', { message: 'Chat ID and Agent ID are required' });
            return;
          }

          // Get chat and agent
          const chat = await Chat.findById(chatId);
          const agent = await User.findById(agentId);

          if (!chat) {
            socket.emit('error', { message: 'Chat not found' });
            return;
          }

          if (!agent || agent.role !== 'agent') {
            socket.emit('error', { message: 'Invalid agent' });
            return;
          }

          // Take over the chat (sets mode to human and assignedAgent)
          await chat.takeOver(agentId);

          // Emit takeover event to chat room
          this.io.to(chatId).emit('chatTaken', {
            chatId,
            agentId,
            agentName: agent.name,
            mode: chat.mode
          });

          // Emit takeover event to agents room
          this.io.to('agents').emit('chatTaken', {
            chatId,
            agentId,
            agentName: agent.name,
            mode: chat.mode
          });

          // Emit a takeover event; client will render the system message once
          const takeoverMessage = {
            senderRole: 'ai',
            text: `This conversation has been transferred to ${agent.name}, a human support agent. They will assist you shortly.`,
            createdAt: new Date()
          };
          this.io.to(chatId).emit('receiveMessage', { chatId, message: takeoverMessage });

          console.log(`Chat ${chatId} taken over by agent ${agentId}`);

        } catch (error) {
          console.error('Take over error:', error.message);
          socket.emit('error', { message: 'Failed to take over chat' });
        }
      });

      // Customer explicitly requests a human agent
      socket.on('requestHuman', async (data) => {
        try {
          const { chatId, customerId, reason } = data;

          if (!chatId || !customerId) {
            socket.emit('error', { message: 'Chat ID and Customer ID are required' });
            return;
          }

          const chat = await Chat.findById(chatId);
          if (!chat) {
            socket.emit('error', { message: 'Chat not found' });
            return;
          }

          const notification = new Notification({
            chatId: chat._id,
            type: 'escalation_request',
            payload: {
              message: reason || 'Customer requested a human agent',
              customerId: customerId
            }
          });
          await notification.save();

          // Notify all agents
          this.io.to('agents').emit('escalationRequest', {
            chatId: chat._id,
            customerId: customerId,
            message: notification.payload.message,
            notificationId: notification._id
          });

          // Confirm to the customer in chat
          const confirmMessage = {
            senderRole: 'ai',
            text: 'Okay, I\'ll connect you with a human agent as soon as one is available.',
            createdAt: new Date()
          };
          await chat.addMessage(confirmMessage);
          this.io.to(chatId).emit('receiveMessage', { chatId, message: confirmMessage });
        } catch (error) {
          console.error('Request human error:', error.message);
          socket.emit('error', { message: 'Failed to request a human agent' });
        }
      });

      // Handle typing indicators
      socket.on('typing', (data) => {
        const { chatId, userId, isTyping } = data;
        socket.to(chatId).emit('userTyping', { userId, isTyping });
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
      });
    });
  }

  // Method to emit events from other parts of the application
  emitToChat(chatId, event, data) {
    this.io.to(chatId).emit(event, data);
  }

  emitToAgents(event, data) {
    this.io.to('agents').emit(event, data);
  }
}

module.exports = ChatSocketHandler;
