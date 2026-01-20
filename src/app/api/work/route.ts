import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectPath, instructions } = body;

    if (!projectPath || !instructions) {
      return NextResponse.json(
        { error: 'Missing projectPath or instructions' },
        { status: 400 }
      );
    }

    // Run chaud work --local with the instructions
    // The instructions are passed via stdin or as an argument
    console.log(`[chaud work] Starting work on ${projectPath}`);
    console.log(`[chaud work] Instructions: ${instructions}`);

    // Run chaud work --local in the project directory
    // Pass instructions via environment variable to avoid shell escaping issues
    const { stdout, stderr } = await execAsync(
      `cd "${projectPath}" && chaud work --local "${instructions.replace(/"/g, '\\"')}"`,
      {
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
        timeout: 300000, // 5 minute timeout
      }
    );

    console.log(`[chaud work] stdout: ${stdout}`);
    if (stderr) {
      console.log(`[chaud work] stderr: ${stderr}`);
    }

    return NextResponse.json({
      success: true,
      stdout,
      stderr,
    });
  } catch (error) {
    console.error('[chaud work] Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const stderr = (error as { stderr?: string })?.stderr || '';

    return NextResponse.json(
      {
        error: errorMessage,
        stderr,
      },
      { status: 500 }
    );
  }
}
