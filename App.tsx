import React, { useState, useEffect, useMemo } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, OperationType, handleFirestoreError } from './lib/firebase';
import { EnergyRecord, FilterOptions, UserProfile } from './types';
import { generateHistoricalData } from './utils/dataGenerator';

// Components
import Sidebar from './components/Sidebar';
import AuthPanel from './components/AuthPanel';
import DashboardTab from './components/DashboardTab';
import ForecastingTab from './components/ForecastingTab';
import ReportsTab from './components/ReportsTab';
import Chatbot from './components/Chatbot';

// Animation
import { motion, AnimatePresence } from 'motion/react';

// Icons
import { 
  Search, 
  Filter, 
  Calendar, 
  User, 
  ChevronDown, 
  ChevronUp, 
  Sliders, 
  Zap,
  Info,
  X,
  Upload,
  Database,
  RefreshCw,
  IndianRupee
} from 'lucide-react';

import { STATE_TARIFFS } from './utils/tariff';

// Robust CSV & JSON parser for Household Electric Power datasets or custom streams
function parseCustomDataset(text: string, fileType: 'csv' | 'json'): EnergyRecord[] {
  if (fileType === 'json') {
    const parsed = JSON.parse(text);
    const arr = Array.isArray(parsed) ? parsed : (parsed.records || parsed.data || []);
    if (!Array.isArray(arr) || arr.length === 0) {
      throw new Error("JSON file must contain an array of energy records.");
    }
    return arr.map((item: any, index: number) => {
      const timestamp = item.timestamp || item.time || item.date || item.DateTime || new Date(Date.now() - index * 60 * 60 * 1000).toISOString();
      const parsedTime = new Date(timestamp);
      return {
        timestamp: parsedTime.toISOString(),
        timestampMs: parsedTime.getTime(),
        activePower: parseFloat(item.activePower ?? item.ActivePower ?? item.Global_active_power ?? item.active ?? item.power ?? 0),
        reactivePower: parseFloat(item.reactivePower ?? item.ReactivePower ?? item.Global_reactive_power ?? item.reactive ?? 0),
        voltage: parseFloat(item.voltage ?? item.Voltage ?? 240),
        intensity: parseFloat(item.intensity ?? item.Intensity ?? item.Global_intensity ?? 0),
        subMetering1: Math.round(item.subMetering1 ?? item.sub_metering_1 ?? item.kitchen ?? item.Sub_metering_1 ?? 0),
        subMetering2: Math.round(item.subMetering2 ?? item.sub_metering_2 ?? item.laundry ?? item.Sub_metering_2 ?? 0),
        subMetering3: Math.round(item.subMetering3 ?? item.sub_metering_3 ?? item.climate ?? item.Sub_metering_3 ?? 0),
        otherMetering: Math.round(item.otherMetering ?? item.other_metering ?? item.other ?? 0)
      };
    });
  } else {
    const lines = text.split(/\r?\n/);
    if (lines.length < 2) {
      throw new Error("CSV file is empty or missing data rows.");
    }
    
    // Split header and clean
    const headers = lines[0].split(',').map(h => h.trim().replace(/['"]/g, '').toLowerCase());
    
    const getColIndex = (names: string[]) => {
      return headers.findIndex(h => names.some(name => h.includes(name) || name.includes(h)));
    };

    const timeIdx = getColIndex(['timestamp', 'time', 'date', 'datetime']);
    const activeIdx = getColIndex(['activepower', 'active_power', 'global_active_power', 'active', 'power']);
    const reactiveIdx = getColIndex(['reactivepower', 'reactive_power', 'global_reactive_power', 'reactive']);
    const voltIdx = getColIndex(['voltage', 'volt']);
    const intensityIdx = getColIndex(['intensity', 'global_intensity', 'amp', 'current']);
    const sub1Idx = getColIndex(['submetering1', 'sub_metering_1', 'kitchen', 'sub1']);
    const sub2Idx = getColIndex(['submetering2', 'sub_metering_2', 'laundry', 'sub2']);
    const sub3Idx = getColIndex(['submetering3', 'sub_metering_3', 'climate', 'sub3']);
    const otherIdx = getColIndex(['othermetering', 'other_metering', 'other']);

    const records: EnergyRecord[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const cols = line.split(',').map(c => c.trim().replace(/['"]/g, ''));
      if (cols.length < Math.min(2, headers.length)) continue;
      
      const timestampVal = timeIdx !== -1 && cols[timeIdx] ? cols[timeIdx] : '';
      let timestamp = new Date().toISOString();
      if (timestampVal) {
        try {
          // Parse UCI style DD/MM/YYYY;hh:mm:ss if needed
          if (timestampVal.includes('/') && timestampVal.includes(':')) {
            const parts = timestampVal.split(' ');
            if (parts.length === 2) {
              const dateParts = parts[0].split('/');
              if (dateParts.length === 3) {
                // assume DD/MM/YYYY
                timestamp = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}T${parts[1]}`).toISOString();
              }
            }
          } else {
            timestamp = new Date(timestampVal).toISOString();
          }
        } catch {
          timestamp = new Date(Date.now() - (lines.length - i) * 60 * 60 * 1000).toISOString();
        }
      } else {
        timestamp = new Date(Date.now() - (lines.length - i) * 60 * 60 * 1000).toISOString();
      }
        
      const activePower = activeIdx !== -1 && cols[activeIdx] ? parseFloat(cols[activeIdx]) : 0;
      const reactivePower = reactiveIdx !== -1 && cols[reactiveIdx] ? parseFloat(cols[reactiveIdx]) : 0;
      const voltage = voltIdx !== -1 && cols[voltIdx] ? parseFloat(cols[voltIdx]) : 240;
      const intensity = intensityIdx !== -1 && cols[intensityIdx] ? parseFloat(cols[intensityIdx]) : 0;
      const subMetering1 = sub1Idx !== -1 && cols[sub1Idx] ? Math.round(parseFloat(cols[sub1Idx])) : 0;
      const subMetering2 = sub2Idx !== -1 && cols[sub2Idx] ? Math.round(parseFloat(cols[sub2Idx])) : 0;
      const subMetering3 = sub3Idx !== -1 && cols[sub3Idx] ? Math.round(parseFloat(cols[sub3Idx])) : 0;
      const otherMetering = otherIdx !== -1 && cols[otherIdx] ? Math.round(parseFloat(cols[otherIdx])) : 0;

      records.push({
        timestamp,
        timestampMs: new Date(timestamp).getTime(),
        activePower: isNaN(activePower) ? 0 : activePower,
        reactivePower: isNaN(reactivePower) ? 0 : reactivePower,
        voltage: isNaN(voltage) ? 240 : voltage,
        intensity: isNaN(intensity) ? 0 : intensity,
        subMetering1: isNaN(subMetering1) ? 0 : subMetering1,
        subMetering2: isNaN(subMetering2) ? 0 : subMetering2,
        subMetering3: isNaN(subMetering3) ? 0 : subMetering3,
        otherMetering: isNaN(otherMetering) ? 0 : otherMetering,
      });
    }

    if (records.length === 0) {
      throw new Error("No valid data rows found in CSV.");
    }
    return records;
  }
}

export default function App() {
  // 1. Core App State
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 2. Global Filtering States
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // Create solid defaults
  const today = new Date('2026-07-04');
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    startDate: thirtyDaysAgo.toISOString().split('T')[0],
    endDate: today.toISOString().split('T')[0],
    viewMode: 'hourly',
    subMetering: 'all',
    stateTariff: 'tamil-nadu'
  });

  // 3. Generate baseline datasets (Household Electric Power Consumption style)
  // Initially starts as empty (values as zero) until user uploads a CSV
  const [rawHistoricalData, setRawHistoricalData] = useState<EnergyRecord[]>([]);
  const [isCustomDatasetActive, setIsCustomDatasetActive] = useState(false);
  const [customDatasetName, setCustomDatasetName] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleUploadRawText = (text: string, fileName: string) => {
    try {
      setUploadError(null);
      const isJson = fileName.endsWith('.json');
      const records = parseCustomDataset(text, isJson ? 'json' : 'csv');
      
      if (records.length > 0) {
        const times = records.map(r => new Date(r.timestamp).getTime());
        const minTime = new Date(Math.min(...times));
        const maxTime = new Date(Math.max(...times));
        
        setFilterOptions(prev => ({
          ...prev,
          startDate: minTime.toISOString().split('T')[0],
          endDate: maxTime.toISOString().split('T')[0]
        }));
      }

      setRawHistoricalData(records);
      setIsCustomDatasetActive(true);
      setCustomDatasetName(fileName);
      setActiveTab('dashboard');
    } catch (err: any) {
      console.error("Upload error:", err);
      const errMsg = err.message || "Failed to parse data. Ensure file is valid CSV or JSON.";
      setUploadError(errMsg);
      throw new Error(errMsg);
    }
  };

  const handleResetDataset = () => {
    setRawHistoricalData([]);
    setIsCustomDatasetActive(false);
    setCustomDatasetName(null);
    setUploadError(null);
    setFilterOptions({
      startDate: thirtyDaysAgo.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0],
      viewMode: 'hourly',
      subMetering: 'all',
      stateTariff: 'tamil-nadu'
    });
  };

  const handleLoadDemoData = () => {
    const demo = generateHistoricalData(60, 42);
    if (demo.length > 0) {
      const times = demo.map(r => new Date(r.timestamp).getTime());
      const minTime = new Date(Math.min(...times));
      const maxTime = new Date(Math.max(...times));
      
      setFilterOptions(prev => ({
        ...prev,
        startDate: minTime.toISOString().split('T')[0],
        endDate: maxTime.toISOString().split('T')[0]
      }));
    }
    setRawHistoricalData(demo);
    setIsCustomDatasetActive(true);
    setCustomDatasetName("seeded_household_demo_data.csv");
    setUploadError(null);
  };

  // 4. Authenticated User Observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        if (firebaseUser.uid === 'demo-guest-user') {
          setUser({
            uid: 'demo-guest-user',
            email: 'demo.auditor@gmail.com',
            savingsGoal: 350,
            createdAt: new Date().toISOString()
          });
          return;
        }

        const path = `users/${firebaseUser.uid}`;
        try {
          const docRef = doc(db, 'users', firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setUser(docSnap.data() as UserProfile);
          } else {
            // Fallback profile if Firestore is still indexing or loading
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              savingsGoal: 350,
              createdAt: new Date().toISOString()
            });
          }
        } catch (err: any) {
          console.error("Error loading user profile:", err);
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            savingsGoal: 350,
            createdAt: new Date().toISOString()
          });
          handleFirestoreError(err, OperationType.GET, path);
        }
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (err) {
      console.error("Signout error:", err);
    }
  };

  // 5. Apply Filter & Search options to Active Data points
  const activeFilteredData = useMemo(() => {
    let filtered = [...rawHistoricalData];

    // Filter by date range bounds
    const startMs = new Date(filterOptions.startDate + 'T00:00:00').getTime();
    const endMs = new Date(filterOptions.endDate + 'T23:59:59').getTime();

    filtered = filtered.filter(r => {
      const ms = r.timestampMs || new Date(r.timestamp).getTime();
      return ms >= startMs && ms <= endMs;
    });

    // Handle view mode aggregate scaling
    if (filterOptions.viewMode === 'daily') {
      // Group and average active power by date
      const dailyMap: { [key: string]: EnergyRecord[] } = {};
      filtered.forEach(r => {
        const dateKey = r.timestamp.split('T')[0];
        if (!dailyMap[dateKey]) dailyMap[dateKey] = [];
        dailyMap[dateKey].push(r);
      });

      filtered = Object.keys(dailyMap).sort().map(dateKey => {
        const records = dailyMap[dateKey];
        const count = records.length || 1;
        
        return {
          timestamp: `${dateKey}T00:00:00Z`,
          timestampMs: new Date(`${dateKey}T00:00:00Z`).getTime(),
          activePower: parseFloat((records.reduce((sum, r) => sum + r.activePower, 0) / count).toFixed(3)),
          reactivePower: parseFloat((records.reduce((sum, r) => sum + r.reactivePower, 0) / count).toFixed(3)),
          voltage: parseFloat((records.reduce((sum, r) => sum + r.voltage, 0) / count).toFixed(2)),
          intensity: parseFloat((records.reduce((sum, r) => sum + r.intensity, 0) / count).toFixed(2)),
          subMetering1: Math.round(records.reduce((sum, r) => sum + r.subMetering1, 0) / count),
          subMetering2: Math.round(records.reduce((sum, r) => sum + r.subMetering2, 0) / count),
          subMetering3: Math.round(records.reduce((sum, r) => sum + r.subMetering3, 0) / count),
          otherMetering: Math.round(records.reduce((sum, r) => sum + r.otherMetering, 0) / count),
        };
      });
    }

    // Filter by text search query across properties (Date, ActivePower, etc)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(r => {
        return (
          r.timestamp.toLowerCase().includes(q) ||
          r.activePower.toString().includes(q) ||
          r.voltage.toString().includes(q)
        );
      });
    }

    return filtered;
  }, [rawHistoricalData, filterOptions, searchQuery]);

  return (
    <div id="app-root-container" className="flex flex-col md:flex-row min-h-screen bg-editorial-bg text-slate-100 font-sans selection:bg-editorial-accent selection:text-black">
      
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onLogout={handleLogout}
        onOpenAuth={() => setIsAuthOpen(true)}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      {/* Main Panel Frame */}
      <main className="flex-1 flex flex-col min-w-0 max-w-7xl mx-auto w-full p-4 md:p-8 space-y-6">
        
        {/* Top Header bar with search and control hubs */}
        <header id="main-header" className="flex flex-col md:flex-row gap-4 md:items-start justify-between border-b border-white/5 pb-6">
          <div className="space-y-2">
            <div className="text-[10px] text-editorial-accent font-bold tracking-[0.2em] uppercase">Active Forecasting Terminal</div>
            <h1 className="text-4xl md:text-6xl font-light tracking-tighter leading-none uppercase text-white">
              {activeTab === 'dashboard' && <>Grid<br/><span className="italic font-serif text-editorial-accent">Consumption</span></>}
              {activeTab === 'forecasting' && <>Predictive<br/><span className="italic font-serif text-editorial-accent">Engine</span></>}
              {activeTab === 'reports' && <>Personal<br/><span className="italic font-serif text-editorial-accent">Audits</span></>}
              {activeTab === 'ai-assistant' && <>AI Energy<br/><span className="italic font-serif text-editorial-accent">Auditor</span></>}
            </h1>
            <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4 text-[10px] uppercase tracking-[0.2em] opacity-60 font-bold">
              <button id="nav-btn-dashboard" onClick={() => setActiveTab('dashboard')} className={`transition hover:text-editorial-accent cursor-pointer ${activeTab === 'dashboard' ? 'text-editorial-accent font-bold' : 'text-slate-400'}`}>Overview</button>
              <button id="nav-btn-forecasting" onClick={() => setActiveTab('forecasting')} className={`transition hover:text-editorial-accent cursor-pointer ${activeTab === 'forecasting' ? 'text-editorial-accent font-bold' : 'text-slate-400'}`}>Forecast Horizon</button>
              <button id="nav-btn-reports" onClick={() => setActiveTab('reports')} className={`transition hover:text-editorial-accent cursor-pointer ${activeTab === 'reports' ? 'text-editorial-accent font-bold' : 'text-slate-400'}`}>Saved Reports</button>
              <button id="nav-btn-ai-assistant" onClick={() => setActiveTab('ai-assistant')} className={`transition hover:text-editorial-accent cursor-pointer ${activeTab === 'ai-assistant' ? 'text-editorial-accent font-bold' : 'text-slate-400'}`}>AI Audit Q&amp;A</button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Global Search Bar */}
            <div className="relative flex-1 sm:flex-none">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Search className="h-3.5 w-3.5" />
              </span>
              <input
                id="search-input-box"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search dates, weekdays..."
                className="w-full sm:w-60 bg-white/5 border border-white/10 hover:border-white/20 focus:border-editorial-accent/50 rounded-full py-2 pl-9 pr-8 text-xs text-slate-100 placeholder-slate-650 outline-none transition"
              />
              {searchQuery && (
                <button
                  id="clear-search-btn"
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Collapsible filter toggle button */}
            <button
              id="filter-toggle-button"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 text-xs font-semibold rounded-full border border-white/10 transition cursor-pointer ${
                isFilterOpen ? 'text-editorial-accent border-editorial-accent/30 bg-editorial-accent/5' : 'text-slate-300'
              }`}
            >
              <Filter className="h-3.5 w-3.5" />
              <span>Filters</span>
              {isFilterOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>

            {/* Profile trigger in Header */}
            {!user && (
              <button
                id="header-profile-btn"
                onClick={() => setIsAuthOpen(true)}
                className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-white text-black hover:bg-editorial-accent text-xs font-bold rounded-full transition shadow-lg cursor-pointer"
              >
                <User className="h-3.5 w-3.5" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </header>

        {/* Global Collapsible Filtering Panel */}
        <AnimatePresence>
          {isFilterOpen && (
            <motion.div
              id="global-filter-panel"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="bg-editorial-card border border-white/10 rounded-3xl p-6 grid grid-cols-1 sm:grid-cols-4 gap-5">
                {/* Start Date */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5" htmlFor="filter-start-date">
                    <Calendar className="h-3.5 w-3.5 text-editorial-accent" />
                    <span>Start Date</span>
                  </label>
                  <input
                    id="filter-start-date"
                    type="date"
                    value={filterOptions.startDate}
                    min={rawHistoricalData.length > 0 ? new Date(Math.min(...rawHistoricalData.map(r => new Date(r.timestamp).getTime()))).toISOString().split('T')[0] : '2026-05-01'}
                    max={filterOptions.endDate}
                    onChange={(e) => setFilterOptions({ ...filterOptions, startDate: e.target.value })}
                    className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl py-2 px-3 text-xs text-slate-250 outline-none focus:border-editorial-accent transition"
                  />
                </div>

                {/* End Date */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5" htmlFor="filter-end-date">
                    <Calendar className="h-3.5 w-3.5 text-editorial-accent" />
                    <span>End Date</span>
                  </label>
                  <input
                    id="filter-end-date"
                    type="date"
                    value={filterOptions.endDate}
                    min={filterOptions.startDate}
                    max={rawHistoricalData.length > 0 ? new Date(Math.max(...rawHistoricalData.map(r => new Date(r.timestamp).getTime()))).toISOString().split('T')[0] : '2026-07-04'}
                    onChange={(e) => setFilterOptions({ ...filterOptions, endDate: e.target.value })}
                    className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl py-2 px-3 text-xs text-slate-250 outline-none focus:border-editorial-accent transition"
                  />
                </div>

                {/* View aggregation mode */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5" htmlFor="filter-view-mode">
                    <Sliders className="h-3.5 w-3.5 text-editorial-accent" />
                    <span>View Aggregation</span>
                  </label>
                  <div id="filter-view-mode" className="grid grid-cols-2 gap-1 bg-[#0A0A0B] p-1 rounded-xl border border-white/10">
                    <button
                      id="viewmode-hourly"
                      type="button"
                      onClick={() => setFilterOptions({ ...filterOptions, viewMode: 'hourly' })}
                      className={`py-1.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                        filterOptions.viewMode === 'hourly'
                          ? 'bg-editorial-accent text-black shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Hourly Raw
                    </button>
                    <button
                      id="viewmode-daily"
                      type="button"
                      onClick={() => setFilterOptions({ ...filterOptions, viewMode: 'daily' })}
                      className={`py-1.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                        filterOptions.viewMode === 'daily'
                          ? 'bg-editorial-accent text-black shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Daily Mean
                    </button>
                  </div>
                </div>

                {/* State Tariff (India) Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5" htmlFor="filter-state-tariff">
                    <IndianRupee className="h-3.5 w-3.5 text-editorial-accent" />
                    <span>State Tariff (India)</span>
                  </label>
                  <select
                    id="filter-state-tariff"
                    value={filterOptions.stateTariff}
                    onChange={(e) => setFilterOptions({ ...filterOptions, stateTariff: e.target.value })}
                    className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl py-2 px-3 text-xs text-slate-250 outline-none focus:border-editorial-accent transition cursor-pointer appearance-none"
                    style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23a1a1aa\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '12px' }}
                  >
                    {Object.entries(STATE_TARIFFS).map(([key, t]) => (
                      <option key={key} value={key} className="bg-[#0A0A0B] text-slate-100">
                        {t.name} - {t.discom}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab View Container with transition animations */}
        <div id="active-tab-frame" className="flex-1 min-h-[400px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              {activeTab === 'dashboard' && (
                <DashboardTab
                  data={activeFilteredData}
                  filterOptions={filterOptions}
                  setFilterOptions={setFilterOptions}
                  isFilterOpen={isFilterOpen}
                  setIsFilterOpen={setIsFilterOpen}
                  searchQuery={searchQuery}
                  isCustomDatasetActive={isCustomDatasetActive}
                  customDatasetName={customDatasetName}
                  uploadError={uploadError}
                  setUploadError={setUploadError}
                  onUploadRawText={handleUploadRawText}
                  onResetDataset={handleResetDataset}
                  onLoadDemoData={handleLoadDemoData}
                />
              )}

              {activeTab === 'forecasting' && (
                <ForecastingTab
                  historicalData={activeFilteredData}
                  searchQuery={searchQuery}
                  filterOptions={filterOptions}
                />
              )}

              {activeTab === 'reports' && (
                <ReportsTab
                  user={user}
                  activeData={activeFilteredData}
                  onOpenAuth={() => setIsAuthOpen(true)}
                  filterOptions={filterOptions}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* User Auth Modal panel */}
      {isAuthOpen && (
        <AuthPanel
          onClose={() => setIsAuthOpen(false)}
          onSuccess={(profile) => setUser(profile)}
        />
      )}

      {/* Floating Smart Energy Chatbot */}
      <Chatbot activeData={activeFilteredData} filterOptions={filterOptions} />
    </div>
  );
}
