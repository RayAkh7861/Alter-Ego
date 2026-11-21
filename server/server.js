// OWNER: Person 1
import 'dotenv/config';
import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import {PAGE_SYSTEM_PROMPT, EPITAPH_SYSTEM_PROMPT, buildPageRequest, buildEpitaphRequest} from './prompts.js';
import {validatePage, validateEpitaph} from './validate.js';
import {fallbackPage, fallbackEpitaph} from '../src/game/fallbacks.js';

const app = express();
app.use(express.json({limit:'16kb'}));
const client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;

async function generate(system, payload, validate) {
  if (!client) throw new Error('ANTHROPIC_API_KEY is missing');
  const result = await client.messages.create({
    model:'claude-haiku-5-5',max_tokens:500,temperature:0.9,system,
    messages:[{role:'user',content:JSON.stringify(payload)}],
  });
  return validate(result.content.filter(block => block.type === 'text').map(block => block.text).join(''));
}

async function withRetry(system, payload, validate, fallback) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try { return await generate(system,payload,validate); }
    catch (error) { console.warn('AI generation failed:', error.message); }
  }
  return fallback;
}

app.post('/api/page', async (request,response) => {
  const payload = buildPageRequest(request.body || {});
  if (!['great','good','mixed','bad','death'].includes(payload.outcome)) return response.status(400).json({error:'Invalid outcome'});
  response.json(await withRetry(PAGE_SYSTEM_PROMPT,payload,raw => validatePage(raw,payload.outcome),fallbackPage(payload.outcome)));
});

app.post('/api/epitaph', async (request,response) => {
  const payload = buildEpitaphRequest(request.body || {});
  response.json(await withRetry(EPITAPH_SYSTEM_PROMPT,payload,validateEpitaph,fallbackEpitaph(payload)));
});

app.listen(3001, () => console.log('Leaves API listening on http://localhost:3001'));
