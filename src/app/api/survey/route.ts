import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

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
  // Get session if available, but don't require it
  const session = await getServerSession(authOptions);
  
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

    // Store in database if user is authenticated
    if (session?.user?.email) {
      const client = await clientPromise;
      const db = client.db();
      await db.collection("users").updateOne(
        { email: session.user.email },
        { 
          $set: { 
            survey: { 
              responses, 
              results, 
              engagementScore, 
              antiPolarizationScore,
              antiPolarizationLevel,
              updatedAt: new Date() 
            } 
          } 
        },
        { upsert: true }
      );
    }
    
    return NextResponse.json({ 
      ...results, 
      engagementScore, 
      antiPolarizationScore, 
      antiPolarizationLevel
    });
  } catch (error: any) {
    console.error("Survey API error:", error);
    return NextResponse.json({ error: error.message || "Failed to process survey" }, { status: 500 });
  }
}