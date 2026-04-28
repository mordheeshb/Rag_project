/**
 * Pure JavaScript Embedder (No native C++ dependencies)
 * Generates embeddings and saves them to a simple JSON file.
 * Run once: node src/embedder.js
 */
import { pipeline } from '@xenova/transformers';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../data');
const FAQ_FILE = path.join(DATA_DIR, 'technician_faqs.json');
const INDEX_FILE = path.join(DATA_DIR, 'faq_vectors.json');

async function run() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR);

  console.log('⏳ Loading embedding model (all-MiniLM-L6-v2)...');
  const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  console.log('✅ Model loaded');

  const faqs = JSON.parse(readFileSync(FAQ_FILE, 'utf-8'));
  console.log(`📊 Embedding ${faqs.length} FAQ entries...`);

  const indexData = [];

  for (let i = 0; i < faqs.length; i++) {
    const entry = faqs[i];
    const text = `Question: ${entry.question} Answer: ${entry.answer}`;
    
    const output = await embedder(text, { pooling: 'mean', normalize: true });
    const vector = Array.from(output.data);

    indexData.push({
      id: i,
      vector: vector,
      metadata: entry
    });

    if ((i + 1) % 5 === 0) process.stdout.write(`  ${i + 1}/${faqs.length}`);
  }

  console.log('\n✅ Embeddings computed');
  
  writeFileSync(INDEX_FILE, JSON.stringify(indexData));
  console.log(`✅ Index saved to ${INDEX_FILE}`);
}

run().catch(console.error);
