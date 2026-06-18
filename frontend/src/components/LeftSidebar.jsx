import React, { useState, useEffect } from 'react';
import { MessageCircle, Clock, User, Bot, AlertTriangle } from 'lucide-react';
import { chatAPI } from '../api/api';

const LeftSidebar = ({ selectedChat, onChatSelect, currentUser }) => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchChats();
    // Refresh chats every 30 seconds
    const interval = setInterval(fetchChats, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchChats = async () => {
    try {
      setLoading(true);
      const response = await chatAPI.getActiveChats();
      setChats(response.data.chats);
      setError('');
    } catch (error) {
      console.error('Failed to fetch chats:', error);
      setError('Failed to load chats');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date) => {
    const now = new Date();
    const chatDate = new Date(date);
    const diffInMinutes = Math.floor((now - chatDate) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return chatDate.toLocaleDateString();
  };

  const getChatStatusColor = (chat) => {
    return chat.mode === 'ai' ? 'border-l-blue-500' : 'border-l-green-500';
  };

  const getChatStatusIcon = (chat) => {
    if (chat.mode === 'ai') {
      return <Bot className="h-4 w-4 text-blue-500" />;
    }
    return <User className="h-4 w-4 text-green-500" />;
  };

  

  if (loading) {
    return (
      <div className="w-80 bg-white border-r border-gray-200 p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-3/4"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-80 bg-white border-r border-gray-200 p-4">
        <div className="text-center text-red-600">
          <p>{error}</p>
          <button
            onClick={fetchChats}
            className="btn btn-secondary mt-2"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Active Chats</h2>
        <p className="text-sm text-gray-500 mt-1">
          {chats.length} active conversation{chats.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {chats.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <MessageCircle className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>No active chats</p>
          </div>
        ) : (
          <div className="space-y-1">
            {chats.map((chat) => (
              <div
                key={chat._id}
                onClick={() => onChatSelect(chat)}
                className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors duration-150 border-l-4 ${getChatStatusColor(chat)} ${
                  selectedChat?._id === chat._id ? 'bg-blue-50 border-l-blue-500' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      {getChatStatusIcon(chat)}
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {chat.customer?.name || 'Unknown Customer'}
                      </h3>
                    </div>
                    
                    <p className="text-xs text-gray-500 mb-2">
                      {chat.customer?.email || 'No email'}
                    </p>
                    
                    <p className="text-sm text-gray-600 truncate">
                      {chat.lastMessage || 'No messages yet'}
                    </p>
                  </div>
                  
                  <div className="flex flex-col items-end space-y-1">
                    <span className="text-xs text-gray-400">
                      {formatTime(chat.lastInteraction)}
                    </span>
                    
                   
                  </div>
                </div>
                
                
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={fetchChats}
          className="w-full btn btn-secondary"
        >
          Refresh Chats
        </button>
      </div>
    </div>
  );
};

export default LeftSidebar;
