// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useState } from 'react';
import { DISCLAIMER_ACK_LABEL, acknowledgeDisclaimer } from '@/lib/disclaimer';
import { DisclaimerDocument } from './DisclaimerDocument';

export function DisclaimerGate({ onAccept }: { onAccept: () => void }) {
  const [checked, setChecked] = useState(false);
  return (
    <div className="disclaimer-gate" data-testid="disclaimer-gate" role="dialog" aria-modal="true" aria-labelledby="disclaimer-title">
      <div className="disclaimer-card">
        <p className="eyebrow">Before you start</p>
        <h1 id="disclaimer-title">Please read this disclaimer</h1>
        <div className="disclaimer-scroll" data-testid="disclaimer-scroll">
          <DisclaimerDocument />
        </div>
        <label className="check" data-testid="disclaimer-ack-label">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            data-testid="disclaimer-ack"
          />
          <span>{DISCLAIMER_ACK_LABEL}</span>
        </label>
        <button
          type="button"
          className="btn primary"
          data-testid="disclaimer-accept"
          disabled={!checked}
          onClick={() => {
            acknowledgeDisclaimer();
            onAccept();
          }}
        >
          I understand — continue
        </button>
      </div>
    </div>
  );
}
