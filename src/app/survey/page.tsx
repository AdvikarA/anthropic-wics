import SurveyForm from "./SurveyForm";
import Link from "next/link";
import "../guardian-style.css";
import "./survey-styles.css";

export default function SurveyPage() {
  return (
    <div className="survey-page">
      <div className="survey-intro">
        <h1 className="survey-title">Political Perspective Survey</h1>
        <p className="survey-description">
          Complete this survey to personalize your news experience. We'll show you articles that both affirm and challenge your political beliefs, helping you gain a more balanced perspective.
        </p>
        <div className="survey-benefits">
          <div className="benefit-item">
            <span className="benefit-icon">🔍</span>
            <span className="benefit-text">Discover your political profile</span>
          </div>
          <div className="benefit-item">
            <span className="benefit-icon">🧠</span>
            <span className="benefit-text">Expand your perspective</span>
          </div>
          <div className="benefit-item">
            <span className="benefit-icon">📰</span>
            <span className="benefit-text">Get personalized news</span>
          </div>
        </div>
      </div>
      
      <SurveyForm />
      
      <div className="survey-footer">
        <p>Your responses help us understand political discourse patterns.</p>
        <p>All data is anonymized and used for research purposes only.</p>
        <Link href="/" className="btn btn-secondary">Return to Home</Link>
      </div>
    </div>
  );
}
