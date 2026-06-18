import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { io } from 'socket.io-client';
import { Send, X, MessageCircle, User, Bot } from 'lucide-react';
import { chatAPI } from '../api/api';

const ChatWidget = ({ customerId, customerName }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [chatId, setChatId] = useState(null);
  const [socket, setSocket] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [chatMode, setChatMode] = useState('ai');
  const [assignedAgent, setAssignedAgent] = useState(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // Initialize chat and socket connection
  useEffect(() => {
    if (isOpen && customerId) {
      initializeChat();
    }
  }, [isOpen, customerId]);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    const container = messagesContainerRef.current;
    const anchor = messagesEndRef.current;
    if (!container || !anchor) return;
    requestAnimationFrame(() => {
      anchor.scrollIntoView({ block: 'end' });
      setTimeout(() => anchor.scrollIntoView({ block: 'end' }), 30);
    });
  };

  useLayoutEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeChat = async () => {
    try {
      // Create or get existing chat
      const response = await chatAPI.createChat({
        customerId: customerId,
        customerName: customerName
      });
      const { chat } = response.data;
      setChatId(chat._id);
      setChatMode(chat.mode);
      setAssignedAgent(chat.assignedAgentId);
      
      // Set initial messages
      if (chat.messages && chat.messages.length > 0) {
        setMessages(chat.messages);
        scrollToBottom();
      } else {
        // If no messages, add the initial AI message
        if (chat.mode === 'ai' && chat.status === 'open') {
          setMessages([{
            senderRole: 'ai',
            text: 'Hello! I\'m your AI support assistant. How can I help you today!',
            createdAt: new Date()
          }]);
        }
      }

      // Initialize socket connection
      const newSocket = io('http://localhost:5000', { transports: ['websocket'], reconnection: true });
      setSocket(newSocket);

      // Join chat room
      newSocket.emit('joinChat', { chatId: chat._id, userId: customerId });

      // Receive chat history from server (backup to API fetch)
      newSocket.on('chatHistory', ({ messages: history }) => {
        if (Array.isArray(history)) {
          setMessages(history);
          scrollToBottom();
        }
      });

      // Listen for new messages
      newSocket.on('receiveMessage', ({ message }) => {
        setMessages(prev => {
          const next = [...prev, message];
          return next;
        });
        scrollToBottom();
      });

      // Listen for chat takeover
      newSocket.on('chatTaken', ({ agentName, mode }) => {
        setChatMode(mode);
        setAssignedAgent(agentName);
        // System message for takeover is sent via receiveMessage; no duplicate append here
      });

      // Listen for typing indicators
      newSocket.on('userTyping', ({ userId, isTyping }) => {
        if (userId !== customerId) {
          setIsTyping(isTyping);
        }
      });

      // Listen for AI typing indicators
      newSocket.on('aiTyping', ({ chatId: socketChatId, isTyping }) => {
        if (socketChatId === chat._id) {
          setIsTyping(isTyping);
        }
      });

      // Listen for errors
      newSocket.on('error', ({ message }) => {
        console.error('Socket error:', message);
      });

    } catch (error) {
      console.error('Failed to initialize chat:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !socket || !chatId) return;

    const messageData = {
      chatId,
      senderId: customerId,
      senderRole: 'customer',
      text: inputText.trim()
    };

    // Send message via socket
    socket.emit('sendMessage', messageData);

    // Clear input
    setInputText('');

    // Send typing indicator
    socket.emit('typing', { chatId, userId: customerId, isTyping: false });
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleTyping = () => {
    if (socket && chatId) {
      socket.emit('typing', { chatId, userId: customerId, isTyping: true });
    }
  };

  const closeChat = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
    setIsOpen(false);
    setMessages([]);
    setChatId(null);
    setChatMode('ai');
    setAssignedAgent(null);
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getMessageStyle = (senderRole) => {
    if (senderRole === 'customer') {
      return 'bg-primary-600 text-white ml-auto';
    } else if (senderRole === 'ai') {
      return 'bg-gray-200 text-gray-800';
    } else {
      return 'bg-green-600 text-white';
    }
  };

  const getSenderIcon = (senderRole) => {
    if (senderRole === 'customer') {
      return <User className="h-4 w-4" />;
    } else if (senderRole === 'ai') {
      return <Bot className="h-4 w-4" />;
    } else {
      return <User className="h-4 w-4" />;
    }
  };

  return (
    <>
      {/* Chat Widget Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-primary-600 text-white p-4 rounded-full shadow-lg hover:bg-primary-700 transition-colors duration-200 z-50"
          title="Open chat"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* Chat Widget */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-white rounded-lg shadow-xl border border-gray-200 z-50 flex flex-col">
          {/* Header */}
          <div className="bg-primary-600 text-white p-4 rounded-t-lg flex items-center justify-between">
            <div>
              <h3 className="font-semibold">
                {chatMode === 'ai' ? 'AI Support' : 'Human Support'}
              </h3>
              {assignedAgent && (
                <p className="text-sm text-primary-100">
                  Agent: {assignedAgent.name || assignedAgent}
                </p>
              )}
            </div>
            <button
              onClick={closeChat}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" ref={messagesContainerRef}>
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex items-start space-x-2 ${
                  message.senderRole === 'customer' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.senderRole !== 'customer' && (
                  <div className="flex-shrink-0 w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                    {getSenderIcon(message.senderRole)}
                  </div>
                )}
                <div
                  className={`max-w-xs px-3 py-2 rounded-lg ${
                    getMessageStyle(message.senderRole)
                  }`}
                >
                  <p className="text-sm">{message.text}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {formatTime(message.createdAt)}
                  </p>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex items-start space-x-2">
                <div className="flex-shrink-0 w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="bg-gray-200 text-gray-800 px-3 py-2 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-600">AI is typing...</span>
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Spacer ensures last message isn't obscured */}
            <div ref={messagesEndRef} style={{ height: '1px' }} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex space-x-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                onInput={handleTyping}
                placeholder="Type your message..."
                className="flex-1 input"
                disabled={false}
              />
              <button
                onClick={sendMessage}
                disabled={!inputText.trim()}
                className="btn btn-primary px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};

export default ChatWidget;
