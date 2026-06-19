import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import { io } from "socket.io-client";
import { Send, X, MessageCircle, User, Bot, Shield, Sparkles } from "lucide-react";
import { chatAPI, customerAPI } from "../api/api";

const ChatWidget = ({ companyId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [chatId, setChatId] = useState(null);
  const [socket, setSocket] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [chatMode, setChatMode] = useState("ai");
  const [assignedAgent, setAssignedAgent] = useState(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  useEffect(() => {
    if (isOpen) initializeChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const scrollToBottom = () => {
    const anchor = messagesEndRef.current;
    if (!anchor) return;
    requestAnimationFrame(() => {
      anchor.scrollIntoView({ block: "end" });
      setTimeout(() => anchor.scrollIntoView({ block: "end" }), 30);
    });
  };

  useLayoutEffect(() => { scrollToBottom(); }, [messages]);

  const initializeChat = async () => {
    try {
      let userId = localStorage.getItem("support_user_id");
      if (!userId) {
        userId = crypto.randomUUID();
        localStorage.setItem("support_user_id", userId);
      }

      const initResponse = await customerAPI.init({ userId, companyId });
      const resolvedCompanyId = initResponse.data.companyId;

      const response = await chatAPI.createChat({ userId, companyId: resolvedCompanyId });
      const { chat } = response.data;
      setChatId(chat._id);
      setChatMode(chat.mode);
      setAssignedAgent(chat.assignedAgentId);

      if (chat.messages && chat.messages.length > 0) {
        setMessages(chat.messages);
        scrollToBottom();
      } else if (chat.mode === "ai" && chat.status === "open") {
        setMessages([
          {
            senderRole: "ai",
            text: "Hi! I'm your AI support assistant. Ask me anything — and just say \"talk to a human\" any time you'd like an agent.",
            createdAt: new Date(),
          },
        ]);
      }

      const newSocket = io("http://localhost:5000", { transports: ["websocket"], reconnection: true });
      setSocket(newSocket);

      newSocket.on("connect", () => newSocket.emit("joinChat", { chatId: chat._id, userId }));
      if (newSocket.connected) newSocket.emit("joinChat", { chatId: chat._id, userId });

      newSocket.on("chatHistory", ({ messages: history }) => {
        if (Array.isArray(history)) { setMessages(history); scrollToBottom(); }
      });

      newSocket.on("receiveMessage", ({ message }) => {
        setMessages((prev) => [...prev, message]);
        scrollToBottom();
      });

      newSocket.on("chatTaken", ({ agentName, mode }) => {
        setChatMode(mode);
        setAssignedAgent(agentName);
      });

      newSocket.on("userTyping", ({ userId: typingUserId, isTyping }) => {
        const currentUserId = localStorage.getItem("support_user_id");
        if (typingUserId !== currentUserId) setIsTyping(isTyping);
      });

      newSocket.on("aiTyping", ({ chatId: socketChatId, isTyping }) => {
        if (socketChatId === chat._id) setIsTyping(isTyping);
      });

      newSocket.on("error", ({ message }) => console.error("Socket error:", message));
    } catch (error) {
      console.error("Failed to initialize chat:", error);
    }
  };

  const sendMessage = () => {
    if (!inputText.trim() || !socket || !chatId) return;
    const userId = localStorage.getItem("support_user_id");
    socket.emit("sendMessage", { chatId, senderId: userId, senderRole: "customer", text: inputText.trim() });
    setInputText("");
    socket.emit("typing", { chatId, userId, isTyping: false });
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleTyping = () => {
    if (socket && chatId) {
      const userId = localStorage.getItem("support_user_id");
      socket.emit("typing", { chatId, userId, isTyping: true });
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
    setChatMode("ai");
    setAssignedAgent(null);
  };

  const formatTime = (date) =>
    new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const isHuman = chatMode === "human";

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full z-50 flex items-center justify-center shadow-2xl btn-accent transition-transform hover:scale-105 active:scale-95"
          aria-label="Open chat"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {isOpen && (
        <div
          className="glass-strong fixed bottom-6 right-6 w-[380px] h-[540px] rounded-3xl z-50 flex flex-col overflow-hidden animate-scale-in"
          style={{ transformOrigin: "bottom right" }}
        >
          {/* Header */}
          <div
            className="px-5 py-4 flex items-center justify-between border-b border-white/10"
            style={{
              background: isHuman
                ? "linear-gradient(135deg, rgba(139,92,246,0.18), rgba(139,92,246,0.04))"
                : "linear-gradient(135deg, rgba(34,211,238,0.18), rgba(34,211,238,0.04))",
            }}
          >
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isHuman ? "avatar-human" : "avatar-ai"}`}>
                {isHuman ? <Shield className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>
              <div>
                <h3 className="font-semibold text-[14px] text-slate-100 tracking-tight">
                  {isHuman ? "Human Support" : "AI Support"}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {isHuman
                    ? `${assignedAgent?.name || assignedAgent || "Agent"} is here`
                    : "Online · usually replies instantly"}
                </p>
              </div>
            </div>
            <button onClick={closeChat} className="text-slate-400 hover:text-slate-100 transition-colors p-1.5 rounded-lg hover:bg-white/10" aria-label="Close chat">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" ref={messagesContainerRef}>
            {messages.map((message, index) => {
              const isCustomer = message.senderRole === "customer";
              const isAI = message.senderRole === "ai";
              const bubble = isCustomer ? "bubble-self" : isAI ? "bubble-ai" : "bubble-human";
              return (
                <div key={index} className={`flex items-end gap-2 animate-fade-slide ${isCustomer ? "justify-end" : "justify-start"}`}>
                  {!isCustomer && (
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${isAI ? "avatar-ai" : "avatar-human"}`}>
                      {isAI ? <Bot className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                    </div>
                  )}
                  <div className={`max-w-[260px] px-3 py-2 rounded-2xl ${bubble} ${isCustomer ? "rounded-br-md" : "rounded-bl-md"}`}>
                    <p className="text-[13px] leading-relaxed">{message.text}</p>
                    <p className="text-[10px] opacity-60 mt-0.5">{formatTime(message.createdAt)}</p>
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div className="flex items-end gap-2 animate-fade-slide">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isHuman ? "avatar-human" : "avatar-ai"}`}>
                  {isHuman ? <Shield className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                </div>
                <div className={`${isHuman ? "bubble-human" : "bubble-ai"} px-3 py-2.5 rounded-2xl rounded-bl-md`}>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] opacity-80 mr-1">{isHuman ? "Typing" : "AI is thinking"}</span>
                    <span className="w-1 h-1 rounded-full animate-pulse-soft" style={{ background: "currentColor" }} />
                    <span className="w-1 h-1 rounded-full animate-pulse-soft" style={{ background: "currentColor", animationDelay: "0.2s" }} />
                    <span className="w-1 h-1 rounded-full animate-pulse-soft" style={{ background: "currentColor", animationDelay: "0.4s" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} style={{ height: "1px" }} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-white/10">
            <div className="glass rounded-2xl flex items-center gap-1.5 p-1.5">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                onInput={handleTyping}
                placeholder="Type a message…"
                className="flex-1 bg-transparent px-3 py-1.5 text-[13px] text-slate-100 placeholder:text-slate-500 outline-none"
              />
              <button
                onClick={sendMessage}
                disabled={!inputText.trim()}
                className="btn-accent rounded-xl w-9 h-9 flex items-center justify-center disabled:opacity-40"
                aria-label="Send"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-[10px] text-slate-500 text-center mt-2 inline-flex items-center gap-1 w-full justify-center">
              <Sparkles className="h-2.5 w-2.5" /> Try saying "talk to a human"
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatWidget;
