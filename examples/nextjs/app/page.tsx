'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState } from 'react';

function sources(output: unknown): { title: string; link: string }[] {
  if (!output || typeof output !== 'object' || !('results' in output)) return [];
  const results = Array.isArray(output.results) ? output.results : [output.results];
  return results.flatMap((result: unknown) => {
    if (!result || typeof result !== 'object' || !('title' in result) || !('link' in result)) return [];
    if (typeof result.title !== 'string' || typeof result.link !== 'string') return [];
    try {
      if (!['http:', 'https:'].includes(new URL(result.link).protocol)) return [];
      return [{ title: result.title, link: result.link }];
    } catch {
      return [];
    }
  });
}

export default function Page() {
  const { messages, sendMessage, status, stop, error } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  });
  const [input, setInput] = useState('');
  const busy = status === 'submitted' || status === 'streaming';

  return (
    <main>
      <h1>Research with Search1API</h1>
      {messages.map((message) => (
        <section key={message.id}>
          <h2>{message.role === 'user' ? 'You' : 'Assistant'}</h2>
          {message.parts.map((part, index) => {
            if (part.type === 'text') return <p key={index}>{part.text}</p>;
            if ('state' in part && part.state === 'output-available' && 'output' in part) {
              const links = sources(part.output);
              return links.length ? <ul key={index}>{links.map((source) => (
                <li key={source.link}><a href={source.link} target="_blank" rel="noreferrer">{source.title}</a></li>
              ))}</ul> : null;
            }
            return null;
          })}
        </section>
      ))}
      {error && <p role="alert">The response could not be completed. Please try again.</p>}
      {busy && <button type="button" onClick={() => stop()}>Stop</button>}
      <form onSubmit={(event) => {
        event.preventDefault();
        if (!input.trim() || busy) return;
        void sendMessage({ text: input });
        setInput('');
      }}>
        <label htmlFor="question">Question</label>
        <input id="question" value={input} onChange={(event) => setInput(event.target.value)} disabled={busy} />
        <button type="submit" disabled={busy || !input.trim()}>Ask</button>
      </form>
    </main>
  );
}
