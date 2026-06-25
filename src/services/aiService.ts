// src/services/aiService.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

// Obtén la API Key desde las variables de entorno
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  throw new Error('VITE_GEMINI_API_KEY is not set in the environment.');
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' }); // O el modelo que prefieras

export async function callGeminiAPI(prompt: string): Promise<string> {
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw new Error('Error de conexión con el núcleo cuántico de IA.');
  }
}
