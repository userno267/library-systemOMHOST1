import { useState, useRef, useEffect } from "react";
import axios from "axios";

// ── Icons ──────────────────────────────────────────────────────────────────
const Icons = {
  Chat:  () => <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  Close: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Send:  () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  Book:  () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
};

export default function AiAssistant({ apiUrl, token }) {
  const BUBBLE_SIZE = 62;
  const MARGIN = 20;

  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 100 });
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [velocity, setVelocity] = useState({ x: 0, y: 0 });

  const [messages, setMessages] = useState([
    { role: "ai", text: "Hello! I can help you find books and library info." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const bubbleRef = useRef(null);
  const chatBodyRef = useRef(null);
  const lastPos = useRef({ x: 0, y: 0, time: 0 });

  /* ================= SESSION ID (for AI conversation memory) =================
     Persists for this tab/page-session only via sessionStorage, so context
     resets on reload/new tab but is kept while the page stays open. */
  const sessionIdRef = useRef(null);
  if (!sessionIdRef.current) {
    let existing = sessionStorage.getItem("aiChatSessionId");
    if (!existing) {
      existing = crypto.randomUUID();
      sessionStorage.setItem("aiChatSessionId", existing);
    }
    sessionIdRef.current = existing;
  }

  /* ================= INIT POSITION (RIGHT SIDE) ================= */
  useEffect(() => {
    setPosition({
      x: window.innerWidth - BUBBLE_SIZE - MARGIN,
      y: 120,
    });
  }, []);

  /* ================= DRAG ================= */
  const startDrag = (clientX, clientY) => {
    setDragging(true);
    setOffset({ x: clientX - position.x, y: clientY - position.y });
    lastPos.current = { x: clientX, y: clientY, time: Date.now() };
  };

  const moveDrag = (clientX, clientY) => {
    if (!dragging) return;

    const newX = Math.min(
      Math.max(clientX - offset.x, 0),
      window.innerWidth - BUBBLE_SIZE
    );

    const newY = Math.min(
      Math.max(clientY - offset.y, 0),
      window.innerHeight - BUBBLE_SIZE
    );

    const now = Date.now();
    const dt = Math.max(now - lastPos.current.time, 1);

    setVelocity({
      x: (clientX - lastPos.current.x) / dt,
      y: (clientY - lastPos.current.y) / dt,
    });

    lastPos.current = { x: clientX, y: clientY, time: now };
    setPosition({ x: newX, y: newY });
  };

  const endDrag = () => {
    if (!dragging) return;
    setDragging(false);

    // Force right side only
    const snapX = window.innerWidth - BUBBLE_SIZE - MARGIN;

    let snapY = position.y + velocity.y * 150;
    snapY = Math.min(
      Math.max(snapY, 10),
      window.innerHeight - BUBBLE_SIZE - 10
    );

    setPosition({ x: snapX, y: snapY });
  };

  /* ================= EVENTS ================= */
  useEffect(() => {
    const handleMouseMove = (e) => moveDrag(e.clientX, e.clientY);
    const handleMouseUp = () => endDrag();

    const handleTouchMove = (e) => {
      if (!dragging) return;
      const t = e.touches[0];
      moveDrag(t.clientX, t.clientY);
    };

    const handleTouchEnd = () => endDrag();

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [dragging, position, velocity]);

  /* ================= AUTO SCROLL ================= */
  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [messages]);

  /* ================= FOCUS ================= */
  useEffect(() => {
    if (open) {
      document.querySelector(".ai-footer input")?.focus();
    }
  }, [open]);

  /* ================= SEND ================= */
  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    setMessages((prev) => [...prev, { role: "user", text: input }]);
    const userText = input;
    setInput("");
    setLoading(true);

    try {
      const res = await axios.post(
        apiUrl || `${import.meta.env.VITE_API_URL}/api/chat`,
        { message: userText, sessionId: sessionIdRef.current },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "true",
          },
        }
      );

      const aiReply = res.data?.reply || "No response.";
      setMessages((prev) => [...prev, { role: "ai", text: aiReply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "Error connecting to AI server." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  /* ================= JSX ================= */
  return (
    <>
      <div
        ref={bubbleRef}
        className="ai-bubble"
        onMouseDown={(e) => startDrag(e.clientX, e.clientY)}
        onTouchStart={(e) => {
          const t = e.touches[0];
          startDrag(t.clientX, t.clientY);
        }}
        onClick={() => !dragging && setOpen(!open)}
        style={{
          left: `${position.x}px`,
          top: `${Math.min(position.y, window.innerHeight - 150)}px`,
          transition: dragging ? "none" : "all 0.3s ease-out",
        }}
      >
        <Icons.Chat />
      </div>

      {open && (
        <div className="ai-box">
          <div className="ai-header">
            <div className="ai-header-left">
              <div className="ai-header-icon"><Icons.Book /></div>
              <div>
                <p className="ai-header-name">Jonathan</p>
                <p className="ai-header-role">AI Librarian</p>
              </div>
            </div>
            <button className="ai-close-btn" onClick={() => setOpen(false)}>
              <Icons.Close />
            </button>
          </div>
          <div className="ai-gold-rule" />

          <div className="ai-body" ref={chatBodyRef}>
            {messages.map((m, i) => (
              <div key={i} className={`ai-message ai-message--${m.role}`}>
                {m.text}
              </div>
            ))}
            {loading && (
              <div className="ai-message ai-message--ai ai-message--typing">
                <span className="ai-typing-dot" />
                <span className="ai-typing-dot" />
                <span className="ai-typing-dot" />
              </div>
            )}
          </div>

          <div className="ai-footer">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              placeholder="Ask about a book or the library…"
            />
            <button onClick={sendMessage} disabled={loading || !input.trim()}>
              <Icons.Send />
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        :root {
          --forest:    #14532D;
          --forest-lt: #3E7A4D;
          --gold:      #B8860B;
          --parchment: #FAF6EE;
          --sage:      #EEF3E7;
          --ink:       #241F18;
          --ink-soft:  #5C5546;
          --line:      #E4DFD3;
        }

        .ai-bubble {
          position: fixed;
          width: 62px;
          height: 62px;
          background: var(--forest);
          border: 2px solid rgba(184,134,11,0.55);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: grab;
          z-index: 600;
          box-shadow: 0 4px 16px rgba(20,83,45,0.35);
          user-select: none;
          touch-action: none;
        }

        .ai-box {
          position: fixed;
          bottom: 78px;
          right: 20px;
          width: min(90vw, 340px);
          height: 50vh;
          max-height: 460px;
          background: var(--parchment);
          border: 1px solid var(--line);
          border-radius: 14px;
          box-shadow: 0 10px 32px rgba(36,31,24,0.22);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          z-index: 590;
          font-family: 'Inter', sans-serif;
        }

        .ai-header {
          background: var(--forest);
          color: white;
          padding: 12px 14px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-shrink: 0;
        }
        .ai-header-left { display: flex; align-items: center; gap: 10px; }
        .ai-header-icon {
          display: flex; align-items: center; justify-content: center;
          width: 30px; height: 30px; border-radius: 6px;
          background: rgba(255,255,255,0.12); color: var(--gold); flex-shrink: 0;
        }
        .ai-header-name {
          font-family: 'Fraunces', Georgia, serif; font-size: 0.92rem;
          font-weight: 700; margin: 0; line-height: 1.2;
        }
        .ai-header-role {
          font-size: 0.65rem; letter-spacing: 0.08em; text-transform: uppercase;
          color: var(--gold); margin: 1px 0 0; opacity: 0.9;
        }
        .ai-close-btn {
          background: rgba(255,255,255,0.12); border: none; border-radius: 6px;
          width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;
          color: white; cursor: pointer; transition: background 0.12s; flex-shrink: 0;
        }
        .ai-close-btn:hover { background: rgba(255,255,255,0.22); }

        .ai-gold-rule {
          height: 1px; flex-shrink: 0;
          background: linear-gradient(90deg, var(--gold), transparent); opacity: 0.6;
        }

        .ai-body {
          flex: 1;
          padding: 12px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .ai-message {
          padding: 8px 12px;
          border-radius: 12px;
          max-width: 85%;
          font-size: 0.85rem;
          line-height: 1.45;
        }
        .ai-message--user {
          align-self: flex-end;
          background: var(--forest);
          color: white;
          border-bottom-right-radius: 4px;
        }
        .ai-message--ai {
          align-self: flex-start;
          background: white;
          color: var(--ink);
          border: 1px solid var(--line);
          border-bottom-left-radius: 4px;
        }
        .ai-message--typing {
          display: flex; align-items: center; gap: 4px; padding: 10px 14px;
        }
        .ai-typing-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--ink-soft); opacity: 0.5;
          animation: ai-bounce 1.1s infinite ease-in-out;
        }
        .ai-typing-dot:nth-child(2) { animation-delay: 0.15s; }
        .ai-typing-dot:nth-child(3) { animation-delay: 0.3s; }
        @keyframes ai-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
          30% { transform: translateY(-3px); opacity: 1; }
        }

        .ai-footer {
          display: flex;
          border-top: 1px solid var(--line);
          background: white;
          flex-shrink: 0;
          gap: 6px;
          padding: 8px;
        }

        .ai-footer input {
          flex: 1;
          padding: 9px 12px;
          border: 1px solid var(--line);
          border-radius: 8px;
          outline: none;
          font-size: 0.84rem;
          font-family: 'Inter', sans-serif;
          color: var(--ink);
          background: var(--parchment);
          transition: border-color 0.15s;
        }
        .ai-footer input:focus { border-color: var(--forest); background: white; }
        .ai-footer input::placeholder { color: #B0A89C; }
        .ai-footer input:disabled { opacity: 0.6; }

        .ai-footer button {
          background: var(--forest);
          color: white;
          border: none;
          border-radius: 8px;
          width: 38px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: background 0.15s;
          flex-shrink: 0;
        }
        .ai-footer button:hover:not(:disabled) { background: var(--forest-lt); }
        .ai-footer button:disabled {
          background: var(--line);
          color: var(--ink-soft);
          cursor: not-allowed;
        }
      `}</style>
    </>
  );
}