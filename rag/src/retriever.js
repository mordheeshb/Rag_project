/**
 * Pure JavaScript Retriever (No native C++ dependencies)
 * Loads vectors from JSON and performs linear scan similarity search.
 */
import { pipeline } from '@xenova/transformers';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INDEX_FILE = path.join(__dirname, '../data', 'faq_vectors.json');

let embedder = null;
let indexData = null;

/**
 * Cosine similarity between two vectors
 */
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function retrieve(query, topK = 3) {
  if (!embedder) {
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }

  if (!indexData) {
    if (!existsSync(INDEX_FILE)) {
      throw new Error('Vector index not found. Please run "npm run embed" first.');
    }
    indexData = JSON.parse(readFileSync(INDEX_FILE, 'utf-8'));
  }

  // 1. Embed query
  const output = await embedder(query, { pooling: 'mean', normalize: true });
  const queryVector = Array.from(output.data);

  // 2. Calculate similarities
  const scores = indexData.map(entry => ({
    score: cosineSimilarity(queryVector, entry.vector),
    metadata: entry.metadata
  }));

  // 3. Sort and return topK
  return scores
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(s => s.metadata);
}
