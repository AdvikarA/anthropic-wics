"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import './survey-styles.css';
import { Radar } from 'react-chartjs-2';
import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';
import PoliticalCompass from '@/components/PoliticalCompass';
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from '@/lib/supabase';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

// Define question types with multiple choice options
interface Question {
  text: string;
  category: string;
  options: {
    text: string;
    value: number;
    weight: number;
  }[];
}

const questions: Question[] = [
  {
    text: "A whistleblower leaks classified information about government surveillance. What should happen?",
    category: "Individual Rights",
    options: [
      { text: "Prosecute them to the fullest extent - national security is paramount", value: 1, weight: 1.2 },
      { text: "Investigate but consider their motivations during sentencing", value: 5, weight: 1.0 },
      { text: "Protect them with strong whistleblower laws", value: 10, weight: 1.5 }
    ]
  },
  {
    text: "A social media platform is removing posts containing misinformation about public health. This is:",
    category: "Individual Rights",
    options: [
      { text: "Appropriate - platforms should prevent harmful misinformation", value: 3, weight: 1.0 },
      { text: "Acceptable only for clear medical falsehoods", value: 6, weight: 1.0 },
      { text: "Censorship - all speech should be protected regardless of content", value: 10, weight: 1.3 }
    ]
  },
  {
    text: "How should healthcare be structured?",
    category: "Government Role",
    options: [
      { text: "Fully private system with minimal regulation", value: 1, weight: 1.4 },
      { text: "Mixed public-private system with subsidies for those in need", value: 5, weight: 1.0 },
      { text: "Universal single-payer system covering all citizens", value: 10, weight: 1.2 }
    ]
  },
  {
    text: "A major corporation wants to build a factory that would create jobs but increase pollution. The government should:",
    category: "Environmental",
    options: [
      { text: "Allow it - economic growth is the priority", value: 1, weight: 1.1 },
      { text: "Permit it with environmental regulations and monitoring", value: 5, weight: 1.0 },
      { text: "Block it unless zero-emission standards can be met", value: 10, weight: 1.3 }
    ]
  },
  {
    text: "The wealthiest citizens should pay in taxes:",
    category: "Economic Systems",
    options: [
      { text: "Lower rates to encourage investment and growth", value: 1, weight: 1.2 },
      { text: "Proportional rates similar to middle-income earners", value: 5, weight: 1.0 },
      { text: "Significantly higher rates to fund social programs", value: 10, weight: 1.4 }
    ]
  },
  {
    text: "When discussing politics with someone who disagrees with you, you typically:",
    category: "Dialogic Tendency",
    options: [
      { text: "Avoid the conversation or quickly end it", value: 1, weight: 1.5 },
      { text: "Listen politely but rarely change your position", value: 5, weight: 1.0 },
      { text: "Engage deeply and consider revising your views based on new information", value: 10, weight: 1.3 }
    ]
  },
  {
    text: "A country is considering military intervention in a foreign conflict. The best approach is:",
    category: "Foreign Policy",
    options: [
      { text: "Intervene decisively to protect strategic interests", value: 3, weight: 1.1 },
      { text: "Provide humanitarian aid but avoid direct military involvement", value: 7, weight: 1.0 },
      { text: "Only act with broad international consensus and UN approval", value: 10, weight: 1.2 }
    ]
  },
  {
    text: "Universities should implement affirmative action in admissions to increase diversity:",
    category: "Social Issues",
    options: [
      { text: "No - admissions should be based solely on merit", value: 1, weight: 1.3 },
      { text: "Yes, but as one of many factors in a holistic process", value: 6, weight: 1.0 },
      { text: "Yes - aggressive measures are needed to address historical inequities", value: 10, weight: 1.2 }
    ]
  },
  {
    text: "Should the government impose price controls on essential goods?",
    category: "Market Regulation",
    options: [
      { text: "Yes, price controls ensure affordability", value: 10, weight: 1.2 },
      { text: "Only during emergencies", value: 5, weight: 1.0 },
      { text: "No, they distort markets", value: 1, weight: 1.3 }
    ]
  },
  {
    text: "Should recreational drug use be decriminalized?",
    category: "Civil Liberties",
    options: [
      { text: "Fully decriminalize all drugs", value: 10, weight: 1.2 },
      { text: "Partial decriminalization for certain substances", value: 5, weight: 1.0 },
      { text: "Keep current laws", value: 1, weight: 1.3 }
    ]
  },
  {
    text: "Should same-sex marriage be protected at the federal level?",
    category: "Social Issues",
    options: [
      { text: "Yes, it's a fundamental right", value: 10, weight: 1.2 },
      { text: "Support, but states can decide", value: 5, weight: 1.0 },
      { text: "No, should be defined by tradition", value: 1, weight: 1.3 }
    ]
  },
  {
    text: "Should military spending be reduced to fund social welfare programs?",
    category: "National Security",
    options: [
      { text: "Significantly reduce military budget", value: 10, weight: 1.2 },
      { text: "Moderate cuts to reallocate funds", value: 5, weight: 1.0 },
      { text: "Maintain or increase spending for security", value: 1, weight: 1.3 }
    ]
  },
  {
    text: "When you hear a political argument from the other party, you typically:",
    category: "Truth-Seeking",
    options: [
      { text: "Search for factual evidence before reacting", value: 10, weight: 1.2 },
      { text: "Listen then fact-check later", value: 5, weight: 1.0 },
      { text: "Dismiss without considering facts", value: 1, weight: 1.3 }
    ]
  },
  {
    text: "When engaging with someone from the opposite party, you tend to:",
    category: "Argumentative",
    options: [
      { text: "Focus only on winning the debate", value: 1, weight: 1.3 },
      { text: "Aim for constructive dialogue", value: 10, weight: 1.2 },
      { text: "Avoid conflict altogether", value: 5, weight: 1.0 }
    ]
  },
  {
    text: "You prefer to explain your political views through:",
    category: "Story-Telling",
    options: [
      { text: "Personal anecdotes and narratives", value: 10, weight: 1.2 },
      { text: "Statistical data and reports", value: 5, weight: 1.0 },
      { text: "Short slogans and catchphrases", value: 1, weight: 1.3 }
    ]
  },
  {
    text: "When someone from the other party shares a personal story, you respond by:",
    category: "Empathy",
    options: [
      { text: "Showing understanding and empathy", value: 10, weight: 1.2 },
      { text: "Acknowledging but fact-checking", value: 5, weight: 1.0 },
      { text: "Changing subject to debate points", value: 1, weight: 1.3 }
    ]
  },
  {
    text: "During political discussions, you display:",
    category: "Respectfulness",
    options: [
      { text: "Polite and respectful tone throughout", value: 10, weight: 1.2 },
      { text: "Sometimes use harsh language", value: 5, weight: 1.0 },
      { text: "Frequently resort to insults", value: 1, weight: 1.3 }
    ]
  },
  {
    text: "When you disagree strongly with someone politically, you:",
    category: "Open-Mindedness",
    options: [
      { text: "Keep an open mind and consider new perspectives", value: 10, weight: 1.2 },
      { text: "Stand firm but listen", value: 5, weight: 1.0 },
      { text: "Shut down the conversation", value: 1, weight: 1.3 }
    ]
  }
];

