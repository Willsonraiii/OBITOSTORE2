import React, { useState, useEffect, useCallback } from 'react';
import { CloseIcon, CheckIcon, PremiumKeyIcon, SparkIcon } from './icons';

export default function AdminPassesModal({ apiKey, onClose }) {
  const [activeTab, setActiveTab] = useState('referrals'); // 'referrals' | 'clients'
  const [referrals, setReferrals] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedKey, setCopiedKey] = useState(null);

  // New Referral Form
  const [newRefCode, setNewRefCode] = useState('');
  const [newRefMaxUses, setNewRefMaxUses] = useState('1');
  const [newRefNote, setNewRefNote] = useState('');
  const [creatingRef, setCreatingRef] = useState(false);

  // New Client Form
  const [newClientName, setNewClientName] = useState('');
  const [newClientId, setNewClientId] = useState('');
  const [newClientCode, setNewClientCode] = useState('');
  const [creatingClient, setCreatingClient] = useState(false);

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/admin/members', {
        headers: { 'x-access-token': apiKey }
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to load member passes');
      setReferrals(data.referrals || []);
      setClients(data.clients || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [apiKey]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const copyToClipboard = (text, key) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCreateReferral = async (e) => {
    e.preventDefault();
    if (!newRefCode.trim()) return;
    try {
      setCreatingRef(true);
      setError('');
      const res = await fetch('/api/admin/referrals', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-access-token': apiKey },
        body: JSON.stringify({
          code: newRefCode.trim(),
          maxUses: newRefMaxUses === 'unlimited' ? null : parseInt(newRefMaxUses, 10) || 1,
          note: newRefNote.trim()
        })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Could not create referral code');
      setNewRefCode('');
      setNewRefNote('');
      await fetchMembers();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreatingRef(false);
    }
  };

  const handleToggleReferral = async (code) => {
    try {
      const res = await fetch(`/api/admin/referrals/${encodeURIComponent(code)}/toggle`, {
        method: 'POST',
        headers: { 'x-access-token': apiKey }
      });
      if (res.ok) fetchMembers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteReferral = async (code) => {
    if (!window.confirm(`Delete referral code "${code}"?`)) return;
    try {
      const res = await fetch(`/api/admin/referrals/${encodeURIComponent(code)}`, {
        method: 'DELETE',
        headers: { 'x-access-token': apiKey }
      });
      if (res.ok) fetchMembers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreateClient = async (e) => {
    e.preventDefault();
    try {
      setCreatingClient(true);
      setError('');
      const res = await fetch('/api/admin/clients', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-access-token': apiKey },
        body: JSON.stringify({
          name: newClientName.trim(),
          customId: newClientId.trim(),
          customCode: newClientCode.trim()
        })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Could not create client');
      setNewClientName('');
      setNewClientId('');
      setNewClientCode('');
      await fetchMembers();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreatingClient(false);
    }
  };

  const handleToggleClient = async (id) => {
    try {
      const res = await fetch(`/api/admin/clients/${encodeURIComponent(id)}/toggle`, {
        method: 'POST',
        headers: { 'x-access-token': apiKey }
      });
      if (res.ok) fetchMembers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteClient = async (id) => {
    if (!window.confirm(`Delete client "${id}"?`)) return;
    try {
      const res = await fetch(`/api/admin/clients/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'x-access-token': apiKey }
      });
      if (res.ok) fetchMembers();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="studio-modal admin-passes-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="admin-modal-title-row">
            <PremiumKeyIcon width={18} height={18} />
            <span className="modal-title">Access & Referral Pass Manager</span>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close modal">
            <CloseIcon width={16} height={16} />
          </button>
        </div>

        {error && <div className="admin-error-banner" role="alert">{error}</div>}

        <div className="admin-tab-bar">
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'referrals' ? 'active' : ''}`}
            onClick={() => setActiveTab('referrals')}
          >
            Referral / Invite Codes ({referrals.length})
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'clients' ? 'active' : ''}`}
            onClick={() => setActiveTab('clients')}
          >
            Registered Clients ({clients.length})
          </button>
        </div>

        {activeTab === 'referrals' && (
          <div className="admin-tab-content">
            {/* Create Referral Section */}
            <form className="admin-create-card" onSubmit={handleCreateReferral}>
              <h3 className="admin-card-heading">
                <SparkIcon width={14} height={14} /> Create New Referral Code
              </h3>
              <div className="admin-form-grid">
                <div className="admin-input-group">
                  <label>Referral Code</label>
                  <input
                    className="studio-input"
                    placeholder="e.g. VIP-FRIEND or PROMO50"
                    value={newRefCode}
                    onChange={(e) => setNewRefCode(e.target.value)}
                    required
                  />
                </div>
                <div className="admin-input-group">
                  <label>Max Redemptions</label>
                  <select
                    className="studio-input"
                    value={newRefMaxUses}
                    onChange={(e) => setNewRefMaxUses(e.target.value)}
                  >
                    <option value="1">1 time use</option>
                    <option value="3">3 times</option>
                    <option value="5">5 times</option>
                    <option value="10">10 times</option>
                    <option value="25">25 times</option>
                    <option value="unlimited">Unlimited uses</option>
                  </select>
                </div>
                <div className="admin-input-group full-width">
                  <label>Note / Recipient (Optional)</label>
                  <input
                    className="studio-input"
                    placeholder="e.g. For WhatsApp friend, VIP client"
                    value={newRefNote}
                    onChange={(e) => setNewRefNote(e.target.value)}
                  />
                </div>
              </div>
              <button type="submit" className="btn-primary-hero admin-submit-btn" disabled={creatingRef}>
                {creatingRef ? 'Generating…' : '+ Add Referral Code'}
              </button>
            </form>

            {/* List of Referrals */}
            <div className="admin-list-section">
              <h4 className="admin-section-sub">Active Referral Codes</h4>
              {loading ? (
                <div className="admin-empty-state">Loading passes…</div>
              ) : referrals.length === 0 ? (
                <div className="admin-empty-state">No referral codes yet. Create one above!</div>
              ) : (
                <div className="admin-items-stack">
                  {referrals.map((ref) => {
                    const isExhausted = ref.maxUses !== null && ref.usedCount >= ref.maxUses;
                    return (
                      <div key={ref.code} className={`admin-item-row ${ref.status !== 'active' ? 'disabled' : ''}`}>
                        <div className="admin-item-info">
                          <div className="admin-item-badge-row">
                            <span className="admin-code-badge">{ref.code}</span>
                            <span className={`admin-status-pill ${ref.status === 'active' && !isExhausted ? 'active' : 'inactive'}`}>
                              {ref.status !== 'active' ? 'Disabled' : isExhausted ? 'Exhausted' : 'Active'}
                            </span>
                            <span className="admin-usage-count">
                              {ref.usedCount || 0} / {ref.maxUses === null ? '∞' : ref.maxUses} used
                            </span>
                          </div>
                          {ref.note && <p className="admin-item-note">{ref.note}</p>}
                        </div>
                        <div className="admin-item-actions">
                          <button
                            type="button"
                            className="btn-secondary admin-action-btn"
                            onClick={() => copyToClipboard(ref.code, `ref_${ref.code}`)}
                            title="Copy Code"
                          >
                            {copiedKey === `ref_${ref.code}` ? 'Copied ✓' : 'Copy'}
                          </button>
                          <button
                            type="button"
                            className="btn-secondary admin-action-btn"
                            onClick={() => handleToggleReferral(ref.code)}
                          >
                            {ref.status === 'active' ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            type="button"
                            className="btn-secondary admin-action-btn danger"
                            onClick={() => handleDeleteReferral(ref.code)}
                            title="Delete"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'clients' && (
          <div className="admin-tab-content">
            {/* Manually Create Client Pass */}
            <form className="admin-create-card" onSubmit={handleCreateClient}>
              <h3 className="admin-card-heading">
                <SparkIcon width={14} height={14} /> Manually Create Client Pass
              </h3>
              <div className="admin-form-grid">
                <div className="admin-input-group">
                  <label>Client Name / Label</label>
                  <input
                    className="studio-input"
                    placeholder="e.g. Rohan Sharma"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    required
                  />
                </div>
                <div className="admin-input-group">
                  <label>Custom Client ID (optional)</label>
                  <input
                    className="studio-input"
                    placeholder="Leave blank to auto-generate"
                    value={newClientId}
                    onChange={(e) => setNewClientId(e.target.value)}
                  />
                </div>
                <div className="admin-input-group full-width">
                  <label>Custom Access Code (optional)</label>
                  <input
                    className="studio-input"
                    placeholder="Leave blank to auto-generate"
                    value={newClientCode}
                    onChange={(e) => setNewClientCode(e.target.value)}
                  />
                </div>
              </div>
              <button type="submit" className="btn-primary-hero admin-submit-btn" disabled={creatingClient}>
                {creatingClient ? 'Generating…' : '+ Generate Client Pass'}
              </button>
            </form>

            {/* List of Clients */}
            <div className="admin-list-section">
              <h4 className="admin-section-sub">Registered Client Credentials</h4>
              {loading ? (
                <div className="admin-empty-state">Loading clients…</div>
              ) : clients.length === 0 ? (
                <div className="admin-empty-state">No registered clients yet.</div>
              ) : (
                <div className="admin-items-stack">
                  {clients.map((c) => (
                    <div key={c.clientId} className={`admin-item-row ${c.status !== 'active' ? 'disabled' : ''}`}>
                      <div className="admin-item-info">
                        <div className="admin-item-badge-row">
                          <span className="admin-client-name">{c.name || 'Client'}</span>
                          <span className={`admin-status-pill ${c.status === 'active' ? 'active' : 'inactive'}`}>
                            {c.status === 'active' ? 'Active' : 'Revoked'}
                          </span>
                          {c.referralCode && (
                            <span className="admin-ref-tag">via {c.referralCode}</span>
                          )}
                        </div>
                        <div className="admin-creds-preview">
                          <span><strong>ID:</strong> {c.clientId}</span>
                          <span><strong>Code:</strong> <code>{c.accessCode}</code></span>
                        </div>
                      </div>
                      <div className="admin-item-actions">
                        <button
                          type="button"
                          className="btn-secondary admin-action-btn"
                          onClick={() => copyToClipboard(`Client ID: ${c.clientId}\nAccess Code: ${c.accessCode}`, `cred_${c.clientId}`)}
                          title="Copy ID & Code for WhatsApp"
                        >
                          {copiedKey === `cred_${c.clientId}` ? 'Copied ✓' : 'Copy Credentials'}
                        </button>
                        <button
                          type="button"
                          className={`btn-secondary admin-action-btn ${c.status === 'active' ? 'danger' : ''}`}
                          onClick={() => handleToggleClient(c.clientId)}
                        >
                          {c.status === 'active' ? 'Revoke' : 'Activate'}
                        </button>
                        <button
                          type="button"
                          className="btn-secondary admin-action-btn danger"
                          onClick={() => handleDeleteClient(c.clientId)}
                          title="Delete"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
