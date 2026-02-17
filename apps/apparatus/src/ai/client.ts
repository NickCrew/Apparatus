import { request } from "undici";
import { logger } from "../logger.js";

interface Message {
    role: "system" | "user" | "assistant";
    content: string;
}

// Simple in-memory session store for context
const sessions = new Map<string, Message[]>();

const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://localhost:11434";
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.LLM_MODEL; // let provider defaults handle it if unset

export async function chat(sessionId: string, systemPrompt: string, userMessage: string): Promise<string> {
    // 1. Initialize Session
    if (!sessions.has(sessionId)) {
        sessions.set(sessionId, [
            { role: "system", content: systemPrompt }
        ]);
    }
    
    const history = sessions.get(sessionId)!;
    history.push({ role: "user", content: userMessage });
    
    // Limit history window to last 20 messages
    if (history.length > 20) {
        const sys = history[0];
        const tail = history.slice(history.length - 19);
        sessions.set(sessionId, [sys, ...tail]);
    }

    try {
        let responseText = "";

        if (ANTHROPIC_KEY) {
            responseText = await callAnthropic(history);
        } else if (OPENAI_KEY) {
            responseText = await callOpenAI(history);
        } else {
            responseText = await callOllama(history);
        }

        // Append assistant response to history
        sessions.get(sessionId)!.push({ role: "assistant", content: responseText });
        return responseText;

    } catch (e: any) {
        logger.error({ error: e.message }, "AI: Generation failed");
        return "Terminal error: Connection lost to mainframe.";
    }
}

async function callOllama(messages: Message[]): Promise<string> {
    const { statusCode, body } = await request(`${OLLAMA_HOST}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model: MODEL || "llama3",
            messages: messages,
            stream: false
        })
    });

    if (statusCode !== 200) {
        throw new Error(`Ollama returned ${statusCode}`);
    }

    const data: any = await body.json();
    return data.message.content;
}

async function callOpenAI(messages: Message[]): Promise<string> {
    const { statusCode, body } = await request("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${OPENAI_KEY}`
        },
        body: JSON.stringify({
            model: MODEL || "gpt-3.5-turbo",
            messages: messages
        })
    });

    if (statusCode !== 200) {
        const err: any = await body.json();
        throw new Error(`OpenAI returned ${statusCode}: ${JSON.stringify(err)}`);
    }

    const data: any = await body.json();
    return data.choices[0].message.content;
}

async function callAnthropic(messages: Message[]): Promise<string> {
    // Anthropic Messages API separates system prompt
    const systemMessage = messages.find(m => m.role === "system");
    const conversation = messages.filter(m => m.role !== "system");

    const { statusCode, body } = await request("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "x-api-key": ANTHROPIC_KEY!,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: MODEL || "claude-3-haiku-20240307",
            max_tokens: 1024,
            system: systemMessage?.content,
            messages: conversation
        })
    });

    if (statusCode !== 200) {
        const err: any = await body.json();
        throw new Error(`Anthropic returned ${statusCode}: ${JSON.stringify(err)}`);
    }

    const data: any = await body.json();
    return data.content[0].text;
}