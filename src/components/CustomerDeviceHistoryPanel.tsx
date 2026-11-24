import React, { useMemo, useState, useEffect } from 'react';
import {
  Smartphone,
  Tablet,
  Monitor,
  History,
  Clock,
  Search,
  Calendar,
  Filter,
  Globe,
  User,
  X,
  CheckCircle2
} from 'lucide-react';
import { DeviceLoginRecord, UserProfile } from '../types';
import {
  formatExactDateTime,
  formatHoursAgoLabel,
  getHoursAgo
} from '../utils/deviceInfo';

interface CustomerDeviceHistoryPanelProps {
  customers: UserProfile[];
  allDeviceLogins: DeviceLoginRecord[];
  /** When provided, locks view to this individual customer (e.g. modal opened from a customer row). */
  lockedCustomer?: UserProfile | null;
}

type TimeUnit = 'hours' | 'days';

function toHours(valueStr: string, unit: TimeUnit): number | null {
  const trimmed = valueStr.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  return unit === 'days' ? n * 24 : n;
}

export const CustomerDeviceHistoryPanel: React.FC<CustomerDeviceHistoryPanelProps> = ({
  customers,
  allDeviceLogins,
  lockedCustomer = null
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    lockedCustomer ? lockedCustomer.uid : 'all'
  );

  // Flexible time range: e.g. "10 hours ago to 3 days ago" or "12 hours ago to 7 days ago" or single "7 hours ago"
  const [fromValue, setFromValue] = useState<string>('');
  const [fromUnit, setFromUnit] = useState<TimeUnit>('hours');
  const [toValue, setToValue] = useState<string>('');
  const [toUnit, setToUnit] = useState<TimeUnit>('hours');

  const [deviceSearch, setDeviceSearch] = useState<string>('');
  const [deviceTypeFilter, setDeviceTypeFilter] = useState<string>('all');
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    if (lockedCustomer) {
      setSelectedCustomerId(lockedCustomer.uid);
    }
  }, [lockedCustomer]);

  // Keep "hours ago" labels ticking live every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const activeCustomerId = lockedCustomer ? lockedCustomer.uid : selectedCustomerId;

  const customerScopedLogins = useMemo(() => {
    if (activeCustomerId === 'all') return allDeviceLogins;
    return allDeviceLogins.filter((rec) => rec.customerId === activeCustomerId);
  }, [allDeviceLogins, activeCustomerId]);

  // Compute normalized [minHoursAgo, maxHoursAgo] bounds automatically.
  // If user fills ONLY "From" (e.g. "7 hours"), treat it as "within last 7 hours" (0 to 7 hrs ago)
  // unless "To" is also filled (e.g. "10 hours ago to 3 days ago" -> between 10h and 72h ago).
  const timeRangeBounds = useMemo(() => {
    const fromH = toHours(fromValue, fromUnit);
    const toH = toHours(toValue, toUnit);

    if (fromH === null && toH === null) {
      return { minHours: null as number | null, maxHours: null as number | null, label: 'All Time (Since Website Launch)' };
    }
    if (fromH !== null && toH === null) {
      // Single input entered (e.g. "7 hours ago") -> show devices within last 7 hours (0 to 7 hrs ago)
      return {
        minHours: 0,
        maxHours: fromH,
        label: `Last ${fromValue} ${fromUnit === 'days' ? (Number(fromValue) === 1 ? 'day' : 'days') : (Number(fromValue) === 1 ? 'hour' : 'hours')} (0 to ${fromH} hrs ago)`
      };
    }
    if (fromH === null && toH !== null) {
      // Only "To" entered -> within last toH hours
      return {
        minHours: 0,
        maxHours: toH,
        label: `Last ${toValue} ${toUnit === 'days' ? (Number(toValue) === 1 ? 'day' : 'days') : (Number(toValue) === 1 ? 'hour' : 'hours')} (0 to ${toH} hrs ago)`
      };
    }

    // Both From and To entered (e.g. 10 hours ago to 3 days ago, or even reversed 3 days to 10 hours)
    const minH = Math.min(fromH!, toH!);
    const maxH = Math.max(fromH!, toH!);
    return {
      minHours: minH,
      maxHours: maxH,
      label: `${fromValue} ${fromUnit} ago to ${toValue} ${toUnit} ago (${minH}h – ${maxH}h ago)`
    };
  }, [fromValue, fromUnit, toValue, toUnit]);

  const filteredLogins = useMemo(() => {
    const q = deviceSearch.trim().toLowerCase();

    return customerScopedLogins.filter((rec) => {
      if (deviceTypeFilter !== 'all' && rec.deviceType !== deviceTypeFilter) {
        return false;
      }

      if (timeRangeBounds.minHours !== null && timeRangeBounds.maxHours !== null) {
        const hrsAgo = getHoursAgo(rec.loggedInAt, nowMs);
        if (hrsAgo < timeRangeBounds.minHours || hrsAgo > timeRangeBounds.maxHours) {
          return false;
        }
      }

      if (q) {
        const haystack = [
          rec.deviceName,
          rec.deviceType,
          rec.deviceModel,
          rec.os,
          rec.browser,
          rec.customerName,
          rec.customerEmail,
          rec.timezone,
          rec.loginMethod
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [customerScopedLogins, deviceTypeFilter, timeRangeBounds, deviceSearch, nowMs]);

  // The most recent (last) device that logged in within the active filter/time range
  const lastMatchingDevice = filteredLogins[0] || null;

  // Aggregate unique device names used across the filtered history
  const uniqueDevicesSummary = useMemo(() => {
    const map = new Map<
      string,
      {
        deviceName: string;
        deviceType: DeviceLoginRecord['deviceType'];
        count: number;
        lastLoggedInAt: string;
        firstLoggedInAt: string;
      }
    >();

    for (const rec of filteredLogins) {
      const existing = map.get(rec.deviceName);
      if (!existing) {
        map.set(rec.deviceName, {
          deviceName: rec.deviceName,
          deviceType: rec.deviceType,
          count: 1,
          lastLoggedInAt: rec.loggedInAt,
          firstLoggedInAt: rec.loggedInAt
        });
      } else {
        existing.count += 1;
        if (new Date(rec.loggedInAt).getTime() > new Date(existing.lastLoggedInAt).getTime()) {
          existing.lastLoggedInAt = rec.loggedInAt;
        }
        if (new Date(rec.loggedInAt).getTime() < new Date(existing.firstLoggedInAt).getTime()) {
          existing.firstLoggedInAt = rec.loggedInAt;
        }
      }
    }

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.lastLoggedInAt).getTime() - new Date(a.lastLoggedInAt).getTime()
    );
  }, [filteredLogins]);

  const renderDeviceIcon = (type: DeviceLoginRecord['deviceType'], sizeClass = 'w-4 h-4') => {
    if (type === 'Mobile Phone') return <Smartphone className={`${sizeClass} text-blue-600 shrink-0`} />;
    if (type === 'Tablet') return <Tablet className={`${sizeClass} text-indigo-600 shrink-0`} />;
    if (type === 'Historical Session') return <History className={`${sizeClass} text-amber-600 shrink-0`} />;
    return <Monitor className={`${sizeClass} text-emerald-600 shrink-0`} />;
  };

  const getDeviceTypeBadgeClass = (type: DeviceLoginRecord['deviceType']) => {
    if (type === 'Mobile Phone') return 'bg-blue-50 text-blue-700 border-blue-200';
    if (type === 'Tablet') return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    if (type === 'Historical Session') return 'bg-amber-50 text-amber-800 border-amber-200';
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  };

  const applyRangePreset = (fVal: string, fUnit: TimeUnit, tVal: string, tUnit: TimeUnit) => {
    setFromValue(fVal);
    setFromUnit(fUnit);
    setToValue(tVal);
    setToUnit(tUnit);
  };

  const clearTimeRange = () => {
    setFromValue('');
    setFromUnit('hours');
    setToValue('');
    setToUnit('hours');
  };

  const activeCustomerObj =
    lockedCustomer || customers.find((c) => c.uid === activeCustomerId) || null;

  const hasAnyRangeInput = Boolean(fromValue.trim() || toValue.trim());

  return (
    <div className="space-y-4">
      {/* Top Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-2xl bg-slate-50 border border-gray-200">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Logins in Range</div>
          <div className="text-lg font-extrabold text-gray-900 mt-0.5">{filteredLogins.length}</div>
        </div>
        <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-200">
          <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Unique Devices</div>
          <div className="text-lg font-extrabold text-blue-900 mt-0.5">{uniqueDevicesSummary.length}</div>
        </div>
        <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200">
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Phones & Tablets</div>
          <div className="text-lg font-extrabold text-emerald-900 mt-0.5">
            {filteredLogins.filter((r) => r.deviceType === 'Mobile Phone' || r.deviceType === 'Tablet').length}
          </div>
        </div>
        <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200">
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800">All-Time Total</div>
          <div className="text-lg font-extrabold text-amber-950 mt-0.5">{customerScopedLogins.length}</div>
        </div>
      </div>

      {/* Filters & Flexible From–To Hours/Days Range Search */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-gray-200 space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* Individual Customer Selector (shown in full tab view) */}
          {!lockedCustomer && (
            <div className="lg:col-span-4">
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-500 mb-1">
                Individual Customer
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:outline-blue-600 cursor-pointer"
              >
                <option value="all">All Customers ({customers.length})</option>
                {customers.map((c) => {
                  const count = allDeviceLogins.filter((r) => r.customerId === c.uid).length;
                  return (
                    <option key={c.uid} value={c.uid}>
                      {c.fullName} ({c.email}) — {count} login{count === 1 ? '' : 's'}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Flexible Time-Ago Range: Single Hour OR Range (e.g. 10 hours ago to 3 days ago, 12 hours to 7 days ago) */}
          <div className={lockedCustomer ? 'lg:col-span-8' : 'lg:col-span-5'}>
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-500 mb-1">
              Time Ago / Range (e.g. 7 hrs OR 10 hrs to 3 days)
            </label>
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5">
              {/* FROM */}
              <div className="flex items-center bg-white border border-blue-200 rounded-xl overflow-hidden flex-1 min-w-[130px]">
                <Clock className="w-3.5 h-3.5 text-blue-600 ml-2.5 shrink-0" />
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={fromValue}
                  onChange={(e) => setFromValue(e.target.value)}
                  placeholder="From (e.g. 10)"
                  className="w-full px-2 py-2 text-xs font-bold text-gray-900 focus:outline-none min-w-0"
                />
                <select
                  value={fromUnit}
                  onChange={(e) => setFromUnit(e.target.value as TimeUnit)}
                  className="px-1.5 py-2 bg-blue-50/70 border-l border-blue-100 text-[10px] font-extrabold text-blue-800 focus:outline-none cursor-pointer shrink-0"
                >
                  <option value="hours">hrs ago</option>
                  <option value="days">days ago</option>
                </select>
              </div>

              <span className="text-[10px] font-black uppercase text-gray-400 px-0.5 shrink-0">to</span>

              {/* TO */}
              <div className="flex items-center bg-white border border-blue-200 rounded-xl overflow-hidden flex-1 min-w-[130px]">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={toValue}
                  onChange={(e) => setToValue(e.target.value)}
                  placeholder="To (e.g. 3)"
                  className="w-full px-2.5 py-2 text-xs font-bold text-gray-900 focus:outline-none min-w-0"
                />
                <select
                  value={toUnit}
                  onChange={(e) => setToUnit(e.target.value as TimeUnit)}
                  className="px-1.5 py-2 bg-blue-50/70 border-l border-blue-100 text-[10px] font-extrabold text-blue-800 focus:outline-none cursor-pointer shrink-0"
                >
                  <option value="hours">hrs ago</option>
                  <option value="days">days ago</option>
                </select>
              </div>

              {hasAnyRangeInput && (
                <button
                  type="button"
                  onClick={clearTimeRange}
                  className="p-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 cursor-pointer shrink-0"
                  title="Clear time range"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Search Device Name / Brand (Nokia, iPhone, Samsung, Dell, HP, MacBook, etc.) */}
          <div className={lockedCustomer ? 'lg:col-span-4' : 'lg:col-span-3'}>
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-500 mb-1">
              Search Device Brand / Name
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={deviceSearch}
                onChange={(e) => setDeviceSearch(e.target.value)}
                placeholder="Nokia, iPhone, Samsung, Dell, PC..."
                className="w-full pl-8 pr-8 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:outline-blue-600"
              />
              {deviceSearch && (
                <button
                  type="button"
                  onClick={() => setDeviceSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
                  title="Clear device search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quick Time-Range Presets & Device Type Filter */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-200/80">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-extrabold uppercase text-gray-400 inline-flex items-center mr-1">
              <Filter className="w-3 h-3 mr-1" /> Quick Ranges:
            </span>
            {[
              { label: 'All Time', fV: '', fU: 'hours' as TimeUnit, tV: '', tU: 'hours' as TimeUnit },
              { label: 'Last 1 hr', fV: '1', fU: 'hours' as TimeUnit, tV: '', tU: 'hours' as TimeUnit },
              { label: 'Last 6 hrs', fV: '6', fU: 'hours' as TimeUnit, tV: '', tU: 'hours' as TimeUnit },
              { label: 'Last 24 hrs', fV: '24', fU: 'hours' as TimeUnit, tV: '', tU: 'hours' as TimeUnit },
              { label: '10 hrs → 3 days', fV: '10', fU: 'hours' as TimeUnit, tV: '3', tU: 'days' as TimeUnit },
              { label: '12 hrs → 7 days', fV: '12', fU: 'hours' as TimeUnit, tV: '7', tU: 'days' as TimeUnit },
              { label: 'Last 7 days', fV: '7', fU: 'days' as TimeUnit, tV: '', tU: 'days' as TimeUnit }
            ].map((preset) => {
              const isSelected =
                fromValue === preset.fV &&
                fromUnit === preset.fU &&
                toValue === preset.tV &&
                toUnit === preset.tU;
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applyRangePreset(preset.fV, preset.fU, preset.tV, preset.tU)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer border ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-blue-50 hover:text-blue-700'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          <select
            value={deviceTypeFilter}
            onChange={(e) => setDeviceTypeFilter(e.target.value)}
            className="px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-[11px] font-bold text-gray-700 cursor-pointer"
          >
            <option value="all">All Device Types</option>
            <option value="Mobile Phone">Mobile Phones</option>
            <option value="Tablet">Tablets</option>
            <option value="Desktop / Laptop">Desktop / Laptop PCs</option>
            <option value="Historical Session">Historical Sessions (Legacy)</option>
          </select>
        </div>
      </div>

      {/* AUTOMATIC HIGHLIGHT: LAST DEVICE THAT LOGGED IN FOR THIS TIME RANGE */}
      {lastMatchingDevice && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-[#0A2540] to-indigo-950 text-white shadow-sm border border-indigo-800/50 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-300">
                Last Logged-In Device • {timeRangeBounds.label}
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-white/15 text-indigo-100 text-[10px] font-extrabold border border-white/20">
              {formatHoursAgoLabel(lastMatchingDevice.loggedInAt, nowMs)}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-xs">
                {renderDeviceIcon(lastMatchingDevice.deviceType, 'w-5 h-5')}
              </div>
              <div className="min-w-0">
                <div className="font-black text-sm sm:text-base text-white break-words">
                  {lastMatchingDevice.deviceName}
                </div>
                <div className="text-[11px] text-indigo-200 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-0.5">
                  <span className="font-bold text-white">{lastMatchingDevice.customerName}</span>
                  <span>• {lastMatchingDevice.deviceType}</span>
                  <span>• {formatExactDateTime(lastMatchingDevice.loggedInAt).full}</span>
                </div>
              </div>
            </div>
          </div>

          {uniqueDevicesSummary.length > 1 && (
            <div className="pt-2 border-t border-white/15 text-[11px] text-indigo-100 flex flex-wrap items-center gap-1.5">
              <span className="font-bold text-indigo-300 mr-1">
                All {uniqueDevicesSummary.length} devices in this range:
              </span>
              {uniqueDevicesSummary.map((d) => (
                <span
                  key={d.deviceName}
                  className="px-2 py-0.5 rounded-md bg-white/10 border border-white/15 text-[10px] font-bold text-white"
                >
                  {d.deviceName} ({d.count}x)
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* All Recorded Device Names Summary Pills */}
      {uniqueDevicesSummary.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-white border border-gray-200 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h4 className="text-xs font-extrabold text-gray-900">
              Device Names Found {activeCustomerObj ? `for ${activeCustomerObj.fullName}` : '(All Customers)'}
            </h4>
            <span className="text-[10px] font-bold text-gray-500">
              {uniqueDevicesSummary.length} unique device{uniqueDevicesSummary.length === 1 ? '' : 's'} • Click any device to filter
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {uniqueDevicesSummary.map((d) => (
              <button
                key={d.deviceName}
                type="button"
                onClick={() => setDeviceSearch(deviceSearch === d.deviceName ? '' : d.deviceName)}
                className={`inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
                  deviceSearch === d.deviceName
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-50 hover:bg-blue-50 text-gray-800 border-gray-200'
                }`}
                title={`Last logged in: ${formatHoursAgoLabel(d.lastLoggedInAt, nowMs)}`}
              >
                {renderDeviceIcon(d.deviceType)}
                <span className="truncate max-w-[280px]">{d.deviceName}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[9px] font-black ${
                    deviceSearch === d.deviceName
                      ? 'bg-white/20 text-white'
                      : 'bg-white text-gray-600 border border-gray-200'
                  }`}
                >
                  {d.count}x
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chronological Device Login Timeline (Newest -> Oldest since website launch) */}
      <div className="space-y-2.5">
        {filteredLogins.length === 0 ? (
          <div className="text-center py-10 px-4 bg-slate-50 border border-dashed border-gray-300 rounded-2xl space-y-2">
            <Clock className="w-8 h-8 text-gray-300 mx-auto" />
            <p className="text-xs font-bold text-gray-700">
              No device logins found for <span className="text-blue-700">{timeRangeBounds.label}</span>
              {deviceSearch ? ` matching "${deviceSearch}"` : ''}.
            </p>
            <p className="text-[11px] text-gray-500">
              Adjust your hours/days range or click <strong>All Time</strong> to list every device since website launch.
            </p>
            {(hasAnyRangeInput || deviceSearch || deviceTypeFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  clearTimeRange();
                  setDeviceSearch('');
                  setDeviceTypeFilter('all');
                }}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer"
              >
                Reset Filters & Show All Devices
              </button>
            )}
          </div>
        ) : (
          filteredLogins.map((rec, idx) => {
            const dt = formatExactDateTime(rec.loggedInAt);
            const hrsLabel = formatHoursAgoLabel(rec.loggedInAt, nowMs);
            const exactHours = getHoursAgo(rec.loggedInAt, nowMs);

            return (
              <div
                key={rec.id}
                className={`p-3.5 sm:p-4 rounded-2xl bg-white border transition-colors shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  idx === 0 ? 'border-indigo-300 ring-1 ring-indigo-100' : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-start space-x-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 border border-gray-200 flex items-center justify-center shrink-0 mt-0.5">
                    {renderDeviceIcon(rec.deviceType)}
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center flex-wrap gap-1.5">
                      {idx === 0 && (
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-indigo-600 text-white">
                          Last Logged In
                        </span>
                      )}
                      <span className="font-extrabold text-xs sm:text-sm text-gray-900 break-words">
                        {rec.deviceName}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${getDeviceTypeBadgeClass(
                          rec.deviceType
                        )}`}
                      >
                        {rec.deviceType}
                      </span>
                      {rec.loginMethod && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          {rec.loginMethod}
                        </span>
                      )}
                    </div>

                    {!lockedCustomer && (
                      <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-gray-700">
                        <span className="inline-flex items-center font-bold">
                          <User className="w-3 h-3 mr-1 text-blue-600" />
                          {rec.customerName}
                        </span>
                        {rec.customerEmail && (
                          <span className="text-gray-500 font-mono text-[10px]">{rec.customerEmail}</span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-500">
                      <span className="inline-flex items-center font-semibold text-gray-700">
                        <Calendar className="w-3 h-3 mr-1 text-gray-400" />
                        {dt.date} • {dt.time}
                      </span>
                      {rec.os && <span>OS: <strong className="text-gray-700">{rec.os}</strong></span>}
                      {rec.browser && <span>Browser: <strong className="text-gray-700">{rec.browser}</strong></span>}
                      {rec.screenResolution && rec.screenResolution !== 'Unknown' && (
                        <span>Screen: <strong className="text-gray-700">{rec.screenResolution}</strong></span>
                      )}
                      {rec.timezone && rec.timezone !== 'Unknown' && (
                        <span className="inline-flex items-center">
                          <Globe className="w-3 h-3 mr-1 text-gray-400" />
                          {rec.timezone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right-side Hours-Ago Badge */}
                <div className="sm:text-right shrink-0 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                  <span
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-black border inline-flex items-center space-x-1 ${
                      exactHours <= 1
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : exactHours <= 24
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <Clock className="w-3 h-3 shrink-0" />
                    <span>{hrsLabel}</span>
                  </span>
                  <span className="text-[10px] font-mono text-gray-400">
                    {exactHours < 0.05 ? '0.0' : exactHours.toFixed(1)} hrs before now
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