// Map categories to their questions
const categoryMap: Record<string, number[]> = {};
questions.forEach((q, idx) => {
  if (!categoryMap[q.category]) {
    categoryMap[q.category] = [];
  }
  categoryMap[q.category].push(idx);
});

export default function SurveyForm() {
  const router = useRouter();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [responses, setResponses] = useState<{value: number, weight: number}[]>(Array(questions.length).fill({value: 0, weight: 0}));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [personalityProfile, setPersonalityProfile] = useState<any>(null);
  const [politicalAxes, setPoliticalAxes] = useState<{
    libertyScore: number;
    socialScore: number;
    globalistScore?: number;
    pragmaticScore?: number;
    individualRights?: number;
    inclusivity?: number;
    nationalSecurity?: number;
    economicFreedom?: number;
    environmentalism?: number;
  } | null>(null);
  const [politicalType, setPoliticalType] = useState<string>('');
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    // Update progress bar and log
    const newProgress = (currentQuestion / questions.length) * 100;
    setProgress(newProgress);
    console.log('Progress updated:', newProgress);
  }, [currentQuestion]);

  const handleOptionSelect = (optionIdx: number) => {
    console.log(`Option selected: Q${currentQuestion} option ${optionIdx}`, questions[currentQuestion].options[optionIdx]);
    const option = questions[currentQuestion].options[optionIdx];
    const newResponses = [...responses];
    newResponses[currentQuestion] = {value: option.value, weight: option.weight};
    setResponses(newResponses);
    console.log('Responses updated:', newResponses);
    
    // Move to next question or submit if last
    if (currentQuestion < questions.length - 1) {
      console.log('Advancing to next question:', currentQuestion + 1);
      setTimeout(() => {
        setCurrentQuestion(currentQuestion + 1);
      }, 500); // Slight delay for smooth transition
    } else {
      console.log('Last question reached, submitting survey');
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    console.log('handleSubmit initiated');
    setLoading(true);
    setError(null);
    
    try {
      console.log('Preparing to submit survey...');
      // Prepare the survey data
      const surveyData = { 
        responses: responses.map(r => ({
          value: r.value,
          weight: r.weight
        })),
        // Also include answers array for backward compatibility
        answers: responses.map(r => r.value)
      };
      console.log('Survey data payload:', surveyData);
      
      // Retrieve Supabase session token for auth header
      console.log('Retrieving Supabase session');
      let accessToken;
      try {
        const {
          data: { session }
        } = await supabase.auth.getSession();
        console.log('Session fetched:', session);
        accessToken = session?.access_token;
      } catch (sessErr) {
        console.error('Error fetching session:', sessErr);
      }
      if (!accessToken) console.warn('No accessToken found; requests may fail');
      
      console.log('Sending POST to /api/survey');
      const res = await fetch("/api/survey", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken && { Authorization: `Bearer ${accessToken}` })
        },
        body: JSON.stringify(surveyData)
      });
      console.log('Received response from /api/survey with status:', res.status);
      if (res.status === 401) {
        console.error('Unauthorized: auth session missing or expired');
      }
      let json;
      try {
        json = await res.json();
        console.log('Response JSON:', json);
      } catch (parseErr) {
        console.error('Error parsing JSON response:', parseErr);
        throw parseErr;
      }
      
      if (!res.ok) {
        if (res.status === 401) {
          setError('Unauthorized: please log in again');
        }
        console.error('Non-OK HTTP status:', res.status, res.statusText);
        throw new Error(json.error || `Server error: ${res.status}`);
      }
      console.log('Survey submission success:', json);
      
      // Extract data from the response
      let profile, axes, type;
      
      if (json.profile) {
        // New API response format
        profile = json.profile.personality_profile;
        axes = json.profile.political_axes;
        type = json.profile.political_type;
      } else {
        // Legacy format
        profile = json.personalityProfile;
        axes = json.politicalAxes;
        type = json.politicalType;
      }
      
      console.log('Extracted profile data:', { profile, axes, type });
      
      setPersonalityProfile(profile);
      setPoliticalAxes(axes);
      setPoliticalType(type);
      // persist profile
      localStorage.setItem('userPersonalityProfile', JSON.stringify(profile));
      setShowDialog(true);
      
      // stop loading
      setLoading(false);
    } catch (err: any) {
      console.error('Error in survey submission:', err);
      setError(err.message || "Submission failed. Please try again.");
      setLoading(false);
    }
  };

  const goBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  return (
    <div className="survey-form-container">
      {/* Progress bar */}
      <div className="progress-container">
        <div className="progress-bar-bg">
          <div 
            className="progress-bar-fill"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <span className="progress-text">Question {currentQuestion + 1} of {questions.length}</span>
      </div>
      
      <div className="survey-form-content">
        {/* Question navigation */}
        <div className="question-nav">
          <button 
            onClick={goBack}
            disabled={currentQuestion === 0}
            className={`nav-button ${currentQuestion === 0 ? 'disabled' : ''}`}
          >
            ← Previous
          </button>
        </div>
        
        {/* Question and options */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="question-container"
          >
            <div className="question-category">
              {questions[currentQuestion].category}
            </div>
            
            <h2 className="question-text">{questions[currentQuestion].text}</h2>
            
            <div className="options-container">
              {questions[currentQuestion].options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleOptionSelect(idx)}
                  className="option-button"
                >
                  {option.text}
                </button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        {loading && (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Saving your responses...</p>
          </div>
        )}
      </div>
      
      {/* Modern Modal popup */}
      {showDialog && personalityProfile && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <div className="flex justify-between items-center">
                <h2 className="modal-title">Your Political Profile</h2>
                <button 
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={() => {
                    setShowDialog(false);
                    router.push('/');
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="modal-body">
              <div className="mb-6">
                <div className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mb-2">
                  {personalityProfile.type}
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">{politicalType}</h3>
                <p className="text-gray-600">{personalityProfile.description}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Political Compass</h4>
                  <div className="mb-4">
                    {politicalAxes && (
                      <PoliticalCompass
                        libertyScore={politicalAxes.libertyScore || 0}
                        socialScore={politicalAxes.socialScore || 0}
                      />
                    )}
                  </div>
                  
                  <h4 className="text-sm font-medium text-gray-500 mt-4 mb-2">Political Dimensions</h4>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Authoritarian</span>
                        <span>Libertarian</span>
                      </div>
                      <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-3 h-3 bg-blue-500 rounded-full z-10" 
                               style={{ left: `${((politicalAxes?.libertyScore || 0) + 10) * 5}%` }}></div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Conservative</span>
                        <span>Progressive</span>
                      </div>
                      <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-3 h-3 bg-blue-500 rounded-full z-10" 
                               style={{ left: `${((politicalAxes?.socialScore || 0) + 10) * 5}%` }}></div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Nationalist</span>
                        <span>Globalist</span>
                      </div>
                      <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-3 h-3 bg-blue-500 rounded-full z-10" 
                               style={{ left: `${((politicalAxes?.globalistScore || 0) + 10) * 5}%` }}></div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Ideological</span>
                        <span>Pragmatic</span>
                      </div>
                      <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-3 h-3 bg-blue-500 rounded-full z-10" 
                               style={{ left: `${((politicalAxes?.pragmaticScore || 0) + 10) * 5}%` }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Engagement Metrics</h4>
                  <div className="h-48 bg-white">
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
                            politicalAxes?.individualRights || 0,
                            politicalAxes?.inclusivity || 0,
                            politicalAxes?.nationalSecurity || 0,
                            politicalAxes?.economicFreedom || 0,
                            politicalAxes?.environmentalism || 0
                          ],
                          backgroundColor: 'rgba(59, 130, 246, 0.2)',
                          borderColor: 'rgba(59, 130, 246, 1)',
                          pointBackgroundColor: 'rgba(59, 130, 246, 1)',
                          pointBorderColor: '#fff',
                        }]
                      }}
                      options={{
                        maintainAspectRatio: false,
                        scales: { r: { beginAtZero: true, max: 10 } },
                        plugins: {
                          legend: {
                            position: 'bottom',
                            labels: {
                              boxWidth: 10,
                              font: {
                                size: 11
                              }
                            }
                          },
                          tooltip: {
                            callbacks: {
                              label: function(context) {
                                return `${context.label}: ${context.raw}/10`;
                              }
                            }
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
              
              <div className="text-center mt-8">
                <p className="text-gray-500 mb-4">Your profile will be used to personalize your news experience.</p>
              </div>
              
              {/* Close button */}
              <div className="modal-footer">
                <button
                  className="modal-close-button"
                  onClick={() => {
                    setShowDialog(false);
                    router.push('/');
                  }}
                >
                  Go to Personalized News
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
