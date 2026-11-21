// Owner: A
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
const unsupportedOptions = new Map();
export function providerInfo() {
  const provider =
    process.env.AI_PROVIDER === 'anthropic' ? 'anthropic' : 'openai';
  const model =
    process.env.AI_MODEL ||
    (provider === 'openai' ? 'gpt-6-luna' : 'claude-haiku-5-5');
  return {
    provider,
    model,
    ai: !!process.env[provider.toUpperCase() + '_API_KEY']?.trim(),
  };
}
export async function complete({
  system,
  user,
  schema,
  schemaName,
  maxTokens,
}) {
  const { provider, model } = providerInfo();
  const options = {
    timeout: Number(process.env.AI_TIMEOUT_MS) || 8000,
    maxRetries: 0,
  };
  let params, send;
  if (provider === 'openai') {
    const client = new OpenAI(options),
      effort = process.env.AI_REASONING_EFFORT ?? 'none';
    params = {
      model,
      instructions: system,
      input: user,
      max_output_tokens: maxTokens,
      ...(effort ? { reasoning: { effort } } : {}),
      text: {
        format: { type: 'json_schema', name: schemaName, schema, strict: true },
      },
    };
    send = async (p) => (await client.responses.create(p)).output_text;
  } else {
    const client = new Anthropic(options);
    params = {
      model,
      max_tokens: maxTokens,
      system,
      thinking: { type: 'disabled' },
      output_config: { effort: 'low' },
      messages: [{ role: 'user', content: user }],
    };
    send = async (p) =>
      (await client.messages.create(p)).content
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('');
  }
  const cacheKey = provider + '/' + model;
  for (const key of unsupportedOptions.get(cacheKey) ?? []) delete params[key];
  try {
    return await send(params);
  } catch (e) {
    if (
      e.status !== 400 ||
      !/reasoning|output_config|thinking|json_schema|text.format/i.test(
        e.message,
      )
    )
      throw e;
    console.warn(e.message);
    const fields = ['reasoning', 'output_config', 'thinking'].filter((field) =>
      e.message.includes(field),
    );
    if (/json_schema|text.format/i.test(e.message)) fields.push('text');
    unsupportedOptions.set(
      cacheKey,
      new Set([...(unsupportedOptions.get(cacheKey) ?? []), ...fields]),
    );
    throw e; // The shared retry will omit the unsupported option.
  }
}
