'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  decomposeSeconds,
  formatExpiryAbsolute,
  type Unit,
} from '@/lib/time';

export type QuickPick = { label: string; seconds: number };

export type DurationPickerProps = {
  value: number;
  onChange: (seconds: number) => void;
  units: Unit[];
  quickPicks?: QuickPick[];
  min: number;
  max: number;
};

export function DurationPicker({
  value,
  onChange,
  units,
  quickPicks,
  min,
  max,
}: DurationPickerProps) {
  const initial = useMemo(() => decomposeSeconds(value, units), []);
  const [amount, setAmount] = useState<string>(String(initial.amount));
  const [unitKey, setUnitKey] = useState<Unit['key']>(initial.unit.key);

  useEffect(() => {
    const n = Number(amount);
    const u = units.find((u) => u.key === unitKey) ?? units[0];
    if (!Number.isFinite(n) || n <= 0) return;
    const total = Math.round(n * u.seconds);
    const clamped = Math.max(min, Math.min(max, total));
    if (clamped !== value) onChange(clamped);
  }, [amount, unitKey]);

  const seconds = useMemo(() => {
    const n = Number(amount);
    const u = units.find((u) => u.key === unitKey) ?? units[0];
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.max(min, Math.min(max, Math.round(n * u.seconds)));
  }, [amount, unitKey, units, min, max]);

  const outOfRange =
    seconds < min || seconds > max || !Number.isFinite(Number(amount)) || Number(amount) <= 0;

  function applyQuick(totalSeconds: number) {
    const { amount: a, unit: u } = decomposeSeconds(totalSeconds, units);
    setAmount(String(a));
    setUnitKey(u.key);
  }

  return (
    <div className="dp">
      <div className="dp-row">
        <input
          type="number"
          min={1}
          step={1}
          inputMode="numeric"
          className="dp-amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
          aria-label="Duration amount"
        />
        <select
          className="dp-unit"
          value={unitKey}
          onChange={(e) => setUnitKey(e.target.value as Unit['key'])}
          aria-label="Duration unit"
        >
          {units.map((u) => (
            <option key={u.key} value={u.key}>
              {u.label}
            </option>
          ))}
        </select>
        <span className={`dp-preview ${outOfRange ? 'err' : ''}`}>
          {outOfRange ? 'out of range' : `expires ${formatExpiryAbsolute(seconds)}`}
        </span>
      </div>

      {quickPicks && quickPicks.length > 0 ? (
        <div className="dp-chips" role="group" aria-label="Quick picks">
          {quickPicks.map((q) => {
            const active = q.seconds === value;
            return (
              <button
                key={q.label}
                type="button"
                className={`dp-chip ${active ? 'on' : ''}`}
                onClick={() => applyQuick(q.seconds)}
              >
                {q.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
