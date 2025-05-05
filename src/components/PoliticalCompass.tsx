"use client";

import React from 'react';

interface PoliticalCompassProps {
  libertyScore: number;
  socialScore: number;
}

const PoliticalCompass: React.FC<PoliticalCompassProps> = ({ libertyScore, socialScore }) => {
  // Convert scores from -10 to 10 scale to 0 to 100% for positioning
  const xPosition = ((libertyScore + 10) / 20) * 100;
  const yPosition = ((socialScore + 10) / 20) * 100;
  
  return (
    <div className="political-compass relative w-full aspect-square max-w-md mx-auto bg-gray-100 rounded-lg overflow-hidden border border-gray-300">
      {/* Grid lines */}
      <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
        <div className="border-b border-r border-gray-400"></div>
        <div className="border-b border-gray-400"></div>
        <div className="border-r border-gray-400"></div>
        <div></div>
      </div>
      
      {/* Axes */}
      <div className="absolute inset-0 flex items-center">
        <div className="w-full h-px bg-gray-500"></div>
      </div>
      <div className="absolute inset-0 flex justify-center">
        <div className="h-full w-px bg-gray-500"></div>
      </div>
      
      {/* Labels */}
      <div className="absolute top-2 left-0 right-0 text-center text-sm font-medium text-gray-700">Progressive</div>
      <div className="absolute bottom-2 left-0 right-0 text-center text-sm font-medium text-gray-700">Conservative</div>
      <div className="absolute left-2 top-0 bottom-0 flex items-center">
        <div className="transform -rotate-90 text-sm font-medium text-gray-700">Authoritarian</div>
      </div>
      <div className="absolute right-2 top-0 bottom-0 flex items-center">
        <div className="transform -rotate-90 text-sm font-medium text-gray-700">Libertarian</div>
      </div>
      
      {/* Quadrant labels */}
      <div className="absolute top-4 left-4 text-xs text-gray-600">Authoritarian Left</div>
      <div className="absolute top-4 right-4 text-xs text-gray-600">Libertarian Left</div>
      <div className="absolute bottom-4 left-4 text-xs text-gray-600">Authoritarian Right</div>
      <div className="absolute bottom-4 right-4 text-xs text-gray-600">Libertarian Right</div>
      
      {/* User position marker */}
      <div 
        className="absolute w-4 h-4 bg-blue-600 rounded-full transform -translate-x-1/2 -translate-y-1/2 shadow-md border-2 border-white"
        style={{ 
          left: `${xPosition}%`, 
          top: `${100 - yPosition}%` // Invert Y axis so progressive is at top
        }}
      ></div>
      
      {/* Coordinates */}
      <div className="absolute bottom-2 right-2 bg-white bg-opacity-70 px-2 py-1 rounded text-xs">
        ({libertyScore.toFixed(1)}, {socialScore.toFixed(1)})
      </div>
    </div>
  );
};

export default PoliticalCompass;
