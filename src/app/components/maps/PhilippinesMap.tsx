import { useState } from 'react';

interface Region {
  name: string;
  priority: 'low' | 'moderate' | 'high' | 'critical';
  coverage: number;
  score?: number;
}

interface PhilippinesMapProps {
  selectedRegion: string | null;
  onRegionClick: (regionName: string) => void;
  highlightMode?: boolean; // If true, only selected region is colored
}

export function PhilippinesMap({ selectedRegion, onRegionClick, highlightMode = false }: PhilippinesMapProps) {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

  const regions: Region[] = [
    { name: 'NCR', priority: 'low', coverage: 92 },
    { name: 'Region I', priority: 'moderate', coverage: 78 },
    { name: 'Region II', priority: 'moderate', coverage: 74 },
    { name: 'CAR', priority: 'high', coverage: 68 },
    { name: 'Region III', priority: 'low', coverage: 85 },
    { name: 'Region IV-A', priority: 'moderate', coverage: 72 },
    { name: 'MIMAROPA', priority: 'high', coverage: 65 },
    { name: 'Region V', priority: 'high', coverage: 58, score: 8.4 },
    { name: 'Region VI', priority: 'moderate', coverage: 75 },
    { name: 'Region VII', priority: 'low', coverage: 88 },
    { name: 'Region VIII', priority: 'high', coverage: 62, score: 7.6 },
    { name: 'Region IX', priority: 'moderate', coverage: 71 },
    { name: 'Region X', priority: 'moderate', coverage: 76 },
    { name: 'Region XI', priority: 'low', coverage: 82 },
    { name: 'Region XII', priority: 'critical', coverage: 54, score: 8.7 },
    { name: 'Region XIII', priority: 'high', coverage: 60, score: 7.9 },
    { name: 'BARMM', priority: 'critical', coverage: 48, score: 8.2 },
  ];

  const getRegionColor = (region: Region) => {
    // If in highlight mode and a region is selected
    if (highlightMode && selectedRegion) {
      // Check if this region matches the selected region (handle both short and long names)
      const isSelected = selectedRegion === region.name || 
                        selectedRegion.includes(region.name) ||
                        region.name.includes(selectedRegion.split(' - ')[0]);
      
      // If this is the selected region, show its priority color
      if (isSelected) {
        switch (region.priority) {
          case 'critical': return '#B8860B';
          case 'high': return '#E8C94F';
          case 'moderate': return '#2E6DA4';
          case 'low': return '#A8C8E8';
          default: return '#D8D8D8';
        }
      }
      // Otherwise, gray it out
      return '#E8E8E8';
    }
    
    // Default: show full heatmap with all colors
    switch (region.priority) {
      case 'critical': return '#B8860B';
      case 'high': return '#E8C94F';
      case 'moderate': return '#2E6DA4';
      case 'low': return '#A8C8E8';
      default: return '#D8D8D8';
    }
  };

  const getRegionOpacity = (region: Region) => {
    if (highlightMode && selectedRegion) {
      const isSelected = selectedRegion === region.name || 
                        selectedRegion.includes(region.name) ||
                        region.name.includes(selectedRegion.split(' - ')[0]);
      if (!isSelected) {
        return 0.3;
      }
    }
    return 1;
  };

  return (
    <svg viewBox="0 0 600 700" className="w-full h-full">
      {/* Luzon */}
      <g id="luzon">
        {/* Region I - Ilocos */}
        <path
          d="M 200 100 L 220 80 L 240 85 L 250 100 L 245 120 L 230 135 L 215 130 L 205 115 Z"
          fill={getRegionColor(regions.find(r => r.name === 'Region I')!)}
          fillOpacity={getRegionOpacity(regions.find(r => r.name === 'Region I')!)}
          stroke="#FFFFFF"
          strokeWidth="2"
          className="cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => onRegionClick('Region I')}
          onMouseEnter={() => setHoveredRegion('Region I')}
          onMouseLeave={() => setHoveredRegion(null)}
        />
        
        {/* CAR - Cordillera */}
        <path
          d="M 230 100 L 245 85 L 260 90 L 265 105 L 255 120 L 240 125 L 230 115 Z"
          fill={getRegionColor(regions.find(r => r.name === 'CAR')!)}
          fillOpacity={getRegionOpacity(regions.find(r => r.name === 'CAR')!)}
          stroke="#FFFFFF"
          strokeWidth="2"
          className="cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => onRegionClick('CAR')}
          onMouseEnter={() => setHoveredRegion('CAR')}
          onMouseLeave={() => setHoveredRegion(null)}
        />

        {/* Region II - Cagayan Valley */}
        <path
          d="M 265 85 L 290 75 L 310 85 L 315 105 L 305 120 L 285 125 L 270 115 L 265 100 Z"
          fill={getRegionColor(regions.find(r => r.name === 'Region II')!)}
          fillOpacity={getRegionOpacity(regions.find(r => r.name === 'Region II')!)}
          stroke="#FFFFFF"
          strokeWidth="2"
          className="cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => onRegionClick('Region II')}
          onMouseEnter={() => setHoveredRegion('Region II')}
          onMouseLeave={() => setHoveredRegion(null)}
        />

        {/* Region III - Central Luzon */}
        <path
          d="M 220 145 L 245 130 L 270 135 L 285 150 L 280 175 L 260 185 L 235 180 L 220 165 Z"
          fill={getRegionColor(regions.find(r => r.name === 'Region III')!)}
          fillOpacity={getRegionOpacity(regions.find(r => r.name === 'Region III')!)}
          stroke="#FFFFFF"
          strokeWidth="2"
          className="cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => onRegionClick('Region III')}
          onMouseEnter={() => setHoveredRegion('Region III')}
          onMouseLeave={() => setHoveredRegion(null)}
        />

        {/* NCR */}
        <circle
          cx="260"
          cy="195"
          r="12"
          fill={getRegionColor(regions.find(r => r.name === 'NCR')!)}
          fillOpacity={getRegionOpacity(regions.find(r => r.name === 'NCR')!)}
          stroke="#FFFFFF"
          strokeWidth="3"
          className="cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => onRegionClick('NCR')}
          onMouseEnter={() => setHoveredRegion('NCR')}
          onMouseLeave={() => setHoveredRegion(null)}
        />

        {/* Region IV-A - CALABARZON */}
        <path
          d="M 240 200 L 270 195 L 295 210 L 300 235 L 285 250 L 255 245 L 235 230 Z"
          fill={getRegionColor(regions.find(r => r.name === 'Region IV-A')!)}
          fillOpacity={getRegionOpacity(regions.find(r => r.name === 'Region IV-A')!)}
          stroke="#FFFFFF"
          strokeWidth="2"
          className="cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => onRegionClick('Region IV-A')}
          onMouseEnter={() => setHoveredRegion('Region IV-A')}
          onMouseLeave={() => setHoveredRegion(null)}
        />

        {/* MIMAROPA */}
        <path
          d="M 170 240 L 200 230 L 225 245 L 230 270 L 215 290 L 185 285 L 165 265 Z"
          fill={getRegionColor(regions.find(r => r.name === 'MIMAROPA')!)}
          fillOpacity={getRegionOpacity(regions.find(r => r.name === 'MIMAROPA')!)}
          stroke="#FFFFFF"
          strokeWidth="2"
          className="cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => onRegionClick('MIMAROPA')}
          onMouseEnter={() => setHoveredRegion('MIMAROPA')}
          onMouseLeave={() => setHoveredRegion(null)}
        />

        {/* Region V - Bicol */}
        <path
          d="M 310 250 L 345 245 L 370 260 L 380 285 L 365 305 L 335 310 L 310 295 L 305 270 Z"
          fill={getRegionColor(regions.find(r => r.name === 'Region V')!)}
          fillOpacity={getRegionOpacity(regions.find(r => r.name === 'Region V')!)}
          stroke="#FFFFFF"
          strokeWidth="2"
          className="cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => onRegionClick('Region V')}
          onMouseEnter={() => setHoveredRegion('Region V')}
          onMouseLeave={() => setHoveredRegion(null)}
        />
      </g>

      {/* Visayas */}
      <g id="visayas">
        {/* Region VI - Western Visayas */}
        <path
          d="M 240 360 L 275 350 L 295 365 L 290 390 L 265 400 L 240 390 Z"
          fill={getRegionColor(regions.find(r => r.name === 'Region VI')!)}
          fillOpacity={getRegionOpacity(regions.find(r => r.name === 'Region VI')!)}
          stroke="#FFFFFF"
          strokeWidth="2"
          className="cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => onRegionClick('Region VI')}
          onMouseEnter={() => setHoveredRegion('Region VI')}
          onMouseLeave={() => setHoveredRegion(null)}
        />

        {/* Region VII - Central Visayas */}
        <path
          d="M 310 370 L 345 365 L 370 380 L 365 405 L 340 415 L 310 405 Z"
          fill={getRegionColor(regions.find(r => r.name === 'Region VII')!)}
          fillOpacity={getRegionOpacity(regions.find(r => r.name === 'Region VII')!)}
          stroke="#FFFFFF"
          strokeWidth="2"
          className="cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => onRegionClick('Region VII')}
          onMouseEnter={() => setHoveredRegion('Region VII')}
          onMouseLeave={() => setHoveredRegion(null)}
        />

        {/* Region VIII - Eastern Visayas */}
        <path
          d="M 380 350 L 415 345 L 435 365 L 430 395 L 405 410 L 380 400 L 375 375 Z"
          fill={getRegionColor(regions.find(r => r.name === 'Region VIII')!)}
          fillOpacity={getRegionOpacity(regions.find(r => r.name === 'Region VIII')!)}
          stroke="#FFFFFF"
          strokeWidth="2"
          className="cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => onRegionClick('Region VIII')}
          onMouseEnter={() => setHoveredRegion('Region VIII')}
          onMouseLeave={() => setHoveredRegion(null)}
        />
      </g>

      {/* Mindanao */}
      <g id="mindanao">
        {/* Region IX - Zamboanga Peninsula */}
        <path
          d="M 200 490 L 235 480 L 255 500 L 250 530 L 225 545 L 200 535 Z"
          fill={getRegionColor(regions.find(r => r.name === 'Region IX')!)}
          fillOpacity={getRegionOpacity(regions.find(r => r.name === 'Region IX')!)}
          stroke="#FFFFFF"
          strokeWidth="2"
          className="cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => onRegionClick('Region IX')}
          onMouseEnter={() => setHoveredRegion('Region IX')}
          onMouseLeave={() => setHoveredRegion(null)}
        />

        {/* Region X - Northern Mindanao */}
        <path
          d="M 270 460 L 310 455 L 335 475 L 330 500 L 305 515 L 275 510 L 265 485 Z"
          fill={getRegionColor(regions.find(r => r.name === 'Region X')!)}
          fillOpacity={getRegionOpacity(regions.find(r => r.name === 'Region X')!)}
          stroke="#FFFFFF"
          strokeWidth="2"
          className="cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => onRegionClick('Region X')}
          onMouseEnter={() => setHoveredRegion('Region X')}
          onMouseLeave={() => setHoveredRegion(null)}
        />

        {/* Region XIII - Caraga */}
        <path
          d="M 350 470 L 390 465 L 410 485 L 405 515 L 380 530 L 350 520 L 345 495 Z"
          fill={getRegionColor(regions.find(r => r.name === 'Region XIII')!)}
          fillOpacity={getRegionOpacity(regions.find(r => r.name === 'Region XIII')!)}
          stroke="#FFFFFF"
          strokeWidth="2"
          className="cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => onRegionClick('Region XIII')}
          onMouseEnter={() => setHoveredRegion('Region XIII')}
          onMouseLeave={() => setHoveredRegion(null)}
        />

        {/* Region XI - Davao */}
        <path
          d="M 320 540 L 360 530 L 385 550 L 380 580 L 350 595 L 320 585 Z"
          fill={getRegionColor(regions.find(r => r.name === 'Region XI')!)}
          fillOpacity={getRegionOpacity(regions.find(r => r.name === 'Region XI')!)}
          stroke="#FFFFFF"
          strokeWidth="2"
          className="cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => onRegionClick('Region XI')}
          onMouseEnter={() => setHoveredRegion('Region XI')}
          onMouseLeave={() => setHoveredRegion(null)}
        />

        {/* Region XII - SOCCSKSARGEN */}
        <path
          d="M 260 540 L 300 535 L 315 555 L 310 585 L 280 595 L 255 580 Z"
          fill={getRegionColor(regions.find(r => r.name === 'Region XII')!)}
          fillOpacity={getRegionOpacity(regions.find(r => r.name === 'Region XII')!)}
          stroke="#FFFFFF"
          strokeWidth="2"
          className="cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => onRegionClick('Region XII')}
          onMouseEnter={() => setHoveredRegion('Region XII')}
          onMouseLeave={() => setHoveredRegion(null)}
        />

        {/* BARMM */}
        <path
          d="M 190 570 L 230 560 L 250 585 L 245 615 L 215 630 L 185 620 L 180 595 Z"
          fill={getRegionColor(regions.find(r => r.name === 'BARMM')!)}
          fillOpacity={getRegionOpacity(regions.find(r => r.name === 'BARMM')!)}
          stroke="#FFFFFF"
          strokeWidth="2"
          className="cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => onRegionClick('BARMM')}
          onMouseEnter={() => setHoveredRegion('BARMM')}
          onMouseLeave={() => setHoveredRegion(null)}
        />
      </g>

      {/* Hover Tooltip */}
      {hoveredRegion && (
        <g>
          <rect
            x="450"
            y="20"
            width="140"
            height="80"
            fill="#1B3A5C"
            stroke="#E8C94F"
            strokeWidth="2"
            rx="4"
          />
          <text
            x="520"
            y="45"
            textAnchor="middle"
            fill="#FFFFFF"
            fontFamily="Arial, sans-serif"
            fontSize="12"
            fontWeight="bold"
          >
            {hoveredRegion}
          </text>
          <text
            x="520"
            y="65"
            textAnchor="middle"
            fill="#E8C94F"
            fontFamily="Arial, sans-serif"
            fontSize="11"
          >
            Coverage: {regions.find(r => r.name === hoveredRegion)?.coverage}%
          </text>
          {regions.find(r => r.name === hoveredRegion)?.score && (
            <text
              x="520"
              y="85"
              textAnchor="middle"
              fill="#E8C94F"
              fontFamily="Arial, sans-serif"
              fontSize="11"
            >
              Priority Score: {regions.find(r => r.name === hoveredRegion)?.score}
            </text>
          )}
        </g>
      )}

      {/* Selected Region Indicator */}
      {selectedRegion && highlightMode && (
        <g>
          <rect
            x="20"
            y="20"
            width="160"
            height="50"
            fill="#E8C94F"
            stroke="#1B3A5C"
            strokeWidth="2"
            rx="4"
          />
          <text
            x="30"
            y="40"
            fill="#1B3A5C"
            fontFamily="Arial, sans-serif"
            fontSize="10"
            fontWeight="bold"
          >
            SELECTED:
          </text>
          <text
            x="30"
            y="58"
            fill="#1B3A5C"
            fontFamily="Arial, sans-serif"
            fontSize="12"
            fontWeight="bold"
          >
            {selectedRegion}
          </text>
        </g>
      )}
    </svg>
  );
}