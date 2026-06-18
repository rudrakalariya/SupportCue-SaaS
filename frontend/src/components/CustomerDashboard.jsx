import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { chatAPI } from '../api/api';
import { MessageCircle, User, LogOut, Settings, HelpCircle } from 'lucide-react';

const CustomerDashboard = ({ user, onLogout }) => {
  const [activeChats, setActiveChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [socketStatus, setSocketStatus] = useState('disconnected');

  // Initialize socket connection
  useEffect(() => {
    console.log('Initializing socket connection...');
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Socket connected successfully');
      setSocketStatus('connected');
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setSocketStatus('error');
    });

    // Join customer room
    newSocket.emit('joinCustomer', { userId: user._id });
    console.log('Joined customer room for user:', user._id);

    // Listen for new messages
    newSocket.on('receiveMessage', (data) => {
      console.log('Received message:', data);
      console.log('Current selected chat:', selectedChat?._id);
      console.log('Message chat ID:', data.chatId);
      console.log('Message data:', data.message);
      
      // Always update the active chats list to reflect new messages
      setActiveChats(prev => prev.map(chat => {
        if (chat._id === data.chatId) {
          return {
            ...chat,
            lastMessage: data.message.text,
            lastInteraction: new Date()
          };
        }
        return chat;
      }));
      
      // Update messages for the current selected chat if it matches
      if (data.chatId === selectedChat?._id) {
        console.log('Updating messages for current chat');
        setMessages(prev => {
          console.log('Previous messages:', prev);
          
          // Check if message already exists to prevent duplicates
          const messageExists = prev.some(msg => 
            msg._id === data.message._id || 
            (msg.text === data.message.text && 
             msg.senderRole === data.message.senderRole &&
             Math.abs(new Date(msg.createdAt) - new Date(data.message.createdAt)) < 1000)
          );
          
          if (messageExists) {
            console.log('Message already exists, skipping duplicate');
            return prev;
          }
          
          console.log('Adding new message to current chat:', data.message);
          const newMessages = [...prev, data.message];
          console.log('New messages array:', newMessages);
          return newMessages;
        });
      } else {
        console.log('Message received for different chat:', data.chatId, 'Current chat:', selectedChat?._id);
        console.log('Consider refreshing current chat messages');
      }
    });

    // Listen for errors
    newSocket.on('error', (error) => {
      console.error('Socket error received:', error);
    });

    // Listen for connection status
    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setSocketStatus('disconnected');
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
      // Rejoin customer room after reconnection
      newSocket.emit('joinCustomer', { userId: user._id });
      setSocketStatus('connected');
    });

    // Listen for typing indicators
    newSocket.on('typing', (data) => {
      console.log('Typing indicator:', data);
      if (data.chatId === selectedChat?._id) {
        setIsTyping(data.isTyping);
      }
    });

    // Listen for AI typing indicators
    newSocket.on('aiTyping', (data) => {
      console.log('AI typing indicator:', data);
      if (data.chatId === selectedChat?._id) {
        setIsTyping(data.isTyping);
      }
    });

    return () => {
      console.log('Disconnecting socket...');
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [user._id]); // Removed selectedChat?._id dependency to prevent unnecessary reconnections

  // Join chat room when selected chat changes
  useEffect(() => {
    if (selectedChat && socket) {
      console.log('Joining chat room for selected chat:', selectedChat._id);
      socket.emit('joinChat', { chatId: selectedChat._id, userId: user._id });
    }
    
    // Cleanup function to leave previous chat room
    return () => {
      if (selectedChat && socket) {
        console.log('Leaving chat room:', selectedChat._id);
        socket.emit('leaveChat', { chatId: selectedChat._id, userId: user._id });
      }
    };
  }, [selectedChat, socket, user._id]);

  // Auto-refresh messages when selected chat changes
  useEffect(() => {
    if (selectedChat) {
      console.log('Selected chat changed, refreshing messages for:', selectedChat._id);
      refreshCurrentChatMessages();
    }
  }, [selectedChat?._id]); // Only depend on the chat ID, not the entire chat object

  // Load user's active chats
  useEffect(() => {
    const loadChats = async () => {
      try {
        console.log('Loading chats for user:', user._id);
        const response = await chatAPI.getUserChats(user._id);
        console.log('Chats loaded:', response.data.chats);
        
        // Log each chat's details for debugging
        response.data.chats.forEach((chat, index) => {
          console.log(`Chat ${index + 1}:`, {
            id: chat._id,
            mode: chat.mode,
            status: chat.status,
            assignedAgent: chat.assignedAgent
          });
        });
        
        setActiveChats(response.data.chats);
      } catch (error) {
        console.error('Failed to load chats:', error);
      }
    };

    loadChats();
  }, [user._id]);

  // Function to refresh chats
  const refreshChats = async () => {
    try {
      console.log('Refreshing chats...');
      const response = await chatAPI.getUserChats(user._id);
      console.log('Refresh response:', response.data);
      console.log('Chats count from refresh:', response.data.chats.length);
      
      // Log each chat for debugging
      response.data.chats.forEach((chat, index) => {
        console.log(`Refresh - Chat ${index + 1}:`, {
          id: chat._id,
          mode: chat.mode,
          status: chat.status,
          lastMessage: chat.lastMessage
        });
      });
      
      setActiveChats(response.data.chats);
      
      // If current selected chat is no longer in the list, clear it
      if (selectedChat && !response.data.chats.find(chat => chat._id === selectedChat._id)) {
        console.log('Selected chat no longer exists, clearing selection');
        setSelectedChat(null);
        setMessages([]);
      }
      
      console.log('Chats refreshed successfully');
    } catch (error) {
      console.error('Failed to refresh chats:', error);
    }
  };

  // Function to refresh current chat messages
  const refreshCurrentChatMessages = async () => {
    if (!selectedChat) return;
    
    try {
      console.log('Refreshing messages for current chat:', selectedChat._id);
      const response = await chatAPI.getChat(selectedChat._id);
      
      if (response.data.messages && response.data.messages.length > 0) {
        console.log('Refreshed messages:', response.data.messages);
        setMessages(response.data.messages);
      }
    } catch (error) {
      console.error('Failed to refresh current chat messages:', error);
    }
  };

  // Debug function to check current state
  const debugState = () => {
    console.log('=== DEBUG STATE ===');
    console.log('Active chats:', activeChats);
    console.log('Selected chat:', selectedChat);
    console.log('Messages:', messages);
    console.log('User ID:', user._id);
    console.log('Socket connected:', socket?.connected);
    console.log('==================');
  };

  // Periodic refresh of chats
  useEffect(() => {
    const interval = setInterval(refreshChats, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [user._id]);

  // Periodic refresh of current chat messages (more frequent)
  useEffect(() => {
    if (!selectedChat) return;
    
    const interval = setInterval(() => {
      console.log('Periodic refresh of current chat messages');
      refreshCurrentChatMessages();
    }, 10000); // Refresh every 10 seconds
    
    return () => clearInterval(interval);
  }, [selectedChat?._id]);

  // Handle chat selection
  const handleChatSelect = async (chat) => {
    console.log('Chat selected:', chat);
    console.log('Chat status:', chat.status);
    console.log('Chat mode:', chat.mode);
    
    // Clear messages first
    setMessages([]);
    setSelectedChat(chat);
    
    // Join the specific chat room
    if (socket) {
      socket.emit('joinChat', { chatId: chat._id, userId: user._id });
      console.log('Joined chat room:', chat._id);
    }
    
    try {
      console.log('Fetching chat messages for chat ID:', chat._id);
      const response = await chatAPI.getChat(chat._id);
      console.log('Chat messages response:', response.data);
      
      if (response.data.messages && response.data.messages.length > 0) {
        console.log('Setting messages from API:', response.data.messages);
        setMessages(response.data.messages);
      } else {
        console.log('No messages from API, adding initial message');
        // If no messages, check if this is a new chat and add the initial AI message
        if (chat.mode === 'ai' && chat.status === 'open') {
          const initialMessage = {
            senderRole: 'ai',
            text: 'Hello! I\'m your AI support assistant. How can I help you today!',
            createdAt: new Date()
          };
          console.log('Adding initial message:', initialMessage);
          setMessages([initialMessage]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch chat messages:', error);
      // Fallback: show initial message for AI chats
      if (chat.mode === 'ai' && chat.status === 'open') {
        const initialMessage = {
          senderRole: 'ai',
          text: 'Hello! I\'m your AI support assistant. How can I help you today!',
          createdAt: new Date()
        };
        console.log('Adding fallback initial message:', initialMessage);
        setMessages([initialMessage]);
      }
    }
  };

  // Handle sending messages
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat || !socket) return;

    console.log('Sending message:', newMessage.trim());
    console.log('Selected chat:', selectedChat);
    console.log('Socket:', socket);

    const messageData = {
      chatId: selectedChat._id,
      senderId: user._id,
      senderRole: 'customer',
      text: newMessage.trim()
    };

    // Add message to local state immediately with a temporary ID
    const tempMessage = {
      ...messageData,
      _id: `temp_${Date.now()}`,
      createdAt: new Date(),
      isTemp: true // Flag to identify temporary messages
    };
    
    setMessages(prev => [...prev, tempMessage]);

    // Clear input immediately
    setNewMessage('');

    // Send message via socket
    socket.emit('sendMessage', messageData);
    console.log('Message sent via socket, waiting for confirmation...');

    // Remove temporary message after a longer delay to ensure server response arrives
    setTimeout(() => {
      setMessages(prev => {
        const filtered = prev.filter(msg => !msg.isTemp);
        console.log('Temporary messages removed, remaining messages:', filtered);
        return filtered;
      });
    }, 3000); // Increased from 2000ms to 3000ms for better reliability
    
    // Force refresh messages after a delay to ensure synchronization
    setTimeout(() => {
      console.log('Forcing message refresh for synchronization');
      refreshCurrentChatMessages();
    }, 1500);
  };

  // Start a new chat
  const startNewChat = async () => {
    try {
      console.log('Creating new chat for user:', user._id);
      console.log('Chat creation request data:', {
        customerId: user._id,
        customerName: user.name,
        customerEmail: user.email
      });
      
      // Clear current chat state first
      setSelectedChat(null);
      setMessages([]);
      setNewMessage('');
      setIsTyping(false);
      
      const response = await chatAPI.createChat({
        // No need to send user data - backend uses authenticated user
      });
      
      console.log('Chat creation response:', response.data);
      
      // Validate response
      if (!response.data || !response.data.chat) {
        throw new Error('Invalid response from server');
      }
      
      console.log('Chat object:', response.data.chat);
      console.log('Chat status:', response.data.chat.status);
      console.log('Chat mode:', response.data.chat.mode);
      const newChat = response.data.chat;
      
      // Verify the chat was created with proper data
      if (!newChat._id) {
        throw new Error('Chat created but missing ID');
      }
      
      console.log('New chat created successfully with ID:', newChat._id);
      
      // Add to active chats first
      setActiveChats(prev => {
        const updatedChats = [newChat, ...prev];
        console.log('Updated active chats:', updatedChats);
        return updatedChats;
      });
      
      // Set as selected chat
      setSelectedChat(newChat);
      console.log('Selected chat set to:', newChat._id);
      
      // Join the new chat room
      if (socket) {
        socket.emit('joinChat', { chatId: newChat._id, userId: user._id });
        console.log('Joined new chat room:', newChat._id);
      }
      
      // Set initial message
      if (newChat.mode === 'ai' && newChat.status === 'open') {
        const initialMessage = {
          senderRole: 'ai',
          text: 'Hello! I\'m your AI support assistant. How can I help you today!',
          createdAt: new Date()
        };
        setMessages([initialMessage]);
        console.log('Initial message set for new chat');
      }
      
      // Force a refresh of chats to ensure consistency
      setTimeout(() => {
        refreshChats();
      }, 1000);
      
    } catch (error) {
      console.error('Failed to create new chat:', error);
      // Show error to user
      alert('Failed to create new chat. Please try again.');
    }
  };

  // Handle logout with proper cleanup
  const handleLogout = () => {
    if (socket) {
      console.log('Cleaning up socket before logout...');
      socket.disconnect();
      setSocket(null);
    }
    // Clear local state
    setActiveChats([]);
    setSelectedChat(null);
    setMessages([]);
    setNewMessage('');
    setIsTyping(false);
    // Call parent logout
    onLogout();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <MessageCircle className="h-8 w-8 text-primary-600" />
                <h1 className="text-xl font-semibold text-gray-900">Customer Support</h1>
              </div>
            </div>
            
            {/* User Menu */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  socketStatus === 'connected' ? 'bg-green-500' : 
                  socketStatus === 'error' ? 'bg-red-500' : 'bg-yellow-500'
                }`} title={`Socket: ${socketStatus}`}></div>
                <span className="text-xs text-gray-500">
                  {socketStatus === 'connected' ? 'Connected' : 
                   socketStatus === 'error' ? 'Error' : 'Connecting...'}
                </span>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="btn btn-secondary flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Sidebar - Chat List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-gray-900">Your Chats</h2>
                  <div className="flex space-x-2">
                    <button
                      onClick={debugState}
                      className="btn btn-secondary text-sm"
                      title="Debug state"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </button>
                    <button
                      onClick={refreshChats}
                      className="btn btn-secondary text-sm"
                      title="Refresh chats"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                    <button
                      onClick={() => {
                        if (selectedChat) {
                          refreshCurrentChatMessages();
                        } else {
                          refreshChats();
                        }
                      }}
                      className="btn btn-secondary text-sm"
                      title="Sync messages"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <button
                      onClick={startNewChat}
                      className="btn btn-primary text-sm"
                    >
                      New Chat
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="divide-y divide-gray-200">
                {activeChats.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    <MessageCircle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p>No active chats</p>
                    <button
                      onClick={startNewChat}
                      className="mt-2 text-primary-600 hover:text-primary-500 text-sm"
                    >
                      Start your first chat
                    </button>
                  </div>
                ) : (
                  activeChats.map((chat) => (
                    <div
                      key={chat._id}
                      onClick={() => handleChatSelect(chat)}
                      className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedChat?._id === chat._id ? 'bg-primary-50 border-r-2 border-primary-600' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-primary-600" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {chat.mode === 'ai' ? 'AI Assistant' : 'Human Agent'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {chat.status === 'open' ? 'Active' : 'Closed'} ({chat.status})
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-96 flex flex-col">
              {selectedChat ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                          {selectedChat.mode === 'ai' ? (
                            <HelpCircle className="h-4 w-4 text-primary-600" />
                          ) : (
                            <User className="h-4 w-4 text-primary-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {selectedChat.mode === 'ai' ? 'AI Assistant' : 'Human Agent'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {selectedChat.status === 'open' ? 'Active' : 'Closed'} ({selectedChat.status})
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={refreshCurrentChatMessages}
                        className="btn btn-secondary text-sm"
                        title="Refresh messages"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center text-gray-500 py-8">
                        <MessageCircle className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                        <p>No messages yet. Start the conversation!</p>
                      </div>
                    ) : (
                      messages.map((message) => (
                        <div
                          key={message._id}
                          className={`flex ${message.senderRole === 'customer' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              message.senderRole === 'customer'
                                ? 'bg-primary-600 text-white'
                                : 'bg-gray-100 text-gray-900'
                            }`}
                          >
                            <p className="text-sm">{message.text}</p>
                            <p className="text-xs opacity-75 mt-1">
                              {new Date(message.createdAt).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                    
                    {isTyping && (
                      <div className="flex justify-start">
                        <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg">
                          <p className="text-sm italic">Typing...</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Message Input */}
                  <div className="p-4 border-t border-gray-200">
                    <form onSubmit={handleSendMessage} className="flex space-x-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 input"
                        disabled={selectedChat.status !== 'open'}
                        title={`Chat status: ${selectedChat.status}, Input disabled: ${selectedChat.status !== 'open'}`}
                      />
                      <button
                        type="submit"
                        disabled={!newMessage.trim() || selectedChat.status !== 'open'}
                        className="btn btn-primary"
                        title={`Button disabled: ${!newMessage.trim() || selectedChat.status !== 'open'}, Message: ${newMessage.trim()}, Status: ${selectedChat.status}`}
                      >
                        Send
                      </button>
                    </form>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <MessageCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium mb-2">Welcome to Customer Support</h3>
                    <p className="mb-4">Select a chat from the left or start a new conversation</p>
                    <button
                      onClick={startNewChat}
                      className="btn btn-primary"
                    >
                      Start New Chat
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;
