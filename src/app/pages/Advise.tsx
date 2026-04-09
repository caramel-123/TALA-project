import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { AlertCircle, CheckCircle2, ChevronRight, ClipboardCheck, FileDown, FlaskConical, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Breadcrumbs } from '../components/layout/Breadcrumbs';
import { StatusBadge } from '../components/dashboard/StatusBadge';
import { Toaster } from '../components/ui/sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../components/ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { getAdvisePageData } from '../../features/advise/api/advise';
import { devSeed } from '../../features/shared/dev-seed';
import type { RecommendationVm, SourceStatus } from '../../features/shared/types/view-models';

type QueueSort = 'urgency' | 'confidence';
type WorkspaceTab = 'action-plan' | 'delivery-notes' | 'simulation';

type SimulationInputs = {
  budget: string;
  trainers: string;
  slots: string;
  timeline: string;
};

type SimulationResult = {
  expectedCoverageLift: number;
  teachersReached: number;
  deliveryConfidence: 'high' | 'moderate';
  risk: 'low' | 'moderate' | 'high';
  prioritizedRecommendations: string[];
  deferredRecommendations: string[];
  budgetUsed: number;
  trainersUsed: number;
  slotsUsed: number;
  tradeoffSummary: string;
};

function getPriorityFromScore(score: number): 'critical' | 'high' | 'moderate' | 'low' {
  if (score >= 8.3) {
    return 'critical';
  }

  if (score >= 7.5) {
    return 'high';
  }

  if (score >= 6.5) {
    return 'moderate';
  }

  return 'low';
}

function getTargetCohort(gap: string): string {
  const normalizedGap = gap.toLowerCase();

  if (normalizedGap.includes('remote') || normalizedGap.includes('island')) {
    return 'Teachers in geographically isolated and disadvantaged schools';
  }

  if (normalizedGap.includes('specialization') || normalizedGap.includes('subject')) {
    return 'Teachers handling out-of-field STEM classes';
  }

  if (normalizedGap.includes('coverage')) {
    return 'Schools with lowest STAR participation continuity';
  }

  return 'Teachers with repeated low participation indicators';
}

function getTimeline(resourceRequirement: string): string {
  const resource = resourceRequirement.toLowerCase();

  if (resource.includes('high')) {
    return '2 rollout waves over 6 months';
  }

  if (resource.includes('medium')) {
    return 'Single wave over 4 months';
  }

  return 'Rapid rollout over 8-10 weeks';
}

