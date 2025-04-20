// Import the Supabase client from our centralized configuration
import { supabase } from './supabase';
import { SupabaseClient } from '@supabase/supabase-js';
import GoogleProvider from 'next-auth/providers/google';
import { NextAuthOptions } from 'next-auth';

// Create a simple admin client for server-side operations
const adminClient: any = supabase;

// Export the supabase client
export { adminClient, supabase };

// NextAuth configuration
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID || '',
      clientSecret: process.env.GOOGLE_SECRET || '',
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    async session({ session, token }) {
      if (token && session.user) {
        // Add the user ID to the session using type assertion
        (session.user as any).id = token.sub as string;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};

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
