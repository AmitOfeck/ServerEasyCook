import { OpenAI } from 'openai';
import { ISuperProduct } from '../models/super_model';

const openai = new OpenAI({
  apiKey: process.env.API_KEY || '',
});

export function buildGetRelevantProductsGPTPrompt(products: ISuperProduct[], query: string): string {
  const options = products.map(product => product.name).join(",\n   ");
  return `I want to make a recipe - I search for a product in the store:
          Product name: ${query},
          Store product options: 
          ${options}
          What products from the options are relevant to my search? Use common sense and narrow the list down.

          IMPORTANT: Return ONLY a valid JSON array in the following format, without any additional text or markdown:
          [
            {
              "name": string
            },
            ...
          ]`;
}

export async function callChatGPT(prompt: string): Promise<string[]> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: "system", content: "You are an assistant that filters product names for recipes." },
        { role: "user", content: prompt }
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    let content = response.choices[0].message?.content?.trim() || '';
    if (content.startsWith('```json')) {
      content = content.replace(/```json/, '').replace(/```/, '').trim();
    }

    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed.map(p => p.name) : [];
  } catch (error) {
    console.error('Error calling ChatGPT:', error);
    return [];
  }
}
