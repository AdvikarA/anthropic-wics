import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const userEmail = url.searchParams.get('userEmail');
  
  if (!userEmail) {
    return NextResponse.json({ error: 'User email is required' }, { status: 400 });
  }
  
  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
      }
    });
    
    console.log(`Fetching profile for user with email: ${userEmail}`);
    
    // Query the users table by email
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('survey_results')
      .eq('email', userEmail)
      .maybeSingle();
    
    if (userError) {
      console.error('Error fetching user profile:', userError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // If no user row exists, create a new account
    if (!userData) {
      console.log('No user found for', userEmail, '; creating new account');
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({ email: userEmail })
        .select('survey_results')
        .maybeSingle();
      if (insertError) {
        console.error('Error creating user account:', insertError);
        return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
      }
      return NextResponse.json({ surveyResults: null, message: 'User account created; no survey results yet' });
    } else if (userData && userData.survey_results) {
      return NextResponse.json({ 
        surveyResults: userData.survey_results,
        message: 'User profile retrieved successfully'
      });
    } else {
      return NextResponse.json({ 
        message: 'No survey results found for this user',
        surveyResults: null
      });
    }
  } catch (error: any) {
    console.error('Error in user profile API:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
