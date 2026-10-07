import { gateway, generateText, stepCountIs } from 'ai';
import { search1apiTools } from '../dist/index.js';

const result = await generateText({
  model: gateway(process.env.AI_MODEL || 'openai/gpt-5-mini'),
  tools: search1apiTools({ only: ['search', 'crawl'] }),
  stopWhen: stepCountIs(5),
  prompt: 'Find the official AI SDK tool calling documentation, read it, and explain how tools work. Cite the URLs you used.',
});

console.log(result.text);
