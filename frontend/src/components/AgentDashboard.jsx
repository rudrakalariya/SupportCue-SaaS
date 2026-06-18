import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { chatAPI } from '../api/api';
import LeftSidebar from './LeftSidebar';
import ChatPanel from './ChatPanel';
import RightPanel from './RightPanel';
import { Bell, AlertTriangle } from 'lucide-react';

const AgentDashboard = ({ user, onLogout }) => {
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [socket, setSocket] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [joinedAgents, setJoinedAgents] = useState(false);

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io('http://localhost:5000', { transports: ['websocket'], reconnection: true });
    setSocket(newSocket);

    // Join agents room
    newSocket.emit('joinAgents', { userId: user._id });

    // Confirm joined agents room
    newSocket.on('joinedAgents', () => {
      console.log('[socket] Joined agents room');
      setJoinedAgents(true);
    });

    // Surface socket errors
    newSocket.on('error', (error) => {
      console.error('[socket error]', error);
    });

    // Listen for explicit escalation requests
    newSocket.on('escalationRequest', (data) => {
      console.log('[socket] escalationRequest received', data);
      const notification = {
        id: Date.now(),
        type: 'escalation',
        message: data.message || `Customer requested a human in chat ${data.chatId}`,
        chatId: data.chatId,
        timestamp: new Date()
      };
      setNotifications(prev => [notification, ...prev]);
    });

    // Listen for chat takeover events
    newSocket.on('chatTaken', (data) => {
      if (data.agentId === user._id) {
        // Refresh chat list if this agent took over a chat
        // This will be handled by the LeftSidebar refresh
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, [user._id]);

  // Join/leave selected chat room so agent receives live messages
  useEffect(() => {
    if (!socket) return;

    if (selectedChat?._id) {
      socket.emit('joinChat', { chatId: selectedChat._id, userId: user._id });
    }

    return () => {
      if (selectedChat?._id) {
        socket.emit('leaveChat', { chatId: selectedChat._id, userId: user._id });
      }
    };
  }, [socket, selectedChat?._id, user._id]);

  // Handle chat selection
  const handleChatSelect = async (chat) => {
    setSelectedChat(chat);
    setMessages([]);
    
    try {
      const response = await chatAPI.getChat(chat._id);
      setMessages(response.data.messages);
    } catch (error) {
      console.error('Failed to fetch chat messages:', error);
    }
  };

  // Open a chat directly by ID (e.g., from a notification click)
  const openChatById = async (chatId) => {
    try {
      const response = await chatAPI.getChat(chatId);
      const { chat, messages: chatMessages } = response.data;

      // Normalize shape to what RightPanel/LeftSidebar expect
      const normalizedChat = {
        _id: chat._id,
        customer: chat.customerId, // populated: { name, email, online }
        assignedAgent: chat.assignedAgentId, // populated
        mode: chat.mode,
        status: chat.status,
        lastInteraction: chat.lastInteraction,
        createdAt: chat.createdAt,
      };

      setSelectedChat(normalizedChat);
      setMessages(chatMessages || []);
      setShowNotifications(false);
    } catch (error) {
      console.error('Failed to open chat from notification:', error);
    }
  };

  // Handle sending messages
  const handleSendMessage = async (text) => {
    if (!selectedChat || !socket) return;

    const messageData = {
      chatId: selectedChat._id,
      senderId: user._id,
      senderRole: 'agent',
      text
    };

    // Send message via socket
    socket.emit('sendMessage', messageData);
  };

  // Handle chat takeover
  const handleTakeOver = async (chatId) => {
    try {
      await chatAPI.takeOverChat(chatId, user._id);
      
      // Update local state
      setSelectedChat(prev => ({
        ...prev,
        mode: 'human',
        assignedAgentId: user._id
      }));

      // Emit takeover via socket
      if (socket) {
        socket.emit('takeOver', { chatId, agentId: user._id });
      }
    } catch (error) {
      console.error('Failed to take over chat:', error);
    }
  };

  // Handle closing chat
  const handleCloseChat = (chatId) => {
    if (selectedChat?._id === chatId) {
      setSelectedChat(null);
      setMessages([]);
    }
  };

  // Handle typing indicators
  const handleTyping = (isTyping) => {
    if (socket && selectedChat) {
      socket.emit('typing', { 
        chatId: selectedChat._id, 
        userId: user._id, 
        isTyping 
      });
    }
  };

  // Listen for new messages
  useEffect(() => {
    if (socket) {
      const handleReceive = ({ message, chatId }) => {
        if (selectedChat && chatId === selectedChat._id) {
          setMessages(prev => [...prev, message]);
          // Ensure status reflects active conversation
          if (selectedChat.status !== 'open') {
            setSelectedChat(prev => ({ ...prev, status: 'open' }));
          }
        }
      };
      const handleTyping = ({ userId, isTyping }) => {
        if (selectedChat && userId !== user._id) {
          setIsTyping(isTyping);
        }
      };

      socket.on('receiveMessage', handleReceive);
      socket.on('userTyping', handleTyping);
    }

    return () => {
      if (socket) {
        socket.off('receiveMessage');
        socket.off('userTyping');
      }
    };
  }, [socket, selectedChat?._id, user._id]);

  // Clear notifications
  const clearNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-gray-900">
              Support Dashboard
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              {user.role === 'admin' ? 'Administrator' : 'Support Agent'}
            </span>
            {!joinedAgents && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                Not connected to agents room
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <Bell className="h-5 w-5" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </button>
              
              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
                      {notifications.length > 0 && (
                        <button
                          onClick={clearAllNotifications}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          Clear all
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                        <p>No notifications</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-200">
                        {notifications.map((notification) => (
                          <div key={notification.id} className="p-4 hover:bg-gray-50 cursor-pointer" onClick={() => openChatById(notification.chatId)}>
                            <div className="flex items-start space-x-3">
                              <div className="flex-shrink-0">
                                <AlertTriangle className="h-5 w-5 text-red-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-900">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {notification.timestamp.toLocaleTimeString()}
                                </p>
                                
                              </div>
                              <button
                                onClick={() => clearNotification(notification.id)}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* User Menu */}
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
              <button
                onClick={onLogout}
                className="btn btn-secondary"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <LeftSidebar
          selectedChat={selectedChat}
          onChatSelect={handleChatSelect}
          currentUser={user}
        />
        
        <ChatPanel
          selectedChat={selectedChat}
          messages={messages}
          onSendMessage={handleSendMessage}
          onTakeOver={handleTakeOver}
          currentUser={user}
          isTyping={isTyping}
        />
        
        <RightPanel
          selectedChat={selectedChat}
          currentUser={user}
          onCloseChat={handleCloseChat}
        />
      </div>
    </div>
  );
};

export default AgentDashboard;
