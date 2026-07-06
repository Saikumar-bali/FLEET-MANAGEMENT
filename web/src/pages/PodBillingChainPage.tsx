import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { approveBilling, getPodBillingChain, rejectBilling, rejectPod, verifyPod, viewPodDocument } from '../services/podBilling';
import type { PodDocument, TripBillingChainRecord } from '../services/podBilling';

function money(value: unknown) {
  return `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function statusClass(status: string) {
  if (status === 'VERIFIED' || status === 'BILLED') return 'status-pill status-pill-success';
  if (status === 'REJECTED' || status === 'CANCELLED') return 'status-pill status-pill-danger';
  if (status === 'UNBILLED' || status === 'PENDING') return 'status-pill status-pill-warning';
  return 'status-pill status-pill-default';
}

function tripLabel(pod: PodDocument) {
  const trip = pod.trip;
  return trip ? `${trip.tripNumber} · ${trip.originName} → ${trip.destinationName}` : 'Trip not linked';
}

function podFileLabel(pod: PodDocument) {
  return pod.originalFileName || pod.documentNumber || pod.title || 'POD document';
}

function findBillingPod(billing: TripBillingChainRecord) {
  return billing.trip?.documents?.find((doc) => doc.verificationStatus === 'VERIFIED') || billing.trip?.documents?.[0] || null;
}

export default function PodBillingChainPage() {
  const auth = useAuth();
  const { showToast } = useToast();
  const [pods, setPods] = useState<PodDocument[]>([]);
  const [billings, setBillings] = useState<TripBillingChainRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [ratePerKm, setRatePerKm] = useState('');
  const [notes, setNotes] = useState('');

  const canVerifyPod = auth.hasAnyPermission(['driver_document_verify', 'documents_verify']);
  const canApproveBilling = (auth.permissions || []).includes('finance_approve');
  const pendingPods = useMemo(() => pods.filter((pod) => pod.verificationStatus === 'PENDING'), [pods]);
  const verifiedPods = useMemo(() => pods.filter((pod) => pod.verificationStatus === 'VERIFIED'), [pods]);
  const rejectedPods = useMemo(() => pods.filter((pod) => pod.verificationStatus === 'REJECTED'), [pods]);

  const load = () => {
    if (!auth.accessToken) return;
    setLoading(true);
    setError(null);
    getPodBillingChain(auth.accessToken)
      .then((res) => {
        setPods(res.data?.pods || []);
        setBillings(res.data?.pendingBillings || []);
      })
      .catch((e) => {
        const msg = e.message || 'Failed to load POD chain';
        setError(msg);
        showToast(msg, 'error');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [auth.accessToken]);

  const handleViewPod = async (pod: PodDocument) => {
    if (!auth.accessToken) return;
    setBusy(`view-pod:${pod.id}`);
    try {
      const response = await viewPodDocument(auth.accessToken, pod.id);
      const podUrl = response.data?.url || response.data?.document?.fileUrl;
      if (!podUrl) throw new Error('POD file is not available for viewing.');
      globalThis.open(podUrl, '_blank');
      showToast('POD document opened.', 'success');
    } catch (e: any) {
      const msg = e.message || 'Failed to open POD document';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setBusy(null);
    }
  };

  const handleVerify = async (pod: PodDocument) => {
    if (!auth.accessToken) return;
    setBusy(`verify:${pod.id}`);
    try {
      const response = await verifyPod(auth.accessToken, pod.id, { ratePerKm: ratePerKm || undefined, notes: notes || undefined });
      setRatePerKm('');
      setNotes('');
      showToast(response.data?.billingCreated ? 'POD verified and billing draft created.' : 'POD verified.', 'success');
      load();
    } catch (e: any) {
      const msg = e.message || 'POD verification failed';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setBusy(null);
    }
  };

  const handleRejectPod = async (pod: PodDocument) => {
    if (!auth.accessToken) return;
    const reason = globalThis.prompt('Reason for rejecting POD?');
    if (!reason) return;
    setBusy(`reject-pod:${pod.id}`);
    try {
      await rejectPod(auth.accessToken, pod.id, reason);
      showToast('POD rejected.', 'success');
      load();
    } catch (e: any) {
      const msg = e.message || 'POD rejection failed';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setBusy(null);
    }
  };

  const handleApproveBilling = async (billing: TripBillingChainRecord) => {
    if (!auth.accessToken) return;
    setBusy(`approve-billing:${billing.id}`);
    try {
      await approveBilling(auth.accessToken, billing.id, notes || undefined);
      setNotes('');
      showToast('Billing approved.', 'success');
      load();
    } catch (e: any) {
      const msg = e.message || 'Billing approval failed';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setBusy(null);
    }
  };

  const handleRejectBilling = async (billing: TripBillingChainRecord) => {
    if (!auth.accessToken) return;
    const reason = globalThis.prompt('Reason for rejecting billing?');
    if (!reason) return;
    setBusy(`reject-billing:${billing.id}`);
    try {
      await rejectBilling(auth.accessToken, billing.id, reason);
      showToast('Billing rejected.', 'success');
      load();
    } catch (e: any) {
      const msg = e.message || 'Billing rejection failed';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setBusy(null);
    }
  };

  if (loading && pods.length === 0 && billings.length === 0) return <LoadingState message="Loading POD and billing chain..." />;
  if (error && pods.length === 0 && billings.length === 0) return <ErrorState message={error} onRetry={load} />;

  const historyPods = [...verifiedPods, ...rejectedPods].slice(0, 12);

  return (
    <section className="pod-chain-page">
      <PageHeader eyebrow="Finance Operations" title="POD & Billing Chain" description="Verify POD documents, create billing drafts, and complete finance approval." actions={<button type="button" className="secondary-button" onClick={load}>Refresh</button>} />
      {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

      <div className="pod-chain-metrics">
        <div><strong>{pendingPods.length}</strong><span>PODs pending</span></div>
        <div><strong>{verifiedPods.length}</strong><span>PODs verified</span></div>
        <div><strong>{billings.length}</strong><span>Billing approvals</span></div>
        <div><strong>{rejectedPods.length}</strong><span>PODs rejected</span></div>
      </div>

      <div className="pod-chain-grid">
        <section className="pod-chain-card">
          <header><div><h2>POD verification queue</h2><p>Fresh driver delivery proofs waiting for review.</p></div></header>
          <div className="pod-chain-controls">
            <label>Rate/km for auto billing<input value={ratePerKm} onChange={(e) => setRatePerKm(e.target.value)} placeholder="Example: 50" /></label>
            <label>Verification notes<input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" /></label>
          </div>
          <div className="pod-chain-list">
            {pendingPods.length === 0 ? <div className="state-panel"><h3>No POD pending</h3><p>Completed trip POD uploads will appear here.</p></div> : pendingPods.map((pod) => (
              <article className="pod-chain-item" key={pod.id}>
                <div className="pod-chain-item-main"><strong>{tripLabel(pod)}</strong><span>{pod.trip?.vehicle?.vehicleNumber || 'No vehicle'} · {pod.trip?.driver?.name || 'No driver'}</span><small>{podFileLabel(pod)} · Uploaded by {pod.uploadedBy?.name || 'Unknown'}</small></div>
                <div className="pod-chain-actions"><span className={statusClass(pod.verificationStatus)}>{pod.verificationStatus}</span><button type="button" className="secondary-button" disabled={busy === `view-pod:${pod.id}`} onClick={() => handleViewPod(pod)}>{busy === `view-pod:${pod.id}` ? 'Opening...' : 'View POD'}</button>{canVerifyPod && <><button type="button" className="primary-button" disabled={busy === `verify:${pod.id}`} onClick={() => handleVerify(pod)}>{busy === `verify:${pod.id}` ? 'Verifying...' : 'Verify & create billing'}</button><button type="button" className="secondary-button" disabled={busy === `reject-pod:${pod.id}`} onClick={() => handleRejectPod(pod)}>Reject</button></>}</div>
              </article>
            ))}
          </div>
        </section>

        <section className="pod-chain-card">
          <header><div><h2>Finance approval queue</h2><p>Billing drafts created after POD verification.</p></div></header>
          <div className="pod-chain-list">
            {billings.length === 0 ? <div className="state-panel"><h3>No billing pending</h3><p>Verified PODs will auto-create billing drafts here.</p></div> : billings.map((billing) => {
              const billingPod = findBillingPod(billing);
              return <article className="pod-chain-item" key={billing.id}><div className="pod-chain-item-main"><strong>{billing.invoiceNumber || 'Draft billing'} · {money(billing.netReceivable)}</strong><span>{billing.trip?.tripNumber || 'No trip'} · {billing.vehicle?.vehicleNumber || 'No vehicle'} · {billing.customer?.name || 'No customer linked'}</span><small>Status: {billing.paymentStatus} · Freight {money(billing.freightAmount)}</small></div><div className="pod-chain-actions"><span className={statusClass(billing.paymentStatus)}>{billing.paymentStatus}</span>{billingPod && <button type="button" className="secondary-button" disabled={busy === `view-pod:${billingPod.id}`} onClick={() => handleViewPod(billingPod)}>View POD</button>}{canApproveBilling && <><button type="button" className="primary-button" disabled={busy === `approve-billing:${billing.id}`} onClick={() => handleApproveBilling(billing)}>Approve</button><button type="button" className="secondary-button" disabled={busy === `reject-billing:${billing.id}`} onClick={() => handleRejectBilling(billing)}>Reject</button></>}</div></article>;
            })}
          </div>
        </section>
      </div>

      <section className="pod-chain-card pod-chain-history"><header><div><h2>Verified / rejected POD history</h2><p>Accepted and declined POD documents stay visible for audit.</p></div></header><div className="pod-chain-history-grid">{historyPods.length === 0 ? <div className="state-panel"><h3>No POD history yet</h3></div> : historyPods.map((pod) => <div className="pod-history-card" key={pod.id}><span className={statusClass(pod.verificationStatus)}>{pod.verificationStatus}</span><strong>{pod.trip?.tripNumber || pod.title}</strong><small>{podFileLabel(pod)}</small><small>{pod.reviewComments || 'No notes'}</small><button type="button" className="secondary-button" disabled={busy === `view-pod:${pod.id}`} onClick={() => handleViewPod(pod)}>View POD</button></div>)}</div></section>

      <style>{`.pod-chain-page{display:flex;flex-direction:column;gap:1rem}.pod-chain-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.75rem}.pod-chain-metrics div,.pod-chain-card{border:1px solid var(--color-border);background:var(--color-surface);border-radius:16px;padding:1rem}.pod-chain-metrics strong{display:block;font-size:1.8rem;color:var(--color-text-primary)}.pod-chain-metrics span,.pod-chain-card p,.pod-chain-item-main span,.pod-chain-item-main small,.pod-history-card small{color:var(--color-text-secondary);font-size:.85rem}.pod-chain-grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem;align-items:start}.pod-chain-card h2{margin:0;font-size:1rem;color:var(--color-text-primary)}.pod-chain-controls{display:grid;grid-template-columns:1fr 1.4fr;gap:.75rem;margin:1rem 0}.pod-chain-controls label{display:flex;flex-direction:column;gap:.35rem;color:var(--color-text-secondary);font-size:.8rem}.pod-chain-controls input{padding:.65rem .75rem;border-radius:10px;border:1px solid var(--color-border);background:var(--color-background);color:var(--color-text-primary)}.pod-chain-list{display:flex;flex-direction:column;gap:.75rem}.pod-chain-item{display:flex;justify-content:space-between;gap:1rem;padding:.9rem;border:1px solid var(--color-border);border-radius:14px;background:var(--color-background)}.pod-chain-item-main{display:flex;flex-direction:column;gap:.25rem;min-width:0}.pod-chain-item-main strong,.pod-history-card strong{color:var(--color-text-primary)}.pod-chain-actions{display:flex;align-items:center;justify-content:flex-end;gap:.5rem;flex-wrap:wrap;min-width:260px}.pod-chain-actions button,.pod-history-card button{padding:.45rem .65rem;font-size:.78rem}.pod-chain-history-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.75rem}.pod-history-card{display:flex;flex-direction:column;gap:.35rem;padding:.8rem;border:1px solid var(--color-border);border-radius:14px;background:var(--color-background)}@media(max-width:1100px){.pod-chain-grid,.pod-chain-metrics,.pod-chain-history-grid{grid-template-columns:1fr}.pod-chain-item{flex-direction:column}.pod-chain-actions{justify-content:flex-start;min-width:0}}`}</style>
    </section>
  );
}
