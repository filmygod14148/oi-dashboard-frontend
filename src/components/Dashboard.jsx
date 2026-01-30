import React, { useState, useEffect } from 'react';
import axios from 'axios';
import SnapshotTable from './SnapshotTable';

const Dashboard = () => {
    const [symbol, setSymbol] = useState('NIFTY');
    const [currentData, setCurrentData] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [liveSpotPrice, setLiveSpotPrice] = useState('N/A'); // Live spot price that updates every 5s

    const [apiError, setApiError] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // UI States (Restored)
    const [timeLeft, setTimeLeft] = useState(5); // Countdown timer
    const [previousData, setPreviousData] = useState(null); // Store previous fetch for comparison
    const [strikeCount, setStrikeCount] = useState(5); // Default 5 strikes
    const [selectedDate, setSelectedDate] = useState(() => {
        const d = new Date();
        const offset = d.getTimezoneOffset();
        const local = new Date(d.getTime() - (offset * 60 * 1000));
        return local.toISOString().split('T')[0];
    }); // Default: Today (Local)
    const [timeFilter, setTimeFilter] = useState('all'); // Default: All Time
    const [currentTime, setCurrentTime] = useState(new Date()); // Clock state
    const [showClock, setShowClock] = useState(true); // Toggle clock

    const getApiBase = () => {
        let base = import.meta.env.VITE_API_URL || '';
        return base.endsWith('/') ? base.slice(0, -1) : base;
    };

    const fetchData = async (isBackground = false) => {
        if (!isBackground) setLoading(true);
        setApiError(null);

        try {
            const API_BASE = getApiBase();
            const timestamp = new Date().toLocaleTimeString();
            console.log(`[${timestamp}] ${isBackground ? 'Background' : 'Manual'} fetch started for ${symbol}...`);
            console.log(`[${timestamp}] Target URL: ${API_BASE}/api/latest?symbol=${symbol}`);

            // 1. Fetch latest data
            const latestRes = await axios.get(`${API_BASE}/api/latest?symbol=${symbol}`);
            const latest = latestRes.data;

            if (!latest) {
                console.warn(`[${timestamp}] No data returned from API`);
                if (!isBackground) setLoading(false);
                return;
            }

            console.log(`[${timestamp}] Success! Latest data timestamp: ${latest.timestamp}`);

            // Update Spot Price immediately from latest data
            if (latest?.data?.records?.underlyingValue) {
                setLiveSpotPrice(latest.data.records.underlyingValue);
            }

            if (previousData) {
                console.log(`[${timestamp}] Comparison: ID(${latest._id === previousData._id}) Time(${latest.timestamp === previousData.timestamp})`);
            }

            const isNewData = !previousData ||
                (latest._id && previousData._id !== latest._id) ||
                (latest.timestamp !== previousData.timestamp);

            if (isNewData) {
                console.log(`[${timestamp}] New data detected! Fetching full history...`);
                const histRes = await axios.get(`${API_BASE}/api/history?symbol=${symbol}&limit=all`);

                if (histRes.data && histRes.data.length > 0) {
                    setHistory(histRes.data);
                    setCurrentData(latest);
                    setLastUpdated(new Date(latest.timestamp).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" }));
                    setPreviousData(latest);
                    console.log(`[${timestamp}] History updated: ${histRes.data.length} records`);
                }
            } else {
                console.log(`[${timestamp}] Data is current (no change).`);
                // Always update currentData from latest to ensure UI is in sync with DB
                setCurrentData(latest);
                setLastUpdated(new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" }));
            }
        } catch (error) {
            const timestamp = new Date().toLocaleTimeString();
            console.error(`[${timestamp}] API Error:`, error.message);
            setApiError(error.message);
        }
        if (!isBackground) setLoading(false);
    };

    // Manual Refresh Trigger (Calls backend scraper)
    const handleManualRefresh = async () => {
        setIsRefreshing(true);
        setLoading(true);
        setApiError(null);
        try {
            const API_BASE = getApiBase();
            const timestamp = new Date().toLocaleTimeString();
            console.log(`[${timestamp}] Triggering backend /api/refresh for ${symbol}...`);

            const [refreshRes] = await axios.all([
                axios.get(`${API_BASE}/api/refresh?symbol=${symbol}`),
                // Wait at least 1s for the UI to feel responsive if it returns too fast
                new Promise(r => setTimeout(r, 1000))
            ]);

            const refreshStatus = refreshRes.data?.data?.status;
            if (refreshStatus === 'no_change') {
                console.log(`[${timestamp}] Backend: NSE data has not updated yet.`);
            } else {
                console.log(`[${timestamp}] Backend: New data scraped and saved.`);
            }

            await fetchData(false); // Fetch the latest state
        } catch (error) {
            console.error('Refresh Error:', error.message);
            setApiError(`Refresh failed: ${error.message}`);
        } finally {
            setIsRefreshing(false);
            setLoading(false);
        }
    };

    // Initial fetch on mount or symbol change
    useEffect(() => {
        fetchData(false);
    }, [symbol]);

    // Poll for latest data (Checking for changes)
    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    fetchData(true);
                    return 5; // Reset to 5 seconds
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [symbol, previousData]);

    // Clock Effect
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Derived values - Always use the latest snapshot for spot price
    const latestSnapshot = history.length > 0 ? history[history.length - 1] : currentData;
    const totalCE = currentData?.data?.filtered?.CE?.totOI || 0;
    const totalPE = currentData?.data?.filtered?.PE?.totOI || 0;
    const pcr = (totalPE / (totalCE || 1)).toFixed(2);
    const spotPrice = latestSnapshot?.data?.records?.underlyingValue || 'N/A';

    // Generate last 7 days for dropdown
    const availableDates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split('T')[0];
    });

    return (
        <div className="p-6 max-w-7xl mx-auto relative">
            {/* Floating Time Display */}
            {showClock && (
                <div className="fixed top-4 left-4 bg-black/80 text-white px-3 py-1 rounded shadow-lg z-50 text-sm font-mono tracking-wider border border-gray-600">
                    {currentTime.toLocaleTimeString()}
                </div>
            )}

            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                        OI Dashboard
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${apiError ? 'bg-red-100 text-red-800 border-red-200' : 'bg-green-100 text-green-800 border-green-200'}`}>
                            <span className={`w-2 h-2 mr-1.5 rounded-full ${apiError ? 'bg-red-400' : 'bg-green-400 animate-pulse'}`}></span>
                            {apiError ? 'Disconnected' : 'Live'}
                        </span>
                    </h1>
                    {apiError && (
                        <p className="text-red-500 text-xs mt-1 font-mono">Error: {apiError}</p>
                    )}
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500 flex flex-col items-end">
                        <span className="font-medium">Web: {lastUpdated || 'Never'}</span>
                        {currentData?.data?.nseTimestamp && (
                            <span className="text-xs text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded mt-1 border border-blue-100">
                                NSE: {new Date(currentData.data.nseTimestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                            </span>
                        )}
                    </span>

                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none bg-white px-3 py-2 rounded border shadow-sm hover:bg-gray-50 transition-colors">
                        <input
                            type="checkbox"
                            checked={showClock}
                            onChange={(e) => setShowClock(e.target.checked)}
                            className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        Clock
                    </label>

                    <select
                        value={symbol}
                        onChange={(e) => setSymbol(e.target.value)}
                        className="p-2 border rounded shadow-sm bg-white font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        <option value="NIFTY">NIFTY 50</option>
                        <option value="BANKNIFTY">BANKNIFTY</option>
                        <option value="FINNIFTY">FINNIFTY</option>
                    </select>
                    <button
                        onClick={handleManualRefresh}
                        disabled={loading || isRefreshing}
                        className={`px-4 py-2 text-white rounded shadow-md transition-all active:scale-95 disabled:opacity-50 min-w-[120px] font-bold ${isRefreshing ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                        {isRefreshing ? 'Scraping...' : loading ? 'Updating...' : `Refresh (${timeLeft}s)`}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded shadow border-l-4 border-blue-500">
                    <h3 className="text-gray-500 text-sm">Spot Price</h3>
                    <p className="text-2xl font-bold">{liveSpotPrice}</p>
                </div>
                <div className="bg-white p-4 rounded shadow border-l-4 border-green-500">
                    <h3 className="text-gray-500 text-sm">PCR</h3>
                    <p className="text-2xl font-bold">{pcr}</p>
                </div>
                <div className="bg-white p-4 rounded shadow border-l-4 border-red-500">
                    <h3 className="text-gray-500 text-sm">Total CE OI</h3>
                    <p className="text-2xl font-bold text-red-600">{totalCE.toLocaleString()}</p>
                </div>
                <div className="bg-white p-4 rounded shadow border-l-4 border-teal-500">
                    <h3 className="text-gray-500 text-sm">Total PE OI</h3>
                    <p className="text-2xl font-bold text-teal-600">{totalPE.toLocaleString()}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                <div className="bg-white p-4 rounded shadow">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg">Snapshot History</h3>
                        <div className="flex gap-3 items-center">
                            <div className="flex items-center gap-2 text-sm">
                                <label className="text-gray-600">Strikes:</label>
                                <select
                                    className="border rounded px-2 py-1 text-sm bg-white"
                                    value={strikeCount}
                                    onChange={(e) => setStrikeCount(Number(e.target.value))}
                                >
                                    <option value={3}>3</option>
                                    <option value={5}>5</option>
                                    <option value={7}>7</option>
                                    <option value={9}>9</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <label className="text-gray-600">Date:</label>
                                <select
                                    className="border rounded px-2 py-1 text-sm bg-white"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                >
                                    {availableDates.map(date => (
                                        <option key={date} value={date}>{date}</option>
                                    ))}
                                    <option value="">All Time</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <label className="text-gray-600">Time:</label>
                                <select
                                    className="border rounded px-2 py-1 text-sm"
                                    value={timeFilter}
                                    onChange={(e) => setTimeFilter(e.target.value)}
                                >
                                    <option value="1h">Last 1 Hour</option>
                                    <option value="3h">Last 3 Hours</option>
                                    <option value="6h">Last 6 Hours</option>
                                    <option value="all">All Time</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <SnapshotTable historyData={history} selectedDate={selectedDate} timeFilter={timeFilter} strikeCount={strikeCount} />
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
