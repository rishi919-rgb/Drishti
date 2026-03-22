import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

async function run() {
    console.log("Listing available models...");
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY_1);
        // The listModels method is on the genAI object in newer versions
        const result = await genAI.listModels();
        console.log("Available models:");
        result.models.forEach(m => {
            console.log(`- ${m.name} (Supports: ${m.supportedGenerationMethods.join(', ')})`);
        });
    } catch (error) {
        console.log(`❌ Failed to list models: ${error.message}`);
    }
}

run();
