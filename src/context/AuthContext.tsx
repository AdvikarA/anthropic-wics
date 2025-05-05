'use client'
import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { User, AuthError, OAuthResponse } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  signInWithGoogle: () => Promise<OAuthResponse>
  signOut: () => Promise<{ error: AuthError | null }>
}

const AuthContext = createContext<AuthContextType>(null!)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  
  // Function to create user profile in Supabase
  const createUserProfile = async (user: User) => {
    if (!user?.id || !user?.email) return;
    
    console.log('Creating user profile after login:', user.id, user.email);
    
    try {
      // First check if user exists by EMAIL (to catch duplicate email issues)
      const { data: existingUserByEmail, error: emailCheckError } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', user.email)
        .maybeSingle();
      
      if (emailCheckError) {
        console.error('Error checking user by email:', emailCheckError);
        return;
      }
      
      // If a user with this email already exists
      if (existingUserByEmail) {
        console.log('User with this email exists, updating profile:', user.email);
        
        // If the existing user has a different ID than the current user,
        // we need to handle this special case (OAuth might have created a new account)
        if (existingUserByEmail.id !== user.id) {
          console.log('Warning: Email exists with different ID. Current auth ID:', user.id, 
                     'Existing DB ID:', existingUserByEmail.id);
          
          // Option 1: Update the existing record with the new auth ID
          const { error: updateIdError } = await supabase
            .from('users')
            .update({
              id: user.id, // Update to the new auth ID
              full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
            })
            .eq('id', existingUserByEmail.id);
            
          if (updateIdError) {
            console.error('Error updating user ID:', updateIdError);
          } else {
            console.log('Successfully linked existing profile to new auth ID');
          }
          return;
        }
        
        // Normal update for existing user with matching ID
        const { error: updateError } = await supabase
          .from('users')
          .update({
            full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
          })
          .eq('id', user.id);
          
        if (updateError) {
          console.error('Error updating user profile:', updateError);
        } else {
          console.log('Successfully updated user profile for:', user.email);
        }
      } else {
        // If no user with this email exists, check by ID as a fallback
        const { data: existingUserById, error: idCheckError } = await supabase
          .from('users')
          .select('id, email')
          .eq('id', user.id)
          .maybeSingle();
        
        if (idCheckError) {
          console.error('Error checking user by ID:', idCheckError);
          return;
        }
        
        if (existingUserById) {
          // User exists with this ID but different email
          console.log('User exists with ID but email changed. Updating profile:', user.email);
          const { error: updateError } = await supabase
            .from('users')
            .update({
              full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
              // Don't update email as it might cause conflicts
            })
            .eq('id', user.id);
            
          if (updateError) {
            console.error('Error updating user profile:', updateError);
          } else {
            console.log('Successfully updated user profile for:', user.email);
          }
        } else {
          // Truly new user - safe to insert
          console.log('User does not exist, creating new profile:', user.email);
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              id: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
              survey_results: {},
              personality_profile: {},
              political_axes: { libertyScore: 0, socialScore: 0 },
              political_type: ''
            });
            
          if (insertError) {
            console.error('Error creating user profile:', insertError);
          } else {
            console.log('Successfully created user profile for:', user.email);
          }
        }
      }
          
      // Error handling is now done in each branch above
    } catch (error) {
      console.error('Unexpected error creating user profile:', error);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const currentUser = data.session?.user ?? null;
      setUser(currentUser);
      
      // Create user profile if user is logged in
      if (currentUser) {
        // Add a small delay to ensure Supabase is ready
        setTimeout(() => {
          createUserProfile(currentUser);
        }, 500);
      }
    });
    
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const newUser = session?.user ?? null;
      setUser(newUser);
      
      // Create user profile on sign in
      if (event === 'SIGNED_IN' && newUser) {
        // Add a small delay to ensure Supabase is ready
        setTimeout(() => {
          createUserProfile(newUser);
        }, 500);
      }
    });
    
    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = () =>
    supabase.auth.signInWithOAuth({ provider: 'google' })

  const signOut = () =>
    supabase.auth.signOut()

  return (
    <AuthContext.Provider value={{ user, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
