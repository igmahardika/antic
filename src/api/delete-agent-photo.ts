import { NextRequest, NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function DELETE(request: NextRequest) {
  try {
    const { agentName } = await request.json();

    if (!agentName) {
      return NextResponse.json({ error: 'No agent name provided' }, { status: 400 });
    }

    // Normalize agent name
    const normalizedName = agentName
      .trim()
      .replace(/[^\w\s'-]/g, '') // Remove special chars except spaces, hyphens, apostrophes
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();

    const fileName = `${normalizedName}.png`;
    
    // Delete from public folder
    const publicFilePath = join(process.cwd(), 'public', 'agent-photos', fileName);
    if (existsSync(publicFilePath)) {
      await unlink(publicFilePath);
    }

    // Delete from dist folder
    const distFilePath = join(process.cwd(), 'dist', 'agent-photos', fileName);
    if (existsSync(distFilePath)) {
      await unlink(distFilePath);
    }

    return NextResponse.json({
      success: true,
      message: 'Photo deleted successfully'
    });

  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete photo' },
      { status: 500 }
    );
  }
}
