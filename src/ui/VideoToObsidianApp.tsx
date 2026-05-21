import { useState } from 'react';
import type VideoToObsidianPlugin from '../main';
import type { ChatMessage, VideoSession } from '../domain';
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
  const [savedAnswerIds, setSavedAnswerIds] = useState<Set<string>>(new Set());
  const [chatInput, setChatInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
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
    setSavedAnswerIds(new Set());
    setStatus(`Ready: ${importedSession.metadata.title}`);
  }

  async function generateSummary() {
    if (!session) return;
    setIsGeneratingSummary(true);
    setStatus('Generating Video note summary...');
    const generated = await run(() => plugin.generateSummary(session, appendRuntimeLog));
    setIsGeneratingSummary(false);
    if (generated !== null) setStatus('Video note summary generated.');
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

  async function saveChatTurn(question: ChatMessage, answer: ChatMessage) {
    if (!session || !answer.content.trim()) return;
    setStatus('Saving chat answer...');
    const saved = await run(() => plugin.saveChatTurn(session, question.content, answer.content));
    if (saved === null) return;
    setSavedAnswerIds((current) => new Set(current).add(answer.id));
    setStatus('Chat answer saved.');
  }

  const chatTurns = toChatTurns(messages);

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
          {session ? <button disabled={isGeneratingSummary} onClick={generateSummary}>Generate summary</button> : null}
        </div>
        <div className="vto-muted">{status}</div>
        {error ? <div className="vto-error">{error}</div> : null}
      </section>

      {session ? (
        <section className="vto-panel vto-column">
          <h3>Chat with Transcript</h3>
          <div className="vto-chat">
            {chatTurns.length === 0 ? <div className="vto-muted">Ask a question about the video.</div> : null}
            {chatTurns.map((turn) => (
              <article className="vto-chat-turn" key={turn.answer.id}>
                <div className="vto-chat-block">
                  <div className="vto-message-role">Question</div>
                  <div className="vto-message-content">{turn.question.content}</div>
                </div>
                <div className="vto-chat-block">
                  <div className="vto-message-role">Answer</div>
                  <div className="vto-message-content">{turn.answer.content || 'Generating...'}</div>
                </div>
                <div className="vto-row vto-row-between">
                  <div className="vto-muted">
                    {savedAnswerIds.has(turn.answer.id) ? 'Saved to Video note.' : null}
                  </div>
                  <button
                    disabled={!turn.answer.streamingComplete || savedAnswerIds.has(turn.answer.id)}
                    onClick={() => saveChatTurn(turn.question, turn.answer)}
                  >
                    {savedAnswerIds.has(turn.answer.id) ? 'Saved' : 'Save'}
                  </button>
                </div>
              </article>
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
          </div>
        </section>
      ) : null}

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

    </>
  );
}

function toChatTurns(messages: ChatMessage[]): Array<{ question: ChatMessage; answer: ChatMessage }> {
  const turns: Array<{ question: ChatMessage; answer: ChatMessage }> = [];

  for (let index = 0; index < messages.length - 1; index += 1) {
    const question = messages[index];
    const answer = messages[index + 1];
    if (question.role === 'user' && answer.role === 'assistant') {
      turns.push({ question, answer });
      index += 1;
    }
  }

  return turns;
}
