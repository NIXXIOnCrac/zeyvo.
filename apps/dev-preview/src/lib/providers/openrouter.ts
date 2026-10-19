import { OpenAIAdapter } from './openai'
import type { ProviderConfig } from './types'

export class OpenRouterAdapter extends OpenAIAdapter {
  constructor(cfg: ProviderConfig, getKey:()=>Promise<string|null>){
    super({ ...cfg, endpoint: cfg.endpoint || 'https://openrouter.ai/api/v1' }, getKey)
    // override id/name via prototype
    ;(this as any).id='openrouter'
    ;(this as any).name='OpenRouter'
  }
}
