'use client';
import React from 'react';
import Button from '../global/components/Button';
import { useAuth } from '../context/AuthContext';

export default function AuthControls() {
  const { user, signInWithGoogle, signOut } = useAuth();
  // If authenticated, show greeting and sign out button
  if (user) {
    const fullName = user.user_metadata?.full_name || user.user_metadata?.name || user.email || '';
    const firstName = fullName.split(' ')[0];
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Hey {firstName}!</span>
        <Button variant="secondary" size="small" onClick={signOut}>
          Sign Out
        </Button>
      </div>
    );
  }
  // If not authenticated, show sign in button
  return (
    <Button variant="auth" size="small" onClick={signInWithGoogle}>
      Sign In
    </Button>
  );
}
