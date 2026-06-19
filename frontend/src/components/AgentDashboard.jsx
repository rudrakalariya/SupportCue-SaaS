import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { chatAPI } from "../api/api";
import LeftSidebar from "./LeftSidebar";
import ChatPanel from "./ChatPanel";
import RightPanel from "./RightPanel";
import { Bell, AlertTriangle, LogOut, ShieldCheck, X } from "lucide-react";

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
    const newSocket = io("http://localhost:5000", { transports: ["websocket"], reconnection: true });
    setSocket(newSocket);

    const joinAgents = () => {
      newSocket.emit("joinAgents", { userId: user._id });
    };

    newSocket.on("connect", joinAgents);
    if (newSocket.connected) joinAgents();

    newSocket.on("joinedAgents", () => {
      setJoinedAgents(true);
    });

    newSocket.on("error", (error) => {
      console.error("[socket error]", error);
    });

    newSocket.on("escalationRequest", (data) => {
      const notification = {
        id: Date.now(),
        type: "escalation",
        message: data.message || `Customer requested a human in chat ${data.chatId}`,
        chatId: data.chatId,
        timestamp: new Date(),
      };
      setNotifications((prev) => [notification, ...prev]);
    });

    newSocket.on("chatTaken", (data) => {
      if (data.agentId === user._id) {
        // handled by LeftSidebar refresh
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, [user._id]);

  // Join/leave selected chat room
  useEffect(() => {
    if (!socket) return;

    const joinRoom = () => {
      if (selectedChat?._id) {
        socket.emit("joinChat", { chatId: selectedChat._id, userId: user._id });
      }
    };
    joinRoom();
    socket.on("connect", joinRoom);

    return () => {
      if (selectedChat?._id) {
        socket.emit("leaveChat", { chatId: selectedChat._id, userId: user._id });
      }
      socket.off("connect", joinRoom);
    };
  }, [socket, selectedChat?._id, user._id]);

  const handleChatSelect = async (chat) => {
    setSelectedChat(chat);
    setMessages([]);
    try {
      const response = await chatAPI.getChat(chat._id);
      setMessages(response.data.messages);
    } catch (error) {
      console.error("Failed to fetch chat messages:", error);
    }
  };

  const openChatById = async (chatId) => {
    try {
      const response = await chatAPI.getChat(chatId);
      const { chat, messages: chatMessages } = response.data;
      const normalizedChat = {
        _id: chat._id,
        customer: chat.customerId,
        assignedAgent: chat.assignedAgentId,
        mode: chat.mode,
        status: chat.status,
        lastInteraction: chat.lastInteraction,
        createdAt: chat.createdAt,
      };
      setSelectedChat(normalizedChat);
      setMessages(chatMessages || []);
      setShowNotifications(false);
    } catch (error) {
      console.error("Failed to open chat from notification:", error);
    }
  };

  const handleSendMessage = async (text) => {
    if (!selectedChat || !socket) return;
    socket.emit("sendMessage", {
      chatId: selectedChat._id,
      senderId: user._id,
      senderRole: "agent",
      text,
    });
  };

  const handleTakeOver = async (chatId) => {
    try {
      await chatAPI.takeOverChat(chatId, user._id);
      setSelectedChat((prev) => ({ ...prev, mode: "human", assignedAgentId: user._id }));
      if (socket) socket.emit("takeOver", { chatId, agentId: user._id });
    } catch (error) {
      console.error("Failed to take over chat:", error);
    }
  };

  const handleCloseChat = async (chatId) => {
    try {
      await chatAPI.closeChat(chatId);
      if (selectedChat?._id === chatId) {
        setSelectedChat(null);
        setMessages([]);
      }
    } catch (error) {
      console.error("Failed to close chat:", error);
    }
  };

  // Listen for new messages
  useEffect(() => {
    if (socket) {
      const handleReceive = ({ message, chatId }) => {
        if (selectedChat && chatId === selectedChat._id) {
          setMessages((prev) => [...prev, message]);
          if (selectedChat.status !== "open") {
            setSelectedChat((prev) => ({ ...prev, status: "open" }));
          }
        }
      };
      const handleTyping = ({ userId, isTyping }) => {
        if (selectedChat && userId !== user._id) setIsTyping(isTyping);
      };
      socket.on("receiveMessage", handleReceive);
      socket.on("userTyping", handleTyping);
    }
    return () => {
      if (socket) {
        socket.off("receiveMessage");
        socket.off("userTyping");
      }
    };
  }, [socket, selectedChat?._id, user._id]);

  const clearNotification = (id) => setNotifications((prev) => prev.filter((n) => n.id !== id));
  const clearAllNotifications = () => setNotifications([]);

  return (
    <div className="h-screen flex flex-col text-slate-100">
      {/* Frosted header */}
      <header className="glass sticky top-0 z-30 px-6 py-3 flex items-center justify-between rounded-none border-x-0 border-t-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--gradient-accent)" }}>
              <ShieldCheck className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-[15px] font-bold tracking-tight">SupportCue</h1>
              <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                {user.role === "admin" ? "Administrator" : "Agent Workspace"}
              </p>
            </div>
          </div>
          <span className="pill-success px-2.5 py-1 rounded-full text-[11px] font-semibold inline-flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse-soft" /> Online
          </span>
          {!joinedAgents && (
            <span className="pill-warning px-2.5 py-1 rounded-full text-[11px] font-semibold">
              Connecting…
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="btn-ghost relative p-2 rounded-xl"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {notifications.length > 0 && (
                <span
                  className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] font-bold rounded-full flex items-center justify-center text-white"
                  style={{ background: "var(--gradient-accent)" }}
                >
                  {notifications.length}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="glass-strong absolute right-0 mt-2 w-80 rounded-2xl z-50 animate-fade-slide overflow-hidden">
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Notifications</h3>
                  {notifications.length > 0 && (
                    <button onClick={clearAllNotifications} className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors">
                      Clear all
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">
                      <Bell className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">All clear</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className="p-3 hover:bg-white/5 cursor-pointer transition-colors"
                          onClick={() => openChatById(notification.chatId)}
                        >
                          <div className="flex items-start gap-3">
                            <div className="badge-human rounded-lg p-1.5 flex-shrink-0">
                              <AlertTriangle className="h-3.5 w-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] text-slate-200">{notification.message}</p>
                              <p className="text-[11px] text-slate-500 mt-1">
                                {notification.timestamp.toLocaleTimeString()}
                              </p>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); clearNotification(notification.id); }}
                              className="text-slate-500 hover:text-slate-200 transition-colors"
                              aria-label="Dismiss"
                            >
                              <X className="h-3.5 w-3.5" />
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

          <div className="flex items-center gap-3 pl-3 border-l border-white/10">
            <div className="text-right">
              <p className="text-[13px] font-medium">{user.name}</p>
              <p className="text-[11px] text-slate-400">{user.email}</p>
            </div>
            <button onClick={onLogout} className="btn-ghost rounded-xl px-3 py-2 text-[13px] inline-flex items-center gap-1.5">
              <LogOut className="h-3.5 w-3.5" /> Logout
            </button>
          </div>
        </div>
      </header>

      {/* Three-pane workspace */}
      <div className="flex-1 flex overflow-hidden gap-px bg-white/5">
        <LeftSidebar selectedChat={selectedChat} onChatSelect={handleChatSelect} currentUser={user} />
        <ChatPanel
          selectedChat={selectedChat}
          messages={messages}
          onSendMessage={handleSendMessage}
          onTakeOver={handleTakeOver}
          currentUser={user}
          isTyping={isTyping}
        />
        <RightPanel selectedChat={selectedChat} currentUser={user} onCloseChat={handleCloseChat} />
      </div>
    </div>
  );
};

export default AgentDashboard;
