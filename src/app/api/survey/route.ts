import { NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

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
  
  // Check if Supabase environment variables are set
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase environment variables");
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  // Initialize auth data
  let userId: string | null = null;
  let userEmail: string | null = null;
  let userName: string | null = null;
  
  // Initialize Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Get auth header
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s/, '');
    
    if (token) {
      // Verify token and get user
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error) {
        console.error('Auth error:', error);
        return NextResponse.json({ error: 'Authentication error' }, { status: 401 });
      } 
      
      if (user) {
        userId = user.id;
        userEmail = user.email || null;
        const meta = user.user_metadata as any;
        userName = typeof meta?.full_name === 'string'
          ? meta.full_name
          : typeof meta?.name === 'string'
            ? meta.name
            : null;
        console.log('Authenticated user:', userId, userEmail);
      } else {
        console.warn("Invalid token - no user found");
        return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
      }
    } else {
      console.warn("No Authorization token provided");
      return NextResponse.json({ error: 'No authentication token provided' }, { status: 401 });
    }
    
    // Parse request body
    const body = await request.json();
    console.log('Request body received:', body);
    
    // Handle different data formats
    let answers;
    if (body.answers && Array.isArray(body.answers)) {
      // Format: { answers: [...] }
      answers = body.answers;
    } else if (body.responses && Array.isArray(body.responses)) {
      // Format: { responses: [...] }
      answers = body.responses.map((r: { value: number }) => r.value);
    } else {
      console.error('Invalid survey data format:', body);
      return NextResponse.json({ error: 'Invalid survey data format' }, { status: 400 });
    }
    
    console.log('Processed answers:', answers);
    
    console.log(`Processing ${answers.length} survey answers`);
    
    // Process survey data
    const surveyData: Record<string, { score: number }> = {};
    
    // Calculate category scores
    for (const [categoryName, questionIndexes] of Object.entries(categories)) {
      const categoryAnswers = questionIndexes.map(idx => answers[idx] || 0);
      const avgScore = categoryAnswers.length > 0
        ? categoryAnswers.reduce((sum, val) => sum + val, 0) / categoryAnswers.length
        : 0;
      
      surveyData[categoryName] = { score: avgScore };
    }
    
    console.log('Calculated category scores:', surveyData);
    
    // Create personality profile
    const results = surveyData;
    
    // Calculate engagement score (0-10)
    const engagementScore = (
      (results['Dialogic Tendency']?.score || 0) * 2 + 
      (results['Empathy']?.score || 0) * 1.5 + 
      (results['Respectfulness']?.score || 0) * 1.5
    ) / 5 * 10;
    
    // Calculate anti-polarization score (0-10)
    const antiPolarizationScore = (
      (results['Open-Mindedness']?.score || 0) * 2 + 
      (results['Truth-Seeking']?.score || 0) * 2 - 
      (results['Argumentative']?.score || 0) * 1
    ) / 5 * 10;
    
    // Determine personality type
    let personalityType = '';
    let personalityDescription = '';
    
    if (engagementScore > 7 && antiPolarizationScore > 7) {
      personalityType = 'Bridge Builder';
      personalityDescription = 'You seek to understand different perspectives and find common ground. You value truth and respectful dialogue.';
    } else if (engagementScore > 7 && antiPolarizationScore < 4) {
      personalityType = 'Passionate Advocate';
      personalityDescription = 'You engage deeply with issues you care about and aren\'t afraid to strongly defend your positions.';
    } else if (engagementScore < 4 && antiPolarizationScore > 7) {
      personalityType = 'Thoughtful Observer';
      personalityDescription = 'You prefer to listen and consider multiple viewpoints before forming your own balanced opinion.';
    } else if (engagementScore < 4 && antiPolarizationScore < 4) {
      personalityType = 'Independent Thinker';
      personalityDescription = 'You form your own opinions and aren\'t easily swayed by others. You value autonomy in your thinking.';
    } else {
      personalityType = 'Balanced Participant';
      personalityDescription = 'You engage with issues in a measured way, sometimes advocating strongly and other times stepping back to listen.';
    }
    
    const personalityProfile = {
      type: personalityType,
      description: personalityDescription,
      traits: {
        engagementScore: Math.round(engagementScore * 10) / 10,
        antiPolarizationScore: Math.round(antiPolarizationScore * 10) / 10
      }
    };
    
    console.log('Personality profile:', personalityProfile);
    
    // Compute more nuanced multi-dimensional political axes (scale -10 to 10)
    // Liberty-Authority Axis (combines civil liberties, national security, and individual rights)
    // Higher scores represent more libertarian views, lower scores more authoritarian
    const libertyScore = (
      (results['Civil Liberties']?.score || 0) * 1.8 - 
      (results['National Security']?.score || 0) * 1.5 + 
      (results['Individual Rights']?.score || 0) * 1.7
    ) / 5.0 * 2 - 10;
    
    // Progressive-Conservative Axis (combines economic, environmental, and social issues)
    // Higher scores represent more progressive views, lower scores more conservative
    const socialScore = (
      (results['Environmental']?.score || 0) * 1.5 - 
      (results['Economic Systems']?.score || 0) * 1.7 + 
      (results['Social Issues']?.score || 0) * 1.8
    ) / 5.0 * 2 - 10;
    
    // Globalist-Nationalist Axis (foreign policy and market regulation)
    // Higher scores represent more globalist views, lower scores more nationalist
    const globalistScore = (
      (results['Foreign Policy']?.score || 0) * 1.8 - 
      (results['Market Regulation']?.score || 0) * 1.2
    ) / 3.0 * 2 - 10;
    
    // Pragmatic-Ideological Axis (based on dialogue and truth-seeking)
    // Higher scores represent more pragmatic views, lower scores more ideological
    const pragmaticScore = (
      (results['Truth-Seeking']?.score || 0) * 1.7 + 
      (results['Open-Mindedness']?.score || 0) * 1.5 - 
      (results['Argumentative']?.score || 0) * 1.3
    ) / 4.5 * 2 - 10;
    
    // Calculate additional political dimensions for radar chart (scale 0-10)
    const individualRights = ((results['Individual Rights']?.score || 0) * 1.5 + 
                             (results['Civil Liberties']?.score || 0) * 1.3) / 2.8 * 10;
    
    const inclusivity = ((results['Social Issues']?.score || 0) * 1.6 + 
                        (results['Open-Mindedness']?.score || 0) * 1.4) / 3.0 * 10;
    
    const nationalSecurity = ((results['National Security']?.score || 0) * 1.8 + 
                             (results['Foreign Policy']?.score || 0) * 1.2) / 3.0 * 10;
    
    const economicFreedom = ((results['Economic Systems']?.score || 0) * 1.7 + 
                            (results['Market Regulation']?.score || 0) * 1.3) / 3.0 * 10;
    
    const environmentalism = ((results['Environmental']?.score || 0) * 2.0) / 2.0 * 10;
    
    // Round all scores for display and storage
    const roundedLibertyScore = Math.round(libertyScore * 10) / 10;
    const roundedSocialScore = Math.round(socialScore * 10) / 10;
    const roundedGlobalistScore = Math.round(globalistScore * 10) / 10;
    const roundedPragmaticScore = Math.round(pragmaticScore * 10) / 10;
    
    const roundedIndividualRights = Math.round(individualRights * 10) / 10;
    const roundedInclusivity = Math.round(inclusivity * 10) / 10;
    const roundedNationalSecurity = Math.round(nationalSecurity * 10) / 10;
    const roundedEconomicFreedom = Math.round(economicFreedom * 10) / 10;
    const roundedEnvironmentalism = Math.round(environmentalism * 10) / 10;
    
    console.log('Political axes:', {
      libertyScore: roundedLibertyScore,
      socialScore: roundedSocialScore,
      globalistScore: roundedGlobalistScore,
      pragmaticScore: roundedPragmaticScore,
      individualRights: roundedIndividualRights,
      inclusivity: roundedInclusivity,
      nationalSecurity: roundedNationalSecurity,
      economicFreedom: roundedEconomicFreedom,
      environmentalism: roundedEnvironmentalism
    });
    
    // Implement two-dimensional political type bucketing system
    // This creates a more precise political type based on the two main axes
    
    // Define political type based on Liberty-Authority and Progressive-Conservative axes
    let politicalType: string;
    
    // Libertarian Left (Progressive + Libertarian)
    if (libertyScore >= 5 && socialScore >= 5) {
      politicalType = 'Progressive Libertarian';
    }
    // Libertarian Right (Conservative + Libertarian)
    else if (libertyScore >= 5 && socialScore <= -5) {
      politicalType = 'Conservative Libertarian';
    }
    // Authoritarian Left (Progressive + Authoritarian)
    else if (libertyScore <= -5 && socialScore >= 5) {
      politicalType = 'Progressive Authoritarian';
    }
    // Authoritarian Right (Conservative + Authoritarian)
    else if (libertyScore <= -5 && socialScore <= -5) {
      politicalType = 'Conservative Authoritarian';
    }
    // Center Left (Progressive + Moderate Authority)
    else if (libertyScore > -5 && libertyScore < 5 && socialScore >= 5) {
      politicalType = 'Progressive';
    }
    // Center Right (Conservative + Moderate Authority)
    else if (libertyScore > -5 && libertyScore < 5 && socialScore <= -5) {
      politicalType = 'Conservative';
    }
    // Libertarian Center (Libertarian + Moderate Social)
    else if (libertyScore >= 5 && socialScore > -5 && socialScore < 5) {
      politicalType = 'Libertarian';
    }
    // Authoritarian Center (Authoritarian + Moderate Social)
    else if (libertyScore <= -5 && socialScore > -5 && socialScore < 5) {
      politicalType = 'Authoritarian';
    }
    // True Centrist
    else {
      politicalType = 'Centrist';
    }
    
    // Add pragmatic/ideological modifier
    if (pragmaticScore >= 5) {
      politicalType = `Pragmatic ${politicalType}`;
    } else if (pragmaticScore <= -5) {
      politicalType = `Ideological ${politicalType}`;
    }
    
    // Add globalist/nationalist modifier if it's a strong tendency
    if (globalistScore >= 7) {
      politicalType = `Globalist ${politicalType}`;
    } else if (globalistScore <= -7) {
      politicalType = `Nationalist ${politicalType}`;
    }
    console.log('Derived political type:', politicalType);

    // Store survey results in Supabase
    console.log("Attempting to save survey results for user:", userId);
    console.log("Political axes being saved:", {
      libertyScore: roundedLibertyScore,
      socialScore: roundedSocialScore,
      globalistScore: roundedGlobalistScore,
      pragmaticScore: roundedPragmaticScore,
      individualRights: roundedIndividualRights,
      inclusivity: roundedInclusivity,
      nationalSecurity: roundedNationalSecurity,
      economicFreedom: roundedEconomicFreedom,
      environmentalism: roundedEnvironmentalism
    });
    
    try {
      // Use upsert to handle both new and existing users in a single operation
      console.log('Upserting user profile for ID:', userId);
      
      const { data: upsertedProfile, error: upsertError } = await supabase
        .from('users')
        .upsert(
          {
            id: userId,
            email: userEmail,
            full_name: userName,
            survey_results: surveyData,
            personality_profile: personalityProfile,
            political_axes: { 
              libertyScore: roundedLibertyScore, 
              socialScore: roundedSocialScore,
              globalistScore: roundedGlobalistScore,
              pragmaticScore: roundedPragmaticScore,
              individualRights: roundedIndividualRights,
              inclusivity: roundedInclusivity,
              nationalSecurity: roundedNationalSecurity,
              economicFreedom: roundedEconomicFreedom,
              environmentalism: roundedEnvironmentalism
            },
            political_type: politicalType,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'id', ignoreDuplicates: false }
        )
        .select('*')
        .maybeSingle();
      
      if (upsertError) {
        console.error('Error upserting user profile:', upsertError);
        return NextResponse.json({ error: 'Failed to save survey results' }, { status: 500 });
      }
      
      console.log('Successfully saved survey results:', upsertedProfile);
      return NextResponse.json({ 
        success: true, 
        profile: {
          personality_profile: personalityProfile,
          political_axes: { 
            libertyScore: roundedLibertyScore, 
            socialScore: roundedSocialScore,
            globalistScore: roundedGlobalistScore,
            pragmaticScore: roundedPragmaticScore,
            individualRights: roundedIndividualRights,
            inclusivity: roundedInclusivity,
            nationalSecurity: roundedNationalSecurity,
            economicFreedom: roundedEconomicFreedom,
            environmentalism: roundedEnvironmentalism
          },
          political_type: politicalType
        }
      });
    } catch (error) {
      console.error('Error saving survey results:', error);
      return NextResponse.json({ error: 'Failed to save survey results' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error processing survey submission:', error);
    return NextResponse.json({ error: 'Failed to process survey submission' }, { status: 500 });
  }
}
