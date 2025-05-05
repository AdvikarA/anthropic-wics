"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';
import { Radar } from 'react-chartjs-2';
import PoliticalCompass from '@/components/PoliticalCompass';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

type ProfileData = {
  email: string;
  full_name: string;
  survey_results: Record<string, { score: number }>;
  personality_profile: {
    type: string;
    description: string;
    traits: {
      engagementScore: number;
      antiPolarizationScore: number;
    };
  };
  political_axes?: {
    libertyScore: number;
    socialScore: number;
    globalistScore?: number;
    pragmaticScore?: number;
    individualRights?: number;
    inclusivity?: number;
    nationalSecurity?: number;
    economicFreedom?: number;
    environmentalism?: number;
  };
  political_type?: string;
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('ProfilePage mounted, starting async fetch...');
    (async () => {
      const { data: { session }, error: sessErr } = await supabase.auth.getSession();
      console.log('Supabase session for profile fetch:', session, sessErr);
      const token = session?.access_token;
      if (!token) console.warn('No access token, profile fetch may fail');
      const res = await fetch('/api/survey/results', {
        credentials: 'include',
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Profile fetch status:', res.status, res.statusText);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      console.log('Profile data loaded:', data);
      setProfile(data);
    })().catch((err) => {
      console.error('Error loading profile:', err);
      setError(err.message);
    });
  }, []);

  useEffect(() => {
    if (profile) {
      console.log('Profile data ready for render:', profile);
    }
  }, [profile]);

  useEffect(() => {
    if (error) {
      console.error('ProfilePage error state:', error);
    }
  }, [error]);

  if (error) return <div className="error">Error: {error}</div>;
  if (!profile) return <div>Loading profile...</div>;

  const { email, full_name, personality_profile } = profile;
  const { type, description, traits } = personality_profile || {};

  // Get political axes if available
  const politicalAxes = profile.political_axes || { 
    libertyScore: 0, 
    socialScore: 0, 
    globalistScore: 0, 
    pragmaticScore: 0,
    individualRights: 0,
    inclusivity: 0,
    nationalSecurity: 0,
    economicFreedom: 0,
    environmentalism: 0
  };
  
  return (
    <div className="profile-container max-w-4xl mx-auto p-8 bg-white rounded-lg shadow-lg">
      <div className="profile-header flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Your Profile</h1>
          <p className="text-gray-600">View your political profile and news preferences</p>
        </div>
        <a href="/" className="btn-primary px-4 py-2 rounded-md bg-blue-500 text-white hover:bg-blue-600 transition-colors">
          Back to News
        </a>
      </div>
      
      <div className="profile-info grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="user-details bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Personal Information</h2>
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mr-4">
              <span className="text-xl text-blue-500">{full_name?.charAt(0) || 'U'}</span>
            </div>
            <div>
              <p className="font-medium">{full_name}</p>
              <p className="text-gray-500 text-sm">{email}</p>
            </div>
          </div>
        </div>
        
        {personality_profile ? (
          <div className="profile-type bg-blue-50 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-2 text-gray-700">Political Profile</h2>
            <div className="profile-badge inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mb-3">
              {type}
            </div>
            <p className="text-gray-600">{description}</p>
          </div>
        ) : (
          <div className="alert-box bg-yellow-50 p-6 rounded-lg border-l-4 border-yellow-400">
            <h2 className="text-xl font-semibold mb-2 text-gray-700">Complete Your Profile</h2>
            <p className="text-gray-600 mb-4">Take the political survey to see personalized news content.</p>
            <a href="/survey" className="btn-primary px-4 py-2 rounded-md bg-blue-500 text-white hover:bg-blue-600 transition-colors inline-block">
              Take the Survey
            </a>
          </div>
        )}
      </div>
      
      {personality_profile && (
        <>
          <div className="political-scores mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">Your Political Dimensions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="score-charts">
                <div className="w-full h-64 bg-white p-4 rounded-lg shadow-sm">
                  <Radar
                    data={{
                      labels: [
                        'Individual Rights', 
                        'Inclusivity', 
                        'National Security',
                        'Economic Freedom',
                        'Environmentalism'
                      ],
                      datasets: [{
                        label: 'Political Dimensions',
                        data: [
                          politicalAxes.individualRights || 0,
                          politicalAxes.inclusivity || 0,
                          politicalAxes.nationalSecurity || 0,
                          politicalAxes.economicFreedom || 0,
                          politicalAxes.environmentalism || 0
                        ],
                        backgroundColor: 'rgba(59, 130, 246, 0.2)',
                        borderColor: 'rgba(59, 130, 246, 1)',
                        pointBackgroundColor: 'rgba(59, 130, 246, 1)',
                        pointBorderColor: '#fff',
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: 'rgba(59, 130, 246, 1)'
                      }]
                    }}
                    options={{ 
                      maintainAspectRatio: false, 
                      scales: { r: { beginAtZero: true, max: 10 } },
                      plugins: {
                        legend: {
                          position: 'bottom',
                          labels: {
                            font: {
                              size: 12
                            }
                          }
                        },
                        tooltip: {
                          callbacks: {
                            label: (context) => `${context.label}: ${context.raw}/10`
                          }
                        }
                      }
                    }}
                    height={300}
                  />
                </div>
              </div>
              
              <div className="political-axes">
                {politicalAxes && (
                  <div className="grid grid-cols-1 gap-6">
                    {/* Political Compass */}
                    <div className="p-4 bg-white rounded-lg shadow-sm">
                      <h3 className="text-sm font-medium text-gray-500 mb-3">Political Compass</h3>
                      <PoliticalCompass 
                        libertyScore={politicalAxes.libertyScore} 
                        socialScore={politicalAxes.socialScore} 
                      />
                    </div>
                    
                    {/* Individual Axes */}
                    <div className="grid grid-cols-1 gap-4">
                      <div className="axis-item p-4 bg-white rounded-lg shadow-sm">
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Liberty vs Authority</h3>
                        <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
                          <div className="absolute inset-0 flex items-center">
                            <div className="w-3 h-3 bg-gray-800 rounded-full z-10" 
                                 style={{ left: `${((politicalAxes.libertyScore || 0) + 10) * 5}%` }}></div>
                          </div>
                          <div className="flex justify-between px-2 text-xs text-gray-600 absolute inset-0 items-center">
                            <span>Authoritarian</span>
                            <span>Libertarian</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="axis-item p-4 bg-white rounded-lg shadow-sm">
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Progressive vs Conservative</h3>
                        <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
                          <div className="absolute inset-0 flex items-center">
                            <div className="w-3 h-3 bg-gray-800 rounded-full z-10" 
                                 style={{ left: `${((politicalAxes.socialScore || 0) + 10) * 5}%` }}></div>
                          </div>
                          <div className="flex justify-between px-2 text-xs text-gray-600 absolute inset-0 items-center">
                            <span>Conservative</span>
                            <span>Progressive</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="axis-item p-4 bg-white rounded-lg shadow-sm">
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Globalist vs Nationalist</h3>
                        <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
                          <div className="absolute inset-0 flex items-center">
                            <div className="w-3 h-3 bg-gray-800 rounded-full z-10" 
                                 style={{ left: `${((politicalAxes.globalistScore || 0) + 10) * 5}%` }}></div>
                          </div>
                          <div className="flex justify-between px-2 text-xs text-gray-600 absolute inset-0 items-center">
                            <span>Nationalist</span>
                            <span>Globalist</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="axis-item p-4 bg-white rounded-lg shadow-sm">
                        <h3 className="text-sm font-medium text-gray-500 mb-1">Pragmatic vs Ideological</h3>
                        <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
                          <div className="absolute inset-0 flex items-center">
                            <div className="w-3 h-3 bg-gray-800 rounded-full z-10" 
                                 style={{ left: `${((politicalAxes.pragmaticScore || 0) + 10) * 5}%` }}></div>
                          </div>
                          <div className="flex justify-between px-2 text-xs text-gray-600 absolute inset-0 items-center">
                            <span>Ideological</span>
                            <span>Pragmatic</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
