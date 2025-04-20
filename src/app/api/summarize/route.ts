import { NextResponse } from "next/server";
import { Anthropic } from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    const completion = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: `Summarize this news article in 2-3 concise sentences, focusing on the key facts and implications:\n\n${text}`
      }],
    });

    // Access the content correctly from the Anthropic API response
    const summary = completion.content[0].type === 'text' ? completion.content[0].text : '';
    return NextResponse.json({ summary }, { status: 200 });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    );
  }
}
