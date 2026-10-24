// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { parseMoneyInput } from '@/engine';
import { useEffect, useId, useState } from 'react';

function formatMoney(value: number): string {
  if (!Number.isFinite(value) || value === 0) return '';
  return value.toLocaleString('en-US');
}

export function Money({
  label, value, onChange, hint, testId, allowNegative = false,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  hint?: string;
  testId?: string;
  allowNegative?: boolean;
}) {
  const id = useId();
  const errId = `${id}-err`;
  const [text, setText] = useState(() => formatMoney(value));
  const [error, setError] = useState<string | null>(Number.isFinite(value) ? null : 'Amount is not a finite number.');
  useEffect(() => {
    if (!Number.isFinite(value)) return;
    const parsed = parseMoneyInput(text, { allowNegative });
    if (!parsed.ok || parsed.value !== value) setText(formatMoney(value));
    if (parsed.ok) setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <label className={`field${error ? ' invalid' : ''}`} htmlFor={id}>
      <span className="field-label">{label}</span>
      <span className={`money-input${error ? ' invalid' : ''}`}>
        <span aria-hidden>$</span>
        <input
          id={id}
          data-testid={testId}
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          value={text}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errId : undefined}
          onChange={(e) => {
            const raw = e.target.value;
            setText(raw);
            const parsed = parseMoneyInput(raw, { allowNegative });
            if (parsed.ok) {
              setError(null);
              onChange(parsed.value);
            } else {
              setError(parsed.error);
              onChange(Number.NaN);
            }
          }}
          onBlur={() => {
            if (!error && Number.isFinite(value)) setText(formatMoney(value));
          }}
        />
      </span>
      {error && <span className="field-error" id={errId} data-testid={testId ? `${testId}-error` : undefined} role="alert">{error}</span>}
      {hint && !error && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function Text({ label, value, onChange, testId, placeholder }: { label: string; value: string; onChange: (s: string) => void; testId?: string; placeholder?: string }) {
  const id = useId();
  return (
    <label className="field" htmlFor={id}>
      <span className="field-label">{label}</span>
      <input id={id} className="text-input" data-testid={testId} value={value} placeholder={placeholder} autoComplete="off" onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

export function Age({ label, value, onChange, testId, hint }: { label: string; value: number | null; onChange: (n: number | null) => void; testId?: string; hint?: string }) {
  const id = useId();
  return (
    <label className="field" htmlFor={id}>
      <span className="field-label">{label}</span>
      <input
        id={id}
        className="text-input"
        data-testid={testId}
        inputMode="numeric"
        autoComplete="off"
        placeholder="Unanswered"
        value={value == null ? '' : String(value)}
        onChange={(e) => {
          const s = e.target.value.trim();
          if (s === '') {
            onChange(null);
            return;
          }
          if (!/^\d{1,3}$/.test(s)) return;
          onChange(Number(s));
        }}
      />
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function Check({ label, checked, onChange, testId, hint }: { label: string; checked: boolean; onChange: (b: boolean) => void; testId?: string; hint?: string }) {
  return (
    <label className="check">
      <input type="checkbox" data-testid={testId} checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        {label}
        {hint && <small className="field-hint block">{hint}</small>}
      </span>
    </label>
  );
}

export function YesNo({ question, value, onChange, testId, help }: { question: string; value: boolean | null; onChange: (b: boolean) => void; testId: string; help?: string }) {
  return (
    <div className="yesno" role="group" aria-label={question}>
      <p className="yesno-q">{question}</p>
      {help && <p className="muted">{help}</p>}
      <div className="yesno-buttons">
        <button type="button" data-testid={`${testId}-yes`} className={value === true ? 'pill on' : 'pill'} onClick={() => onChange(true)}>Yes</button>
        <button type="button" data-testid={`${testId}-no`} className={value === false ? 'pill on' : 'pill'} onClick={() => onChange(false)}>No</button>
      </div>
    </div>
  );
}

export function Choice<T extends string>({ label, value, options, onChange, testId }: { label: string; value: T; options: { value: T; label: string; hint?: string }[]; onChange: (v: T) => void; testId?: string }) {
  return (
    <fieldset className="choice" data-testid={testId}>
      <legend className="field-label">{label}</legend>
      <div className="choice-grid">
        {options.map((o) => (
          <button type="button" key={o.value} data-value={o.value} className={o.value === value ? 'choice-card on' : 'choice-card'} onClick={() => onChange(o.value)}>
            <strong>{o.label}</strong>
            {o.hint && <span>{o.hint}</span>}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
