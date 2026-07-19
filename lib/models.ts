export interface ModelPricing {
  id: string;
  provider: string;
  displayName: string;
  openRouterModel: string; // The real model ID sent to OpenRouter
  input: number;           // USD per 1M tokens
  cached: number;          // USD per 1M tokens
  output: number;          // USD per 1M tokens
}

export const MODELS: ModelPricing[] = [
  // ---- OpenAI ----
  {
    id: 'gpt-5',
    provider: 'openai',
    displayName: 'GPT-5 (OpenRouter gpt-4o)',
    openRouterModel: 'openai/gpt-4o',
    input: 1.25,
    cached: 0.625,
    output: 10.00,
  },
  {
    id: 'gpt-5-mini',
    provider: 'openai',
    displayName: 'GPT-5 Mini (OpenRouter gpt-4o-mini)',
    openRouterModel: 'openai/gpt-4o-mini',
    input: 0.40,
    cached: 0.20,
    output: 3.20,
  },
  {
    id: 'gpt-4.1',
    provider: 'openai',
    displayName: 'GPT-4.1 (OpenRouter gpt-4-turbo)',
    openRouterModel: 'openai/gpt-4-turbo',
    input: 2.00,
    cached: 1.00,
    output: 8.00,
  },
  // ---- Anthropic Claude ----
  {
    id: 'claude-opus-4-20250514',
    provider: 'anthropic',
    displayName: 'Claude 4 Opus (OpenRouter claude-3-opus)',
    openRouterModel: 'anthropic/claude-3-opus',
    input: 15.00,
    cached: 7.50,
    output: 75.00,
  },
  {
    id: 'claude-sonnet-4-20250514',
    provider: 'anthropic',
    displayName: 'Claude 4 Sonnet (OpenRouter claude-3.5-sonnet)',
    openRouterModel: 'anthropic/claude-3.5-sonnet',
    input: 3.00,
    cached: 1.50,
    output: 15.00,
  },
  {
    id: 'claude-haiku-4-20250514',
    provider: 'anthropic',
    displayName: 'Claude 4 Haiku (OpenRouter claude-3-haiku)',
    openRouterModel: 'anthropic/claude-3-haiku',
    input: 0.80,
    cached: 0.40,
    output: 4.00,
  },
  // ---- Moonshot / Kimi ----
  {
    id: 'kimi-k2-0905',
    provider: 'moonshot',
    displayName: 'Kimi K2 (OpenRouter moonshot-v1-8k)',
    openRouterModel: 'moonshotai/moonshot-v1-8k',
    input: 0.60,
    cached: 0.30,
    output: 2.50,
  },
  {
    id: 'kimi-k2-thinking',
    provider: 'moonshot',
    displayName: 'Kimi K2 Thinking (OpenRouter moonshot-v1-32k)',
    openRouterModel: 'moonshotai/moonshot-v1-32k',
    input: 1.20,
    cached: 0.60,
    output: 5.00,
  },
  // ---- Tencent ----
  {
    id: 'tencent/hy3:free',
    provider: 'tencent',
    displayName: 'Tencent Hy3 (Free - Going away 21 July 2026)',
    openRouterModel: 'tencent/hy3:free',
    input: 0.0,
    cached: 0.0,
    output: 0.0,
  },
];

export function getModelById(id: string): ModelPricing | undefined {
  return MODELS.find((m) => m.id === id);
}

export function calculateCost(
  modelId: string,
  tokensIn: number,
  tokensCached: number,
  tokensOut: number
): number {
  const model = getModelById(modelId);
  if (!model) {
    throw new Error(`Model ${modelId} not found in catalog.`);
  }

  const activeInputTokens = Math.max(0, tokensIn - tokensCached);

  const activeInputCost = (activeInputTokens / 1000000) * model.input;
  const cachedInputCost = (tokensCached / 1000000) * model.cached;
  const outputCost = (tokensOut / 1000000) * model.output;

  const totalCost = activeInputCost + cachedInputCost + outputCost;
  return Number(totalCost.toFixed(6));
}
