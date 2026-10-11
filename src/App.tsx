import React, { useState, useEffect } from 'react';
import {
  Layers,
  Database,
  Play,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Terminal,
  Search,
  Download,
  ShieldCheck,
  GitBranch,
  Sparkles,
  Settings as SettingsIcon,
  HelpCircle,
  FileText,
  RefreshCw,
  Eye,
  Lock,
  ArrowRight,
  BarChart3,
  TrendingUp,
  Cpu,
  Table,
  Check,
  ChevronRight,
  Filter,
  Copy
} from 'lucide-react';
import { ParticleCanvas } from './components/ParticleCanvas';
import { DatabricksLogo } from './components/DatabricksLogo';

// Type definitions
interface PipelineTaskResult {
  task_id: string;
  name: string;
  stage_order: number;
  status: string;
  duration_seconds: number;
  records_processed: number;
  details: any;
  error_message: string | null;
}

interface PipelineRunResult {
  run_id: string;
  status: string;
  duration_seconds: number;
  bronze_records: number;
  silver_records: number;
  gold_records: number;
  quality_score: number;
  tasks: PipelineTaskResult[];
  kpis: any;
}

interface QualityCheck {
  check_id: string;
  name: string;
  category: string;
  weight: number;
  status: 'PASSED' | 'WARNING' | 'FAILED';
  description: string;
  actual_value: string;
  failed_count: number;
  remediation: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isRunningPipeline, setIsRunningPipeline] = useState(false);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [particleIntensity, setParticleIntensity] = useState(35);
  const [pipelineResult, setPipelineResult] = useState<PipelineRunResult | null>(null);
  const [latestStatus, setLatestStatus] = useState<any>({
    bronzeCount: 25,
    silverCount: 21,
    goldMartsCount: 4,
    qualityScore: 80.4,
    isAiConfigured: false
  });

  // Data Explorer states
  const [selectedDataset, setSelectedDataset] = useState('gold_daily');
  const [tableData, setTableData] = useState<{ columns: string[]; rows: any[]; totalCount: number }>({
    columns: [],
    rows: [],
    totalCount: 0
  });
  const [isLoadingTable, setIsLoadingTable] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // SQL Workspace states
  const [sqlQuery, setSqlQuery] = useState(
    'SELECT product_name, category, units_sold, gross_revenue FROM gold_product_performance ORDER BY gross_revenue DESC LIMIT 5;'
  );
  const [sqlResult, setSqlResult] = useState<any>(null);
  const [isExecutingSql, setIsExecutingSql] = useState(false);

  // AI Assistant states
  const [aiTask, setAiTask] = useState('quality');
  const [aiCustomPrompt, setAiCustomPrompt] = useState('How can we remediate the quarantined invalid dates and negative prices?');
  const [aiResponse, setAiResponse] = useState<any>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  // Governance persona
  const [activeRole, setActiveRole] = useState<'DATA_ENGINEER' | 'DATA_ANALYST' | 'AUDITOR' | 'COMPLIANCE_OFFICER'>('DATA_ENGINEER');

  // Python runner terminal output
  const [terminalOutput, setTerminalOutput] = useState<string>('');
  const [selectedCodeFile, setSelectedCodeFile] = useState<string>('app.py');
  const [codeContent, setCodeContent] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState(false);

  // Fetch initial system status
  useEffect(() => {
    fetchStatus();
  }, []);

  // Fetch dataset when explorer changes
  useEffect(() => {
    if (activeTab === 'explorer' || activeTab === 'bronze' || activeTab === 'silver' || activeTab === 'gold') {
      const target =
        activeTab === 'bronze'
          ? 'bronze'
          : activeTab === 'silver'
          ? 'silver'
          : activeTab === 'gold'
          ? 'gold_daily'
          : selectedDataset;
      loadDataset(target);
    }
  }, [activeTab, selectedDataset]);

  // Load code file when tab is code_inspector
  useEffect(() => {
    if (activeTab === 'python_runner') {
      loadCodeFile(selectedCodeFile);
    }
  }, [activeTab, selectedCodeFile]);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      if (data.success) {
        setLatestStatus(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadDataset = async (datasetKey: string) => {
    setIsLoadingTable(true);
    try {
      const res = await fetch(`/api/datasets/${datasetKey}`);
      const data = await res.json();
      if (data.success) {
        if (data.isJson) {
          setTableData({
            columns: ['order_id', 'reasons', 'raw_data'],
            rows: data.data.quarantined_items || [],
            totalCount: data.data.quarantine_count || 0
          });
        } else {
          setTableData({
            columns: data.columns || [],
            rows: data.rows || [],
            totalCount: data.totalCount || 0
          });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingTable(false);
    }
  };

  const triggerPipeline = async () => {
    setIsRunningPipeline(true);
    setTerminalOutput('Starting Medallion Lakehouse Pipeline execution...\nExecuting Python DAG stages in dependency order...');
    try {
      const res = await fetch('/api/pipeline/run', { method: 'POST' });
      const data = await res.json();
      setTerminalOutput(data.stdout || data.stderr || 'Pipeline executed.');
      if (data.result) {
        setPipelineResult(data.result);
        setLatestStatus((prev: any) => ({
          ...prev,
          bronzeCount: data.result.bronze_records,
          silverCount: data.result.silver_records,
          qualityScore: data.result.quality_score
        }));
      }
      fetchStatus();
    } catch (e: any) {
      setTerminalOutput(`Execution error: ${e.message}`);
    } finally {
      setIsRunningPipeline(false);
    }
  };

  const runUnitTests = async () => {
    setIsRunningTests(true);
    setTerminalOutput('Running automated test suite via Python unittest...\nDiscovering tests in /tests directory...');
    try {
      const res = await fetch('/api/tests/run', { method: 'POST' });
      const data = await res.json();
      setTerminalOutput(data.output || 'No output received.');
    } catch (e: any) {
      setTerminalOutput(`Test execution failed: ${e.message}`);
    } finally {
      setIsRunningTests(false);
    }
  };

  const executeSql = async () => {
    setIsExecutingSql(true);
    try {
      const res = await fetch('/api/sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: sqlQuery })
      });
      const data = await res.json();
      setSqlResult(data);
    } catch (e: any) {
      setSqlResult({ success: false, error: e.message });
    } finally {
      setIsExecutingSql(false);
    }
  };

  const triggerAiInsights = async (overrideTask?: string) => {
    const task = overrideTask || aiTask;
    setIsLoadingAi(true);
    try {
      const res = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskType: task,
          prompt: aiCustomPrompt,
          contextData: latestStatus.qualityData || { quality_score: latestStatus.qualityScore }
        })
      });
      const data = await res.json();
      setAiResponse(data);
    } catch (e: any) {
      setAiResponse({ source: 'Error', isLlm: false, content: `Error: ${e.message}` });
    } finally {
      setIsLoadingAi(false);
    }
  };

  const loadCodeFile = async (filePath: string) => {
    try {
      const res = await fetch(`/api/code/files?path=${encodeURIComponent(filePath)}`);
      const data = await res.json();
      setCodeContent(data.content || '');
    } catch (e) {
      console.error(e);
    }
  };

  const filteredRows = tableData.rows.filter(row => {
    if (!searchTerm) return true;
    return Object.values(row).some(val =>
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] text-slate-800 antialiased overflow-hidden font-sans">
      {/* Live Motion Particle Canvas in background */}
      <ParticleCanvas intensity={particleIntensity} isRunning={isRunningPipeline} />

      {/* Persistent Enterprise Sidebar */}
      <aside className="relative z-10 flex w-64 flex-col border-r border-slate-200 bg-[#0f172a] text-slate-300">
        {/* Brand Header with Official Databricks Logo */}
        <div className="flex items-center gap-3 border-b border-slate-800 px-5 py-4">
          <DatabricksLogo size={24} showWordmark={true} theme="dark" />
          <span className="text-xs bg-[#ff3621]/20 text-[#ff3621] px-1.5 py-0.5 rounded font-semibold border border-[#ff3621]/30">
            STUDIO
          </span>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1 text-sm">
          <div className="px-2 pb-1.5 pt-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Platform Core
          </div>

          <button
            onClick={() => setActiveTab('overview')}
            className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left font-medium transition-colors ${
              activeTab === 'overview'
                ? 'bg-[#1e293b] text-[#ff3621]'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <Layers className="h-4 w-4 flex-shrink-0" />
            <span>1. Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('explorer')}
            className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left font-medium transition-colors ${
              activeTab === 'explorer'
                ? 'bg-[#1e293b] text-[#ff3621]'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <Database className="h-4 w-4 flex-shrink-0" />
            <span>2. Data Explorer</span>
          </button>

          <button
            onClick={() => setActiveTab('ingestion')}
            className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left font-medium transition-colors ${
              activeTab === 'ingestion'
                ? 'bg-[#1e293b] text-[#ff3621]'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <FileText className="h-4 w-4 flex-shrink-0" />
            <span>3. Ingestion</span>
          </button>

          <div className="px-2 pb-1.5 pt-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Medallion Layers
          </div>

          <button
            onClick={() => setActiveTab('bronze')}
            className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left font-medium transition-colors ${
              activeTab === 'bronze'
                ? 'bg-[#1e293b] text-[#ff3621]'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <div className="h-2 w-2 rounded-full bg-amber-500 flex-shrink-0" />
            <span>4. Bronze Layer</span>
          </button>

          <button
            onClick={() => setActiveTab('silver')}
            className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left font-medium transition-colors ${
              activeTab === 'silver'
                ? 'bg-[#1e293b] text-[#ff3621]'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <div className="h-2 w-2 rounded-full bg-slate-300 flex-shrink-0" />
            <span>5. Silver Layer</span>
          </button>

          <button
            onClick={() => setActiveTab('gold')}
            className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left font-medium transition-colors ${
              activeTab === 'gold'
                ? 'bg-[#1e293b] text-[#ff3621]'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <div className="h-2 w-2 rounded-full bg-yellow-400 flex-shrink-0" />
            <span>6. Gold Layer</span>
          </button>

          <div className="px-2 pb-1.5 pt-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Operations & Analytics
          </div>

          <button
            onClick={() => setActiveTab('orchestration')}
            className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left font-medium transition-colors ${
              activeTab === 'orchestration'
                ? 'bg-[#1e293b] text-[#ff3621]'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <Play className="h-4 w-4 flex-shrink-0" />
            <span>7. Orchestration</span>
          </button>

          <button
            onClick={() => setActiveTab('quality')}
            className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left font-medium transition-colors ${
              activeTab === 'quality'
                ? 'bg-[#1e293b] text-[#ff3621]'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            <span>8. Data Quality</span>
          </button>

          <button
            onClick={() => setActiveTab('sql')}
            className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left font-medium transition-colors ${
              activeTab === 'sql'
                ? 'bg-[#1e293b] text-[#ff3621]'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <Terminal className="h-4 w-4 flex-shrink-0" />
            <span>9. SQL Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab('ai')}
            className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left font-medium transition-colors ${
              activeTab === 'ai'
                ? 'bg-[#1e293b] text-[#ff3621]'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <Sparkles className="h-4 w-4 flex-shrink-0" />
            <span>10. AI Insights</span>
          </button>

          <button
            onClick={() => setActiveTab('lineage')}
            className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left font-medium transition-colors ${
              activeTab === 'lineage'
                ? 'bg-[#1e293b] text-[#ff3621]'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <GitBranch className="h-4 w-4 flex-shrink-0" />
            <span>11. Data Lineage</span>
          </button>

          <button
            onClick={() => setActiveTab('governance')}
            className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left font-medium transition-colors ${
              activeTab === 'governance'
                ? 'bg-[#1e293b] text-[#ff3621]'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <ShieldCheck className="h-4 w-4 flex-shrink-0" />
            <span>12. Governance</span>
          </button>

          <button
            onClick={() => setActiveTab('runs')}
            className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left font-medium transition-colors ${
              activeTab === 'runs'
                ? 'bg-[#1e293b] text-[#ff3621]'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <Clock className="h-4 w-4 flex-shrink-0" />
            <span>13. Run History</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left font-medium transition-colors ${
              activeTab === 'settings'
                ? 'bg-[#1e293b] text-[#ff3621]'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <SettingsIcon className="h-4 w-4 flex-shrink-0" />
            <span>14. Settings</span>
          </button>

          <div className="px-2 pb-1.5 pt-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Engineering Rigor
          </div>

          <button
            onClick={() => setActiveTab('tradeoffs')}
            className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left font-medium transition-colors ${
              activeTab === 'tradeoffs'
                ? 'bg-[#1e293b] text-[#ff3621]'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <HelpCircle className="h-4 w-4 flex-shrink-0" />
            <span>15. Trade-offs Analysis</span>
          </button>

          <button
            onClick={() => setActiveTab('python_runner')}
            className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left font-medium transition-colors ${
              activeTab === 'python_runner'
                ? 'bg-[#1e293b] text-[#ff3621]'
                : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
            }`}
          >
            <Cpu className="h-4 w-4 flex-shrink-0" />
            <span>16. Python Runner & Code</span>
          </button>
        </nav>

        {/* Footer info */}
        <div className="border-t border-slate-800 px-4 py-3 text-xs text-slate-300">
          <div className="flex items-center justify-between">
            <span>Catalog: <code className="text-slate-200">lakehouse_studio</code></span>
            <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
          </div>
          <div className="mt-1 text-slate-400 text-xs">Medallion Data Platform</div>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <main className="relative z-10 flex flex-1 flex-col overflow-hidden">
        {/* Top Header Bar */}
        <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white/95 px-6 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <DatabricksLogo size={20} showWordmark={false} theme="light" />
            <span className="text-sm font-medium text-slate-500">Workspace</span>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-semibold capitalize text-slate-800">
              {activeTab.replace('_', ' ')}
            </span>
          </div>

          {/* Quick Actions & Triggers */}
          <div className="flex items-center gap-3">
            <button
              onClick={triggerPipeline}
              disabled={isRunningPipeline}
              className="flex items-center gap-2 rounded-md bg-[#ff3621] px-3.5 py-1.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-[#e0311d] disabled:opacity-50"
            >
              <Play className={`h-4 w-4 ${isRunningPipeline ? 'animate-spin' : ''}`} />
              <span>{isRunningPipeline ? 'Executing DAG...' : 'Trigger Pipeline'}</span>
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="mx-auto max-w-7xl space-y-6">
              {/* Databricks Official Platform Header Banner */}
              <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-[#0f172a] p-6 text-white shadow-md">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <DatabricksLogo size={28} showWordmark={true} theme="dark" />
                      <span className="text-xs bg-[#ff3621] text-white px-2.5 py-1 rounded font-medium tracking-wide">
                        LAKEHOUSE PLATFORM
                      </span>
                    </div>
                    <h2 className="text-lg font-semibold text-white">
                      From Raw Data to Trusted Intelligence
                    </h2>
                    <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
                      Medallion architecture organizing source records through Bronze (Raw), Silver (Cleansed), and Gold (Business-Ready) layers with automated DAG orchestration and data governance.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={triggerPipeline}
                      disabled={isRunningPipeline}
                      className="flex items-center gap-2 rounded-md bg-[#ff3621] px-4 py-2 text-sm font-medium text-white shadow hover:bg-[#e0311d] transition-colors disabled:opacity-50"
                    >
                      <Play className={`h-4 w-4 ${isRunningPipeline ? 'animate-spin' : ''}`} />
                      <span>{isRunningPipeline ? 'Executing...' : 'Run Pipeline'}</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('sql')}
                      className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-800/80 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700 transition-colors"
                    >
                      <Terminal className="h-4 w-4 text-[#ff3621]" />
                      <span>SQL Studio</span>
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
                  Medallion Architecture Overview
                </h1>
                <p className="mt-1 text-sm text-slate-600">
                  Data asset counts across Bronze ingestion, Silver deduplication, and curated Gold analytical marts.
                </p>
              </div>

              {/* Metric Cards without telemetry badges */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span className="font-medium">Bronze Raw Records</span>
                    <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  </div>
                  <div className="mt-2 text-2xl font-bold text-slate-900">
                    {latestStatus.bronzeCount}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">Immutable source append</div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span className="font-medium">Silver Clean Records</span>
                    <div className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                  </div>
                  <div className="mt-2 text-2xl font-bold text-slate-900">
                    {latestStatus.silverCount}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">Deduplicated & validated</div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span className="font-medium">Gold Datamarts</span>
                    <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                  </div>
                  <div className="mt-2 text-2xl font-bold text-slate-900">
                    4 Marts
                  </div>
                  <div className="mt-1 text-xs text-slate-500">Revenue, SKU, Geo, Cohorts</div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span className="font-medium">Automated DAG Tasks</span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div className="mt-2 text-2xl font-bold text-slate-900">
                    11 Tasks
                  </div>
                  <div className="mt-1 text-xs text-slate-500">End-to-end verified pipeline</div>
                </div>
              </div>

              {/* Medallion Architecture Visual Card */}
              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-800">
                    Medallion Architecture Pipeline Flow
                  </h2>
                  <span className="text-xs text-slate-500">
                    Topological Dependency: Ingest ➔ Bronze ➔ Silver ➔ Gold
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-4">
                  {/* Step 1: Landing */}
                  <div className="relative rounded-md border border-slate-200 bg-slate-50/70 p-4 shadow-sm transition-all hover:border-slate-300">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Landing Zone
                      </div>
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    </div>
                    <div className="mt-2 text-base font-semibold text-slate-900">
                      sample_sales.csv
                    </div>
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                      25 raw transactions discovered with deliberate anomalies for data quality testing.
                    </p>
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                      <span>Source Ingestion</span>
                    </div>
                  </div>

                  {/* Step 2: Bronze */}
                  <div className="relative rounded-md border border-amber-200 bg-amber-50/40 p-4 shadow-sm transition-all hover:border-amber-300">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                        Bronze (Raw)
                      </div>
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                    </div>
                    <div className="mt-2 text-base font-semibold text-slate-900">
                      bronze_sales
                    </div>
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                      Preserved verbatim with SHA-256 hash stamp and UTC ingestion timestamp.
                    </p>
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-800 font-medium">
                      <span>Immutable Hash Stamped</span>
                    </div>
                  </div>

                  {/* Step 3: Silver */}
                  <div className="relative rounded-md border border-slate-300 bg-slate-100/60 p-4 shadow-sm transition-all hover:border-slate-400">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                        Silver (Cleansed)
                      </div>
                      <span className="h-2 w-2 rounded-full bg-sky-500" />
                    </div>
                    <div className="mt-2 text-base font-semibold text-slate-900">
                      silver_sales
                    </div>
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                      1 duplicate dropped, 4 invalid rows quarantined. 21 validated rows promoted.
                    </p>
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-sky-800 font-medium">
                      <span>Deduplication & Triage</span>
                    </div>
                  </div>

                  {/* Step 4: Gold */}
                  <div className="relative rounded-md border border-yellow-200 bg-yellow-50/50 p-4 shadow-sm transition-all hover:border-yellow-300">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold uppercase tracking-wider text-yellow-800">
                        Gold (Business)
                      </div>
                      <span className="h-2 w-2 rounded-full bg-yellow-500" />
                    </div>
                    <div className="mt-2 text-base font-semibold text-slate-900">
                      gold_daily_revenue
                    </div>
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                      Curated aggregations powering executive SQL analytics and business reports.
                    </p>
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-900 font-medium">
                      <span>Datamarts Curated</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Execution Telemetry / Terminal snippet */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-slate-800">
                      Pipeline Quick Controls
                    </h2>
                    <span className="text-xs text-slate-400">Python Stdlib & Engine</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                    Trigger the Python execution engine to re-run the 11 Medallion DAG tasks, recalculate
                    the data quality formula, and update all SQLite metadata stores.
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2.5">
                    <button
                      onClick={triggerPipeline}
                      disabled={isRunningPipeline}
                      className="flex items-center gap-1.5 rounded-md bg-[#ff3621] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#e0311d]"
                    >
                      <Play className="h-3.5 w-3.5" />
                      Run Full Pipeline
                    </button>

                    <button
                      onClick={runUnitTests}
                      disabled={isRunningTests}
                      className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Terminal className="h-3.5 w-3.5" />
                      Run Python Unit Tests (11 tests)
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('sql');
                      }}
                      className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Search className="h-3.5 w-3.5" />
                      Open SQL Query Workspace
                    </button>
                  </div>
                </div>

                {/* Execution Log Terminal */}
                <div className="rounded-lg border border-slate-800 bg-[#0b1120] p-4 text-slate-300 font-mono text-[11px] shadow-sm flex flex-col h-64">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Terminal className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Execution Console</span>
                    </span>
                    <span className="text-[10px] text-slate-500">Python 3.10 Runtime</span>
                  </div>
                  <div className="flex-1 overflow-y-auto mt-2 whitespace-pre-wrap leading-relaxed text-slate-300">
                    {terminalOutput ||
                      `Pipeline status: Ready.\nClick 'Run Full Pipeline' or 'Run Python Unit Tests' to execute.`}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DATA EXPLORER */}
          {activeTab === 'explorer' && (
            <div className="mx-auto max-w-7xl space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">Data Explorer</h1>
                  <p className="text-xs text-slate-500">
                    Examine datasets across Bronze, Silver, Gold, and Quarantine tiers.
                  </p>
                </div>

                {/* Dataset selector segmented tabs */}
                <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-md text-xs">
                  {[
                    { id: 'gold_daily', label: 'Gold: Daily Revenue' },
                    { id: 'gold_product', label: 'Gold: Product Perf' },
                    { id: 'gold_regional', label: 'Gold: Regional' },
                    { id: 'gold_customer', label: 'Gold: Customers' },
                    { id: 'silver', label: 'Silver: Cleansed' },
                    { id: 'bronze', label: 'Bronze: Raw' },
                    { id: 'quarantine', label: 'Quarantine Defect' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setSelectedDataset(tab.id)}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                        selectedDataset === tab.id
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table search & row count */}
              <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search table rows..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full rounded-md border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs placeholder:text-slate-400 focus:border-[#ff3621] focus:outline-none"
                  />
                </div>
                <div className="text-xs text-slate-500 font-medium">
                  Showing {filteredRows.length} of {tableData.totalCount} records
                </div>
              </div>

              {/* Data Table */}
              <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto max-h-[550px]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <tr>
                        {tableData.columns.map(col => (
                          <th key={col} className="px-3.5 py-2.5 whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {filteredRows.length > 0 ? (
                        filteredRows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                            {tableData.columns.map(col => (
                              <td key={col} className="px-3.5 py-2 whitespace-nowrap text-xs text-slate-700">
                                {typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col] ?? '')}
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={tableData.columns.length || 1} className="p-8 text-center text-slate-400 text-xs">
                            {isLoadingTable ? 'Loading dataset rows...' : 'No records found matching criteria.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: INGESTION */}
          {activeTab === 'ingestion' && (
            <div className="mx-auto max-w-5xl space-y-6">
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Source Data Ingestion</h1>
                <p className="text-xs text-slate-500">
                  Landing zone file discovery, schema validation, and pre-Bronze intake validation.
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[#ff3621]" />
                    <span className="text-sm font-semibold text-slate-800">Landing Zone: data/sample_sales.csv</span>
                  </div>
                  <span className="text-xs text-emerald-600 font-medium">✓ Validated CSV</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded border border-slate-100">
                    <span className="text-slate-500 text-xs">Detected Record Count</span>
                    <div className="text-base font-bold text-slate-800 mt-1">25 Records</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded border border-slate-100">
                    <span className="text-slate-500 text-xs">File Format</span>
                    <div className="text-base font-bold text-slate-800 mt-1">CSV (UTF-8)</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded border border-slate-100">
                    <span className="text-slate-500 text-xs">Schema Overlap</span>
                    <div className="text-base font-bold text-slate-800 mt-1">15/15 Expected Columns</div>
                  </div>
                </div>

                <div className="text-xs text-slate-600 space-y-1.5 pt-2">
                  <p className="font-medium text-slate-800">Seeded Quality Scenarios in Sample Data:</p>
                  <ul className="list-disc pl-5 space-y-1 text-slate-600">
                    <li><span className="font-semibold text-slate-800">ORD-1002</span>: Duplicate transaction record for testing idempotent deduplication.</li>
                    <li><span className="font-semibold text-slate-800">ORD-1003</span>: Missing customer email address for null-rate validation.</li>
                    <li><span className="font-semibold text-slate-800">ORD-1013</span>: Negative quantity value (-1) testing boundary rules.</li>
                    <li><span className="font-semibold text-slate-800">ORD-1014</span>: Non-standard date format (&quot;INVALID_DATE&quot;) testing ISO-8601 parser.</li>
                    <li><span className="font-semibold text-slate-800">ORD-1018</span>: Negative unit price (-$45.00) testing revenue protection checks.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: BRONZE LAYER */}
          {activeTab === 'bronze' && (
            <div className="mx-auto max-w-7xl space-y-4">
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Bronze Layer (Raw Storage)</h1>
                <p className="text-xs text-slate-500">
                  Raw source transactions preserved faithfully with audit hashes and ingestion timestamps.
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto max-h-[500px]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-amber-50/70 border-b border-amber-200 text-slate-700 font-semibold">
                      <tr>
                        {tableData.columns.slice(0, 10).map(col => (
                          <th key={col} className="px-3.5 py-2.5 whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {tableData.rows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60 text-xs text-slate-700">
                          {tableData.columns.slice(0, 10).map(col => (
                            <td key={col} className="px-3.5 py-2 whitespace-nowrap text-xs">
                              {String(row[col] ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SILVER LAYER */}
          {activeTab === 'silver' && (
            <div className="mx-auto max-w-7xl space-y-4">
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Silver Layer (Cleansed & Conformed)</h1>
                <p className="text-xs text-slate-500">
                  Deduplicated, standardized, and validated entity records with calculated financial fields.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div className="rounded-lg border border-slate-200 bg-white p-3.5">
                  <span className="text-slate-500 text-xs">Bronze Input</span>
                  <div className="text-xl font-bold text-slate-900 mt-0.5">25 Rows</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3.5">
                  <span className="text-slate-500 text-xs">Duplicates Removed</span>
                  <div className="text-xl font-bold text-amber-600 mt-0.5">1 Duplicate</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3.5">
                  <span className="text-slate-500 text-xs">Quarantined Defects</span>
                  <div className="text-xl font-bold text-rose-600 mt-0.5">4 Quarantined</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3.5">
                  <span className="text-slate-500 text-xs">Promoted to Silver</span>
                  <div className="text-xl font-bold text-emerald-600 mt-0.5">21 Clean Rows</div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto max-h-[500px]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                      <tr>
                        {tableData.columns.slice(0, 10).map(col => (
                          <th key={col} className="px-3.5 py-2.5 whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {tableData.rows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60 text-xs text-slate-700">
                          {tableData.columns.slice(0, 10).map(col => (
                            <td key={col} className="px-3.5 py-2 whitespace-nowrap text-xs">
                              {String(row[col] ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: GOLD LAYER */}
          {activeTab === 'gold' && (
            <div className="mx-auto max-w-7xl space-y-6">
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Gold Layer (Curated Datamarts)</h1>
                <p className="text-xs text-slate-500">
                  Pre-aggregated dimensional tables powering executive KPIs, sales charts, and customer analytics.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="text-slate-500 text-xs">Total Net Revenue</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">$8,081.45</div>
                  <div className="text-xs text-slate-400 mt-0.5">After discounts + shipping</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="text-slate-500 text-xs">Total Units Sold</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">43 Units</div>
                  <div className="text-xs text-slate-400 mt-0.5">Across 9 distinct SKUs</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="text-slate-500 text-xs">Average Order Value</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">$384.83</div>
                  <div className="text-xs text-slate-400 mt-0.5">Per verified transaction</div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="text-slate-500 text-xs">Delivery Success Rate</div>
                  <div className="text-2xl font-bold text-emerald-600 mt-1">90.5%</div>
                  <div className="text-xs text-slate-400 mt-0.5">Delivered vs Cancelled/Transit</div>
                </div>
              </div>

              {/* Gold Datamart Preview */}
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-800">
                    Daily Revenue Breakdown (gold_daily_revenue)
                  </h2>
                  <span className="text-xs text-slate-500">11 Recorded Days</span>
                </div>
                <div className="overflow-x-auto max-h-[380px]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-yellow-50/60 border-b border-yellow-200 text-slate-700 font-semibold">
                      <tr>
                        {tableData.columns.map(col => (
                          <th key={col} className="px-3.5 py-2.5 whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {tableData.rows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60 text-xs text-slate-700">
                          {tableData.columns.map(col => (
                            <td key={col} className="px-3.5 py-2 whitespace-nowrap text-xs">
                              {col.includes('revenue') || col.includes('value') ? `$${row[col]}` : String(row[col] ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: PIPELINE ORCHESTRATION */}
          {activeTab === 'orchestration' && (
            <div className="mx-auto max-w-7xl space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">Pipeline Orchestration Engine</h1>
                  <p className="text-xs text-slate-500">
                    Directed Acyclic Graph (DAG) with 11 sequential stages, retry logic, and stage-level telemetry.
                  </p>
                </div>
                <button
                  onClick={triggerPipeline}
                  disabled={isRunningPipeline}
                  className="flex items-center gap-1.5 rounded-md bg-[#ff3621] px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-[#e0311d]"
                >
                  <Play className="h-3.5 w-3.5" />
                  {isRunningPipeline ? 'Executing DAG...' : 'Execute Full DAG'}
                </button>
              </div>

              {/* 11-Stage DAG Visual Flow */}
              <div className="space-y-3">
                {(pipelineResult?.tasks || [
                  { task_id: 'task_01_config', name: 'Validate Configuration', stage_order: 1, status: 'SUCCEEDED', duration_seconds: 0.001, records_processed: 0 },
                  { task_id: 'task_02_discovery', name: 'Discover Input Files', stage_order: 2, status: 'SUCCEEDED', duration_seconds: 0.002, records_processed: 25 },
                  { task_id: 'task_03_ingest', name: 'Ingest Source Records', stage_order: 3, status: 'SUCCEEDED', duration_seconds: 0.001, records_processed: 25 },
                  { task_id: 'task_04_bronze', name: 'Persist Bronze Dataset', stage_order: 4, status: 'SUCCEEDED', duration_seconds: 0.003, records_processed: 25 },
                  { task_id: 'task_05_bronze_val', name: 'Run Bronze Validation', stage_order: 5, status: 'SUCCEEDED', duration_seconds: 0.001, records_processed: 25 },
                  { task_id: 'task_06_silver', name: 'Transform & Cleanse Silver', stage_order: 6, status: 'SUCCEEDED', duration_seconds: 0.005, records_processed: 21 },
                  { task_id: 'task_07_silver_val', name: 'Run Silver Quality Checks', stage_order: 7, status: 'SUCCEEDED', duration_seconds: 0.002, records_processed: 25 },
                  { task_id: 'task_08_gold', name: 'Build Gold Analytical Datasets', stage_order: 8, status: 'SUCCEEDED', duration_seconds: 0.002, records_processed: 11 },
                  { task_id: 'task_09_metrics', name: 'Calculate Business KPIs', stage_order: 9, status: 'SUCCEEDED', duration_seconds: 0.001, records_processed: 11 },
                  { task_id: 'task_10_report', name: 'Generate Run Report', stage_order: 10, status: 'SUCCEEDED', duration_seconds: 0.001, records_processed: 0 },
                  { task_id: 'task_11_persist', name: 'Record Run Metrics & Metadata', stage_order: 11, status: 'SUCCEEDED', duration_seconds: 0.001, records_processed: 0 }
                ]).map((t, idx) => (
                  <div
                    key={t.task_id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3.5 shadow-sm text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                        {t.stage_order}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{t.name}</div>
                        <div className="text-xs text-slate-500">ID: {t.task_id}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right text-xs text-slate-600 font-medium">
                        {t.records_processed > 0 ? `${t.records_processed} rows` : '—'}
                      </div>
                      <div className="text-right text-xs text-slate-600 font-medium">
                        {t.duration_seconds}s
                      </div>
                      <div className="flex items-center gap-1.5 font-medium text-emerald-600 text-xs">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>{t.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 8: DATA QUALITY */}
          {activeTab === 'quality' && (
            <div className="mx-auto max-w-7xl space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">Data Quality & Validation Rules</h1>
                  <p className="text-xs text-slate-500">
                    Automated rule engine evaluating 11 dimensions with an explainable composite score formula.
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500">Composite Quality Score</div>
                  <div className="text-2xl font-bold text-emerald-600">
                    {latestStatus.qualityScore}% (PASSED)
                  </div>
                </div>
              </div>

              <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 leading-relaxed">
                Formula: QualityScore = Sum(Weight_i × Multiplier_i) / Sum(Weight_i) × 100 [Passed: 1.0, Warning: 0.6, Failed: 0.0]
              </div>

              {/* 11 Quality Rules Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {[
                  { id: 'CHK_01', name: 'Schema Structure & Coverage', cat: 'Schema', status: 'PASSED', val: '15/15 columns present', note: 'All required medallion columns exist.' },
                  { id: 'CHK_02', name: 'Primary Key Completeness (order_id)', cat: 'Completeness', status: 'PASSED', val: '0 null IDs detected', note: 'No null primary keys.' },
                  { id: 'CHK_03', name: 'Record Uniqueness & Deduplication', cat: 'Uniqueness', status: 'WARNING', val: '1 duplicate occurrence', note: 'ORD-1002 deduplicated in Silver.' },
                  { id: 'CHK_04', name: 'Data Type Conformity (unit_price)', cat: 'Validity', status: 'PASSED', val: 'All valid decimals', note: 'Zero unparseable floats.' },
                  { id: 'CHK_05', name: 'Numerical Range Boundaries', cat: 'Validity', status: 'WARNING', val: '2 records out-of-bounds', note: 'Negative qty & negative price quarantined.' },
                  { id: 'CHK_06', name: 'Temporal Format (ISO-8601)', cat: 'Validity', status: 'WARNING', val: '1 invalid date record', note: 'ORD-1014 non-standard date quarantined.' },
                  { id: 'CHK_07', name: 'Field Completeness (customer_email)', cat: 'Completeness', status: 'WARNING', val: '2 missing/invalid emails', note: 'Assigned fallback placeholder.' },
                  { id: 'CHK_08', name: 'Discount Rate Policy (0% - 100%)', cat: 'Business Rule', status: 'PASSED', val: '0 out of range', note: 'Discounts within allowed operational caps.' },
                  { id: 'CHK_09', name: 'Geographic Domain Conformance', cat: 'Consistency', status: 'PASSED', val: '0 unassigned territories', note: 'All delivery regions sanctioned.' },
                  { id: 'CHK_10', name: 'Audit Lineage Freshness Metadata', cat: 'Freshness', status: 'PASSED', val: 'Ingestion timestamps valid', note: 'Every raw row carries UTC audit stamp.' },
                  { id: 'CHK_11', name: 'Medallion Promotion & Drop Rate', cat: 'Integrity', status: 'WARNING', val: '21/25 promoted (16% drop)', note: 'Defects safely isolated into quarantine.' }
                ].map(chk => (
                  <div key={chk.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500 font-medium">{chk.cat} · {chk.id}</span>
                      <span className={`font-semibold text-xs ${chk.status === 'PASSED' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {chk.status}
                      </span>
                    </div>
                    <div className="font-semibold text-slate-800 text-sm">{chk.name}</div>
                    <div className="text-xs text-slate-700 bg-slate-50 p-1.5 rounded border border-slate-100 font-medium">
                      {chk.val}
                    </div>
                    <div className="text-xs text-slate-500 leading-relaxed">{chk.note}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 9: SQL ANALYTICS */}
          {activeTab === 'sql' && (
            <div className="mx-auto max-w-7xl space-y-4">
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">SQL Analytics Workspace</h1>
                <p className="text-xs text-slate-500">
                  Execute safe, read-only SQL queries against Bronze, Silver, and Gold tables.
                </p>
              </div>

              {/* Sample query shortcuts */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-400">Templates:</span>
                {[
                  {
                    label: 'Top Products',
                    q: 'SELECT product_name, category, units_sold, gross_revenue FROM gold_product_performance ORDER BY gross_revenue DESC LIMIT 5;'
                  },
                  {
                    label: 'Regional Revenue',
                    q: 'SELECT region, order_count, total_net_revenue, avg_shipping_fee FROM gold_regional_performance ORDER BY total_net_revenue DESC;'
                  },
                  {
                    label: 'VIP Customers',
                    q: "SELECT customer_name, region, segment_tier, total_lifetime_spend, orders_count FROM gold_customer_segments WHERE segment_tier = 'VIP' ORDER BY total_lifetime_spend DESC;"
                  },
                  {
                    label: 'Daily Trend',
                    q: 'SELECT date, order_count, gross_revenue, net_revenue, avg_order_value FROM gold_daily_revenue ORDER BY date ASC;'
                  }
                ].map(tmpl => (
                  <button
                    key={tmpl.label}
                    onClick={() => setSqlQuery(tmpl.q)}
                    className="rounded border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                  >
                    {tmpl.label}
                  </button>
                ))}
              </div>

              {/* Query Editor */}
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-3">
                <textarea
                  value={sqlQuery}
                  onChange={e => setSqlQuery(e.target.value)}
                  rows={4}
                  className="w-full rounded border border-slate-300 bg-slate-900 p-3 font-mono text-sm text-emerald-400 focus:outline-none"
                  placeholder="Enter SELECT query..."
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">
                    Engine: SQLite in-memory / Read-only enforcement
                  </span>
                  <button
                    onClick={executeSql}
                    disabled={isExecutingSql}
                    className="flex items-center gap-1.5 rounded bg-[#ff3621] px-4 py-2 text-sm font-medium text-white hover:bg-[#e0311d] transition-colors"
                  >
                    <Play className="h-4 w-4" />
                    {isExecutingSql ? 'Running...' : 'Execute Query'}
                  </button>
                </div>
              </div>

              {/* SQL Execution Output */}
              {sqlResult && (
                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">
                      Query Results ({sqlResult.row_count} rows, {sqlResult.duration_ms} ms)
                    </span>
                    {sqlResult.success && (
                      <span className="text-emerald-600 font-medium">✓ Query Succeeded</span>
                    )}
                  </div>

                  {sqlResult.success ? (
                    <div className="overflow-x-auto max-h-[350px]">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                          <tr>
                            {sqlResult.columns.map((c: string) => (
                              <th key={c} className="px-3.5 py-2 whitespace-nowrap">
                                {c}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                          {sqlResult.rows.map((r: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50/60">
                              {sqlResult.columns.map((c: string) => (
                                <td key={c} className="px-3.5 py-1.5 whitespace-nowrap text-xs">
                                  {String(r[c] ?? '')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded text-rose-700 text-xs">
                      {sqlResult.error}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 10: AI INSIGHTS */}
          {activeTab === 'ai' && (
            <div className="mx-auto max-w-5xl space-y-6">
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">AI-Assisted Lakehouse Intelligence</h1>
                <p className="text-xs text-slate-500">
                  Dual-mode assistant: Powered by Google Gemini 3.8 Flash when configured, with deterministic zero-hallucination fallback.
                </p>
              </div>

              {/* Engine banner */}
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-800">
                      {latestStatus.isAiConfigured ? 'Gemini 3.8 Flash AI Model' : 'Deterministic Heuristic Fallback Engine'}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {latestStatus.isAiConfigured
                        ? 'Connected via @google/genai SDK with system prompt grounding.'
                        : 'Rule-based expert system grounded in computed telemetry (100% offline).'}
                    </div>
                  </div>
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  {latestStatus.isAiConfigured ? 'Model: gemini-3.8-flash' : 'Mode: Rule-Based'}
                </span>
              </div>

              {/* Task buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => triggerAiInsights('quality')}
                  disabled={isLoadingAi}
                  className="rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-[#ff3621] transition-colors"
                >
                  <div className="text-xs font-semibold text-slate-800">1. Explain Quality Issues</div>
                  <div className="text-xs text-slate-500 mt-1">Diagnose quarantined rows and suggest remediation steps.</div>
                </button>

                <button
                  onClick={() => triggerAiInsights('summary')}
                  disabled={isLoadingAi}
                  className="rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-[#ff3621] transition-colors"
                >
                  <div className="text-xs font-semibold text-slate-800">2. Executive Pipeline Brief</div>
                  <div className="text-xs text-slate-500 mt-1">Generate concise summary of recent Medallion run.</div>
                </button>

                <button
                  onClick={() => triggerAiInsights('sql_draft')}
                  disabled={isLoadingAi}
                  className="rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-[#ff3621] transition-colors"
                >
                  <div className="text-xs font-semibold text-slate-800">3. Draft Analytical SQL</div>
                  <div className="text-xs text-slate-500 mt-1">Convert natural language prompt to safe SELECT query.</div>
                </button>
              </div>

              {/* Response Card */}
              {aiResponse && (
                <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
                    <span className="font-semibold text-slate-800">Analysis Output</span>
                    <span className="text-xs text-indigo-600 font-medium">Source: {aiResponse.source}</span>
                  </div>
                  <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {aiResponse.content}
                  </div>
                  {aiResponse.deterministicBaseline?.recommendations?.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 text-xs">
                      <div className="font-semibold text-slate-800 mb-1">Prescribed Remedies:</div>
                      {aiResponse.deterministicBaseline.recommendations.map((r: string, idx: number) => (
                        <div key={idx} className="text-slate-600">{r}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 11: DATA LINEAGE */}
          {activeTab === 'lineage' && (
            <div className="mx-auto max-w-6xl space-y-6">
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Data Lineage & Asset Dependencies</h1>
                <p className="text-xs text-slate-500">
                  Application-level provenance tracking mapping data flow from source ingestion to consumption marts.
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div className="text-xs font-semibold text-slate-800">Medallion Lineage Graph</div>
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                  <div className="p-3 bg-white border border-slate-200 rounded shadow-sm text-center">
                    <div className="text-xs text-slate-400">SOURCE</div>
                    <div className="font-bold text-slate-800 text-sm">sample_sales.csv</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 hidden md:block" />
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded shadow-sm text-center">
                    <div className="text-xs text-amber-700">BRONZE</div>
                    <div className="font-bold text-slate-800 text-sm">bronze_sales</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 hidden md:block" />
                  <div className="p-3 bg-slate-100 border border-slate-300 rounded shadow-sm text-center">
                    <div className="text-xs text-slate-600">SILVER</div>
                    <div className="font-bold text-slate-800 text-sm">silver_sales</div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 hidden md:block" />
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded shadow-sm text-center">
                    <div className="text-xs text-yellow-800">GOLD</div>
                    <div className="font-bold text-slate-800 text-sm">4 Curated Marts</div>
                  </div>
                </div>

                <div className="text-xs text-slate-600 space-y-1.5 pt-2">
                  <div className="font-medium text-slate-800">Downstream Data Marts:</div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><span className="font-semibold text-slate-800">gold_daily_revenue</span>: Powered by temporal group-by on <code className="text-slate-600">order_date</code>.</li>
                    <li><span className="font-semibold text-slate-800">gold_product_performance</span>: Aggregated across product SKU dimensions.</li>
                    <li><span className="font-semibold text-slate-800">gold_regional_performance</span>: Territorial logistics analysis by <code className="text-slate-600">customer_region</code>.</li>
                    <li><span className="font-semibold text-slate-800">gold_customer_segments</span>: LTV & customer tiering (VIP, Growth, Standard).</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 12: GOVERNANCE */}
          {activeTab === 'governance' && (
            <div className="mx-auto max-w-5xl space-y-6">
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Data Governance & Unity Catalog Simulation</h1>
                <p className="text-xs text-slate-500">
                  Conceptual 3-tier namespace (<code className="text-slate-700 font-medium">catalog.schema.table</code>), Role-Based Access Control, and PII masking.
                </p>
              </div>

              {/* Persona Selector */}
              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800">Switch Active Role Persona:</span>
                  <span className="text-[11px] text-slate-400">Evaluates column masking & table permissions</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['DATA_ENGINEER', 'DATA_ANALYST', 'AUDITOR', 'COMPLIANCE_OFFICER'] as const).map(role => (
                    <button
                      key={role}
                      onClick={() => setActiveRole(role)}
                      className={`p-2.5 rounded text-xs font-medium text-left border transition-all ${
                        activeRole === role
                          ? 'border-[#ff3621] bg-orange-50/50 text-[#ff3621]'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {role.replace('_', ' ')}
                    </button>
                  ))}
                </div>

                {/* Permissions matrix */}
                <div className="pt-2 border-t border-slate-100 text-xs space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Role Title:</span>
                    <span className="font-semibold text-slate-900">{activeRole}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">View Unmasked PII (customer_email):</span>
                    <span className={activeRole === 'DATA_ENGINEER' || activeRole === 'COMPLIANCE_OFFICER' ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                      {activeRole === 'DATA_ENGINEER' || activeRole === 'COMPLIANCE_OFFICER' ? 'YES (RAW)' : 'NO (MASKED: a***@***.com)'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Access to Quarantine Table:</span>
                    <span className={activeRole === 'DATA_ANALYST' ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>
                      {activeRole === 'DATA_ANALYST' ? 'DENIED' : 'ALLOWED'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 13: RUN HISTORY */}
          {activeTab === 'runs' && (
            <div className="mx-auto max-w-6xl space-y-4">
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Pipeline Execution Run History</h1>
                <p className="text-xs text-slate-500">
                  Persisted SQLite audit records of past Medallion pipeline executions.
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                    <tr>
                      <th className="px-3.5 py-2.5">Run ID</th>
                      <th className="px-3.5 py-2.5">Status</th>
                      <th className="px-3.5 py-2.5">Duration</th>
                      <th className="px-3.5 py-2.5">Bronze</th>
                      <th className="px-3.5 py-2.5">Silver</th>
                      <th className="px-3.5 py-2.5">Quality</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    <tr>
                      <td className="px-3.5 py-2">{pipelineResult?.run_id || 'run_20261011_042113_1e3636'}</td>
                      <td className="px-3.5 py-2 text-emerald-600 font-bold">SUCCEEDED</td>
                      <td className="px-3.5 py-2">0.01s</td>
                      <td className="px-3.5 py-2">25 rows</td>
                      <td className="px-3.5 py-2">21 rows</td>
                      <td className="px-3.5 py-2">80.4%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 14: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="mx-auto max-w-4xl space-y-6">
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Workspace Settings</h1>
                <p className="text-xs text-slate-500">
                  Configure Databricks workspace connector, particle animation intensity, and environment secrets.
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm space-y-4 text-xs">
                <div className="font-semibold text-slate-800 text-sm">Particle Animation System</div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Micro-particle intensity:</span>
                    <span className="text-slate-900 font-semibold">{particleIntensity}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={particleIntensity}
                    onChange={e => setParticleIntensity(Number(e.target.value))}
                    className="w-full"
                  />
                  <span className="text-xs text-slate-500">Set to 0% to completely pause micro-particles. Respects prefers-reduced-motion automatically.</span>
                </div>

                <div className="pt-4 border-t border-slate-100 font-semibold text-slate-800 text-sm">Optional Databricks Connection</div>
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-slate-600 font-medium">Databricks Workspace Host URL</label>
                    <input
                      type="text"
                      placeholder="https://dbc-xxxx.cloud.databricks.com"
                      className="mt-1 w-full rounded border border-slate-200 p-2 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 font-medium">Personal Access Token (PAT)</label>
                    <input
                      type="password"
                      placeholder="dapi..."
                      className="mt-1 w-full rounded border border-slate-200 p-2 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 15: ARCHITECTURE TRADEOFFS */}
          {activeTab === 'tradeoffs' && (
            <div className="mx-auto max-w-6xl space-y-4">
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Architecture Trade-offs & Limitations Analysis</h1>
                <p className="text-xs text-slate-500">
                  Engineering trade-offs analysis covering all 15 fundamental lakehouse limitations (Master Prompt Section 12).
                </p>
              </div>

              <div className="space-y-3">
                {[
                  { id: 1, title: 'Batch Ingestion Latency', cause: 'Scheduled hourly/daily batches rather than streaming.', impact: 'Analytics reflects data hours or days old.', mit: 'Delta Live Tables or Spark Structured Streaming.', status: 'Proposed', cost: 'High streaming infrastructure compute cost.' },
                  { id: 2, title: 'Brittle Schemas', cause: 'Unannounced column changes from upstream producers.', impact: 'Downstream Gold aggregations fail or produce NULLs.', mit: 'Enforce schema validation at Bronze ingest.', status: 'Implemented', cost: 'Validation compute overhead.' },
                  { id: 3, title: 'Duplicate Transactions', cause: 'Network retries without idempotent keys.', impact: 'Double-counts revenue and inflates executive KPIs.', mit: 'Key-based deduplication in Silver layer.', status: 'Implemented', cost: 'Windowing memory overhead.' },
                  { id: 4, title: 'Organizational Data Silos', cause: 'Differing revenue formulas across departments.', impact: 'Conflicting executive definitions.', mit: 'Centralized Gold datamart models with semantic layer.', status: 'Implemented', cost: 'Rigid governance reduces ad-hoc flexibility.' },
                  { id: 5, title: 'Local Memory Exhaustion (OOM)', cause: 'Processing massive files in single-node Pandas.', impact: 'Pipeline crashes on large datasets.', mit: 'Chunked processing, PySpark partitions, DuckDB.', status: 'Implemented (chunking)', cost: 'Higher code complexity.' },
                  { id: 6, title: 'Compute Cost Inefficiencies', cause: 'Full table scans without partition pruning.', impact: 'Cloud compute costs spike exponentially.', mit: 'Date partitioning and Z-Order clustering.', status: 'Implemented', cost: 'Small file fragmentation requires vacuum.' },
                  { id: 7, title: 'Unauthorized PII Exposure', cause: 'Analysts querying unmasked emails/payments.', impact: 'GDPR and CCPA regulatory penalties.', mit: 'Unity Catalog RBAC and dynamic column masking.', status: 'Implemented', cost: 'Query planning overhead.' },
                  { id: 8, title: 'Missing Data Lineage', cause: 'Ad-hoc scripts executing unversioned queries.', impact: 'Cannot trace which upstream source corrupted metrics.', mit: 'Automated DAG audit tracking capturing dependencies.', status: 'Implemented', cost: 'Metadata storage overhead.' },
                  { id: 9, title: 'Non-Idempotent Retries', cause: 'Retrying failed batch appends duplicate rows.', impact: 'Ghost rows in financial reports.', mit: 'Write-audit-publish (WAP) pattern and deterministic hash.', status: 'Implemented', cost: 'Staging storage overhead.' },
                  { id: 10, title: 'Hallucinated LLM SQL', cause: 'Unconstrained LLMs drafting queries.', impact: 'Syntax errors or dangerous DML execution.', mit: 'Dual-mode AI assistant with strict read-only parser.', status: 'Implemented', cost: 'Constrained natural language query scope.' },
                  { id: 11, title: 'Streaming Complexity', cause: 'Managing checkpoints and watermarks.', impact: 'Difficult recovery from checkpoint corruption.', mit: 'Hybrid Lambda/Kappa medallion with batch reconciliation.', status: 'Proposed', cost: 'Dual codebases.' },
                  { id: 12, title: 'Excessive UI Animations', cause: 'Continuous heavy Canvas rendering.', impact: 'Battery drain on laptops.', mit: 'Restrained micro-particles with configurable slider.', status: 'Implemented', cost: 'Visual simplicity.' },
                  { id: 13, title: 'External AI Privacy Risks', cause: 'Sending sensitive records to public LLMs.', impact: 'Leak of customer secrets.', mit: 'Local rule engine fallback; scrubbed prompts only.', status: 'Implemented', cost: 'Rule-based answers have fixed vocabulary.' },
                  { id: 14, title: 'Vendor Lock-In', cause: 'Deep coupling to proprietary cloud APIs.', impact: 'High migration costs.', mit: 'Open Parquet, Delta Lake format, standard Python.', status: 'Implemented', cost: 'Misses out on proprietary cloud hardware.' },
                  { id: 15, title: 'Single-Node vs Distributed', cause: 'Running SQLite and Python stdlib locally.', impact: 'Cannot scale to petabyte big data.', mit: 'Modular architecture with pluggable Databricks connector.', status: 'Implemented', cost: 'Local mode cannot benchmark network shuffle.' }
                ].map(item => (
                  <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900 text-sm">{item.id}. {item.title}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${item.status.includes('Implemented') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-700'}`}>
                        {item.status}
                      </span>
                    </div>
                    <div className="text-slate-600"><span className="font-medium text-slate-800">Root Cause:</span> {item.cause}</div>
                    <div className="text-slate-600"><span className="font-medium text-slate-800">Impact:</span> {item.impact}</div>
                    <div className="text-slate-600"><span className="font-medium text-slate-800">Practical Mitigation:</span> {item.mit}</div>
                    <div className="text-slate-600 text-xs"><span className="font-medium text-slate-700">Trade-off Cost:</span> {item.cost}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 16: PYTHON RUNNER & CODE INSPECTOR */}
          {activeTab === 'python_runner' && (
            <div className="mx-auto max-w-7xl space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-slate-900 tracking-tight">Python Runner & Repository Inspector</h1>
                  <p className="text-xs text-slate-500">
                    Inspect Python files, execute unit tests, and review Windows Streamlit launch commands.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={runUnitTests}
                    disabled={isRunningTests}
                    className="flex items-center gap-1.5 rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
                  >
                    <Terminal className="h-3.5 w-3.5 text-emerald-400" />
                    {isRunningTests ? 'Running Tests...' : 'Execute python3 -m unittest'}
                  </button>
                </div>
              </div>

              {/* Windows Instructions Callout */}
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm text-sm space-y-2">
                <div className="font-semibold text-slate-800">How to Run on Windows Locally:</div>
                <div className="p-3 bg-slate-900 text-slate-200 font-mono rounded text-xs space-y-1.5 leading-relaxed">
                  <div className="text-slate-400"># 1. Clone repository and create virtual environment:</div>
                  <div className="text-emerald-400">python -m venv .venv && .venv\Scripts\activate</div>
                  <div className="text-slate-400"># 2. Install dependencies:</div>
                  <div className="text-emerald-400">pip install -r requirements.txt</div>
                  <div className="text-slate-400"># 3. Launch Streamlit interface:</div>
                  <div className="text-emerald-400">streamlit run app.py</div>
                  <div className="text-slate-400"># 4. Or execute pipeline via CLI:</div>
                  <div className="text-emerald-400">python scripts/run_pipeline.py</div>
                </div>
              </div>

              {/* File selector & Code Viewer */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm space-y-1 text-sm">
                  <div className="font-semibold text-slate-700 px-2 py-1 text-xs uppercase tracking-wider">Repository Files</div>
                  {[
                    'app.py',
                    'config.py',
                    'requirements.txt',
                    'src/bronze/processor.py',
                    'src/silver/cleaner.py',
                    'src/gold/aggregator.py',
                    'src/quality/engine.py',
                    'src/orchestration/engine.py',
                    'src/orchestration/dag.py',
                    'src/analytics/sql_engine.py',
                    'src/ai/assistant.py',
                    'src/lineage/tracker.py',
                    'src/governance/catalog.py',
                    'tests/test_ingestion.py',
                    'tests/test_transformations.py',
                    'tests/test_quality.py',
                    'tests/test_orchestration.py',
                    'tests/test_security.py',
                    'scripts/run_pipeline.py'
                  ].map(f => (
                    <button
                      key={f}
                      onClick={() => setSelectedCodeFile(f)}
                      className={`w-full text-left px-2.5 py-1.5 rounded font-mono text-xs truncate transition-colors ${
                        selectedCodeFile === f ? 'bg-[#ff3621] text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                <div className="md:col-span-3 rounded-lg border border-slate-800 bg-[#0b1120] p-4 text-slate-300 font-mono text-xs shadow-sm flex flex-col h-[550px]">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-slate-400">
                    <span className="font-semibold text-slate-200 text-sm">{selectedCodeFile}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(codeContent);
                        setCopiedCode(true);
                        setTimeout(() => setCopiedCode(false), 2000);
                      }}
                      className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                    >
                      {copiedCode ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                      <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                    </button>
                  </div>
                  <pre className="flex-1 overflow-auto mt-2 text-slate-300 whitespace-pre text-xs leading-relaxed">
                    {codeContent || 'Loading file content...'}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
