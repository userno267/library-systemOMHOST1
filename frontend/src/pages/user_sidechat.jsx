import { useEffect, useState, useRef, useCallback } from "react";
import Sidebar from "../components/Sidebar";
import BottomNav from "../components/BottomNav";
import socket from "../socket";

const Icons = {
  Send: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  ),
  Chat: () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
};

function formatMsgTime(dt) {
  if (!dt) return "";
  return new Date(dt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateLabel(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
}

export default function UserChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState(null);
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const token = localStorage.getItem("token");
  const baseUrl = import.meta.env.VITE_API_URL.replace(/\/$/, "");

  /* =========== Load existing conversation =========== */
  useEffect(() => {
    const loadConversation = async () => {
      try {
        const res = await fetch(`${baseUrl}/api/support/my-conversation`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "ngrok-skip-browser-warning": "anyvalue",
          },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.id) setConversationId(data.id);
      } catch (err) {
        console.error("❌ Load conversation error:", err);
      }
    };
    loadConversation();
  }, [baseUrl, token]);

  /* =========== Fetch messages =========== */
  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;
    setLoading(true);
    try {
      const res = await fetch(`${baseUrl}/api/support/${conversationId}/messages`, {
        headers: { Authorization: `Bearer ${token}`, "ngrok-skip-browser-warning": "anyvalue" },
      });
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);

      if (!socket.connected) socket.connect();
      socket.emit("joinConversation", conversationId);
    } catch (err) {
      console.error("❌ Fetch messages error:", err);
    } finally {
      setLoading(false);
    }
  }, [conversationId, token, baseUrl]);

  /* =========== Socket listener =========== */
  useEffect(() => {
    const handleNewMessage = (data) => {
      if (data.conversationId === conversationId) {
        setMessages((prev) => [...prev, data]);
      }
    };
    socket.on("newMessage", handleNewMessage);
    return () => socket.off("newMessage", handleNewMessage);
  }, [conversationId]);

  /* =========== Auto scroll =========== */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* =========== Send message =========== */
  const sendMessage = async () => {
    if (!input.trim()) return;
    try {
      const res = await fetch(`${baseUrl}/api/support/send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "anyvalue",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: input, conversationId }),
      });
      const data = await res.json();

      if (!conversationId && data?.conversationId) {
        setConversationId(data.conversationId);
        socket.emit("joinConversation", data.conversationId);
      }
      setInput("");
    } catch (err) {
      console.error("❌ Send message error:", err);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  useEffect(() => {
    fetchMessages();
  }, [conversationId, fetchMessages]);

  // Group messages by date for date dividers (matches AdminChat behavior)
  const groupedMessages = messages.reduce((groups, msg) => {
    const date = new Date(msg.created_at).toDateString();
    if (!groups[date]) groups[date] = [];
    groups[date].push(msg);
    return groups;
  }, {});

  return (
    <>
      <Sidebar />

      <div className="uc-main">
        <header className="uc-header">
          <p className="uc-eyebrow">Library Support</p>
          <h1 className="uc-title">Chat with a Librarian</h1>
        </header>

        <div className="uc-card">
          <div className="uc-messages">
            {loading ? (
              <div className="uc-msg-state">
                <div className="uc-spinner" />
                <span>Loading messages…</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="uc-msg-state">
                <Icons.Chat />
                <span>No messages yet. Say hello!</span>
              </div>
            ) : (
              Object.entries(groupedMessages).map(([dateStr, msgs]) => (
                <div key={dateStr}>
                  <div className="uc-date-divider">
                    <span>{formatDateLabel(dateStr)}</span>
                  </div>

                  {msgs.map((msg, idx) => {
                    const isStudent = msg.sender === "student";
                    return (
                      <div key={idx} className={`uc-msg-row ${isStudent ? "uc-msg-row--me" : ""}`}>
                        <div className="uc-msg-col">
                          <div className={`uc-bubble ${isStudent ? "uc-bubble--me" : "uc-bubble--them"}`}>
                            {msg.message}
                          </div>
                          <span className="uc-msg-time">{formatMsgTime(msg.created_at)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="uc-input-area">
            <input
              className="uc-input"
              type="text"
              placeholder="Type a message…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
            />
            <button className="uc-send-btn" onClick={sendMessage} disabled={!input.trim()}>
              <Icons.Send />
              <span>Send</span>
            </button>
          </div>
        </div>
      </div>

      <BottomNav />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap');

        :root {
          --forest:    #14532D;
          --forest-lt: #3E7A4D;
          --gold:      #B8860B;
          --espresso:  #5C3D2E;
          --parchment: #FAF6EE;
          --sage:      #EEF3E7;
          --ink:       #241F18;
          --ink-soft:  #5C5546;
          --line:      #E4DFD3;
        }

        .uc-main {
          padding: 80px 16px 100px;
          background: var(--parchment);
          min-height: 100vh;
          font-family: 'Inter', sans-serif;
          color: var(--ink);
        }

        .uc-header { margin-bottom: 18px; }
        .uc-eyebrow {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.68rem; letter-spacing: 0.14em;
          text-transform: uppercase; color: var(--gold);
          margin: 0 0 5px; font-weight: 600;
        }
        .uc-title {
          font-family: 'Fraunces', serif;
          font-size: 1.5rem; font-weight: 600;
          color: var(--forest); margin: 0; letter-spacing: -0.01em;
        }

        .uc-card {
          background: white;
          border: 1px solid var(--line);
          border-radius: 10px;
          display: flex;
          flex-direction: column;
          height: calc(100vh - 260px);
          min-height: 380px;
          overflow: hidden;
        }

        .uc-messages {
          flex: 1;
          overflow-y: auto;
          padding: 18px 16px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .uc-msg-state {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          color: var(--ink-soft);
          font-size: 0.85rem;
          padding: 30px 0;
        }
        .uc-msg-state svg { opacity: 0.3; }

        .uc-spinner {
          width: 20px; height: 20px;
          border: 2.5px solid var(--line); border-top-color: var(--forest);
          border-radius: 50%; animation: uc-spin 0.7s linear infinite;
        }
        @keyframes uc-spin { to { transform: rotate(360deg); } }

        .uc-date-divider {
          display: flex; align-items: center; gap: 10px;
          margin: 14px 0 8px; color: var(--ink-soft);
        }
        .uc-date-divider::before,
        .uc-date-divider::after {
          content: ''; flex: 1; height: 1px; background: var(--line);
        }
        .uc-date-divider span {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.66rem; white-space: nowrap; letter-spacing: 0.05em;
        }

        .uc-msg-row {
          display: flex; align-items: flex-end; gap: 8px; margin-bottom: 6px;
        }
        .uc-msg-row--me { flex-direction: row-reverse; }

        .uc-msg-col {
          display: flex; flex-direction: column; gap: 3px; max-width: 78%;
        }
        .uc-msg-row--me .uc-msg-col { align-items: flex-end; }

        .uc-bubble {
          padding: 9px 13px; border-radius: 16px;
          font-size: 0.875rem; line-height: 1.5; word-break: break-word;
        }
        .uc-bubble--them {
          background: var(--sage); color: var(--ink);
          border-bottom-left-radius: 4px;
        }
        .uc-bubble--me {
          background: var(--forest); color: white;
          border-bottom-right-radius: 4px;
        }

        .uc-msg-time {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.62rem; color: var(--ink-soft); padding: 0 4px;
        }

        .uc-input-area {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 14px; background: white;
          border-top: 1px solid var(--line); flex-shrink: 0;
        }
        .uc-input {
          flex: 1; border: 1px solid var(--line); border-radius: 8px;
          padding: 10px 14px; font-size: 0.875rem;
          font-family: 'Inter', sans-serif; color: var(--ink);
          outline: none; background: var(--parchment);
          transition: border-color 0.15s;
        }
        .uc-input:focus { border-color: var(--forest); background: white; }
        .uc-input::placeholder { color: #B0A89C; }

        .uc-send-btn {
          display: flex; align-items: center; gap: 6px;
          background: var(--forest); color: white;
          border: none; border-radius: 8px;
          padding: 10px 16px; font-size: 0.85rem;
          font-weight: 600; cursor: pointer;
          font-family: 'Inter', sans-serif; white-space: nowrap;
          transition: background 0.15s;
        }
        .uc-send-btn:hover:not(:disabled) { background: var(--forest-lt); }
        .uc-send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
      `}</style>
    </>
  );
}