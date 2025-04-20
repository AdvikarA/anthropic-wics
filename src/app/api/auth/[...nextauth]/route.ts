import { NextResponse } from 'next/server';

// This file is no longer needed with Supabase Auth
// It's kept as a placeholder to prevent 404 errors for any existing links

export async function GET() {
  return NextResponse.redirect(new URL('/auth/login', process.env.NEXTAUTH_URL));
}

export async function POST() {
  return NextResponse.redirect(new URL('/auth/login', process.env.NEXTAUTH_URL));
}
