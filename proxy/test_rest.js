import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

async function run() {
    const apiKey = process.env.GEMINI_API_KEY_1;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;
    
    console.log(`Probing REST API: ${url.replace(apiKey, "REDACTED")}`);
    
    try {
        const response = await axios.post(url, {
            contents: [{ parts: [{ text: "Hello!" }] }]
        });
        console.log("✅ REST API Success!");
        console.log("Response:", JSON.stringify(response.data, null, 2).substring(0, 200));
    } catch (error) {
        console.log("❌ REST API Failed!");
        if (error.response) {
            console.log(`Status: ${error.response.status}`);
            console.log("Error Data:", JSON.stringify(error.response.data, null, 2));
        } else {
            console.log(`Error Message: ${error.message}`);
        }
    }
}

run();
