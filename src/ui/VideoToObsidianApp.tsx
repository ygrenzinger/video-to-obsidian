import { useState } from 'react';
import type VideoToObsidianPlugin from '../main';
import type { AtomicNoteCandidate, ChatMessage, VideoSession } from '../domain';
import { ChatService } from '../chat-service';

type Props = {
  plugin: VideoToObsidianPlugin;
};

export function VideoToObsidianApp({ plugin }: Props) {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState('Enter a YouTube URL to begin.');
  const [error, setError] = useState('');
  const [session, setSession] = useState<VideoSession | null>(null);
  const [chatService, setChatService] = useState<ChatService | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [candidates, setCandidates] = useState<AtomicNoteCandidate[]>([]);
  const [selectedCandidates, setSelectedCandidates] = useState<Set<number>>(new Set());
  const [runtimeLogs, setRuntimeLogs] = useState<string[]>([]);

  function appendRuntimeLog(message: string) {
    const timestamp = new Date().toLocaleTimeString();
    setRuntimeLogs((current) => [...current, `[${timestamp}] ${message}`]);
  }

  async function run<T>(operation: () => Promise<T>): Promise<T | null> {
    setError('');
    try {
      return await operation();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Unexpected error';
      setError(message);
      setStatus('Action failed.');
      return null;
    }
  }

  async function importVideo() {
    setStatus('Downloading Transcript and creating Video note...');
    const importedSession = await run(() => plugin.importVideo(url, appendRuntimeLog));
    if (!importedSession) return;
    setSession(importedSession);
    setChatService(plugin.createChatService(importedSession, appendRuntimeLog));
    setMessages([]);
    setCandidates([]);
    setSelectedCandidates(new Set());
    setStatus(`Ready: ${importedSession.metadata.title}`);
  }

  async function sendChatMessage() {
    if (!chatService || !chatInput.trim()) return;

    const content = chatInput.trim();
    setChatInput('');
    setIsStreaming(true);

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      createdAt: new Date().toISOString()
    };
    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
      streamingComplete: false
    };

    setMessages((current) => [...current, userMessage, assistantMessage]);

    await run(async () => {
      let assistantContent = '';
      for await (const part of chatService.sendMessage(content)) {
        assistantContent += part;
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantMessage.id ? { ...message, content: assistantContent } : message
          )
        );
      }

      setMessages((current) =>
        current.map((message) =>
          message.id === assistantMessage.id
            ? { ...message, content: assistantContent, streamingComplete: true }
            : message
        )
      );
    });

    setIsStreaming(false);
  }

  async function saveChatHistory() {
    if (!session) return;
    setStatus('Saving chat history...');
    await run(() => plugin.saveChatHistory(session, messages));
    setStatus('Chat history saved.');
  }

  async function extractKnowledge() {
    if (!session) return;
    setStatus('Extracting Atomic knowledge note candidates...');
    const extracted = await run(() => plugin.extractAtomicNotes(session, appendRuntimeLog));
    if (!extracted) return;
    setCandidates(extracted);
    setSelectedCandidates(new Set(extracted.map((_, index) => index)));
    setStatus(`Extracted ${extracted.length} candidate${extracted.length === 1 ? '' : 's'} for review.`);
  }

  async function createSelectedNotes() {
    if (!session) return;
    const selected = candidates.filter((_, index) => selectedCandidates.has(index));
    if (selected.length === 0) {
      setError('Select at least one Atomic knowledge note candidate.');
      return;
    }

    setStatus('Creating Atomic knowledge notes...');
    await run(() => plugin.createAtomicNotes(session, selected));
    setStatus('Atomic knowledge notes created.');
  }

  function toggleCandidate(index: number) {
    setSelectedCandidates((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  return (
    <>
      <section className="vto-panel vto-column">
        <h2>Video To Obsidian</h2>
        <div className="vto-row">
          <input
            className="vto-input"
            value={url}
            placeholder="https://www.youtube.com/watch?v=..."
            onChange={(event) => setUrl(event.currentTarget.value)}
          />
          <button onClick={importVideo}>Create Video note</button>
        </div>
        <div className="vto-muted">{status}</div>
        {error ? <div className="vto-error">{error}</div> : null}
      </section>

      <section className="vto-panel vto-column">
        <div className="vto-row vto-row-between">
          <h3>Runtime log</h3>
          <button disabled={runtimeLogs.length === 0} onClick={() => setRuntimeLogs([])}>Clear</button>
        </div>
        {runtimeLogs.length === 0 ? (
          <div className="vto-muted">yt-dlp and LLM calls will appear here.</div>
        ) : (
          <pre className="vto-runtime-log">{runtimeLogs.join('\n')}</pre>
        )}
      </section>

      {session ? (
        <section className="vto-panel vto-column">
          <h3>{session.metadata.title}</h3>
          <div className="vto-muted">Video note: {session.videoNotePath}</div>
          <details>
            <summary>Transcript preview</summary>
            <pre className="vto-transcript">{session.transcript.markdown}</pre>
          </details>
        </section>
      ) : null}

      {session ? (
        <section className="vto-panel vto-column">
          <h3>Chat with Transcript</h3>
          <div className="vto-chat">
            {messages.length === 0 ? <div className="vto-muted">Ask a question about the video.</div> : null}
            {messages.map((message) => (
              <div className="vto-message" key={message.id}>
                <div className="vto-message-role">{message.role}</div>
                <div>{message.content}</div>
              </div>
            ))}
          </div>
          <div className="vto-row">
            <input
              className="vto-input"
              value={chatInput}
              disabled={isStreaming}
              placeholder="Ask about the video..."
              onChange={(event) => setChatInput(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) void sendChatMessage();
              }}
            />
            <button disabled={isStreaming} onClick={sendChatMessage}>Send</button>
            <button disabled={messages.length === 0} onClick={saveChatHistory}>Save chat</button>
          </div>
        </section>
      ) : null}

      {session ? (
        <section className="vto-panel vto-column">
          <h3>Create Atomic knowledge notes</h3>
          <div className="vto-row">
            <button onClick={extractKnowledge}>Extract for review</button>
            <button disabled={candidates.length === 0} onClick={createSelectedNotes}>Create selected notes</button>
          </div>
          {candidates.map((candidate, index) => (
            <article className="vto-note-candidate" key={`${candidate.title}-${index}`}>
              <label className="vto-row">
                <input
                  type="checkbox"
                  checked={selectedCandidates.has(index)}
                  onChange={() => toggleCandidate(index)}
                />
                <strong>{candidate.title}</strong>
              </label>
              <p>{candidate.summary}</p>
              <ul>
                {candidate.claims.map((claim, claimIndex) => (
                  <li key={`${claim.timestamp}-${claimIndex}`}>
                    {claim.text} ({claim.timestamp})
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>
      ) : null}
    </>
  );
}
