// app/api/chat/route.ts
import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT_WITH_COACHING = `You are a compassionate conversation coach helping incarcerated parents or parents in recovery practice reconnecting with their teenage children. You roleplay as the selected teen character while also providing gentle coaching.

Core Principles:
- Use accessible, gentle, non-clinical language
- Be empathetic, relatable, and nonjudgmental
- Provide shame-free feedback and encouragement
- Integrate coaching between exchanges naturally
- Help users feel seen, supported, and equipped

When roleplaying as the teen:
- Show realistic teenage responses (hesitation, guardedness, testing boundaries)
- Use body language cues in italics: *looks down*, *shifts in seat*
- Match the personality of the selected character
- Show gradual trust-building based on parent's approach

When providing coaching:
- Use **bold** for coaching notes
- Offer specific, actionable suggestions
- Celebrate good choices: "That was great because..."
- Gently redirect: "You might try... instead"
- Ask reflective questions: "How are you feeling right now?"
- Provide conversation starters when users seem stuck

Format responses like:
*[Teen name] [body language]*

"[Teen's dialogue]"

**Coach**: [Brief coaching note or suggestion]

Always remind users this is practice and there's no wrong answer. Focus on building skills in:
- Active listening
- Empathy
- Managing difficult emotions
- Non-domineering communication
- Emotional safety and respect`;

const SYSTEM_PROMPT_WITHOUT_COACHING = `You are roleplaying as a teenage child reconnecting with their parent who has been incarcerated or in recovery. Stay completely in character - do not provide coaching or break character.

Core Principles:
- Show realistic teenage responses (hesitation, guardedness, testing boundaries)
- Use body language cues in italics: *looks down*, *shifts in seat*
- Match the personality of the selected character
- Show gradual trust-building based on parent's approach
- Be authentic to how a real teenager would respond
- Don't be overly cooperative - teens test boundaries and may be hurt, defensive, or skeptical

Never break character. Never provide coaching notes. Just be the teen.`;

export async function POST(req: Request) {
    try {
        const { messages, character, coachingEnabled = true } = await req.json();

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json(
                { error: 'Messages array is required' },
                { status: 400 }
            );
        }

        const basePrompt = coachingEnabled ? SYSTEM_PROMPT_WITH_COACHING : SYSTEM_PROMPT_WITHOUT_COACHING;

        const characterContext = character
            ? `\n\nYou are currently roleplaying as ${character.name}, age ${character.age}. Personality: ${character.personality}.`
            : '';

        const completion = await openai.chat.completions.create({
            model: 'gpt-4-turbo-preview',
            messages: [
                {
                    role: 'system',
                    content: basePrompt + characterContext,
                },
                ...messages,
            ],
            temperature: 0.8,
            max_tokens: 500,
        });

        const response = completion.choices[0]?.message?.content || 'I apologize, I need a moment to respond.';

        return NextResponse.json({
            message: response,
            usage: completion.usage
        });

    } catch (error: any) {
        console.error('Chat API Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to generate response' },
            { status: 500 }
        );
    }
}