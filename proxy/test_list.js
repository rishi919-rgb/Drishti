import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

async function run() {
    const apiKey = process.env.GEMINI_API_KEY_1;
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    
    console.log(`Listing available models via REST: ${url.replace(apiKey, "REDACTED")}`);
    
    try {
        const response = await axios.get(url);
        console.log("✅ REST Models List Success!");
        if (response.data.models) {
            response.data.models.forEach(m => {
                console.log(`- ${m.name}`);
            });
        } else {
            console.log("No models returned in list.");
        }
    } catch (error) {
        console.log("❌ REST Models List Failed!");
        if (error.response) {
            console.log(`Status: ${error.response.status}`);
            console.log("Error Data:", JSON.stringify(error.response.data, null, 2));
        } else {
            console.log(`Error Message: ${error.message}`);
        }
    }
}

run();
