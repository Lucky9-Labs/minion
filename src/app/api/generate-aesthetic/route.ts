import { NextResponse } from 'next/server';
import type { BuildingType, ProjectContext } from '@/types/project';

interface GenerateAestheticRequest {
  projectContext: ProjectContext;
}

interface GenerateAestheticResponse {
  type: BuildingType;
  aesthetic: string;
}

const SYSTEM_PROMPT = `You are a fantasy building architect. Based on a software project's details, determine what type of fantasy building best represents it and describe its visual aesthetic.

Building types:
- cottage: Cozy home with chimney - for internal tools, utilities, personal projects
- market: Merchant stall/shop with awning - for marketing sites, e-commerce, sales pages
- workshop: Artificer's workshop with anvil and tools - for developer tools, CLIs, build systems
- laboratory: Alchemist's lab with bubbling potions - for AI/ML, research, data science
- manor: Large multi-story manor house - for large platforms, full-stack apps
- tower: Wizard's tower - reserved for meta/management projects

Respond with JSON only:
{
  "type": "cottage|market|workshop|laboratory|manor|tower",
  "aesthetic": "2-3 sentence visual description of the building's fantasy appearance"
}`;

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    // Fallback to default if no API key
    return NextResponse.json({
      type: 'cottage' as BuildingType,
      aesthetic: 'A quaint stone cottage with a thatched roof and warm light glowing from its windows.',
    });
  }

  try {
    const body: GenerateAestheticRequest = await request.json();
    const { projectContext } = body;

    const userPrompt = `Project: ${projectContext.name}
${projectContext.packageJson?.description ? `Description: ${projectContext.packageJson.description}` : ''}
${projectContext.packageJson?.keywords?.length ? `Keywords: ${projectContext.packageJson.keywords.join(', ')}` : ''}
${projectContext.readme ? `README excerpt: ${projectContext.readme}` : ''}
${projectContext.packageJson?.dependencies ? `Dependencies: ${Object.keys(projectContext.packageJson.dependencies).slice(0, 10).join(', ')}` : ''}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content in response');
    }

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON in response');
    }

    const result: GenerateAestheticResponse = JSON.parse(jsonMatch[0]);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error generating aesthetic:', error);
    // Fallback
    return NextResponse.json({
      type: 'cottage' as BuildingType,
      aesthetic: 'A humble stone cottage with ivy climbing its walls and smoke curling from its chimney.',
    });
  }
}
