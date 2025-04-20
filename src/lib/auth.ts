import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client for direct operations
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID!,
      clientSecret: process.env.GOOGLE_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  debug: true,
  callbacks: {
    async signIn({ account, profile }) {
      // Allow all sign-ins
      return true;
    },
    async jwt({ token, account, user }) {
      // Initial sign in
      if (account && user) {
        // Store the user ID in the token
        token.userId = user.id;
        token.email = user.email;
        
        // Store user in Supabase if using Google provider
        if (account.provider === 'google' && user.email) {
          try {
            // Check if user already exists
            const { data: existingUser } = await supabase
              .from('users')
              .select('*')
              .eq('email', user.email)
              .single();
            
            // If user doesn't exist, create one
            if (!existingUser) {
              const { data, error } = await supabase
                .from('users')
                .insert([
                  {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    image: user.image
                  }
                ]);
              
              if (error) console.error('Error storing user in Supabase:', error);
            }
          } catch (error) {
            console.error('Error in JWT callback:', error);
          }
        }
      }
      return token;
    },
    async session({ session, token }) {
      // Send properties to the client
      if (token.userId && session.user) {
        // Add id property to the session user object
        (session.user as any).id = token.userId as string;
      }
      return session;
    },
  },
};
