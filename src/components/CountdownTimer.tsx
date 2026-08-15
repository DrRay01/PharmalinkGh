import React, { useEffect, useState } from 'react';
import { formatRemainingTime } from '../utils/geo';
import { Clock, AlertTriangle } from 'lucide-react';

interface CountdownTimerProps {
  expiresAt: string;
  onExpire?: () => void;
  compact?: boolean;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  expiresAt,
  onExpire,
  compact = false,
}) => {
  const [timeState, setTimeState] = useState(() => formatRemainingTime(expiresAt));

  useEffect(() => {
    const interval = setInterval(() => {
      const updated = formatRemainingTime(expiresAt);
      setTimeState(updated);
      if (updated.isExpired && onExpire) {
        onExpire();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  if (timeState.isExpired) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
        <AlertTriangle className="w-3 h-3" />
        Expired
      </span>
    );
  }

  const isCritical = timeState.urgencyLevel === 'critical';
  const isWarning = timeState.urgencyLevel === 'warning';

  const badgeClass = isCritical
    ? 'bg-rose-500/10 text-rose-600 border-rose-200 animate-pulse-subtle'
    : isWarning
    ? 'bg-amber-500/10 text-amber-700 border-amber-200'
    : 'bg-emerald-500/10 text-emerald-700 border-emerald-200';

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 text-[11px] font-medium font-mono px-2 py-0.5 rounded-full border ${badgeClass}`}>
        <Clock className="w-3 h-3" />
        {timeState.formatted}
      </span>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-medium font-mono ${badgeClass}`}>
      <Clock className="w-3.5 h-3.5 shrink-0" />
      <span>Expires in: <strong>{timeState.formatted}</strong></span>
    </div>
  );
};
