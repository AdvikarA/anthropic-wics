import { createClient } from '@supabase/supabase-js';
import { NextResponse, NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  // Authenticate via Supabase JWT
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.replace(/^Bearer\s/, '');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user?.email) {
    console.error('Supabase auth error:', authErr);
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const email = user.email;
  const userId = user.id;

  console.log('Getting or creating profile for user:', userId, email);
  
  // Try direct upsert - insert or update if exists
  console.log('Attempting direct upsert on users table');
  const { error: upsertError } = await supabase.from('users').upsert({
    id: userId,
    email: email,
    full_name: user.user_metadata?.full_name ?? (user.user_metadata as any)?.name ?? null,
    survey_results: {},
    personality_profile: {},
    political_axes: { 
      libertyScore: 0, 
      socialScore: 0,
      globalistScore: 0,
      pragmaticScore: 0,
      individualRights: 0,
      inclusivity: 0,
      nationalSecurity: 0,
      economicFreedom: 0,
      environmentalism: 0
    },
    political_type: ''
  }, { onConflict: 'id' });
  
  if (upsertError) {
    console.error('Upsert error:', upsertError);
  } else {
    console.log('Upsert successful');
  }
  
  // Now fetch the user (whether newly created or existing)
  console.log('Fetching user profile after insert attempt');
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  
  if (error) {
    console.error('Error fetching user after insert:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  if (!data) {
    console.error('User still not found after insert attempt');
    // One final attempt with a direct insert
    console.log('Final attempt: direct insert with RETURNING');
    const { data: finalData, error: finalError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: email,
        full_name: user.user_metadata?.full_name ?? (user.user_metadata as any)?.name ?? null,
        survey_results: {},
        personality_profile: {},
        political_axes: { 
          libertyScore: 0, 
          socialScore: 0,
          globalistScore: 0,
          pragmaticScore: 0,
          individualRights: 0,
          inclusivity: 0,
          nationalSecurity: 0,
          economicFreedom: 0,
          environmentalism: 0
        },
        political_type: ''
      })
      .select('*')
      .single();
      
    if (finalError) {
      console.error('Final insert failed:', finalError);
      return NextResponse.json({ error: 'Failed to create user profile after multiple attempts' }, { status: 500 });
    }
    
    console.log('Final insert succeeded:', finalData);
    return NextResponse.json(finalData);
  }
  
  console.log('Successfully retrieved user profile:', data);
  return NextResponse.json(data);
}
