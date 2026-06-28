const DEFAULT_PROVIDER = 'moonshot'
const DEFAULT_MOONSHOT_MODEL = 'kimi-k2.6'
const DEFAULT_OPENAI_MODEL = 'gpt-5.5'
const DEFAULT_MOONSHOT_API_KEY = 'sk-Z4E0yxkleWuU93lUUKgcZMt4ZVfqrsVn84XenTUq7gYcXt0k'

const API_BASE_URLS = {
  moonshot: 'https://api.moonshot.cn/v1',
  openai: 'https://api.openai.com/v1',
}

const BROWSER_CONFIG_KEY = 'hanai_ai_config'

function canUseLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function readBrowserAIConfig() {
  if (!canUseLocalStorage()) return {}

  try {
    const raw = window.localStorage.getItem(BROWSER_CONFIG_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed
  } catch {
    return {}
  }
}

export function saveBrowserAIConfig(config) {
  if (!canUseLocalStorage()) return

  const provider = normalizeProvider(config.provider)
  const apiBaseUrl = (config.apiBaseUrl || API_BASE_URLS[provider]).replace(/\/+$/, '')
  const model = config.model || (provider === 'openai' ? DEFAULT_OPENAI_MODEL : DEFAULT_MOONSHOT_MODEL)

  window.localStorage.setItem(BROWSER_CONFIG_KEY, JSON.stringify({
    provider,
    apiKey: config.apiKey,
    apiBaseUrl,
    model,
  }))
}

function readImportMetaEnv(name) {
  try {
    return import.meta?.env?.[name]
  } catch {
    return undefined
  }
}

function readProcessEnv(name) {
  if (typeof process === 'undefined' || !process.env) {
    return undefined
  }
  return process.env[name]
}

function readEnv(names) {
  for (const name of names) {
    const value = readImportMetaEnv(name) || readProcessEnv(name)
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim()
    }
  }
  return ''
}

function normalizeProvider(provider) {
  const value = String(provider || DEFAULT_PROVIDER).trim().toLowerCase()
  return value === 'openai' ? 'openai' : 'moonshot'
}

export function resolveAIConfig(overrides = {}) {
  const browserConfig = readBrowserAIConfig()
  const provider = normalizeProvider(
    overrides.provider || readEnv(['VITE_AI_PROVIDER', 'AI_PROVIDER']) || browserConfig.provider
  )
  const defaultModel = provider === 'openai' ? DEFAULT_OPENAI_MODEL : DEFAULT_MOONSHOT_MODEL
  const defaultBaseUrl = API_BASE_URLS[provider]

  return {
    provider,
    apiKey: overrides.apiKey || readEnv([
      'VITE_AI_API_KEY',
      'AI_API_KEY',
      'MOONSHOT_API_KEY',
      'KIMI_API_KEY',
      'OPENAI_API_KEY',
    ]) || browserConfig.apiKey || (provider === 'moonshot' ? DEFAULT_MOONSHOT_API_KEY : ''),
    apiBaseUrl: (overrides.apiBaseUrl || readEnv([
      'VITE_AI_API_BASE_URL',
      'AI_API_BASE_URL',
      'MOONSHOT_API_BASE_URL',
      'OPENAI_API_BASE_URL',
    ]) || browserConfig.apiBaseUrl || defaultBaseUrl).replace(/\/+$/, ''),
    model: overrides.model || readEnv(['VITE_AI_MODEL', 'AI_MODEL']) || browserConfig.model || defaultModel,
  }
}

export function getChatCompletionUrl(config) {
  return `${config.apiBaseUrl}/chat/completions`
}

export function assertAIConfig(config) {
  if (!config.apiKey) {
    throw new Error('未配置 AI API Key，请检查内置 Kimi Key，或使用 AI_API_KEY / MOONSHOT_API_KEY / VITE_AI_API_KEY 覆盖。')
  }
  if (!config.model) {
    throw new Error('未配置 AI 模型，请设置 AI_MODEL 或 VITE_AI_MODEL。')
  }
}

export function buildChatCompletionPayload(config, {
  messages,
  stream = false,
  temperature = 0.7,
  maxTokens = 8000,
} = {}) {
  const payload = {
    model: config.model,
    messages,
    stream,
  }

  if (config.provider === 'openai') {
    payload.max_completion_tokens = maxTokens
  } else {
    payload.temperature = config.model?.startsWith('kimi-k2') ? 1 : temperature
    payload.max_tokens = maxTokens
  }

  return payload
}

export function getAuthHeaders(config) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${config.apiKey}`,
  }
}

export function extractAIMessage(responseData) {
  const content = responseData?.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('API 返回数据格式错误，未找到 choices[0].message.content。')
  }
  return content
}

export function getAPIErrorMessage(status, statusText, body, config) {
  const apiMessage = body?.error?.message || body?.message || ''

  if (status === 401 || status === 403) {
    return `API Key 无效或无权限（${status}）。请检查当前 ${config.provider} key 是否可用。${apiMessage ? ` ${apiMessage}` : ''}`
  }

  if (status === 404) {
    return `API 地址或模型不可用（${status}）。当前模型：${config.model}。请检查 AI_MODEL/VITE_AI_MODEL。${apiMessage ? ` ${apiMessage}` : ''}`
  }

  return `API 请求失败：${status} ${statusText || ''}${apiMessage ? ` - ${apiMessage}` : ''}`.trim()
}
