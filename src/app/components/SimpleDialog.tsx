"use client";
import React, { useEffect, useRef } from "react";
import { Radar } from "react-chartjs-2";

interface PoliticalIdeology {
  name: string;
  description: string;
}

// Political ideology mapping based on scores
const determineIdeology = (scores: Record<string, number>): PoliticalIdeology => {
  const economicScore = scores["Economic Systems"] || 5;
  const individualRightsScore = scores["Individual Rights"] || 5;
  const foreignPolicyScore = scores["Foreign Policy"] || 5;
  const environmentalScore = scores["Environmental"] || 5;
  
  // Economic axis: Left vs Right
  const economicAxis = economicScore > 6.5 ? "left" : economicScore < 3.5 ? "right" : "center";
  
  // Social axis: Libertarian vs Authoritarian
  const socialAxis = individualRightsScore > 6.5 ? "libertarian" : individualRightsScore < 3.5 ? "authoritarian" : "moderate";
  
  // Foreign policy: Isolationist vs Interventionist
  const foreignAxis = foreignPolicyScore > 6.5 ? "diplomatic" : foreignPolicyScore < 3.5 ? "nationalist" : "balanced";
  
  // Environmental stance
  const environmentAxis = environmentalScore > 6.5 ? "progressive" : environmentalScore < 3.5 ? "traditional" : "moderate";

  // Map the axes to ideologies
  const ideologyMap: Record<string, Record<string, PoliticalIdeology>> = {
    left: {
      libertarian: {
        name: "Progressive",
        description: "You value both economic equality and personal freedom. You likely support social welfare programs alongside strong civil liberties."
      },
      authoritarian: {
        name: "Socialist",
        description: "You favor economic equality and believe in strong government intervention to achieve social goals."
      },
      moderate: {
        name: "Social Democrat",
        description: "You support a mixed economy with strong social safety nets while valuing democratic processes."
      }
    },
    right: {
      libertarian: {
        name: "Libertarian",
        description: "You strongly value individual freedom in both personal and economic matters, preferring minimal government intervention."
      },
      authoritarian: {
        name: "Conservative",
        description: "You favor traditional values and free markets with strong national security and social order."
      },
      moderate: {
        name: "Classical Liberal",
        description: "You support free markets and individual rights with limited but necessary government intervention."
      }
    },
    center: {
      libertarian: {
        name: "Liberal",
        description: "You value personal freedoms while accepting moderate economic regulation for social good."
      },
      authoritarian: {
        name: "Centrist with Traditional Values",
        description: "You take a balanced approach to economics while favoring social stability and order."
      },
      moderate: {
        name: "Centrist",
        description: "You take pragmatic positions that balance competing interests across the political spectrum."
      }
    }
  };

  // Add modifiers based on foreign policy and environmental stance
  let ideology = ideologyMap[economicAxis][socialAxis];
  let modifiers = [];
  
  if (foreignAxis === "diplomatic" && environmentAxis === "progressive") {
    modifiers.push("Globalist");
  } else if (foreignAxis === "nationalist" && environmentAxis === "traditional") {
    modifiers.push("Nationalist");
  }
  
  if (environmentAxis === "progressive") {
    modifiers.push("Environmentalist");
  }

  // Combine base ideology with modifiers
  if (modifiers.length > 0) {
    ideology = {
      name: `${modifiers.join("-")} ${ideology.name}`,
      description: ideology.description
    };
  }

  return ideology;
};

interface SurveyResults {
  [category: string]: { score: number } | number | string | undefined;
  engagementScore: number;
  antiPolarizationScore?: number;
  antiPolarizationLevel?: string;
  updatedAt?: string;
}

interface SimpleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onChallenge: () => void;
  results: SurveyResults;
}

export function SimpleDialog({ isOpen, onClose, onChallenge, results }: SimpleDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node) && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !results) return null;
  
  // Extract scores for radar chart
  const categories = Object.keys(results)
    .filter(key => !['engagementScore', 'antiPolarizationScore', 'antiPolarizationLevel', 'updatedAt'].includes(key));
  
  const dataValues: number[] = categories.map(cat => Number(
    typeof results[cat] === 'object' ? results[cat].score : results[cat]
  ));
  
  // Prepare scores for ideology determination
  const scores: Record<string, number> = {};
  categories.forEach(cat => {
    scores[cat] = Number(typeof results[cat] === 'object' ? results[cat].score : results[cat]);
  });
  
  const ideology = determineIdeology(scores);
  
  const data = {
    labels: categories,
    datasets: [
      {
        label: "Political Profile",
        data: dataValues,
        backgroundColor: "rgba(75, 192, 192, 0.2)",
        borderColor: "rgba(75, 192, 192, 1)",
        borderWidth: 2,
        pointBackgroundColor: "rgba(75, 192, 192, 1)",
        pointBorderColor: "#fff",
        pointHoverBackgroundColor: "#fff",
        pointHoverBorderColor: "rgba(75, 192, 192, 1)"
      }
    ]
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div 
        ref={dialogRef}
        className="bg-white rounded-xl shadow-lg p-6 max-w-md md:max-w-2xl m-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Your Political Profile</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        
        <div className="py-4">
          <div className="mb-6">
            <Radar 
              data={data} 
              options={{ 
                scales: { r: { min: 0, max: 10, ticks: { stepSize: 2 } } },
                plugins: { legend: { position: 'top' } }
              }} 
            />
          </div>
          
          <div className="bg-gray-50 p-6 rounded-lg mb-6">
            <h3 className="text-xl font-bold mb-2 text-center">{ideology.name}</h3>
            <p className="text-gray-700">{ideology.description}</p>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Engagement Score:</span>
              <span className="font-medium text-lg">{results.engagementScore}%</span>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              This score reflects your willingness to engage with diverse political viewpoints.
            </p>
          </div>
          <button
            onClick={onChallenge}
            className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-md"
          >
            Challenge Me
          </button>
        </div>
      </div>
    </div>
  );
}
