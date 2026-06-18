import React, { useState, useEffect, useRef } from 'react';
import { Send, User, Bot, Shield, MessageCircle } from 'lucide-react';

const ChatPanel = ({ 
  selectedChat, 
  messages, 
  onSendMessage, 
  onTakeOver, 
  currentUser,
  isTyping 
}) => {
  const [inputText, setInputText] = useState('');
  const [isTypingLocal, setIsTypingLocal] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputText.trim() || !selectedChat) return;

    onSendMessage(inputText.trim());
    setInputText('');
    setIsTypingLocal(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTyping = () => {
    if (!isTypingLocal) {
      setIsTypingLocal(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTypingLocal(false);
    }, 1000);
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getMessageStyle = (senderRole, senderId) => {
    if (senderRole === 'ai') {
      return 'bg-gray-200 text-gray-800';
    } else if (senderRole === 'customer') {
      return 'bg-primary-600 text-white';
    } else if (senderId === currentUser?._id) {
      return 'bg-green-600 text-white';
    } else {
      return 'bg-blue-600 text-white';
    }
  };

  const getSenderIcon = (senderRole, senderId) => {
    if (senderRole === 'ai') {
      return <Bot className="h-4 w-4" />;
    } else if (senderRole === 'customer') {
      return <User className="h-4 w-4" />;
    } else {
      return <Shield className="h-4 w-4" />;
    }
  };

  const getSenderName = (senderRole, senderId) => {
    if (senderRole === 'ai') {
      return 'AI Assistant';
    } else if (senderRole === 'customer') {
      return selectedChat?.customer?.name || 'Customer';
    } else if (senderId === currentUser?._id) {
      return 'You';
    } else {
      return 'Agent';
    }
  };

  if (!selectedChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <MessageCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select a chat</h3>
          <p className="text-gray-500">Choose a conversation from the sidebar to start chatting</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Chat Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {selectedChat.customer?.name || 'Customer'}
            </h3>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                selectedChat.mode === 'ai' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-green-100 text-green-800'
              }`}>
                {selectedChat.mode === 'ai' ? 'AI Mode' : 'Human Mode'}
              </span>
            </div>
          </div>
          
          {selectedChat.mode === 'ai' && (
            <button
              onClick={() => onTakeOver(selectedChat._id)}
              className="btn btn-primary"
            >
              Take Over
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex items-start space-x-2 ${
              // Customer messages should be on the left for agents
              message.senderRole === 'customer'
                ? 'justify-start'
                // Current agent's own messages on the right
                : (message.senderId === currentUser?._id)
                  ? 'justify-end'
                  // Other senders (AI/other agents) on the left
                  : 'justify-start'
            }`}
          >
            {(message.senderRole !== 'customer' && message.senderId !== currentUser?._id) && (
              <div className="flex-shrink-0 w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                {getSenderIcon(message.senderRole, message.senderId)}
              </div>
            )}
            
            <div className="max-w-xs">
              <div
                className={`px-3 py-2 rounded-lg ${
                  getMessageStyle(message.senderRole, message.senderId)
                }`}
              >
                <p className="text-sm">{message.text}</p>
              </div>
              <div className="mt-1 text-xs text-gray-500">
                <span>{getSenderName(message.senderRole, message.senderId)}</span>
                <span className="mx-2">•</span>
                <span>{formatTime(message.createdAt)}</span>
              </div>
            </div>
          </div>
        ))}
        
        {(isTyping || isTypingLocal) && (
          <div className="flex items-start space-x-2">
            <div className="flex-shrink-0 w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <User className="h-4 w-4" />
            </div>
            <div className="bg-gray-200 text-gray-800 px-3 py-2 rounded-lg">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
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
            disabled={selectedChat.mode === 'ai'}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim() || selectedChat.mode === 'ai'}
            className="btn btn-primary px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        {selectedChat.mode === 'ai' && (
          <p className="text-xs text-gray-500 mt-2">
            This chat is in AI mode. Click "Take Over" to switch to human support.
          </p>
        )}
      </div>
    </div>
  );
};

export default ChatPanel;
