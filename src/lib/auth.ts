import { createClient } from '@supabase/supabase-js';

// Get environment variables with fallbacks to prevent 'undefined' errors
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Check your .env.local file.');
}

// Create Supabase client with service role key for admin operations (server-side only)
export const adminClient = createClient(supabaseUrl, supabaseServiceKey);

// Create regular Supabase client for client-side operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Auth helper functions for Supabase Auth

/**
 * Sign up a new user with email and password
 */
export async function signUp(email: string, password: string, name: string) {
  const { data, error } = await supabase.auth.signUp({ 
    email, 
    password,
    options: {
      data: { name },
      emailRedirectTo: `${window.location.origin}/auth/callback`
    }
  });
  
  return { data, error };
}

/**
 * Sign in a user with email and password
 */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ 
    email, 
    password 
  });
  
  return { data, error };
}

/**
 * Sign out the current user
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

/**
 * Get the current user session
 */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  return { data, error };
}

/**
 * Get the current user
 */
export async function getUser() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user || null;
}

/**
 * Update a user's survey results
 */
export async function updateSurveyResults(userId: string, surveyResults: any) {
  const { data, error } = await supabase
    .from('users')
    .update({ survey_results: surveyResults })
    .eq('id', userId)
    .select()
    .single();
  
  return { data, error };
}

/**
 * Get a user's survey results
 */
export async function getSurveyResults(userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('survey_results')
    .eq('id', userId)
    .single();
  
  return { data: data?.survey_results, error };
}
