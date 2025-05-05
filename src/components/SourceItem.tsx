"use client";

import React from 'react';
import './source-item.css';

interface SourceItemProps {
  source: {
    title: string;
    source: string;
    link: string;
    quote?: string;
  };
  bias: string;
  biasQuotes?: string[];
  userPoliticalProfile: any;
  isAffirming: boolean;
}

export default function SourceItem({ source, bias, biasQuotes, userPoliticalProfile, isAffirming }: SourceItemProps) {
  // Generate a moderating statement based on whether this source aligns with or challenges the user's views
  const getModeratingStatement = () => {
    if (isAffirming) {
      return `This perspective generally aligns with your views, though it's worth noting that ${
        bias === 'left' 
          ? 'progressive policies may have economic trade-offs and implementation challenges.' 
          : bias === 'right' 
            ? 'traditional approaches might not address all modern challenges or social inequities.' 
            : 'centrist positions sometimes lack decisive action on pressing issues.'
      }`;
    } else {
      return `This source presents a perspective that may challenge your views. Consider that ${
        bias === 'left' 
          ? 'progressive voices often highlight important social equity concerns and systemic issues.' 
          : bias === 'right' 
            ? 'conservative perspectives can offer valuable insights on economic growth, tradition, and individual responsibility.' 
            : 'centrist positions often seek practical compromise between competing values and ideologies.'
      }`;
    }
  };

  return (
    <div className="source-item">
      <div className="source-header">
        <a href={source.link} target="_blank" rel="noopener noreferrer" className="source-link">
          <span className="source-name">{source.source}</span>
          <span className="link-icon">↗</span>
        </a>
        <span className={`bias-tag small bias-${bias}`}>
          {bias.charAt(0).toUpperCase() + bias.slice(1)}
        </span>
      </div>
      
      {source.quote && (
        <div className="quote-item">
          <p>"{source.quote}"</p>
          
          {/* Moderating statement */}
          <div className={`moderating-statement ${isAffirming ? 'affirming' : 'challenging'}`}>
            <p>
              {getModeratingStatement()}
            </p>
          </div>
        </div>
      )}
      
      {biasQuotes && biasQuotes.length > 0 && (
        <div className="bias-evidence">
          <h5 className="bias-evidence-title">Bias indicators:</h5>
          <ul className="bias-quotes-list">
            {biasQuotes.map((quote, i) => (
              <li key={i} className="bias-quote">
                "{quote}"
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