function toNumber(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildWhyBullets(rec: RecommendationVm): string[] {
  return [
    `${rec.gap} is the dominant blocker in the latest Diagnose signal for ${rec.region}.`,
    `Underserved score ${rec.score.toFixed(1)} keeps this recommendation in the top urgency tier.`,
    `${rec.deliveryMethod} delivery aligns with ${rec.resourceRequirement.toLowerCase()} resource conditions in this area.`,
  ];
}

function confidenceWeight(confidence: RecommendationVm['confidence']): number {
  return confidence === 'high' ? 2 : 1;
}

function estimateBudgetPerRecommendation(resourceRequirement: string): number {
  const normalizedRequirement = resourceRequirement.toLowerCase();

  if (normalizedRequirement.includes('high')) {
    return 1_200_000;
  }

  if (normalizedRequirement.includes('medium')) {
    return 800_000;
  }

  return 500_000;
}

function summarizeTradeoff(prioritizedCount: number, deferredCount: number, risk: SimulationResult['risk']): string {
  if (prioritizedCount === 0) {
    return 'Current constraints produce no viable rollout; increase inputs before approving.';
  }

  if (deferredCount === 0) {
    return 'Current capacity can execute all active recommendations in one planning cycle.';
  }

  if (risk === 'high') {
    return 'Compressed timeline raises implementation risk; defer lower-urgency items or extend rollout timing.';
  }

  return `This plan prioritizes ${prioritizedCount} recommendations and defers ${deferredCount} due to capacity limits.`;
}

export function Advise() {
  const [recommendations, setRecommendations] = useState<RecommendationVm[]>(devSeed.advise.recommendations);
  const [interventionPortfolio, setInterventionPortfolio] = useState<string[]>(devSeed.advise.interventionPortfolio);
  const [selectedRecommendationId, setSelectedRecommendationId] = useState<string | null>(devSeed.advise.recommendations[0]?.id ?? null);
  const [plannerNotesById, setPlannerNotesById] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | SourceStatus>('all');
  const [sortBy, setSortBy] = useState<QueueSort>('urgency');
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('action-plan');

  const [isEvidenceSheetOpen, setIsEvidenceSheetOpen] = useState(false);
  const [isSimulationDialogOpen, setIsSimulationDialogOpen] = useState(false);

  const [simulationInputs, setSimulationInputs] = useState<SimulationInputs>({
    budget: '5000000',
    trainers: '12',
    slots: '18',
    timeline: '6',
  });
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadAdviseData() {
      setIsLoading(true);

      try {
        const result = await getAdvisePageData();

        if (!isMounted) {
          return;
        }

        setRecommendations(result.data.recommendations);
        setInterventionPortfolio(result.data.interventionPortfolio);
        setSelectedRecommendationId(result.data.recommendations[0]?.id ?? null);
        setUsingFallback(result.usingFallback);
        setLoadError(result.error);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setRecommendations(devSeed.advise.recommendations);
        setInterventionPortfolio(devSeed.advise.interventionPortfolio);
        setSelectedRecommendationId(devSeed.advise.recommendations[0]?.id ?? null);
        setUsingFallback(true);
        setLoadError(error instanceof Error ? error.message : 'Unable to load Advise data.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadAdviseData();

    return () => {
      isMounted = false;
    };
  }, []);

  const queueItems = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    const filtered = recommendations.filter((recommendation) => {
      const matchesSearch =
        normalizedQuery.length === 0 ||
        recommendation.region.toLowerCase().includes(normalizedQuery) ||
        recommendation.gap.toLowerCase().includes(normalizedQuery) ||
        recommendation.interventions.some((intervention) => intervention.toLowerCase().includes(normalizedQuery));

      const matchesStatus = statusFilter === 'all' || recommendation.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'confidence') {
        const byConfidence = confidenceWeight(b.confidence) - confidenceWeight(a.confidence);
        if (byConfidence !== 0) {
          return byConfidence;
        }
      }

      return b.score - a.score;
    });

    return sorted;
  }, [recommendations, searchQuery, sortBy, statusFilter]);

  useEffect(() => {
    if (queueItems.length === 0) {
      setSelectedRecommendationId(null);
      return;
    }

    const selectedExists = queueItems.some((item) => item.id === selectedRecommendationId);
    if (!selectedExists) {
      setSelectedRecommendationId(queueItems[0].id);
    }
  }, [queueItems, selectedRecommendationId]);

  const selectedRecommendation = useMemo(
    () => recommendations.find((recommendation) => recommendation.id === selectedRecommendationId) ?? null,
    [recommendations, selectedRecommendationId],
  );

  const statusCounts = useMemo(() => {
    return recommendations.reduce(
      (acc, recommendation) => {
        acc[recommendation.status] += 1;
        return acc;
      },
      {
        pending: 0,
        validated: 0,
        flagged: 0,
        rejected: 0,
      },
    );
  }, [recommendations]);

  const selectedPrimaryIntervention = selectedRecommendation?.interventions[0] ?? 'Intervention TBD';
  const selectedSupportInterventions = selectedRecommendation?.interventions.slice(1) ?? [];
  const selectedPlannerNotes = selectedRecommendation ? plannerNotesById[selectedRecommendation.id] ?? '' : '';

  const applyRecommendationStatus = (status: SourceStatus, successMessage: string) => {
    if (!selectedRecommendation) {
      return;
    }

    setRecommendations((previousRecommendations) =>
      previousRecommendations.map((recommendation) =>
        recommendation.id === selectedRecommendation.id
          ? {
              ...recommendation,
              status,
            }
          : recommendation,
      ),
    );

    toast.success(successMessage);
  };

  const handleApprove = () => {
    if (!selectedRecommendation) {
      return;
    }

    applyRecommendationStatus('validated', `${selectedRecommendation.region} approved and added to implementation queue.`);
  };

  const handleDefer = () => {
    if (!selectedRecommendation) {
      return;
    }

    applyRecommendationStatus('pending', `${selectedRecommendation.region} deferred for a later planning cycle.`);
  };

  const handleEscalate = () => {
    if (!selectedRecommendation) {
      return;
    }

    applyRecommendationStatus('flagged', `${selectedRecommendation.region} escalated for executive review.`);
  };

  const handleAddToPlanningBrief = () => {
    if (!selectedRecommendation) {
      return;
    }

    toast.success(`${selectedRecommendation.region} notes added to planning brief.`);
  };

  const runSimulation = () => {
    if (!selectedRecommendation) {
      return;
    }

    const budget = toNumber(simulationInputs.budget, 5_000_000);
    const trainers = toNumber(simulationInputs.trainers, 12);
    const slots = toNumber(simulationInputs.slots, 18);
    const timeline = toNumber(simulationInputs.timeline, 6);

    const activeRecommendations = [...recommendations]
      .filter((recommendation) => recommendation.status !== 'rejected')
      .sort((a, b) => b.score - a.score);

    const capacityByBudget = Math.max(0, Math.floor(budget / 900_000));
    const capacityByTrainers = Math.max(0, Math.floor(trainers * 1.5));
    const capacityBySlots = Math.max(0, Math.floor(slots));
    const feasibleCount = Math.min(activeRecommendations.length, capacityByBudget, capacityByTrainers, capacityBySlots);

    const prioritizedRecommendations = activeRecommendations.slice(0, feasibleCount).map((recommendation) => recommendation.region);
    const deferredRecommendations = activeRecommendations.slice(feasibleCount).map((recommendation) => recommendation.region);

    const prioritizedRecommendationRows = activeRecommendations.slice(0, feasibleCount);
    const budgetUsed = Math.min(
      budget,
      prioritizedRecommendationRows.reduce((total, recommendation) => total + estimateBudgetPerRecommendation(recommendation.resourceRequirement), 0),
    );
    const trainersUsed = Math.min(trainers, Math.max(0, Math.ceil(feasibleCount / 2)));
    const slotsUsed = Math.min(slots, feasibleCount);

    const expectedCoverageLift = Math.max(0, Math.round((prioritizedRecommendations.length / Math.max(activeRecommendations.length, 1)) * 16));
    const teachersReached = Math.max(0, Math.round((prioritizedRecommendations.length * 1100 + trainersUsed * 120 + slotsUsed * 60) / 100) * 100);

    const risk: SimulationResult['risk'] =
      timeline <= 3 ? 'high' : trainers < 8 || selectedRecommendation.resourceRequirement.toLowerCase().includes('high') ? 'moderate' : 'low';

    const nextResult: SimulationResult = {
      expectedCoverageLift,
      teachersReached,
      deliveryConfidence: selectedRecommendation.confidence,
      risk,
      prioritizedRecommendations,
      deferredRecommendations,
      budgetUsed,
      trainersUsed,
      slotsUsed,
      tradeoffSummary: summarizeTradeoff(prioritizedRecommendations.length, deferredRecommendations.length, risk),
    };

    setSimulationResult(nextResult);
    toast.success(`Simulation complete for ${selectedRecommendation.region}.`);
  };

  const handleRunSimulationFromHeader = () => {
    setActiveTab('simulation');
    runSimulation();
  };

  return (
    <div className="flex-1">
      <Toaster />

      <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
        <Breadcrumbs />

        <header className="sticky top-0 z-20 mb-4 rounded-xl border border-[#D8D8D8] bg-white/95 p-4 backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1
                className="text-2xl font-bold"
                style={{
                  fontFamily: 'Arial, sans-serif',
                  color: '#1B3A5C',
                }}
              >
                Advise
              </h1>
              <p className="mt-1 text-xs" style={{ fontFamily: 'Arial, sans-serif', color: '#555555' }}>
                Convert diagnosis into concrete interventions your team can review, approve, and schedule quickly.
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[#D8D8D8] bg-[#EBF4FB] px-3 py-1 text-xs font-bold" style={{ fontFamily: 'Arial, sans-serif', color: '#1B3A5C' }}>
                  Queue: {queueItems.length}
                </span>
                <span className="rounded-full border border-[#D8D8D8] bg-white px-3 py-1 text-xs" style={{ fontFamily: 'Arial, sans-serif', color: '#555555' }}>
                  Pending: {statusCounts.pending}
                </span>
                <span className="rounded-full border border-[#D8D8D8] bg-white px-3 py-1 text-xs" style={{ fontFamily: 'Arial, sans-serif', color: '#555555' }}>
                  Approved: {statusCounts.validated}
                </span>
                <span className="rounded-full border border-[#D8D8D8] bg-white px-3 py-1 text-xs" style={{ fontFamily: 'Arial, sans-serif', color: '#555555' }}>
                  Escalated: {statusCounts.flagged}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <button
                onClick={() => toast.success('Planning brief exported.')}
                className="inline-flex items-center gap-2 rounded-md border border-[#D8D8D8] bg-white px-3 py-2 text-xs font-bold transition-colors hover:bg-[#EBF4FB]"
                style={{ fontFamily: 'Arial, sans-serif', color: '#1A1A1A' }}
              >
                <FileDown className="h-4 w-4" />
                Export Brief
              </button>
              <button
                onClick={handleRunSimulationFromHeader}
                className="inline-flex items-center gap-2 rounded-md border border-[#2E6DA4] bg-[#D5E8F7] px-3 py-2 text-xs font-bold transition-colors hover:bg-[#A8C8E8]"
                style={{ fontFamily: 'Arial, sans-serif', color: '#1B3A5C' }}
              >
                <FlaskConical className="h-4 w-4" />
                Run Simulation
              </button>
              <button
                onClick={() => setIsEvidenceSheetOpen(true)}
                className="inline-flex items-center gap-2 rounded-md bg-[#1B3A5C] px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-[#2E6DA4]"
                style={{ fontFamily: 'Arial, sans-serif' }}
              >
                <ClipboardCheck className="h-4 w-4" />
                View Evidence Log
              </button>
            </div>
          </div>

          <p className="mt-3 text-[11px]" style={{ fontFamily: 'Arial, sans-serif', color: usingFallback ? '#B8860B' : '#2E6DA4' }}>
            {isLoading ? 'Loading data from Supabase...' : usingFallback ? 'Using fallback demo data' : 'Live data connected'}
          </p>
          {loadError && (
            <p className="mt-1 text-[11px]" style={{ fontFamily: 'Arial, sans-serif', color: '#B8860B' }}>
              Data warning: {loadError}
            </p>
          )}
        </header>

        <main className="grid grid-cols-1 gap-4 lg:h-[calc(100vh-235px)] lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="flex min-h-[380px] flex-col overflow-hidden rounded-xl border border-[#D8D8D8] bg-white p-4 shadow-sm lg:min-h-0">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold" style={{ fontFamily: 'Arial, sans-serif', color: '#1B3A5C' }}>
                Recommendation Queue
              </h2>
              <span className="text-[10px]" style={{ fontFamily: 'Arial, sans-serif', color: '#888888' }}>
                Action-ready
              </span>
            </div>

            <div className="mb-3 space-y-2">
              <label className="relative block">
                <Search className="pointer-events-none absolute top-2.5 left-2.5 h-4 w-4" style={{ color: '#888888' }} />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search region, gap, intervention"
                  className="w-full rounded-md border border-[#D8D8D8] py-2 pr-3 pl-8 text-xs outline-none transition-colors focus:border-[#2E6DA4]"
                  style={{ fontFamily: 'Arial, sans-serif', color: '#1A1A1A' }}
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as 'all' | SourceStatus)}
                  className="rounded-md border border-[#D8D8D8] bg-white px-2 py-2 text-xs"
                  style={{ fontFamily: 'Arial, sans-serif', color: '#1A1A1A' }}
                >
                  <option value="all">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="validated">Approved</option>
                  <option value="flagged">Escalated</option>
                  <option value="rejected">Rejected</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as QueueSort)}
                  className="rounded-md border border-[#D8D8D8] bg-white px-2 py-2 text-xs"
                  style={{ fontFamily: 'Arial, sans-serif', color: '#1A1A1A' }}
                >
                  <option value="urgency">Sort: Urgency</option>
                  <option value="confidence">Sort: Confidence</option>
                </select>
              </div>
            </div>

            {queueItems.length === 0 ? (
              <div className="rounded-md border border-dashed border-[#D8D8D8] bg-[#EBF4FB] p-3 text-xs" style={{ fontFamily: 'Arial, sans-serif', color: '#1A1A1A' }}>
                No recommendations match current filters.
              </div>
            ) : (
              <div className="flex-1 space-y-2 overflow-y-auto pr-1">
                {queueItems.map((recommendation) => {
                  const isSelected = recommendation.id === selectedRecommendationId;
                  const priority = getPriorityFromScore(recommendation.score);

                  return (
                    <button
                      key={recommendation.id}
                      onClick={() => setSelectedRecommendationId(recommendation.id)}
                      className={`w-full rounded-lg border p-3 text-left transition-all ${
                        isSelected ? 'border-[#2E6DA4] bg-[#D5E8F7]' : 'border-[#D8D8D8] hover:border-[#A8C8E8] hover:bg-[#EBF4FB]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-xs font-bold" style={{ fontFamily: 'Arial, sans-serif', color: '#1B3A5C' }}>
                          {recommendation.region}
                        </h3>
                        <span className="rounded-full bg-[#1B3A5C] px-2 py-0.5 text-[10px] font-bold text-white" style={{ fontFamily: 'Arial, sans-serif' }}>
                          {recommendation.score.toFixed(1)}
                        </span>
                      </div>

                      <p className="mt-2 line-clamp-2 text-[11px]" style={{ fontFamily: 'Arial, sans-serif', color: '#555555' }}>
                        {recommendation.interventions[0] ?? 'Intervention TBD'}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <StatusBadge status={priority} label={`Priority ${priority}`} />
                        <StatusBadge status={recommendation.confidence} label={`${recommendation.confidence} confidence`} />
                        <StatusBadge status={recommendation.status} />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </aside>

          <section className="flex min-h-[380px] flex-col overflow-hidden rounded-xl border border-[#D8D8D8] bg-white shadow-sm lg:min-h-0">
            {!selectedRecommendation ? (
              <div className="m-4 rounded-md border border-dashed border-[#D8D8D8] bg-[#EBF4FB] p-4 text-sm" style={{ fontFamily: 'Arial, sans-serif', color: '#1A1A1A' }}>
                Select a recommendation from the queue to start decision review.
              </div>
            ) : (
              <>
                <div className="sticky top-0 z-10 border-b border-[#D8D8D8] bg-white p-4 sm:p-5">
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <h2 className="text-lg font-bold" style={{ fontFamily: 'Arial, sans-serif', color: '#1B3A5C' }}>
                        {selectedRecommendation.region}
                      </h2>
                      <p className="mt-1 text-xs" style={{ fontFamily: 'Arial, sans-serif', color: '#555555' }}>
                        Recommend {selectedPrimaryIntervention} to close the {selectedRecommendation.gap.toLowerCase()} gap efficiently.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status={selectedRecommendation.confidence} label={`${selectedRecommendation.confidence} confidence`} />
                      <StatusBadge status={selectedRecommendation.status} />
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-3 xl:grid-cols-6">
                    <SummaryCell label="Primary" value={selectedPrimaryIntervention} />
                    <SummaryCell label="Support" value={selectedSupportInterventions[0] ?? 'None required'} />
                    <SummaryCell label="Delivery" value={selectedRecommendation.deliveryMethod} />
                    <SummaryCell label="Resources" value={selectedRecommendation.resourceRequirement} />
                    <SummaryCell label="Score" value={selectedRecommendation.score.toFixed(1)} />
                    <SummaryCell label="Target Cohort" value={getTargetCohort(selectedRecommendation.gap)} />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleApprove}
                      className="inline-flex items-center gap-1.5 rounded-md bg-[#2E6DA4] px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-[#1B3A5C]"
                      style={{ fontFamily: 'Arial, sans-serif' }}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Approve
                    </button>
                    <button
                      onClick={handleDefer}
                      className="rounded-md border border-[#2E6DA4] bg-white px-3 py-2 text-xs font-bold transition-colors hover:bg-[#EBF4FB]"
                      style={{ fontFamily: 'Arial, sans-serif', color: '#2E6DA4' }}
                    >
                      Defer
                    </button>
                    <button
                      onClick={handleEscalate}
                      className="rounded-md bg-[#F5DFA0] px-3 py-2 text-xs font-bold transition-colors hover:bg-[#E8C94F]"
                      style={{ fontFamily: 'Arial, sans-serif', color: '#1A1A1A' }}
                    >
                      Escalate
                    </button>
                  </div>
                </div>

                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as WorkspaceTab)} className="flex-1 overflow-hidden">
                  <div className="border-b border-[#D8D8D8] px-4 pt-3 sm:px-5">
                    <TabsList className="h-9 w-full justify-start bg-[#EBF4FB] p-1 sm:w-auto">
                      <TabsTrigger value="action-plan" className="text-xs" style={{ fontFamily: 'Arial, sans-serif' }}>
                        Action Plan
                      </TabsTrigger>
                      <TabsTrigger value="delivery-notes" className="text-xs" style={{ fontFamily: 'Arial, sans-serif' }}>
                        Delivery Notes
                      </TabsTrigger>
                      <TabsTrigger value="simulation" className="text-xs" style={{ fontFamily: 'Arial, sans-serif' }}>
                        Simulation
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="action-plan" className="h-full overflow-y-auto p-4 sm:p-5">
                    <div className="grid gap-4 lg:grid-cols-2">
                      <InfoBlock label="Primary intervention" value={selectedPrimaryIntervention} />
                      <InfoBlock label="Support intervention(s)" value={selectedSupportInterventions.join(' | ') || 'None at this stage'} />
                      <InfoBlock label="Target cohort" value={getTargetCohort(selectedRecommendation.gap)} />
                      <InfoBlock label="Suggested modality" value={selectedRecommendation.deliveryMethod} />
                      <InfoBlock label="Suggested timeline" value={getTimeline(selectedRecommendation.resourceRequirement)} />
                      <InfoBlock label="Resource needs" value={selectedRecommendation.resourceRequirement} />
                    </div>

                    <div className="mt-4 rounded-lg border border-[#D8D8D8] bg-[#EBF4FB] p-3">
                      <h3 className="mb-2 text-xs font-bold" style={{ fontFamily: 'Arial, sans-serif', color: '#1B3A5C' }}>
                        Why this recommendation
                      </h3>
                      <ul className="space-y-1.5">
                        {buildWhyBullets(selectedRecommendation).map((bullet) => (
                          <li key={bullet} className="flex items-start gap-2 text-xs" style={{ fontFamily: 'Arial, sans-serif', color: '#1A1A1A' }}>
                            <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: '#2E6DA4' }} />
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Link
                          to="/diagnose"
                          className="inline-flex items-center gap-1 text-xs font-bold underline"
                          style={{ fontFamily: 'Arial, sans-serif', color: '#2E6DA4' }}
                        >
                          Open full diagnosis
                        </Link>
                        <button
                          onClick={() => setIsEvidenceSheetOpen(true)}
                          className="rounded-md border border-[#D8D8D8] bg-white px-2.5 py-1.5 text-xs font-bold transition-colors hover:bg-[#D5E8F7]"
                          style={{ fontFamily: 'Arial, sans-serif', color: '#1A1A1A' }}
                        >
                          Compare interventions
                        </button>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="delivery-notes" className="h-full overflow-y-auto p-4 sm:p-5">
                    <div className="space-y-4">
                      <div>
                        <label className="mb-2 block text-xs font-bold" style={{ fontFamily: 'Arial, sans-serif', color: '#1B3A5C' }}>
                          Planner notes
                        </label>
                        <textarea
                          value={selectedPlannerNotes}
                          onChange={(event) => {
                            if (!selectedRecommendation) {
                              return;
                            }

                            setPlannerNotesById((previousNotes) => ({
                              ...previousNotes,
                              [selectedRecommendation.id]: event.target.value,
                            }));
                          }}
                          placeholder="Capture decisions, dependencies, and deployment comments."
                          className="min-h-28 w-full rounded-md border border-[#D8D8D8] px-3 py-2 text-xs outline-none transition-colors focus:border-[#2E6DA4]"
                          style={{ fontFamily: 'Arial, sans-serif', color: '#1A1A1A' }}
                        />
                      </div>

                      <div className="grid gap-4 lg:grid-cols-2">
                        <SimpleList
                          title="Implementation considerations"
                          items={[
                            `Sequence rollout by urgency tier, starting with score ${selectedRecommendation.score.toFixed(1)} schools.`,
                            `Align schedule windows with ${selectedRecommendation.deliveryMethod.toLowerCase()} delivery constraints.`,
                          ]}
                        />
                        <SimpleList
                          title="Trainer and partner requirements"
                          items={[
                            'Assign a lead trainer per rollout wave and designate division-level focal points.',
                            'Confirm LGU or partner venue and transport support before final approval.',
                          ]}
                        />
                        <SimpleList
                          title="Risks and blockers"
                          items={[
                            `Coverage delay risk increases when confidence is ${selectedRecommendation.confidence}.`,
                            'Trainer bandwidth can become a bottleneck if approval windows overlap.',
                          ]}
                        />
                        <div className="rounded-lg border border-[#D8D8D8] p-3">
                          <h3 className="mb-2 text-xs font-bold" style={{ fontFamily: 'Arial, sans-serif', color: '#1B3A5C' }}>
                            Planning brief
                          </h3>
                          <p className="text-xs" style={{ fontFamily: 'Arial, sans-serif', color: '#555555' }}>
                            Add this recommendation context and notes to your export-ready planning brief.
                          </p>
                          <button
                            onClick={handleAddToPlanningBrief}
                            className="mt-3 rounded-md bg-[#1B3A5C] px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-[#2E6DA4]"
                            style={{ fontFamily: 'Arial, sans-serif' }}
                          >
                            Add to planning brief
                          </button>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="simulation" className="h-full overflow-y-auto p-4 sm:p-5">
                    <div className="space-y-4">
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <NumberInput
                          label="Budget (PHP)"
                          value={simulationInputs.budget}
                          onChange={(value) => setSimulationInputs((previous) => ({ ...previous, budget: value }))}
                        />
                        <NumberInput
                          label="Trainers"
                          value={simulationInputs.trainers}
                          onChange={(value) => setSimulationInputs((previous) => ({ ...previous, trainers: value }))}
                        />
                        <NumberInput
                          label="Training slots"
                          value={simulationInputs.slots}
                          onChange={(value) => setSimulationInputs((previous) => ({ ...previous, slots: value }))}
                        />
                        <NumberInput
                          label="Timeline (months)"
                          value={simulationInputs.timeline}
                          onChange={(value) => setSimulationInputs((previous) => ({ ...previous, timeline: value }))}
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={runSimulation}
                          className="rounded-md bg-[#E8C94F] px-3 py-2 text-xs font-bold transition-colors hover:bg-[#B8860B] hover:text-white"
                          style={{ fontFamily: 'Arial, sans-serif', color: '#1A1A1A' }}
                        >
                          Run Simulation
                        </button>
                        <button
                          onClick={() => setIsSimulationDialogOpen(true)}
                          disabled={!simulationResult}
                          className="rounded-md border border-[#D8D8D8] bg-white px-3 py-2 text-xs font-bold transition-colors hover:bg-[#EBF4FB] disabled:cursor-not-allowed disabled:opacity-50"
                          style={{ fontFamily: 'Arial, sans-serif', color: '#1A1A1A' }}
                        >
                          View detailed simulation
                        </button>
                      </div>

                      {simulationResult ? (
                        <div className="rounded-lg border border-[#D8D8D8] bg-[#EBF4FB] p-4">
                          <h3 className="text-sm font-bold" style={{ fontFamily: 'Arial, sans-serif', color: '#1B3A5C' }}>
                            Scenario outcome
                          </h3>
                          <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                            <ResultCell label="Prioritized" value={String(simulationResult.prioritizedRecommendations.length)} />
                            <ResultCell label="Deferred" value={String(simulationResult.deferredRecommendations.length)} />
                            <ResultCell label="Budget used" value={`PHP ${simulationResult.budgetUsed.toLocaleString()}`} />
                            <ResultCell label="Trainers used" value={String(simulationResult.trainersUsed)} />
                            <ResultCell label="Slots used" value={String(simulationResult.slotsUsed)} />
                            <ResultCell label="Risk" value={simulationResult.risk} />
                          </div>

                          <div className="mt-3 grid gap-3 lg:grid-cols-2">
                            <SimpleList
                              title="Selected / prioritized recommendations"
                              items={
                                simulationResult.prioritizedRecommendations.length > 0
                                  ? simulationResult.prioritizedRecommendations
                                  : ['No recommendations selected under current constraints.']
                              }
                            />
                            <SimpleList
                              title="Deferred recommendations"
                              items={
                                simulationResult.deferredRecommendations.length > 0
                                  ? simulationResult.deferredRecommendations
                                  : ['No deferrals in this simulation run.']
                              }
                            />
                          </div>

                          <div className="mt-3 rounded-md border border-[#D8D8D8] bg-white p-3 text-xs" style={{ fontFamily: 'Arial, sans-serif', color: '#1A1A1A' }}>
                            <strong>Tradeoff summary:</strong> {simulationResult.tradeoffSummary}
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-lg border border-dashed border-[#D8D8D8] p-4 text-xs" style={{ fontFamily: 'Arial, sans-serif', color: '#555555' }}>
                          Run a scenario to see impact estimates before approving this recommendation.
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </section>
        </main>
      </div>

      <Sheet open={isEvidenceSheetOpen} onOpenChange={setIsEvidenceSheetOpen}>
        <SheetContent side="right" className="w-full border-l border-[#D8D8D8] p-0 sm:max-w-xl">
          <SheetHeader className="border-b border-[#D8D8D8]">
            <SheetTitle style={{ fontFamily: 'Arial, sans-serif', color: '#1B3A5C' }}>Evidence Log and Secondary Details</SheetTitle>
            <SheetDescription style={{ fontFamily: 'Arial, sans-serif' }}>
              Expanded evidence, intervention portfolio, and comparison details are kept off the main page to preserve focus.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-5 overflow-y-auto p-4">
            <section className="rounded-lg border border-[#D8D8D8] p-3">
              <h3 className="text-xs font-bold" style={{ fontFamily: 'Arial, sans-serif', color: '#1B3A5C' }}>
                Evidence log
              </h3>
              <div className="mt-2 space-y-2">
                {selectedRecommendation ? (
                  <>
                    <EvidenceRow
                      title="Gap signal"
                      value={`${selectedRecommendation.gap} is currently the dominant barrier in this scope.`}
                    />
                    <EvidenceRow
                      title="Urgency signal"
                      value={`Score ${selectedRecommendation.score.toFixed(1)} places ${selectedRecommendation.region} in immediate review range.`}
                    />
                    <EvidenceRow
                      title="Delivery fit"
                      value={`${selectedRecommendation.deliveryMethod} delivery can launch with ${selectedRecommendation.resourceRequirement.toLowerCase()} resource demand.`}
                    />
                  </>
                ) : (
                  <p className="text-xs" style={{ fontFamily: 'Arial, sans-serif', color: '#555555' }}>
                    Select a recommendation to populate evidence items.
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-lg border border-[#D8D8D8] p-3">
              <h3 className="text-xs font-bold" style={{ fontFamily: 'Arial, sans-serif', color: '#1B3A5C' }}>
                Full intervention portfolio
              </h3>
              <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                {interventionPortfolio.map((intervention) => (
                  <li
                    key={intervention}
                    className="rounded-md border border-[#D8D8D8] bg-white px-2 py-1.5 text-xs"
                    style={{ fontFamily: 'Arial, sans-serif', color: '#1A1A1A' }}
                  >
                    {intervention}
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-lg border border-[#D8D8D8] p-3">
              <h3 className="text-xs font-bold" style={{ fontFamily: 'Arial, sans-serif', color: '#1B3A5C' }}>
                Compare interventions
              </h3>

              {selectedRecommendation ? (
                <div className="mt-2 space-y-2 text-xs" style={{ fontFamily: 'Arial, sans-serif', color: '#1A1A1A' }}>
                  <CompareRow label="Primary" value={selectedPrimaryIntervention} />
                  <CompareRow label="Support" value={selectedSupportInterventions.join(' | ') || 'No support intervention selected'} />
                  <CompareRow label="Delivery mode" value={selectedRecommendation.deliveryMethod} />
                  <CompareRow label="Resource intensity" value={selectedRecommendation.resourceRequirement} />
                </div>
              ) : (
                <p className="mt-2 text-xs" style={{ fontFamily: 'Arial, sans-serif', color: '#555555' }}>
                  Select a recommendation to compare options.
                </p>
              )}
            </section>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={isSimulationDialogOpen} onOpenChange={setIsSimulationDialogOpen}>
        <DialogContent className="border-[#D8D8D8] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Arial, sans-serif', color: '#1B3A5C' }}>Detailed Simulation Results</DialogTitle>
            <DialogDescription style={{ fontFamily: 'Arial, sans-serif' }}>
              Expanded result details are shown in a modal to keep the main workspace concise.
            </DialogDescription>
          </DialogHeader>

          {simulationResult && selectedRecommendation ? (
            <div className="space-y-3 text-xs" style={{ fontFamily: 'Arial, sans-serif', color: '#1A1A1A' }}>
              <div className="rounded-md border border-[#D8D8D8] bg-[#EBF4FB] p-3">
                <p>
                  <strong>Region:</strong> {selectedRecommendation.region}
                </p>
                <p className="mt-1">
                  <strong>Projected coverage lift:</strong> {simulationResult.expectedCoverageLift}% in the next cycle.
                </p>
                <p className="mt-1">
                  <strong>Teachers reached:</strong> {simulationResult.teachersReached.toLocaleString()} estimated.
                </p>
                <p className="mt-1">
                  <strong>Total budget used:</strong> PHP {simulationResult.budgetUsed.toLocaleString()}
                </p>
                <p className="mt-1">
                  <strong>Trainers used:</strong> {simulationResult.trainersUsed} | <strong>Slots used:</strong> {simulationResult.slotsUsed}
                </p>
              </div>

              <div className="rounded-md border border-[#D8D8D8] p-3">
                <p>
                  <strong>Delivery confidence:</strong> {simulationResult.deliveryConfidence}
                </p>
                <p className="mt-1">
                  <strong>Implementation risk:</strong> {simulationResult.risk}
                </p>
                <p className="mt-1">
                  <strong>Recommendation:</strong>{' '}
                  {simulationResult.risk === 'high'
                    ? 'Consider deferring or adding support resources before approval.'
                    : 'Scenario remains viable for approval with current assumptions.'}
                </p>
                <p className="mt-1">
                  <strong>Tradeoff summary:</strong> {simulationResult.tradeoffSummary}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <SimpleList
                  title="Prioritized recommendations"
                  items={
                    simulationResult.prioritizedRecommendations.length > 0
                      ? simulationResult.prioritizedRecommendations
                      : ['No recommendations prioritized in this run.']
                  }
                />
                <SimpleList
                  title="Deferred recommendations"
                  items={
                    simulationResult.deferredRecommendations.length > 0
                      ? simulationResult.deferredRecommendations
                      : ['No recommendations deferred in this run.']
                  }
                />
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-[#D8D8D8] p-3 text-xs" style={{ fontFamily: 'Arial, sans-serif', color: '#555555' }}>
              Run a simulation first to populate this detail view.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#D8D8D8] bg-[#F7FAFD] p-2">
      <p className="text-[10px]" style={{ fontFamily: 'Arial, sans-serif', color: '#888888' }}>
        {label}
      </p>
      <p className="mt-0.5 line-clamp-2 text-[11px] font-bold" style={{ fontFamily: 'Arial, sans-serif', color: '#1A1A1A' }}>
        {value}
      </p>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#D8D8D8] p-3">
      <p className="text-[10px]" style={{ fontFamily: 'Arial, sans-serif', color: '#888888' }}>
        {label}
      </p>
      <p className="mt-1 text-xs font-bold" style={{ fontFamily: 'Arial, sans-serif', color: '#1A1A1A' }}>
        {value}
      </p>
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="mb-1 block text-[10px]" style={{ fontFamily: 'Arial, sans-serif', color: '#888888' }}>
        {label}
      </span>
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-[#D8D8D8] px-3 py-2 text-xs outline-none transition-colors focus:border-[#2E6DA4]"
        style={{ fontFamily: 'Arial, sans-serif', color: '#1A1A1A' }}
      />
    </label>
  );
}

function ResultCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#D8D8D8] bg-white p-2">
      <p className="text-[10px]" style={{ fontFamily: 'Arial, sans-serif', color: '#888888' }}>
        {label}
      </p>
      <p className="mt-1 text-xs font-bold" style={{ fontFamily: 'Arial, sans-serif', color: '#1A1A1A' }}>
        {value}
      </p>
    </div>
  );
}

function SimpleList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-[#D8D8D8] p-3">
      <h3 className="mb-2 text-xs font-bold" style={{ fontFamily: 'Arial, sans-serif', color: '#1B3A5C' }}>
        {title}
      </h3>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-xs" style={{ fontFamily: 'Arial, sans-serif', color: '#1A1A1A' }}>
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: '#2E6DA4' }} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EvidenceRow({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-md border border-[#D8D8D8] bg-white p-2">
      <p className="text-[10px] font-bold" style={{ fontFamily: 'Arial, sans-serif', color: '#1B3A5C' }}>
        {title}
      </p>
      <p className="mt-1 text-xs" style={{ fontFamily: 'Arial, sans-serif', color: '#1A1A1A' }}>
        {value}
      </p>
    </div>
  );
}

function CompareRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-2 rounded-md border border-[#D8D8D8] p-2">
      <p className="font-bold" style={{ color: '#1B3A5C' }}>
        {label}
      </p>
      <p>{value}</p>
    </div>
  );
}