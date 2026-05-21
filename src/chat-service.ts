import { generateObject, streamText } from 'ai';
import { z } from 'zod';
import type { ChatMessage, ModelConfiguration, Transcript } from './domain';
import { buildTranscriptSystemPrompt, CHAT_TASK_PROMPT, GENERATE_CHAT_ANSWER_TITLE_TASK_PROMPT } from './prompts';
import { formatLogError, formatTokenUsage, type RuntimeLog } from './runtime-log';
import { createYouTubeTimestampUrl } from './youtube';

const chatAnswerTitleSchema = z.object({
  title: z.string().min(1).describe('Concise Obsidian section title for the saved chat answer.')
});

export class ChatService {
  private readonly messages: ChatMessage[] = [];

  constructor(
    private readonly videoUrl: string,
    private readonly transcript: Transcript,
    private readonly modelConfig: ModelConfiguration,
    private readonly onLog?: RuntimeLog
  ) {}

  getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  clearMessages(): void {
    this.messages.length = 0;
  }

  async *sendMessage(message: string): AsyncIterable<string> {
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
      createdAt: new Date().toISOString()
    };

    this.messages.push(userMessage);

    this.log(`LLM chat request started (${this.modelConfig.provider}/${this.modelConfig.modelId}).`);

    try {
      const result = streamText({
        model: this.modelConfig.model,
        system: this.systemPrompt(),
        messages: this.messages.map((msg) => ({ role: msg.role, content: msg.content }))
      });

      let assistantContent = '';
      let linkifyBuffer = '';
      let hasLoggedStreamStart = false;
      for await (const textPart of result.textStream) {
        if (!hasLoggedStreamStart) {
          this.log('LLM chat response streaming.');
          hasLoggedStreamStart = true;
        }
        linkifyBuffer += textPart;

        const processedLength = Math.max(0, linkifyBuffer.length - 32);
        const processed = linkifyTranscriptTimestamps(this.videoUrl, linkifyBuffer.slice(0, processedLength));
        linkifyBuffer = linkifyBuffer.slice(processedLength);

        if (processed) {
          assistantContent += processed;
          yield processed;
        }
      }

      const finalProcessed = linkifyTranscriptTimestamps(this.videoUrl, linkifyBuffer);
      assistantContent += finalProcessed;
      if (finalProcessed) yield finalProcessed;

      const [finishReason, totalUsage] = await Promise.all([result.finishReason, result.totalUsage]);
      this.log(`LLM chat response finished (${finishReason}; ${formatTokenUsage(totalUsage)}).`);

      this.messages.push({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: assistantContent,
        createdAt: new Date().toISOString(),
        streamingComplete: true
      });
    } catch (caught) {
      this.log(`LLM chat request failed: ${formatLogError(caught)}`);
      throw caught;
    }
  }

  private log(message: string): void {
    this.onLog?.(message);
  }

  private systemPrompt(): string {
    return `${buildTranscriptSystemPrompt(CHAT_TASK_PROMPT)}

Video URL: ${this.videoUrl}

<Transcript>
${this.transcript.markdown}
</Transcript>`;
  }
}

export function linkifyTranscriptTimestamps(videoUrl: string, text: string): string {
  return text.replace(/\[((?:\d{1,2}:)?\d{1,2}:\d{2})\]/g, (match, timestamp: string) => {
    const timestampUrl = createYouTubeTimestampUrl(videoUrl, timestamp);
    return timestampUrl ? `[${timestamp}](${timestampUrl})` : match;
  });
}

export async function generateChatAnswerTitle(
  question: string,
  answer: string,
  modelConfig: ModelConfiguration,
  onLog?: RuntimeLog
): Promise<string> {
  onLog?.(`LLM chat answer title generation started (${modelConfig.provider}/${modelConfig.modelId}).`);

  try {
    const result = await generateObject({
      model: modelConfig.model,
      temperature: 0,
      schema: chatAnswerTitleSchema,
      system: GENERATE_CHAT_ANSWER_TITLE_TASK_PROMPT,
      prompt: `Question: ${question.trim()}

Answer:
${answer.trim()}`
    });

    onLog?.(`LLM chat answer title generation finished (${result.finishReason}; ${formatTokenUsage(result.usage)}).`);
    return sanitizeChatAnswerTitle(result.object.title, question);
  } catch (caught) {
    onLog?.(`LLM chat answer title generation failed: ${formatLogError(caught)}`);
    throw caught;
  }
}

function sanitizeChatAnswerTitle(title: string, fallbackQuestion: string): string {
  const sanitized = title
    .replace(/^#+\s*/, '')
    .replace(/^['"]|['"]$/g, '')
    .replace(/[.!?:;]+$/g, '')
    .trim();

  if (sanitized) return sanitized;

  return fallbackQuestion
    .replace(/[.!?:;]+$/g, '')
    .trim()
    .slice(0, 80) || 'Saved chat answer';
}
