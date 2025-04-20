import SurveyForm from "./SurveyForm";

export default function SurveyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="absolute inset-0 bg-grid-slate-200 [mask-image:linear-gradient(0deg,rgba(255,255,255,0.5),rgba(255,255,255,0.8))] bg-[length:20px_20px] pointer-events-none"></div>
      
      <main className="relative max-w-7xl mx-auto p-6 pt-10">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-blue-500">
            Political Compass Survey
          </h1>
          <p className="text-center text-gray-600 mb-8 max-w-2xl mx-auto">
            Answer the following questions to discover your political profile and engagement score.
            Each question presents a scenario with multiple perspectives.
          </p>
        </div>
        
        <SurveyForm />
        
        <div className="mt-16 text-center text-sm text-gray-500">
          <p>Your responses help us understand political discourse patterns.</p>
          <p>All data is anonymized and used for research purposes only.</p>
        </div>
      </main>
    </div>
  );
}
