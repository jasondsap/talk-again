// app/api/tts/route.ts
import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Map character profiles to appropriate voices
const CHARACTER_VOICES = {
    'Maya': 'nova',      // Younger, softer female voice
    'Jordan': 'onyx',    // More mature, direct voice
    'Alex': 'shimmer',   // Energetic, warm voice
    'Sam': 'alloy',      // Neutral, observant voice
};

export async function POST(req: Request) {
    try {
        const { text, character } = await req.json();

        if (!text) {
            return NextResponse.json(
                { error: 'Text is required' },
                { status: 400 }
            );
        }

        // Remove markdown and coaching notes for cleaner TTS
        const cleanText = text
            .replace(/\*\*/g, '')           // Remove bold markers
            .replace(/\*/g, '')             // Remove italic markers
            .replace(/\*\*Coach\*\*:.*$/gm, '') // Remove coaching lines
            .trim();

        // Select voice based on character
        const voice = CHARACTER_VOICES[character?.name] || 'nova';

        const mp3 = await openai.audio.speech.create({
            model: 'tts-1',
            voice: voice as any,
            input: cleanText,
            speed: 0.95, // Slightly slower for clarity
        });

        const buffer = Buffer.from(await mp3.arrayBuffer());

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Length': buffer.length.toString(),
            },
        });

    } catch (error: any) {
        console.error('TTS API Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to generate speech' },
            { status: 500 }
        );
    }
} 
