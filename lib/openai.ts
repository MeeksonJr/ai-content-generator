// Mock OpenAI class for compatibility
export class OpenAI {
  private apiKey: string

  constructor(config: { apiKey: string }) {
    this.apiKey = config.apiKey
  }

  async createCompletion(params: any) {
    throw new Error("OpenAI integration not implemented. Using alternative AI services.")
  }

  async createChatCompletion(params: any) {
    throw new Error("OpenAI integration not implemented. Using alternative AI services.")
  }
}
