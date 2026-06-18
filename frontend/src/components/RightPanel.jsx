import React, { useState } from 'react';
import { User, Mail, Calendar, MessageCircle, Shield, CheckCircle } from 'lucide-react';

const RightPanel = ({ selectedChat, currentUser, onCloseChat }) => {
  const [loading, setLoading] = useState(false);

  if (!selectedChat) {
    return (
      <div className="w-80 bg-white border-l border-gray-200 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <User className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <p>Select a chat to view details</p>
        </div>
      </div>
    );
  }

  // Close chat functionality removed per requirements

  const formatDate = (date) => {
    const d = date ? new Date(date) : null;
    if (!d || Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDurationMinutes = (start) => {
    const s = start ? new Date(start) : null;
    if (!s || Number.isNaN(s.getTime())) return '-';
    const minutes = Math.floor((Date.now() - s.getTime()) / (1000 * 60));
    if (!Number.isFinite(minutes) || minutes < 0) return '-';
    return `${minutes} minutes`;
  };

  // Frustration indicators removed

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Chat Details</h2>
        <p className="text-sm text-gray-500 mt-1">
          {selectedChat.customer?.name || 'Customer'}
        </p>
      </div>

      {/* Customer Profile */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Customer Information</h3>
        
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {selectedChat.customer?.name || 'Unknown'}
              </p>
              <p className="text-xs text-gray-500">Customer</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Mail className="h-4 w-4" />
            <span>{selectedChat.customer?.email || 'No email'}</span>
          </div>

          {/* Removed Joined date */}
        </div>
      </div>

      {/* Chat Status */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Chat Status</h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Mode:</span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              selectedChat.mode === 'ai' 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-green-100 text-green-800'
            }`}>
              {selectedChat.mode === 'ai' ? 'AI Mode' : 'Human Mode'}
            </span>
          </div>

          {selectedChat.assignedAgent && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Assigned Agent:</span>
              <span className="text-sm font-medium text-gray-900">
                {selectedChat.assignedAgent.name || 'Unknown'}
              </span>
            </div>
          )}

          
        </div>
      </div>

      {/* Chat Statistics */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Chat Statistics</h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Total Messages:</span>
            <span className="text-sm font-medium text-gray-900">
              {selectedChat.messageCount || 0}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Last Activity:</span>
            <span className="text-sm text-gray-900">
              {formatDate(selectedChat.lastInteraction)}
            </span>
          </div>

          {/* Removed Duration */}
        </div>
      </div>

      {/* Actions removed */}

      {/* Footer */}
      <div className="mt-auto p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          <p>Chat ID: {selectedChat._id}</p>
        </div>
      </div>
    </div>
  );
};

export default RightPanel;
