import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const photo = formData.get('photo') as File;
    const agentName = formData.get('agentName') as string;

    if (!photo) {
      return NextResponse.json({ error: 'No photo provided' }, { status: 400 });
    }

    if (!agentName) {
      return NextResponse.json({ error: 'No agent name provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(photo.type)) {
      return NextResponse.json({ error: 'File must be PNG, JPEG, or JPG' }, { status: 400 });
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (photo.size > maxSize) {
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 });
    }

    // Normalize agent name
    const normalizedName = agentName
      .trim()
      .replace(/[^\w\s'-]/g, '') // Remove special chars except spaces, hyphens, apostrophes
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();

    // Create directory if it doesn't exist
    const publicDir = join(process.cwd(), 'public');
    const agentPhotosDir = join(publicDir, 'agent-photos');
    
    if (!existsSync(agentPhotosDir)) {
      await mkdir(agentPhotosDir, { recursive: true });
    }

    // Convert file to buffer
    const bytes = await photo.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save file
    const fileName = `${normalizedName}.png`;
    const filePath = join(agentPhotosDir, fileName);
    await writeFile(filePath, buffer);

    // Also save to dist folder for production
    const distDir = join(process.cwd(), 'dist');
    const distAgentPhotosDir = join(distDir, 'agent-photos');
    
    if (!existsSync(distAgentPhotosDir)) {
      await mkdir(distAgentPhotosDir, { recursive: true });
    }
    
    const distFilePath = join(distAgentPhotosDir, fileName);
    await writeFile(distFilePath, buffer);

    return NextResponse.json({
      success: true,
      filePath: `/agent-photos/${fileName}`,
      fileName: fileName,
      agentName: normalizedName
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload photo' },
      { status: 500 }
    );
  }
}
