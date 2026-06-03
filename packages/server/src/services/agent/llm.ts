/**
 * Thin LLM wrapper — reuses the same DeepSeek config as thread-summary.
 * Returns structured JSON by instructing the model to output JSON.
 */

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface LlmOptions {
  messages: ChatMessage[]
  maxTokens?: number
  temperature?: number
  /** If true, parse the response as JSON */
  json?: boolean
}

export async function llmChat(opts: LlmOptions): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY not configured')

  const body: Record<string, unknown> = {
    model: process.env.AI_MODEL || 'deepseek-chat',
    messages: opts.messages,
    max_tokens: opts.maxTokens || 1024,
    temperature: opts.temperature ?? 0.3,
  }
  if (opts.json) {
    body.response_format = { type: 'json_object' }
  }

  const res = await fetch(process.env.AI_BASE_URL || 'https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => '')
    throw new Error(`LLM API error ${res.status}: ${err.slice(0, 200)}`)
  }

  const data = await res.json() as any
  const text = data.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('LLM returned empty response')
  return text
}

/** Parse JSON from LLM response, stripping markdown fences if present */
export function parseJsonResponse<T = any>(text: string): T {
  let clean = text.trim()
  // Strip ```json ... ``` fences
  if (clean.startsWith('```')) {
    clean = clean.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')
  }
  return JSON.parse(clean)
}

/** Stream LLM response — yields text chunks */
export async function* llmStream(opts: LlmOptions): AsyncGenerator<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY not configured')

  const res = await fetch(process.env.AI_BASE_URL || 'https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.AI_MODEL || 'deepseek-chat',
      messages: opts.messages,
      max_tokens: opts.maxTokens || 1024,
      temperature: opts.temperature ?? 0.3,
      stream: true,
    }),
  })

  if (!res.ok || !res.body) {
    const err = await res.text().catch(() => '')
    throw new Error(`LLM API error ${res.status}: ${err.slice(0, 200)}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') return
      try {
        const json = JSON.parse(data)
        const content = json.choices?.[0]?.delta?.content
        if (content) yield content
      } catch {}
    }
  }
}
