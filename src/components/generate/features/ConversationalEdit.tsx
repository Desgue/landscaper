import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Check, X, Loader2, ImageIcon } from 'lucide-react';
import { useGenerateStore } from '../../../store/useGenerateStore';

export function ConversationalEdit() {
  const chatHistory = useGenerateStore((s) => s.chatHistory);
  const sendChatMessage = useGenerateStore((s) => s.sendChatMessage);
  const acceptEdit = useGenerateStore((s) => s.acceptEdit);
  const rejectEdit = useGenerateStore((s) => s.rejectEdit);
  const resultUrl = useGenerateStore((s) => s.resultUrl);
  const editVersions = useGenerateStore((s) => s.editVersions);
  const undoToVersion = useGenerateStore((s) => s.undoToVersion);

  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory.length]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    }
  }, [input]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendChatMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isWaitingResponse =
    chatHistory.length > 0 &&
    chatHistory[chatHistory.length - 1].role === 'user' &&
    !chatHistory.some(
      (m, i) =>
        i === chatHistory.length - 1 && m.role === 'assistant',
    );

  return (
    <div className="flex h-full">
      {/* Left: Image workspace (55%) */}
      <div className="w-[55%] flex flex-col border-r border-border bg-bg">
        <div className="flex-1 flex items-center justify-center p-6">
          {resultUrl ? (
            <img
              src={resultUrl}
              alt="Current version"
              className="max-w-full max-h-full rounded-xl shadow-lg border border-border object-contain"
            />
          ) : (
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-bg-alt flex items-center justify-center mx-auto">
                <ImageIcon size={28} className="text-text-muted" />
              </div>
              <p className="text-sm text-text-muted">
                Generate an image first to start editing
              </p>
            </div>
          )}
        </div>

        {/* Version selector */}
        {editVersions.length > 0 && (
          <div className="px-4 py-3 border-t border-border bg-bg-card flex items-center gap-3">
            <span className="text-xs text-text-muted">Version:</span>
            <select
              value={editVersions[editVersions.length - 1]?.id ?? ''}
              onChange={(e) => undoToVersion(e.target.value)}
              className="bg-bg-card border border-border rounded-md px-2 py-1 text-xs text-text"
            >
              {editVersions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
            <span className="text-[10px] text-text-muted">
              {editVersions.length} version{editVersions.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Right: Conversation (45%) */}
      <div className="w-[45%] flex flex-col bg-bg-card">
        {/* Chat header */}
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-text">Edit with Chat</h3>
          <p className="text-[11px] text-text-muted mt-0.5">
            Describe changes in natural language
          </p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {chatHistory.length === 0 && (
            <div className="text-center py-12 space-y-3">
              <div className="w-12 h-12 rounded-full bg-bg-alt flex items-center justify-center mx-auto">
                <Send size={18} className="text-text-muted" />
              </div>
              <p className="text-sm text-text-muted">
                Describe what you want to change
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  'Make the patio larger',
                  'Add more flowers',
                  'Change fence to wood',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setInput(suggestion);
                      textareaRef.current?.focus();
                    }}
                    className="px-3 py-1.5 text-xs rounded-full border border-border text-text-secondary hover:bg-bg-elevated hover:text-text transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {chatHistory.map((msg) => (
            <div key={msg.id}>
              {msg.role === 'user' ? (
                <UserMessage text={msg.text} />
              ) : (
                <AssistantMessage
                  msg={msg}
                  onAccept={() => acceptEdit(msg.id)}
                  onReject={() => rejectEdit(msg.id)}
                />
              )}
            </div>
          ))}

          {/* Loading indicator when waiting for response */}
          {isWaitingResponse && (
            <div className="flex items-center gap-2 text-primary">
              <Loader2 size={14} className="animate-spin" />
              <span className="text-xs">Generating edit...</span>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input area — pinned to bottom */}
        <div className="border-t border-border p-3">
          <div className="flex items-end gap-2 rounded-xl border border-border bg-bg-card px-3 py-2 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 transition-colors">
            <button className="flex-shrink-0 p-1 text-text-muted hover:text-text transition-colors">
              <Paperclip size={18} />
            </button>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your edit..."
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm text-text placeholder:text-text-muted outline-none min-h-[24px] max-h-[120px]"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className={`flex-shrink-0 p-1.5 rounded-lg transition-colors ${
                input.trim()
                  ? 'bg-primary text-white hover:bg-primary-dark'
                  : 'text-text-muted cursor-not-allowed'
              }`}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function UserMessage({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] bg-bg-elevated rounded-2xl rounded-br-sm px-4 py-2.5">
        <p className="text-sm text-text">{text}</p>
      </div>
    </div>
  );
}

function AssistantMessage({
  msg,
  onAccept,
  onReject,
}: {
  msg: { text: string; imageUrl?: string; status?: string };
  onAccept: () => void;
  onReject: () => void;
}) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] space-y-2">
        <div className="bg-bg-alt rounded-2xl rounded-bl-sm px-4 py-2.5">
          <p className="text-sm text-text">{msg.text}</p>
        </div>

        {msg.imageUrl && (
          <div className="rounded-xl overflow-hidden border border-border shadow-sm">
            <img
              src={msg.imageUrl}
              alt="Generated edit"
              className="w-full aspect-[4/3] object-cover bg-bg-elevated"
            />
          </div>
        )}

        {msg.status === 'pending' && (
          <div className="flex items-center gap-2">
            <button
              onClick={onAccept}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-success/10 text-success hover:bg-success/20 transition-colors"
            >
              <Check size={14} />
              Accept
            </button>
            <button
              onClick={onReject}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-error/10 text-error hover:bg-error/20 transition-colors"
            >
              <X size={14} />
              Reject
            </button>
          </div>
        )}

        {msg.status === 'accepted' && (
          <span className="inline-flex items-center gap-1 text-[11px] text-success font-medium">
            <Check size={12} /> Accepted
          </span>
        )}

        {msg.status === 'rejected' && (
          <span className="inline-flex items-center gap-1 text-[11px] text-text-muted font-medium">
            <X size={12} /> Rejected
          </span>
        )}
      </div>
    </div>
  );
}
