import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';

class AIProviderManager {
    constructor() {
        this.providers = this.initializeProviders();
        this.usage = new Map(); // Track usage: `${providerName}:${minute}` -> count
        this.cleanupInterval = setInterval(() => this.cleanupOldUsage(), 60000); // Cleanup every minute
    }

    initializeProviders() {
        return [
            // Gemini Flash providers (vision + text)
            {
                name: 'gemini1',
                type: 'gemini',
                key: process.env.GEMINI_API_KEY_1,
                rpm: 15, // 15 requests per minute
                tasks: ['vision', 'text'],
                endpoint: 'gemini-1.5-flash',
                model: null // Will be initialized on first use
            },
            {
                name: 'gemini2',
                type: 'gemini',
                key: process.env.GEMINI_API_KEY_2,
                rpm: 15,
                tasks: ['vision', 'text'],
                endpoint: 'gemini-1.5-flash',
                model: null
            },
            {
                name: 'gemini3',
                type: 'gemini',
                key: process.env.GEMINI_API_KEY_3,
                rpm: 15,
                tasks: ['vision', 'text'],
                endpoint: 'gemini-1.5-flash',
                model: null
            },
            // Groq provider (text-only fallback)
            {
                name: 'groq',
                type: 'groq',
                key: process.env.GROQ_API_KEY,
                rpm: 30,
                tasks: ['text'],
                endpoint: 'https://api.groq.com/openai/v1/chat/completions',
                model: 'llama3-8b-8192'
            },
            // DeepSeek provider (backup)
            {
                name: 'deepseek',
                type: 'deepseek',
                key: process.env.DEEPSEEK_API_KEY,
                rpm: 20,
                tasks: ['text'],
                endpoint: 'https://api.deepseek.com/v1/chat/completions',
                model: 'deepseek-chat'
            }
        ].filter(provider => provider.key); // Filter out providers without API keys
    }

    getCurrentMinute() {
        return Math.floor(Date.now() / 60000);
    }

    getUsageKey(providerName, minute = null) {
        const min = minute || this.getCurrentMinute();
        return `${providerName}:${min}`;
    }

    getUsage(providerName) {
        const key = this.getUsageKey(providerName);
        return this.usage.get(key) || 0;
    }

    incrementUsage(providerName) {
        const key = this.getUsageKey(providerName);
        const current = this.usage.get(key) || 0;
        this.usage.set(key, current + 1);
    }

    cleanupOldUsage() {
        const currentMinute = this.getCurrentMinute();
        const keysToDelete = [];
        
        for (const [usageKey] of this.usage) {
            const [, minute] = usageKey.split(':');
            if (parseInt(minute) < currentMinute - 5) { // Keep last 5 minutes
                keysToDelete.push(usageKey);
            }
        }
        
        keysToDelete.forEach(key => this.usage.delete(key));
    }

    async getAvailableProvider(taskType = 'vision') {
        const availableProviders = this.providers.filter(p => 
            p.tasks.includes(taskType) && this.getUsage(p.name) < p.rpm
        );

        if (availableProviders.length === 0) {
            return null;
        }

        // Prefer vision providers for vision tasks, fallback to text-only if needed
        if (taskType === 'vision') {
            const visionProvider = availableProviders.find(p => p.type === 'gemini');
            if (visionProvider) return visionProvider;
        }

        // Round-robin selection among available providers
        const provider = availableProviders[Math.floor(Math.random() * availableProviders.length)];
        return provider;
    }

    async initializeGeminiProvider(provider) {
        if (!provider.model && provider.type === 'gemini') {
            const ai = new GoogleGenerativeAI(provider.key);
            provider.model = ai.getGenerativeModel({ model: provider.endpoint });
        }
    }

    async callGemini(provider, prompt, imageBase64 = null) {
        await this.initializeGeminiProvider(provider);
        
        const contents = [
            {
                role: 'user',
                parts: [
                    { text: prompt }
                ]
            }
        ];

        if (imageBase64) {
            contents[0].parts.push({
                inlineData: { 
                    mimeType: 'image/jpeg', 
                    data: imageBase64.replace(/^data:image\/[a-z]+;base64,/, '') 
                }
            });
        }

        const response = await provider.model.generateContent(contents);
        return response.response.text();
    }

    async callOpenAICompatible(provider, prompt, imageBase64 = null) {
        const messages = [
            {
                role: 'user',
                content: [
                    { type: 'text', text: prompt }
                ]
            }
        ];

        if (imageBase64) {
            messages[0].content.push({
                type: 'image_url',
                image_url: {
                    url: imageBase64
                }
            });
        }

        const response = await axios.post(provider.endpoint, {
            model: provider.model,
            messages,
            max_tokens: 1000,
            temperature: 0.7
        }, {
            headers: {
                'Authorization': `Bearer ${provider.key}`,
                'Content-Type': 'application/json'
            }
        });

        return response.data.choices[0].message.content;
    }

    async analyzeImage(prompt, imageBase64 = null, taskType = 'vision') {
        const maxRetries = 3;
        let lastError = null;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            const provider = await this.getAvailableProvider(taskType);
            
            if (!provider) {
                // If no provider available, wait and retry
                await new Promise(resolve => setTimeout(resolve, 1000));
                continue;
            }

            try {
                this.incrementUsage(provider.name);
                
                let result;
                if (provider.type === 'gemini') {
                    result = await this.callGemini(provider, prompt, imageBase64);
                } else {
                    result = await this.callOpenAICompatible(provider, prompt, imageBase64);
                }

                return {
                    provider: provider.name,
                    result,
                    usage: this.getUsage(provider.name),
                    rpm: provider.rpm
                };

            } catch (error) {
                console.error(`Error with provider ${provider.name}:`, error.message);
                lastError = error;
                continue;
            }
        }

        console.warn(`All AI providers failed or are unavailable. Falling back to mock response.`);
        return {
            provider: 'mock-ai',
            result: `DESCRIPTION: This is a mock description because no valid AI API keys were provided or the services are down. You see a clear, safe path ahead.\nTEXT: No text found\nCURRENCY: No currency detected`,
            usage: 0,
            rpm: 100
        };
    }

    getProviderStatus() {
        const currentMinute = this.getCurrentMinute();
        return this.providers.map(provider => ({
            name: provider.name,
            type: provider.type,
            tasks: provider.tasks,
            rpm: provider.rpm,
            currentUsage: this.getUsage(provider.name),
            available: this.getUsage(provider.name) < provider.rpm,
            hasApiKey: !!provider.key
        }));
    }

    // Graceful shutdown
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
    }
}

export default AIProviderManager;
