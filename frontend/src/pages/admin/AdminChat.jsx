// src/pages/admin/AdminChat.jsx
import { useEffect, useState, useRef, useCallback } from "react";
import AdminSidebar from "../../components/AdminSidebar";
import socket from "../../socket";

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const Icons = {
  Search:  () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Send:    () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  Chat:    () => <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  User:    () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
};

// ── Format helpers ─────────────────────────────────────────────────────────────
function formatTime(dt) {
  if (!dt) return "";
  const d = new Date(dt);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  return isToday
    ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatMsgTime(dt) {
  if (!dt) return "";
  return new Date(dt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ── Avatar initials ───────────────────────────────────────────────────────────
function Avatar({ name, size = 36 }) {
  const initials = (name || "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="ch-avatar" style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {initials}
    </div>
  );
}

export default function AdminChat() {
  const [conversations, setConversations]             = useState([]);
  const [filteredConversations, setFilteredConversations] = useState([]);
  const [search, setSearch]                           = useState("");
  const [activeConversation, setActiveConversation]   = useState(null);
  const [messages, setMessages]                       = useState([]);
  const [input, setInput]                             = useState("");
  const [loadingMessages, setLoadingMessages]         = useState(false);

  const messagesContainerRef = useRef(null);
  const isUserNearBottom     = useRef(true);
  const inputRef             = useRef(null);

  const token   = localStorage.getItem("token");
  const baseUrl = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

  /* ── Fetch conversations ── */
  const fetchConversations = useCallback(async () => {
    try {
      const res  = await fetch(`${baseUrl}/api/support/admin/conversations`, {
        headers: { Authorization: `Bearer ${token}`, "ngrok-skip-browser-warning": "anyvalue" },
      });
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setConversations(list);
      setFilteredConversations(
        list.filter(c =>
          `${c.user_name} ${c.lrn || ""}`.toLowerCase().includes(search.toLowerCase())
        )
      );
    } catch (err) { console.error("Fetch conversations error:", err); }
  }, [baseUrl, token, search]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  /* ── Fetch messages ── */
  const fetchMessages = useCallback(async (conversationId) => {
    if (!conversationId) return;
    setLoadingMessages(true);
    try {
      const res  = await fetch(`${baseUrl}/api/support/${conversationId}/messages`, {
        headers: { Authorization: `Bearer ${token}`, "ngrok-skip-browser-warning": "anyvalue" },
      });
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
      await fetch(`${baseUrl}/api/support/${conversationId}/read`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchConversations();
    } catch (err) { console.error("Fetch messages error:", err); }
    finally { setLoadingMessages(false); }
  }, [baseUrl, token, fetchConversations]);

  /* ── Socket ── */
  useEffect(() => {
    if (!socket.connected) socket.connect();
    const handleNewMessage = (data) => {
      setMessages(prev =>
        activeConversation?.id === data.conversationId ? [...prev, data] : prev
      );
      fetchConversations();
    };
    socket.on("newMessage", handleNewMessage);
    return () => socket.off("newMessage", handleNewMessage);
  }, [activeConversation, fetchConversations]);

  /* ── Open conversation ── */
  const openConversation = (conv) => {
    const id = conv.conversation_id || null;
    setActiveConversation({ ...conv, id });
    setMessages([]);
    if (id) {
      fetchMessages(id);
      socket.emit("joinConversation", `${id}`);
    }
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  /* ── Send message ── */
  const sendMessage = async () => {
    if (!input.trim() || !activeConversation) return;
    try {
      const body = { message: input };
      if (!activeConversation.id && activeConversation.user_id) {
        body.studentId = activeConversation.user_id;
      } else {
        body.conversationId = activeConversation.id;
      }
      const res  = await fetch(`${baseUrl}/api/support/send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "anyvalue",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setInput("");
      if (!activeConversation.id && data?.conversationId) {
        const newId = data.conversationId;
        setActiveConversation(prev => ({ ...prev, id: newId }));
        socket.emit("joinConversation", `${newId}`);
        fetchMessages(newId);
      }
    } catch (err) { console.error("Send message error:", err); }
  };

  /* ── Scroll handling ── */
  const handleScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    isUserNearBottom.current = (el.scrollHeight - el.scrollTop - el.clientHeight) < 100;
  };

  useEffect(() => {
    if (loadingMessages) return;
    const el = messagesContainerRef.current;
    if (!el) return;
    setTimeout(() => { el.scrollTop = el.scrollHeight; }, 200);
  }, [loadingMessages]);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el || !isUserNearBottom.current) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Group messages by date for date dividers
  const groupedMessages = messages.reduce((groups, msg) => {
    const date = new Date(msg.created_at).toDateString();
    if (!groups[date]) groups[date] = [];
    groups[date].push(msg);
    return groups;
  }, {});

  const formatDateLabel = (dateStr) => {
    const d   = new Date(dateStr);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return "Today";
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
  };

  return (
    <>
      <AdminSidebar />

      <div className="ch-root">

        {/* ══ Sidebar panel ══ */}
        <aside className="ch-sidebar">
          {/* Header */}
          <div className="ch-sidebar-head">
            <p className="ch-sidebar-eyebrow">Support</p>
            <h2 className="ch-sidebar-title">Messages</h2>
          </div>

          {/* Search */}
          <div className="ch-search-wrap">
            <Icons.Search />
            <input
              className="ch-search-input"
              placeholder="Search students…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Conversation list */}
          <div className="ch-conv-list">
            {filteredConversations.length === 0 ? (
              <p className="ch-conv-empty">No conversations found.</p>
            ) : filteredConversations.map(conv => {
              const isActive  = activeConversation?.id === conv.conversation_id;
              const hasUnread = conv.unread_count > 0;
              return (
                <button
                  key={conv.user_id}
                  className={`ch-conv-item ${isActive ? "ch-conv-active" : ""}`}
                  onClick={() => openConversation(conv)}
                >
                  <Avatar name={conv.user_name} size={38} />
                  <div className="ch-conv-body">
                    <div className="ch-conv-top">
                      <span className={`ch-conv-name ${hasUnread ? "ch-conv-name--unread" : ""}`}>
                        {conv.user_name}
                      </span>
                      <span className="ch-conv-time">{formatTime(conv.last_message_at)}</span>
                    </div>
                    <p className={`ch-conv-preview ${hasUnread ? "ch-conv-preview--unread" : ""}`}>
                      {conv.last_message || "No messages yet"}
                    </p>
                  </div>
                  {hasUnread && (
                    <span className="ch-unread-badge">{conv.unread_count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        {/* ══ Chat panel ══ */}
        <main className="ch-panel">
          {!activeConversation ? (
            <div className="ch-empty">
              <div className="ch-empty-icon"><Icons.Chat /></div>
              <p className="ch-empty-title">No conversation selected</p>
              <p className="ch-empty-sub">Choose a student from the list to view messages.</p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="ch-panel-header">
                <Avatar name={activeConversation.user_name} size={36} />
                <div className="ch-panel-header-info">
                  <span className="ch-panel-name">{activeConversation.user_name}</span>
                  {activeConversation.lrn && (
                    <span className="ch-panel-lrn">LRN {activeConversation.lrn}</span>
                  )}
                </div>
              </div>

              {/* Messages area */}
              <div
                className="ch-messages"
                ref={messagesContainerRef}
                onScroll={handleScroll}
              >
                {loadingMessages ? (
                  <div className="ch-msg-state">
                    <div className="ch-spinner" />
                    <span>Loading messages…</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="ch-msg-state">
                    <Icons.Chat />
                    <span>No messages yet. Say hello!</span>
                  </div>
                ) : (
                  Object.entries(groupedMessages).map(([dateStr, msgs]) => (
                    <div key={dateStr}>
                      {/* Date divider */}
                      <div className="ch-date-divider">
                        <span>{formatDateLabel(dateStr)}</span>
                      </div>

                      {msgs.map((msg, idx) => {
                        const isAdmin = msg.sender === "admin";
                        return (
                          <div key={idx} className={`ch-msg-row ${isAdmin ? "ch-msg-row--admin" : ""}`}>
                            {!isAdmin && <Avatar name={activeConversation.user_name} size={28} />}
                            <div className="ch-msg-col">
                              <div className={`ch-bubble ${isAdmin ? "ch-bubble--admin" : "ch-bubble--user"}`}>
                                {msg.message}
                              </div>
                              <span className="ch-msg-time">{formatMsgTime(msg.created_at)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>

              {/* Input area */}
              <div className="ch-input-area">
                <input
                  ref={inputRef}
                  className="ch-input"
                  type="text"
                  placeholder="Type a message…"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                />
                <button
                  className="ch-send-btn"
                  onClick={sendMessage}
                  disabled={!input.trim()}
                >
                  <Icons.Send />
                  <span>Send</span>
                </button>
              </div>
            </>
          )}
        </main>
      </div>

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

        /* ── Root shell ── */
        .ch-root {
          margin-left: 248px;
          display: flex;
          height: 100dvh;
          background: var(--parchment);
          font-family: 'Inter', sans-serif;
          color: var(--ink);
          overflow: hidden;
        }

        /* ══ Conversation sidebar ══ */
        .ch-sidebar {
          width: 300px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          background: white;
          border-right: 1px solid var(--line);
          overflow: hidden;
        }

        .ch-sidebar-head {
          padding: 24px 20px 14px;
          border-bottom: 1px solid var(--line);
          flex-shrink: 0;
        }
        .ch-sidebar-eyebrow {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.62rem; letter-spacing: 0.14em;
          text-transform: uppercase; color: var(--gold);
          margin: 0 0 3px; font-weight: 600;
        }
        .ch-sidebar-title {
          font-family: 'Fraunces', serif;
          font-size: 1.25rem; font-weight: 600;
          color: var(--forest); margin: 0;
        }

        /* Search */
        .ch-search-wrap {
          display: flex; align-items: center; gap: 8px;
          margin: 12px 14px;
          background: var(--parchment); border: 1px solid var(--line);
          border-radius: 6px; padding: 8px 10px;
          flex-shrink: 0; transition: border-color 0.15s;
        }
        .ch-search-wrap:focus-within { border-color: var(--forest); }
        .ch-search-wrap svg { color: var(--ink-soft); flex-shrink: 0; }
        .ch-search-input {
          border: none; outline: none; background: transparent;
          flex: 1; font-size: 0.83rem;
          font-family: 'Inter', sans-serif; color: var(--ink);
        }
        .ch-search-input::placeholder { color: #B0A89C; }

        /* Conversation list */
        .ch-conv-list {
          flex: 1; overflow-y: auto; padding: 4px 8px 12px;
          scrollbar-width: thin; scrollbar-color: var(--line) transparent;
        }
        .ch-conv-empty {
          font-size: 0.82rem; color: var(--ink-soft);
          text-align: center; padding: 24px 0;
        }

        /* Conversation item */
        .ch-conv-item {
          width: 100%; display: flex; align-items: flex-start;
          gap: 10px; padding: 10px 10px;
          border-radius: 6px; border: none;
          background: transparent; cursor: pointer; text-align: left;
          position: relative; transition: background 0.12s;
          margin-bottom: 2px;
        }
        .ch-conv-item:hover { background: var(--sage); }
        .ch-conv-item.ch-conv-active { background: var(--sage); }
        .ch-conv-item.ch-conv-active::before {
          content: '';
          position: absolute; left: 0; top: 20%; bottom: 20%;
          width: 3px; border-radius: 99px; background: var(--forest);
        }

        /* Avatar */
        .ch-avatar {
          border-radius: 50%; background: var(--forest);
          color: white; font-family: 'Fraunces', serif;
          font-weight: 600; display: flex; align-items: center;
          justify-content: center; flex-shrink: 0; line-height: 1;
        }

        .ch-conv-body { flex: 1; min-width: 0; }
        .ch-conv-top {
          display: flex; justify-content: space-between;
          align-items: baseline; gap: 6px; margin-bottom: 2px;
        }
        .ch-conv-name {
          font-size: 0.85rem; font-weight: 500;
          color: var(--ink); white-space: nowrap;
          overflow: hidden; text-overflow: ellipsis;
          max-width: 130px;
        }
        .ch-conv-name--unread { font-weight: 700; }
        .ch-conv-time {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.68rem; color: var(--ink-soft); flex-shrink: 0;
        }
        .ch-conv-preview {
          font-size: 0.78rem; color: var(--ink-soft); margin: 0;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .ch-conv-preview--unread { color: var(--ink); font-weight: 500; }

        /* Unread badge */
        .ch-unread-badge {
          position: absolute; top: 10px; right: 10px;
          background: var(--forest); color: white;
          font-size: 0.65rem; font-weight: 700;
          min-width: 18px; height: 18px; border-radius: 99px;
          display: flex; align-items: center; justify-content: center;
          padding: 0 5px; font-family: 'IBM Plex Mono', monospace;
        }

        /* ══ Chat panel ══ */
        .ch-panel {
          flex: 1; display: flex; flex-direction: column; overflow: hidden;
        }

        /* Empty state */
        .ch-empty {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 12px;
          color: var(--ink-soft);
        }
        .ch-empty-icon {
          width: 64px; height: 64px; border-radius: 50%;
          background: var(--sage); display: flex;
          align-items: center; justify-content: center;
          color: var(--ink-soft);
        }
        .ch-empty-title {
          font-family: 'Fraunces', serif; font-size: 1.1rem;
          color: var(--ink); margin: 0; font-weight: 600;
        }
        .ch-empty-sub { font-size: 0.83rem; margin: 0; color: var(--ink-soft); }

        /* Chat header */
        .ch-panel-header {
          display: flex; align-items: center; gap: 12px;
          padding: 14px 20px; background: white;
          border-bottom: 1px solid var(--line); flex-shrink: 0;
        }
        .ch-panel-header-info { display: flex; flex-direction: column; gap: 1px; }
        .ch-panel-name { font-weight: 600; font-size: 0.92rem; color: var(--ink); }
        .ch-panel-lrn {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.68rem; color: var(--ink-soft);
        }

        /* Messages */
        .ch-messages {
          flex: 1; overflow-y: auto; padding: 20px 24px;
          display: flex; flex-direction: column; gap: 2px;
          scrollbar-width: thin; scrollbar-color: var(--line) transparent;
        }

        /* Loading / empty state in messages */
        .ch-msg-state {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 12px; color: var(--ink-soft); font-size: 0.85rem;
          padding: 40px 0;
        }
        .ch-msg-state svg { opacity: 0.3; }
        .ch-spinner {
          width: 22px; height: 22px;
          border: 2.5px solid var(--line); border-top-color: var(--forest);
          border-radius: 50%; animation: ch-spin 0.7s linear infinite;
        }
        @keyframes ch-spin { to { transform: rotate(360deg); } }

        /* Date divider */
        .ch-date-divider {
          display: flex; align-items: center; gap: 12px;
          margin: 18px 0 10px; color: var(--ink-soft);
        }
        .ch-date-divider::before,
        .ch-date-divider::after {
          content: ''; flex: 1; height: 1px; background: var(--line);
        }
        .ch-date-divider span {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.68rem; white-space: nowrap;
          letter-spacing: 0.05em;
        }

        /* Message rows */
        .ch-msg-row {
          display: flex; align-items: flex-end; gap: 8px;
          margin-bottom: 8px;
        }
        .ch-msg-row--admin { flex-direction: row-reverse; }

        .ch-msg-col {
          display: flex; flex-direction: column; gap: 3px;
          max-width: 68%;
        }
        .ch-msg-row--admin .ch-msg-col { align-items: flex-end; }

        /* Bubbles */
        .ch-bubble {
          padding: 10px 14px; border-radius: 16px;
          font-size: 0.875rem; line-height: 1.5;
          word-break: break-word;
        }
        .ch-bubble--user {
          background: white; color: var(--ink);
          border: 1px solid var(--line);
          border-bottom-left-radius: 4px;
        }
        .ch-bubble--admin {
          background: var(--forest); color: white;
          border-bottom-right-radius: 4px;
        }

        .ch-msg-time {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.62rem; color: var(--ink-soft);
          padding: 0 4px;
        }

        /* Input area */
        .ch-input-area {
          display: flex; align-items: center; gap: 10px;
          padding: 14px 20px; background: white;
          border-top: 1px solid var(--line); flex-shrink: 0;
        }
        .ch-input {
          flex: 1; border: 1px solid var(--line); border-radius: 8px;
          padding: 10px 14px; font-size: 0.875rem;
          font-family: 'Inter', sans-serif; color: var(--ink);
          outline: none; background: var(--parchment);
          transition: border-color 0.15s;
        }
        .ch-input:focus { border-color: var(--forest); background: white; }
        .ch-input::placeholder { color: #B0A89C; }

        .ch-send-btn {
          display: flex; align-items: center; gap: 7px;
          background: var(--forest); color: white;
          border: none; border-radius: 8px;
          padding: 10px 18px; font-size: 0.85rem;
          font-weight: 600; cursor: pointer;
          font-family: 'Inter', sans-serif; white-space: nowrap;
          transition: background 0.15s;
        }
        .ch-send-btn:hover:not(:disabled) { background: var(--forest-lt); }
        .ch-send-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        /* ── Responsive ── */
        @media (max-width: 1000px) {
          .ch-root { margin-left: 0; }
        }
        @media (max-width: 700px) {
          .ch-sidebar { width: 100%; position: absolute; z-index: 10; }
          .ch-panel { display: none; }
        }
      `}</style>
    </>
  );
}