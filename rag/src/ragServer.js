/**
 * RAG Express server — exposes POST /api/rag/ask
 * Uses local embeddings for retrieval and OpenAI (or fallback) for answer generation.
 */
import 'dotenv/config';
import express from 'express';
import { retrieve } from './retriever.js';
import { appendFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logsDir = path.join(__dirname, '../../logs');
if (!existsSync(logsDir)) mkdirSync(logsDir, { recursive: true });
const ragLogPath = path.join(logsDir, 'rag_queries.log');

const app = express();
app.use(express.json({ limit: '10kb' }));

// ─── LLM generation (OpenAI or local fallback) ────────────────────────────────

async function generateAnswer(question, chunks) {
  const context = chunks
    .map((c, i) => `[${i + 1}] Q: ${c.question}\n    A: ${c.answer}`)
    .join('\n\n');

  // Try OpenAI if key is available
  if (process.env.OPENAI_API_KEY) {
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful assistant for Instant Technician Booker, a platform for booking home service professionals. Answer using ONLY the context provided. Be concise and friendly. If the context does not contain the answer, say so clearly.',
        },
        {
          role: 'user',
          content: `Context:\n${context}\n\nQuestion: ${question}\n\nAnswer:`,
        },
      ],
      temperature: 0.3,
      max_tokens: 250,
    });

    return completion.choices[0].message.content.trim();
  }

  // Fallback: return the best matching chunk's answer directly
  return chunks[0]?.answer || 'I could not find a relevant answer to your question.';
}

// ─── POST /api/rag/ask ────────────────────────────────────────────────────────

app.post('/api/rag/ask', async (req, res) => {
  try {
    const { question } = req.body;
    if (!question || typeof question !== 'string' || question.trim().length < 3) {
      return res.status(400).json({ success: false, message: 'A valid question is required' });
    }

    // Retrieve top-3 relevant chunks
    const chunks = await retrieve(question.trim(), 3);

    // Generate grounded answer
    const answer = await generateAnswer(question.trim(), chunks);

    // Log RAG query for observability
    const logEntry = JSON.stringify({
      timestamp: new Date().toISOString(),
      question: question.trim(),
      retrievedChunks: chunks.map(c => ({ q: c.question, score: c.score })),
      answerPreview: answer.slice(0, 100),
    }) + '\n';
    appendFileSync(ragLogPath, logEntry);

    res.json({
      success: true,
      question: question.trim(),
      answer,
      sources: chunks.map(c => ({ question: c.question, score: c.score })),
    });
  } catch (err) {
    console.error('[RAG] Error:', err.message);
    res.status(500).json({ success: false, message: 'RAG service error: ' + err.message });
  }
});

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'rag' }));

// ─── Startup ──────────────────────────────────────────────────────────────────
const PORT = process.env.RAG_PORT || 3002;

retrieve('test')
  .then(() => {
    app.listen(PORT, () => console.log(`[RAG] Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('[RAG] Failed to initialize:', err.message);
    console.error('Hint: Run "npm run embed" first to build the vector index.');
    process.exit(1);
  });
