import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

// Category indexes mapping
const categories: Record<string, number[]> = {
  "Individual Rights": [0, 1],
  "Economic Systems": [4],
  "Government Role": [2],
  "Environmental": [3],
  "Foreign Policy": [6],
  "Social Issues": [7],
  "Dialogic Tendency": [5],
  "Market Regulation": [8],
  "Civil Liberties": [9],
  "National Security": [11],
  "Truth-Seeking": [12],
  "Argumentative": [13],
  "Story-Telling": [14],
  "Empathy": [15],
  "Respectfulness": [16],
  "Open-Mindedness": [17]
};

export async function POST(request: Request) {
  console.log("Survey submission started");
  
  // Create a Supabase client with the user's session cookie
  const cookieStore = cookies();
  
  // Check if Supabase environment variables are set
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  let supabase;
  let userId = null;
  
  // Only initialize Supabase if we have the required credentials
  if (supabaseUrl && supabaseKey) {
    try {
      // Create a supabase client
      supabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false,
        }
      });
      
      // Get the user's session from the cookie
      const supabaseAuthCookie = cookieStore.get('sb-auth-token')?.value;
      
      if (supabaseAuthCookie) {
        try {
          const { data: { user } } = await supabase.auth.getUser(supabaseAuthCookie);
          userId = user?.id;
          console.log("Authenticated user ID:", userId);
        } catch (error) {
          console.error("Error getting user from session:", error);
          // Continue without user ID
        }
      } else {
        console.log("No authentication cookie found, continuing without user ID");
      }
    } catch (error) {
      console.error("Error initializing Supabase client:", error);
      // Continue without Supabase
    }
  } else {
    console.log("Supabase credentials not found, continuing without database storage");
  }

  try {
    const { responses }: { responses: {value: number, weight: number}[] } = await request.json();

    // Calculate weighted category scores
    const results: Record<string, { score: number }> = {};
    
    for (const [cat, idxs] of Object.entries(categories)) {
      let totalValue = 0;
      let totalWeight = 0;
      
      for (const idx of idxs) {
        const response = responses[idx];
        if (response && response.value) {
          totalValue += response.value * response.weight;
          totalWeight += response.weight;
        }
      }
      
      // Weighted average
      const score = totalWeight > 0 ? totalValue / totalWeight : 0;
      results[cat] = { score: Math.round(score * 10) / 10 };
    }

    // Calculate engagement score from Dialogic Tendency
    const dialogicScore = results["Dialogic Tendency"]?.score || 0;
    const engagementScore = Math.round((dialogicScore / 10) * 100);

    // Compute anti-polarization index
    const antiPolCats = ["Truth-Seeking", "Argumentative", "Story-Telling", "Empathy", "Respectfulness", "Open-Mindedness"];
    let antiTotal = 0;
    for (const cat of antiPolCats) {
      antiTotal += results[cat]?.score || 0;
    }
    const antiPolarizationScore = antiPolCats.length > 0 ? Math.round((antiTotal / antiPolCats.length) * 10) / 10 : 0;
    let antiPolarizationLevel: string;
    if (antiPolarizationScore >= 8) {
      antiPolarizationLevel = "Very High";
    } else if (antiPolarizationScore >= 6) {
      antiPolarizationLevel = "High";
    } else if (antiPolarizationScore >= 4) {
      antiPolarizationLevel = "Moderate";
    } else if (antiPolarizationScore >= 2) {
      antiPolarizationLevel = "Low";
    } else {
      antiPolarizationLevel = "Very Low";
    }

    const surveyData = {
      ...results,
      engagementScore,
      antiPolarizationScore,
      antiPolarizationLevel,
      updatedAt: new Date().toISOString()
    };

    // Store survey results in Supabase if possible
    if (userId && supabase) {
      console.log("Attempting to save survey results for user:", userId);
      
      try {
        // First try to get the user to see if they exist
        const { data: userData, error: fetchError } = await supabase
          .from('users')
          .select('id')
          .eq('id', userId)
          .single();
          
        if (fetchError) {
          console.error("Error fetching user:", fetchError);
          
          // If user doesn't exist in our table, insert them
          if (fetchError.code === 'PGRST116') {
            console.log("User not found in table, creating new record");
            const { error: insertError } = await supabase
              .from('users')
              .insert({ id: userId, survey_results: surveyData });
              
            if (insertError) {
              console.error("Error inserting user:", insertError);
              // Continue without throwing - we'll still return the results
            }
          }
          // Don't throw error, just log it and continue
        } else {
          // User exists, update their survey results
          console.log("User found, updating survey results");
          const { error: updateError } = await supabase
            .from('users')
            .update({ survey_results: surveyData })
            .eq('id', userId);
            
          if (updateError) {
            console.error("Error updating user survey results:", updateError);
            // Continue without throwing - we'll still return the results
          }
        }
        
        console.log("Survey results saved successfully");
      } catch (err) {
        console.error("Error saving survey results:", err);
        // Continue without throwing - we'll still return the results
      }
    } else {
      console.log("No authenticated user or Supabase client, skipping database save");
      console.log("Survey will still be processed and results returned");
    }
    
    // Store results in session storage as a fallback
    try {
      // We can't directly modify cookies here, but we'll return the data
      // to be stored client-side
      console.log("Returning survey results to client");
    } catch (err) {
      console.error("Error with session storage:", err);
    }

    return NextResponse.json(surveyData);
  } catch (err: any) {
    console.error("Survey submission error:", err);
    return NextResponse.json(
      { error: err.message || "An unexpected error occurred" },
      { status: 500 }
    );
  }
}