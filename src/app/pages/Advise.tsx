import { useEffect, useState } from 'react';
import { Breadcrumbs } from '../components/layout/Breadcrumbs';
import { StatusBadge } from '../components/dashboard/StatusBadge';
import { CheckCircle, AlertCircle, FileText, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Toaster } from '../components/ui/sonner';
import { getAdvisePageData } from '../../features/advise/api/advise';
import { devSeed } from '../../features/shared/dev-seed';
import type { RecommendationVm } from '../../features/shared/types/view-models';

export function Advise() {
  const [recommendations, setRecommendations] = useState(devSeed.advise.recommendations);
  const [interventionPortfolio, setInterventionPortfolio] = useState(devSeed.advise.interventionPortfolio);
  const [selectedRec, setSelectedRec] = useState<RecommendationVm | null>(devSeed.advise.recommendations[0] || null);
  const [plannerNotes, setPlannerNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadAdviseData() {
      setIsLoading(true);
      const result = await getAdvisePageData();

      if (!isMounted) {
        return;
      }

      setRecommendations(result.data.recommendations);
      setInterventionPortfolio(result.data.interventionPortfolio);
      setSelectedRec(result.data.recommendations[0] || null);
      setUsingFallback(result.usingFallback);
      setLoadError(result.error);
      setIsLoading(false);
    }

    loadAdviseData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleApprove = () => {
    if (!selectedRec) {
      return;
    }
    toast.success(`Intervention for ${selectedRec.region} approved and added to implementation queue`);
  };

  const handleDefer = () => {
    if (!selectedRec) {
      return;
    }
    toast.info(`Recommendation for ${selectedRec.region} deferred for later review`);
  };

  const handleEscalate = () => {
    if (!selectedRec) {
      return;
    }
    toast.warning(`${selectedRec.region} escalated to senior management for review`);
  };

  const handleAddToReport = () => {
    toast.success('Added to report generation queue');
  };

  const handleRunSimulation = () => {
    toast.info('Running scenario simulation with current parameters...');
    setTimeout(() => {
      toast.success('Simulation complete! Adjusted priorities calculated.');
    }, 2000);
  };

  return (
    <div className="flex-1">
      <Toaster />
      <div className="max-w-7xl mx-auto p-6">
        <Breadcrumbs />
        
        {/* Page Header */}
        <div className="mb-6">
          <h1 
            className="mb-2" 
            style={{ 
              fontFamily: 'Arial, sans-serif', 
              fontSize: '24px', 
              fontWeight: 'bold', 
              color: '#1B3A5C' 
            }}
          >
            Intervention Recommendation Engine
          </h1>
          <p style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#888888' }}>
            Turn analysis into actionable planning decisions
          </p>
        </div>

        {/* Alert Banner */}
        <div 
          className="rounded-lg p-4 mb-6 flex items-start gap-3"
          style={{ backgroundColor: '#F5DFA0', borderLeft: '4px solid #E8C94F' }}
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#B8860B' }} />
          <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#1A1A1A' }}>
            <strong>{recommendations.length} regions</strong> pending review. Review recommendations and approve interventions to move them to the planning queue.
          </div>
        </div>

        <p style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', color: usingFallback ? '#B8860B' : '#2E6DA4', marginBottom: '12px' }}>
          {isLoading ? 'Loading data from Supabase...' : usingFallback ? 'Using fallback demo data' : 'Live data connected'}
        </p>
        {loadError && (
          <p style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', color: '#B8860B', marginBottom: '12px' }}>
            Data warning: {loadError}
          </p>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recommendation Queue */}
          <div className="lg:col-span-1 bg-white rounded-lg shadow-sm p-4">
            <h2 
              className="mb-4" 
              style={{ 
                fontFamily: 'Arial, sans-serif', 
                fontSize: '14px', 
                fontWeight: 'bold', 
                color: '#1B3A5C' 
              }}
            >
              Recommendation Queue
            </h2>
            {!isLoading && recommendations.length === 0 && (
              <div className="p-3 rounded" style={{ backgroundColor: '#EBF4FB', fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#1A1A1A' }}>
                No recommendations are available yet for review.
              </div>
            )}
            <div className="space-y-3">
              {recommendations.map((rec) => (
                <div
                  key={rec.id}
                  onClick={() => setSelectedRec(rec)}
                  className={`
                    p-3 rounded border cursor-pointer transition-all
                    ${selectedRec?.id === rec.id 
                      ? 'border-2 bg-[#D5E8F7]' 
                      : 'hover:bg-[#EBF4FB]'
                    }
                  `}
                  style={{ 
                    borderColor: selectedRec?.id === rec.id ? '#2E6DA4' : '#D8D8D8' 
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 
                      className="flex-1 text-sm" 
                      style={{ 
                        fontFamily: 'Arial, sans-serif', 
                        fontWeight: 'bold', 
                        color: '#1B3A5C' 
                      }}
                    >
                      {rec.region}
                    </h3>
                    <span 
                      className="px-2 py-1 rounded text-white text-xs" 
                      style={{ 
                        fontFamily: 'Arial, sans-serif', 
                        fontWeight: 'bold',
                        backgroundColor: '#B8860B' 
                      }}
                    >
                      {rec.score}
                    </span>
                  </div>
                  <div className="text-xs space-y-1" style={{ fontFamily: 'Arial, sans-serif', color: '#888888' }}>
                    <div>Gap: {rec.gap}</div>
                    <div className="mt-2">
                      <StatusBadge status={rec.status} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Intervention Detail Card */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              {!selectedRec && (
                <div className="p-3 rounded" style={{ backgroundColor: '#EBF4FB', fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#1A1A1A' }}>
                  No recommendations available yet.
                </div>
              )}
              {selectedRec && (
                <>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 
                    className="mb-2" 
                    style={{ 
                      fontFamily: 'Arial, sans-serif', 
                      fontSize: '18px', 
                      fontWeight: 'bold', 
                      color: '#1B3A5C' 
                    }}
                  >
                    {selectedRec.region}
                  </h2>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={selectedRec.confidence} label={`${selectedRec.confidence} confidence`} />
                    <span style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#888888' }}>
                      Underserved Score: <strong style={{ color: '#B8860B' }}>{selectedRec.score}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Diagnosed Needs */}
              <div className="mb-6 p-4 rounded" style={{ backgroundColor: '#EBF4FB' }}>
                <h3 
                  className="mb-2" 
                  style={{ 
                    fontFamily: 'Arial, sans-serif', 
                    fontSize: '14px', 
                    fontWeight: 'bold', 
                    color: '#1B3A5C' 
                  }}
                >
                  Diagnosed Needs
                </h3>
                <div className="flex items-start gap-2" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#1A1A1A' }}>
                  <ChevronRight className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#2E6DA4' }} />
                  <span>Primary Gap: <strong>{selectedRec.gap}</strong></span>
                </div>
              </div>

              {/* Recommended Interventions */}
              <div className="mb-6">
                <h3 
                  className="mb-3" 
                  style={{ 
                    fontFamily: 'Arial, sans-serif', 
                    fontSize: '14px', 
                    fontWeight: 'bold', 
                    color: '#1B3A5C' 
                  }}
                >
                  Recommended Interventions
                </h3>
                <div className="space-y-2">
                  {selectedRec.interventions.map((intervention, index) => (
                    <div 
                      key={index}
                      className="flex items-start gap-3 p-3 rounded border"
                      style={{ borderColor: '#D8D8D8' }}
                    >
                      <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#2E6DA4' }} />
                      <div className="flex-1">
                        <div 
                          style={{ 
                            fontFamily: 'Arial, sans-serif', 
                            fontSize: '11px', 
                            fontWeight: 'bold',
                            color: '#1A1A1A' 
                          }}
                        >
                          {intervention}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery Details */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-3 rounded" style={{ backgroundColor: '#EBF4FB' }}>
                  <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '9px', color: '#888888' }}>
                    Delivery Method
                  </div>
                  <div 
                    className="mt-1" 
                    style={{ 
                      fontFamily: 'Arial, sans-serif', 
                      fontSize: '14px', 
                      fontWeight: 'bold',
                      color: '#1A1A1A' 
                    }}
                  >
                    {selectedRec.deliveryMethod}
                  </div>
                </div>
                <div className="p-3 rounded" style={{ backgroundColor: '#EBF4FB' }}>
                  <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '9px', color: '#888888' }}>
                    Resource Requirement
                  </div>
                  <div 
                    className="mt-1" 
                    style={{ 
                      fontFamily: 'Arial, sans-serif', 
                      fontSize: '14px', 
                      fontWeight: 'bold',
                      color: '#1A1A1A' 
                    }}
                  >
                    {selectedRec.resourceRequirement}
                  </div>
                </div>
              </div>

              {/* Planner Notes */}
              <div className="mb-6">
                <label 
                  className="block mb-2" 
                  style={{ 
                    fontFamily: 'Arial, sans-serif', 
                    fontSize: '11px', 
                    fontWeight: 'bold',
                    color: '#1B3A5C' 
                  }}
                >
                  Planner Notes (Optional)
                </label>
                <textarea
                  value={plannerNotes}
                  onChange={(e) => setPlannerNotes(e.target.value)}
                  placeholder="Add custom notes or adjustments to this recommendation..."
                  className="w-full p-3 border rounded resize-none"
                  style={{
                    fontFamily: 'Arial, sans-serif',
                    fontSize: '11px',
                    borderColor: '#D8D8D8',
                    minHeight: '100px'
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleApprove}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded bg-[#2E6DA4] text-white hover:bg-[#1B3A5C] transition-colors cursor-pointer"
                  style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', fontWeight: 'bold' }}
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve Recommendation
                </button>
                <button 
                  onClick={handleDefer}
                  className="px-4 py-3 rounded bg-white border hover:bg-[#EBF4FB] transition-colors cursor-pointer"
                  style={{ 
                    fontFamily: 'Arial, sans-serif', 
                    fontSize: '10px', 
                    fontWeight: 'bold',
                    borderColor: '#2E6DA4',
                    color: '#2E6DA4'
                  }}
                >
                  Defer
                </button>
                <button 
                  onClick={handleEscalate}
                  className="px-4 py-3 rounded bg-[#F5DFA0] hover:bg-[#E8C94F] transition-colors cursor-pointer"
                  style={{ 
                    fontFamily: 'Arial, sans-serif', 
                    fontSize: '10px', 
                    fontWeight: 'bold',
                    color: '#1A1A1A'
                  }}
                >
                  Escalate
                </button>
                <button 
                  onClick={handleAddToReport}
                  className="px-4 py-3 rounded bg-white border hover:bg-[#EBF4FB] transition-colors cursor-pointer"
                  style={{ 
                    fontFamily: 'Arial, sans-serif', 
                    fontSize: '10px', 
                    fontWeight: 'bold',
                    borderColor: '#D8D8D8',
                    color: '#1A1A1A'
                  }}
                >
                  <FileText className="w-4 h-4" />
                </button>
              </div>
                </>
              )}
            </div>

            {/* Intervention Portfolio Panel */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 
                className="mb-4" 
                style={{ 
                  fontFamily: 'Arial, sans-serif', 
                  fontSize: '14px', 
                  fontWeight: 'bold', 
                  color: '#1B3A5C' 
                }}
              >
                STAR Intervention Portfolio
              </h3>
              {!isLoading && interventionPortfolio.length === 0 && (
                <div className="p-3 rounded mb-3" style={{ backgroundColor: '#EBF4FB', fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#1A1A1A' }}>
                  No intervention programs are available in the portfolio.
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {interventionPortfolio.map((intervention, index) => (
                  <div 
                    key={index}
                    className="p-3 rounded border hover:border-[#2E6DA4] cursor-pointer transition-colors"
                    style={{ borderColor: '#D8D8D8' }}
                  >
                    <div 
                      style={{ 
                        fontFamily: 'Arial, sans-serif', 
                        fontSize: '11px',
                        color: '#1A1A1A' 
                      }}
                    >
                      {intervention}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Scenario Simulation Panel */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 
                className="mb-4" 
                style={{ 
                  fontFamily: 'Arial, sans-serif', 
                  fontSize: '14px', 
                  fontWeight: 'bold', 
                  color: '#1B3A5C' 
                }}
              >
                Scenario Simulation
              </h3>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label 
                    className="block mb-2" 
                    style={{ 
                      fontFamily: 'Arial, sans-serif', 
                      fontSize: '9px',
                      color: '#888888' 
                    }}
                  >
                    Budget (PHP)
                  </label>
                  <input
                    type="text"
                    placeholder="5,000,000"
                    className="w-full px-3 py-2 border rounded"
                    style={{
                      fontFamily: 'Arial, sans-serif',
                      fontSize: '11px',
                      borderColor: '#D8D8D8'
                    }}
                  />
                </div>
                <div>
                  <label 
                    className="block mb-2" 
                    style={{ 
                      fontFamily: 'Arial, sans-serif', 
                      fontSize: '9px',
                      color: '#888888' 
                    }}
                  >
                    Trainers Available
                  </label>
                  <input
                    type="text"
                    placeholder="12"
                    className="w-full px-3 py-2 border rounded"
                    style={{
                      fontFamily: 'Arial, sans-serif',
                      fontSize: '11px',
                      borderColor: '#D8D8D8'
                    }}
                  />
                </div>
                <div>
                  <label 
                    className="block mb-2" 
                    style={{ 
                      fontFamily: 'Arial, sans-serif', 
                      fontSize: '9px',
                      color: '#888888' 
                    }}
                  >
                    Timeline (months)
                  </label>
                  <input
                    type="text"
                    placeholder="6"
                    className="w-full px-3 py-2 border rounded"
                    style={{
                      fontFamily: 'Arial, sans-serif',
                      fontSize: '11px',
                      borderColor: '#D8D8D8'
                    }}
                  />
                </div>
              </div>
              <button 
                onClick={handleRunSimulation}
                className="w-full px-4 py-2 rounded bg-[#E8C94F] hover:bg-[#B8860B] hover:text-white transition-colors cursor-pointer"
                style={{ 
                  fontFamily: 'Arial, sans-serif', 
                  fontSize: '10px', 
                  fontWeight: 'bold',
                  color: '#1A1A1A'
                }}
              >
                Run Simulation
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}