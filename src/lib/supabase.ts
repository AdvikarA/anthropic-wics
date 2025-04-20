import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Get environment variables with fallbacks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://ehbwpbxueiulrkgkfztz.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoYndwYnh1ZWl1bHJrZ2tmenR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxMTE5MzcsImV4cCI6MjA2MDY4NzkzN30.-sDlsAcwi5idzohXrYWBVYZ-Jc0gsbJPu_7dSP9OQ98';

// Create a type for our dummy client that matches the SupabaseClient interface
type DummyClient = {
  from: (table: string) => any;
  auth: {
    signUp: (params: any) => Promise<any>;
    signInWithPassword: (params: any) => Promise<any>;
    signOut: () => Promise<any>;
    getSession: () => Promise<any>;
  };
};

// Create a Supabase client with proper typing
let supabase: SupabaseClient | DummyClient;

try {
  if (supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  } else {
    throw new Error('Missing Supabase credentials');
  }
} catch (error) {
  console.error('Error creating Supabase client:', error);
  // Create a dummy client that won't throw errors
  supabase = {
    from: () => ({
      select: () => ({
        order: () => ({
          limit: () => Promise.resolve({ data: [], error: null })
        }),
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: null }),
          select: () => Promise.resolve({ data: [], error: null })
        })
      }),
      update: () => ({
        eq: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: null, error: null })
          })
        })
      })
    }),
    auth: {
      signUp: () => Promise.resolve({ data: null, error: null }),
      signInWithPassword: () => Promise.resolve({ data: null, error: null }),
      signOut: () => Promise.resolve({ error: null }),
      getSession: () => Promise.resolve({ data: { session: null }, error: null })
    }
  };
}

export { supabase };

// Export a function to check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseAnonKey);
};
