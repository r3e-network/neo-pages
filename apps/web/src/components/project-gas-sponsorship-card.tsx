'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ProjectGasSponsorshipView } from '@neopages/core';

export function ProjectGasSponsorshipCard({ projectId, initialSponsorship, accessRole }: { projectId: string; initialSponsorship: ProjectGasSponsorshipView | null; accessRole: 'owner' | 'admin' | 'editor' | 'developer' | 'viewer' }) {
  const router = useRouter();
  const [isEnabled, setIsEnabled] = useState(initialSponsorship?.isEnabled ?? false);
  const [busy, setBusy] = useState(false);

  async function handleToggle() {
    setBusy(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/gas-sponsorship`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isEnabled: !isEnabled })
      });
      
      if (response.ok) {
        setIsEnabled(!isEnabled);
        router.refresh();
      } else {
        const data = await response.json();
        alert(data.error ?? 'Failed to update gas sponsorship');
      }
    } catch (error) {
      alert('Network error updating gas sponsorship');
    } finally {
      setBusy(false);
    }
  }

  const balance = initialSponsorship?.balance ?? 0;

  return (
    <section className="card stack">
      <div className="split-row">
        <div>
          <p className="eyebrow">Billing</p>
          <h2>Gas Sponsoring</h2>
        </div>
      </div>
      <p className="muted">
        NeoPages can automatically subsidize gas fees for your smart contract interactions, ensuring a seamless experience for your users without requiring them to hold GAS.
      </p>

      <div className="card" style={{ padding: '1rem', background: 'var(--background-modifier-hover, rgba(0,0,0,0.02))' }}>
        <div className="split-row" style={{ alignItems: 'center' }}>
          <div>
            <h3>NeoPages Gas Sponsoring</h3>
            <p className="muted" style={{ margin: 0 }}>
              {isEnabled ? 'Active: Contracts are subsidized' : 'Inactive: Users pay their own gas'}
            </p>
          </div>
          <button
            className="button"
            onClick={handleToggle}
            disabled={busy || (accessRole !== 'owner' && accessRole !== 'admin')}
          >
            {busy ? 'Saving…' : isEnabled ? 'Disable Sponsoring' : 'Enable Sponsoring'}
          </button>
        </div>
      </div>

      {isEnabled && (
        <div style={{ marginTop: '1rem' }}>
          <p className="muted">Current Sponsoring Balance: <strong>{balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GAS</strong></p>
        </div>
      )}
    </section>
  );
}
