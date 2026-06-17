import OpenAI from 'openai';

let client = null;
const llmLogs = [];

export function getLLMLogs() {
  return llmLogs;
}

export function clearLLMLogs() {
  llmLogs.length = 0;
}

export function exportLogsAsMarkdown() {
  if (llmLogs.length === 0) return '';

  let md = '# LLM 调用日志\n\n';
  md += `> 生成时间: ${new Date().toLocaleString('zh-CN')}\n\n`;
  md += `共 ${llmLogs.length} 次 LLM 调用\n\n---\n\n`;

  llmLogs.forEach((log, i) => {
    md += `## 调用 ${i + 1}: ${log.agent}\n\n`;
    md += `- 模型: ${log.model}\n`;
    md += `- 温度: ${log.temperature}\n`;
    md += `- 耗时: ${log.duration}ms\n`;
    md += `- 状态: ${log.success ? '成功' : '失败: ' + log.error}\n\n`;

    md += '### System Prompt\n\n```\n' + log.systemPrompt + '\n```\n\n';
    md += '### User Prompt\n\n```\n' + log.userPrompt + '\n```\n\n';

    if (log.response) {
      md += '### Response\n\n```json\n' + JSON.stringify(log.response, null, 2) + '\n```\n\n';
    }

    md += '---\n\n';
  });

  return md;
}

// DeepSeek 兼容 OpenAI API
const PROVIDERS = {
  openai: {
    baseURL: 'https://api.openai.com/v1',
    model: 'gpt-4o',
    envKey: 'OPENAI_API_KEY',
  },
  deepseek: {
    baseURL: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    envKey: 'DEEPSEEK_API_KEY',
  },
};

export function getLLMClient() {
  if (!client) {
    const provider = process.env.LLM_PROVIDER || 'deepseek';
    const config = PROVIDERS[provider] || PROVIDERS.deepseek;

    const apiKey = process.env[config.envKey];
    if (!apiKey) {
      throw new Error(
        `${config.envKey} is not set. Set it in your environment or .env file.\n` +
        `Provider: ${provider}\n` +
        `Get DeepSeek key at: https://platform.deepseek.com/api_keys`
      );
    }

    client = new OpenAI({
      apiKey,
      baseURL: process.env.LLM_BASE_URL || config.baseURL,
    });

    client._defaultModel = process.env.LLM_MODEL || config.model;
  }
  return client;
}

export async function askLLM({ systemPrompt, userPrompt, model, temperature = 0.7, agent = 'unknown' }) {
  const llm = getLLMClient();
  const startTime = Date.now();

  const logEntry = {
    agent,
    model: model || llm._defaultModel,
    temperature,
    systemPrompt,
    userPrompt,
    response: null,
    error: null,
    success: false,
    duration: 0,
  };

  try {
    const response = await llm.chat.completions.create({
      model: model || llm._defaultModel,
      temperature,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('LLM returned empty response');
    }

    try {
      const parsed = JSON.parse(content);
      logEntry.response = parsed;
      logEntry.success = true;
      logEntry.duration = Date.now() - startTime;
      llmLogs.push(logEntry);
      return parsed;
    } catch {
      throw new Error(`LLM returned invalid JSON: ${content.slice(0, 200)}`);
    }
  } catch (err) {
    logEntry.error = err.message;
    logEntry.duration = Date.now() - startTime;
    llmLogs.push(logEntry);
    throw err;
  }
}
