import OpenAI from 'openai';

/**
 * OpenAI client instance
 * Used for both embeddings and chat completions
 */
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

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
    const response = await openai.embeddings.create({
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
