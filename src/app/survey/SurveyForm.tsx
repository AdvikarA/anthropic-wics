"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
} from "chart.js";
import { motion, AnimatePresence } from "framer-motion";

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
    text: "When you hear a political argument from the other party, you first:",
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

  useEffect(() => {
    // Update progress bar
    setProgress((currentQuestion / questions.length) * 100);
  }, [currentQuestion]);

  const handleOptionSelect = (optionIdx: number) => {
    const option = questions[currentQuestion].options[optionIdx];
    const newResponses = [...responses];
    newResponses[currentQuestion] = {value: option.value, weight: option.weight};
    setResponses(newResponses);
    
    // Move to next question or submit if last
    if (currentQuestion < questions.length - 1) {
      setTimeout(() => {
        setCurrentQuestion(currentQuestion + 1);
      }, 500); // Slight delay for smooth transition
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch("/api/survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          responses: responses.map(r => ({
            value: r.value,
            weight: r.weight
          }))
        })
      });
      
      if (!res.ok) throw new Error(await res.text());
      
      // Redirect to home page after successful submission
      router.push('/');
    } catch (err: any) {
      setError(err.message || "Submission failed");
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  return (
    <>
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Progress bar */}
        <div className="w-full bg-gray-200 h-1">
          <div 
            className="bg-indigo-600 h-1 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        
        <div className="p-8">
          {/* Question counter */}
          <div className="flex justify-between items-center mb-8">
            <button 
              onClick={goBack}
              disabled={currentQuestion === 0}
              className={`text-indigo-600 ${currentQuestion === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:text-indigo-800'}`}
            >
              ← Previous
            </button>
            <span className="text-gray-500">Question {currentQuestion + 1} of {questions.length}</span>
          </div>
          
          {/* Question and options */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-xl font-bold mb-6">{questions[currentQuestion].text}</h2>
              
              <div className="space-y-4">
                {questions[currentQuestion].options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleOptionSelect(idx)}
                    className="w-full text-left p-4 border border-gray-300 rounded-lg hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
                  >
                    {option.text}
                  </button>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
          
          {error && (
            <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-lg">
              {error}
            </div>
          )}
          
          {loading && (
            <div className="mt-6 flex justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
