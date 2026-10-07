import { search1apiTools } from '@search1api/ai-sdk';
import { convertToModelMessages, gateway, stepCountIs, streamText } from 'ai';
import type { UIMessage } from 'ai';

export const maxDuration = 60;

// Credentials are resolved when a tool executes, rather than during next build.
const tools = search1apiTools({ only: ['search', 'crawl'] });

export async function POST(request: Request) {
  const { messages }: { messages: UIMessage[] } = await request.json();
  const result = streamText({
    model: gateway(process.env.AI_MODEL || 'openai/gpt-5-mini'),
    system: 'Search when you need current facts. Read relevant pages before answering. Cite the URLs you actually used. If a tool fails or finds nothing, say so.',
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(5),
    abortSignal: request.signal,
  });
  return result.toUIMessageStreamResponse();
}
