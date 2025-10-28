import OpenAI from 'openai';

let openaiInstance: OpenAI | null = null;

/**
 * Get or create OpenAI client instance (lazy-loaded)
 * This ensures the client is only instantiated at runtime, not during build
 */
function getOpenAIClient(): OpenAI {
  if (!openaiInstance) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openaiInstance = new OpenAI({ apiKey });
  }
  return openaiInstance;
}

/**
 * OpenAI client instance (for backwards compatibility)
 * Used for both embeddings and chat completions
 */
export const openai = {
  get embeddings() {
    return getOpenAIClient().embeddings;
  },
  get chat() {
    return getOpenAIClient().chat;
  },
};

/**
 * Generate embedding for a text string using OpenAI's text-embedding-3-small model
 * Returns a 1536-dimensional vector
 *
 * @param text - The text to generate an embedding for
 * @returns Array of numbers representing the embedding
 */
export async function embed(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error('Text cannot be empty for embedding generation');
  }

  try {
    const client = getOpenAIClient();
    const response = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
      encoding_format: 'float',
    });

    const embedding = response.data[0].embedding;

    if (!embedding || embedding.length !== 1536) {
      throw new Error('Invalid embedding response from OpenAI');
    }

    return embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
