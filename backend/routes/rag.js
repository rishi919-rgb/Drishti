import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Fuse from 'fuse.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const knowledgePath = path.join(__dirname, '../data/knowledge.json');
let knowledge = {};

try {
  knowledge = JSON.parse(fs.readFileSync(knowledgePath, 'utf8'));
  console.log('[RAG] Loaded knowledge base with', Object.keys(knowledge).length, 'entries');
} catch (err) {
  console.error('[RAG] Failed to load knowledge.json:', err);
}

// Build a flat list with 'name' = the key, so Fuse can search by it
const knowledgeList = Object.entries(knowledge).map(([key, data]) => ({
  name: key,
  ...data
}));

// Fuse instance for fuzzy key matching
const fuse = new Fuse(knowledgeList, {
  keys: ['name'],
  threshold: 0.4,       // Tolerate ~40% difference (e.g. "kishan" → "kisan")
  ignoreLocation: true, // Match anywhere in the string
  useExtendedSearch: false
});

export function formatResponse(key, data) {
  // Government Schemes
  if (data.benefits && data.eligibility) {
    let text = `${data.title}: ${data.description}. `;
    text += `Benefits: ${data.benefits}. `;
    text += `Eligibility: ${data.eligibility}. `;
    if (data.documents) text += `Documents required: ${data.documents}. `;
    if (data.how_to_apply) text += `How to apply: ${data.how_to_apply}. `;
    return text;
  }
  // Medicines
  if (data.uses && data.dosage) {
    let text = `${data.title}: Used for ${data.uses}. `;
    text += `Dosage: ${data.dosage}. `;
    if (data.warning) text += `Warning: ${data.warning}. `;
    if (data.side_effects) text += `Possible side effects: ${data.side_effects}. `;
    return text;
  }
  // Drishti project info
  if (data.features) {
    let text = `${data.title}: ${data.description}. `;
    text += `Features: ${data.features}. `;
    if (data.team) text += `Team: ${data.team}. `;
    if (data.tech) text += `Built using: ${data.tech}. `;
    return text;
  }
  // Generic fallback
  return `${data.title || key}: ${JSON.stringify(data)}`;
}

router.post('/query', (req, res) => {
  const { query } = req.body;
  if (!query) {
    return res.status(400).json({ error: 'No query provided' });
  }

  const lowerQuery = query.toLowerCase().trim();

  // Fuzzy search — tolerates typos and spelling variations
  const results = fuse.search(lowerQuery);

  if (results.length > 0) {
    const matched = results[0].item;
    const response = formatResponse(matched.name, matched);
    return res.json({ response });
  } else {
    return res.json({ response: "I'm sorry, I don't have information about that. Try asking about PM Kisan, Ayushman Bharat, Paracetamol, or Drishti." });
  }
});

export default router;
