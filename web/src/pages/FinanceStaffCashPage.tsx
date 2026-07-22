import { useEffect, useMemo, useState } from 'react';
import { Modal } from '../components/Modal';
import { useAuth } from '../context/AuthContext';
import {
  createAllowancePolicy,
  createStaffAdvance,
  createStaffSettlement,
  getAllowancePolicies,
  getFinanceAccounts,
  getStaffAdvances,
  getStaffSettlements,
  getStaffWallets,
  getUsers,
  transitionStaffAdvance,
  transitionStaffSettlement,
  updateAllowancePolicy,
} from '../services/api';
import type { FinanceAccount, UserRecord } from '../types/auth';

type View = 'wallets' | 'advances' | 'settlements' | 'policies';

const advanceInitial = {
  beneficiaryUserId: '', contextType: 'TRIP', contextId: '', tripId: '', vehicleId: '', accountId: '',
  targetAllowance: '', fundingMode: 'USE_EXISTING_BALANCE', paymentMode: 'CASH', dueDate: '', purpose: '', notes: '',
};
const policyInitial = {
  name: '', tripType: '', baseAmount: '15000', perKmAmount: '0', maxAmount: '', autoApproveThreshold: '',
  fundingMode: 'USE_EXISTING_BALANCE', accountId: '', paymentMode: 'CASH', autoFund: false, isActive: true,
};

function money(value: unknown) {
  return Number(value ?? 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
}

function tone(status: string) {
  if (['ACTIVE', 'CLOSED', 'APPROVED', 'FUNDED'].includes(status)) return 'status-pill status-pill-success';
  if (['REJECTED', 'CANCELLED'].includes(status)) return 'status-pill status-pill-danger';
  if (['SUBMITTED', 'RECONCILING', 'UNDER_REVIEW', 'NEEDS_CHANGES'].includes(status)) return 'status-pill status-pill-warning';
  return 'status-pill status-pill-default';
}

export default function FinanceStaffCashPage() {
  const auth = useAuth();
  const token = auth.accessToken;
  const [view, setView] = useState<View>('wallets');
  const [wallets, setWallets] = useState<any[]>([]);
  const [advances, setAdvances] = useState<any[]>([]);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [policies, setPolicies] = useState<any[]>([]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [advanceForm, setAdvanceForm] = useState(advanceInitial);
  const [policyForm, setPolicyForm] = useState(policyInitial);
  const [showAdvance, setShowAdvance] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);
  const [settlementForm, setSettlementForm] = useState<{ advanceId: string; remaining: number; disposition: 'RETURN' | 'CARRY_FORWARD'; declaredReturnAmount: string } | null>(null);
  const [confirmation, setConfirmation] = useState<{ settlementId: string; accountId: string; paymentMode: string; referenceNumber: string } | null>(null);

  const canManage = auth.hasAnyPermission(['staff_advance_manage']);
  const canApprove = auth.hasAnyPermission(['staff_advance_approve']);
  const canFund = auth.hasAnyPermission(['staff_advance_fund']);
  const canApproveSettlement = auth.hasAnyPermission(['staff_settlement_approve']);
  const canCashier = auth.hasAnyPermission(['staff_settlement_cashier']);
  const canManageSettlement = auth.hasAnyPermission(['staff_settlement_manage']);
  const canPolicy = auth.hasAnyPermission(['allowance_policy_manage']);

  async function load() {
    if (!token) return;
    setLoading(true);
    try {
      const [walletRes, advanceRes, settlementRes, policyRes, userRes, accountRes] = await Promise.all([
        getStaffWallets(token, { limit: 100 }), getStaffAdvances(token, { limit: 100 }), getStaffSettlements(token, { limit: 100 }),
        getAllowancePolicies(token), getUsers(token), getFinanceAccounts(token, { limit: 100 }),
      ]);
      setWallets(walletRes.data.items ?? []);
      setAdvances(advanceRes.data.items ?? []);
      setSettlements(settlementRes.data.items ?? []);
      setPolicies(policyRes.data ?? []);
      setUsers(userRes.data ?? []);
      setAccounts(accountRes.data.items ?? []);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not load staff finance data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [token]);

  const summary = useMemo(() => ({
    custody: wallets.reduce((sum, wallet) => sum + Number(wallet.currentBalance ?? 0), 0),
    reserved: wallets.reduce((sum, wallet) => sum + Number(wallet.reservedBalance ?? 0), 0),
    active: advances.filter((advance) => ['ACTIVE', 'RECONCILING'].includes(advance.status)).length,
    settlementQueue: settlements.filter((settlement) => !['CLOSED', 'CANCELLED', 'REJECTED'].includes(settlement.status)).length,
  }), [wallets, advances, settlements]);

  async function action(message: string, callback: () => Promise<unknown>) {
    setNotice('');
    try { await callback(); setNotice(message); await load(); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'Action failed'); }
  }

  async function saveAdvance(event: React.FormEvent) {
    event.preventDefault();
    if (!token) return;
    await action('Staff allowance created as a draft.', () => createStaffAdvance(token, {
      ...advanceForm,
      targetAllowance: Number(advanceForm.targetAllowance),
      tripId: advanceForm.tripId || null,
      vehicleId: advanceForm.vehicleId || null,
      accountId: advanceForm.accountId || null,
      dueDate: advanceForm.dueDate ? new Date(advanceForm.dueDate).toISOString() : null,
    }));
    setShowAdvance(false); setAdvanceForm(advanceInitial);
  }

  async function savePolicy(event: React.FormEvent) {
    event.preventDefault();
    if (!token) return;
    await action('Trip allowance policy created.', () => createAllowancePolicy(token, {
      ...policyForm, tripType: policyForm.tripType || null, accountId: policyForm.accountId || null,
      baseAmount: Number(policyForm.baseAmount), perKmAmount: Number(policyForm.perKmAmount),
      maxAmount: policyForm.maxAmount ? Number(policyForm.maxAmount) : null,
      autoApproveThreshold: policyForm.autoApproveThreshold ? Number(policyForm.autoApproveThreshold) : null,
    }));
    setShowPolicy(false); setPolicyForm(policyInitial);
  }

  async function saveSettlement(event: React.FormEvent) {
    event.preventDefault();
    if (!token || !settlementForm) return;
    await action('Settlement opened for review.', () => createStaffSettlement(token, {
      advanceId: settlementForm.advanceId, disposition: settlementForm.disposition,
      declaredReturnAmount: settlementForm.disposition === 'RETURN' ? Number(settlementForm.declaredReturnAmount) : 0,
    }));
    setSettlementForm(null); setView('settlements');
  }

  async function confirmSettlement(event: React.FormEvent) {
    event.preventDefault();
    if (!token || !confirmation) return;
    await action('Return confirmed, numbered receipt created, and settlement closed.', () => transitionStaffSettlement(token, confirmation.settlementId, 'confirm', {
      accountId: confirmation.accountId || null,
      paymentMode: confirmation.paymentMode,
      referenceNumber: confirmation.referenceNumber || null,
    }));
    setConfirmation(null);
  }

  return (
    <section className="custody-page" data-testid="staff-cash-page">
      <header className="custody-hero">
        <div>
          <span className="custody-eyebrow">Company money in staff custody</span>
          <h1>Cash & staff advances</h1>
          <p>Allocate trip money, track every approved spend, and close return or carry-forward settlements without changing balances by hand.</p>
        </div>
        <div className="custody-hero-actions">
          {canPolicy ? <button className="secondary-button" onClick={() => setShowPolicy(true)}>New policy</button> : null}
          {canManage ? <button className="primary-button" data-testid="new-staff-advance" onClick={() => setShowAdvance(true)}>New allowance</button> : null}
        </div>
      </header>

      {notice ? <div className="custody-notice" role="status">{notice}</div> : null}

      <div className="custody-metrics">
        <article><span>Total custody</span><strong>{money(summary.custody)}</strong><small>Company cash currently held by staff</small></article>
        <article><span>Reserved</span><strong>{money(summary.reserved)}</strong><small>Allocated to active trips and work</small></article>
        <article><span>Available</span><strong>{money(summary.custody - summary.reserved)}</strong><small>Eligible for reuse on a future allowance</small></article>
        <article><span>Settlement queue</span><strong>{summary.settlementQueue}</strong><small>{summary.active} active advances</small></article>
      </div>

      <nav className="custody-segments" aria-label="Cash and staff finance views">
        {([['wallets', 'Wallets'], ['advances', 'Advances'], ['settlements', 'Settlements'], ['policies', 'Policies']] as Array<[View, string]>).map(([key, label]) => (
          <button key={key} data-testid={`staff-cash-${key}`} className={view === key ? 'active' : ''} onClick={() => setView(key)}>{label}</button>
        ))}
      </nav>

      <div className="custody-panel">
        {loading ? <p className="empty-state">Loading finance custody ledger…</p> : null}

        {!loading && view === 'wallets' ? (
          <div className="table-scroll"><table className="data-table"><thead><tr><th>Staff member</th><th>Role</th><th>Custody</th><th>Reserved</th><th>Available</th><th>Last activity</th></tr></thead><tbody>
            {wallets.map((wallet) => <tr key={wallet.id}><td><strong>{wallet.owner?.name ?? wallet.userId}</strong><small className="table-secondary">{wallet.owner?.email}</small></td><td>{wallet.owner?.role?.name ?? 'Staff'}</td><td>{money(wallet.currentBalance)}</td><td>{money(wallet.reservedBalance)}</td><td><strong>{money(wallet.availableBalance)}</strong></td><td>{new Date(wallet.updatedAt).toLocaleString('en-IN')}</td></tr>)}
            {wallets.length === 0 ? <tr><td colSpan={6} className="empty-state">Wallets are created automatically when the first allowance is funded.</td></tr> : null}
          </tbody></table></div>
        ) : null}

        {!loading && view === 'advances' ? (
          <div className="table-scroll"><table className="data-table"><thead><tr><th>Advance</th><th>Beneficiary</th><th>Context</th><th>Target</th><th>Funding split</th><th>Spent / remaining</th><th>Status</th><th>Next action</th></tr></thead><tbody>
            {advances.map((advance) => <tr key={advance.id} data-testid={`staff-advance-${advance.id}`}><td><strong>{advance.advanceNumber}</strong><small className="table-secondary">{new Date(advance.createdAt).toLocaleDateString('en-IN')}</small></td><td>{advance.beneficiary?.name ?? advance.beneficiaryUserId}<small className="table-secondary">{advance.beneficiary?.role?.name}</small></td><td>{advance.contextType}<small className="table-secondary">{advance.contextId}</small></td><td>{money(advance.targetAllowance)}</td><td><span>{money(advance.existingBalanceAllocated)} existing</span><small className="table-secondary">{money(advance.newCashIssued)} issued</small></td><td>{money(advance.spentAmount)}<small className="table-secondary">{money(advance.remainingAmount)} remaining</small></td><td><span className={tone(advance.status)}>{advance.status.replaceAll('_', ' ')}</span></td><td><div className="custody-row-actions">
              {advance.status === 'DRAFT' && canManage ? <button onClick={() => action('Advance submitted.', () => transitionStaffAdvance(token!, advance.id, 'submit'))}>Submit</button> : null}
              {advance.status === 'SUBMITTED' && canApprove ? <button onClick={() => action('Advance approved.', () => transitionStaffAdvance(token!, advance.id, 'approve'))}>Approve</button> : null}
              {advance.status === 'APPROVED' && canFund ? <button className="primary-button" onClick={() => action('Advance funded.', () => transitionStaffAdvance(token!, advance.id, 'fund', { accountId: advance.accountId }))}>Fund</button> : null}
              {['ACTIVE', 'RECONCILING'].includes(advance.status) && !advance.settlements?.length ? <button onClick={() => setSettlementForm({ advanceId: advance.id, remaining: Number(advance.remainingAmount), disposition: 'RETURN', declaredReturnAmount: String(advance.remainingAmount) })}>Settle</button> : null}
              {!['DRAFT', 'SUBMITTED', 'APPROVED', 'ACTIVE', 'RECONCILING'].includes(advance.status) ? <span>Complete</span> : null}
            </div></td></tr>)}
          </tbody></table></div>
        ) : null}

        {!loading && view === 'settlements' ? (
          <div className="table-scroll"><table className="data-table"><thead><tr><th>Settlement</th><th>Advance</th><th>Disposition</th><th>Spend</th><th>Return / carry</th><th>Reimbursement</th><th>Status</th><th>Next action</th></tr></thead><tbody>
            {settlements.map((settlement) => <tr key={settlement.id} data-testid={`staff-settlement-${settlement.id}`}><td><strong>{settlement.settlementNumber}</strong></td><td>{settlement.advance?.advanceNumber}</td><td>{settlement.disposition.replaceAll('_', ' ')}</td><td>{money(settlement.approvedSpend)}</td><td>{money(settlement.disposition === 'RETURN' ? settlement.declaredReturnAmount : settlement.carryForwardAmount)}</td><td>{money(settlement.reimbursementAmount)}</td><td><span className={tone(settlement.status)}>{settlement.status.replaceAll('_', ' ')}</span></td><td><div className="custody-row-actions">
              {settlement.status === 'DRAFT' ? <button onClick={() => action('Settlement submitted.', () => transitionStaffSettlement(token!, settlement.id, 'submit'))}>Submit</button> : null}
              {settlement.status === 'SUBMITTED' && canApproveSettlement ? <button onClick={() => action('Settlement approved.', () => transitionStaffSettlement(token!, settlement.id, 'approve'))}>Approve</button> : null}
              {settlement.status === 'APPROVED' && canCashier ? <button className="primary-button" onClick={() => setConfirmation({ settlementId: settlement.id, accountId: settlement.advance?.accountId ?? '', paymentMode: settlement.advance?.paymentMode ?? 'CASH', referenceNumber: '' })}>Confirm & close</button> : null}
              {!['CLOSED', 'CANCELLED', 'REJECTED'].includes(settlement.status) && canManageSettlement ? <button className="danger-button" onClick={() => action('Settlement cancelled; its source lines are available for a replacement.', () => transitionStaffSettlement(token!, settlement.id, 'cancel', { reason: 'Cancelled from finance workspace' }))}>Cancel</button> : null}
              {settlement.status === 'CLOSED' ? <span>{settlement.cashReceiptNumber ?? 'Reconciled'}</span> : null}
            </div></td></tr>)}
          </tbody></table></div>
        ) : null}

        {!loading && view === 'policies' ? (
          <div className="custody-policy-grid">{policies.map((policy) => <article key={policy.id} className="custody-policy-card"><div><span className={tone(policy.isActive ? 'ACTIVE' : 'CANCELLED')}>{policy.isActive ? 'ACTIVE' : 'INACTIVE'}</span><h3>{policy.name}</h3><p>{policy.tripType ?? 'All trip types'}</p></div><dl><div><dt>Base</dt><dd>{money(policy.baseAmount)}</dd></div><div><dt>Per km</dt><dd>{money(policy.perKmAmount)}</dd></div><div><dt>Reuse wallet</dt><dd>{policy.fundingMode === 'USE_EXISTING_BALANCE' ? 'Yes' : 'No'}</dd></div><div><dt>Automatic funding</dt><dd>{policy.autoFund ? 'Enabled' : 'Approval only'}</dd></div></dl>{canPolicy ? <button className="secondary-button" onClick={() => action(policy.isActive ? 'Policy disabled.' : 'Policy enabled.', () => updateAllowancePolicy(token!, policy.id, { isActive: !policy.isActive }))}>{policy.isActive ? 'Disable' : 'Enable'}</button> : null}</article>)}</div>
        ) : null}
      </div>

      <Modal isOpen={showAdvance} title="Create staff allowance" description="The request is reviewed first. Money moves only after approval and funding." onClose={() => setShowAdvance(false)} size="large">
        <form className="form-grid" onSubmit={saveAdvance} data-testid="staff-advance-form">
          <label>Beneficiary<select required value={advanceForm.beneficiaryUserId} onChange={(e) => setAdvanceForm({ ...advanceForm, beneficiaryUserId: e.target.value })}><option value="">Select staff member</option>{users.filter((user) => user.status === 'ACTIVE').map((user) => <option key={user.id} value={user.id}>{user.name} — {user.role?.name}</option>)}</select></label>
          <label>Context type<select value={advanceForm.contextType} onChange={(e) => setAdvanceForm({ ...advanceForm, contextType: e.target.value })}><option>TRIP</option><option>REPAIR</option><option>MAINTENANCE</option><option>PURCHASE</option><option>OTHER</option></select></label>
          <label>Context ID<input required value={advanceForm.contextId} onChange={(e) => setAdvanceForm({ ...advanceForm, contextId: e.target.value, tripId: advanceForm.contextType === 'TRIP' ? e.target.value : advanceForm.tripId })} placeholder="Trip or work-order ID" /></label>
          <label>Target allowance (₹)<input required min="1" type="number" value={advanceForm.targetAllowance} onChange={(e) => setAdvanceForm({ ...advanceForm, targetAllowance: e.target.value })} /></label>
          <label>Use existing wallet balance<select value={advanceForm.fundingMode} onChange={(e) => setAdvanceForm({ ...advanceForm, fundingMode: e.target.value })}><option value="USE_EXISTING_BALANCE">Yes — issue only the shortfall</option><option value="PRESERVE_EXISTING_BALANCE">No — preserve existing balance</option></select></label>
          <label>Funding account<select value={advanceForm.accountId} onChange={(e) => setAdvanceForm({ ...advanceForm, accountId: e.target.value })}><option value="">Unassigned cash account</option>{accounts.filter((a) => a.isActive).map((account) => <option key={account.id} value={account.id}>{account.name} — {money(account.currentBalance)}</option>)}</select></label>
          <label>Due date<input type="datetime-local" value={advanceForm.dueDate} onChange={(e) => setAdvanceForm({ ...advanceForm, dueDate: e.target.value })} /></label>
          <label>Purpose<input value={advanceForm.purpose} onChange={(e) => setAdvanceForm({ ...advanceForm, purpose: e.target.value })} /></label>
          <label className="form-field-full">Notes<textarea value={advanceForm.notes} onChange={(e) => setAdvanceForm({ ...advanceForm, notes: e.target.value })} /></label>
          <div className="form-actions form-field-full"><button type="button" className="secondary-button" onClick={() => setShowAdvance(false)}>Cancel</button><button className="primary-button" type="submit">Create draft</button></div>
        </form>
      </Modal>

      <Modal isOpen={Boolean(settlementForm)} title="Open settlement" description="Choose whether unused company money is returned or remains available in the staff wallet." onClose={() => setSettlementForm(null)}>
        {settlementForm ? <form className="form-grid" onSubmit={saveSettlement}><label>Remaining allocation<input readOnly value={money(settlementForm.remaining)} /></label><label>Disposition<select value={settlementForm.disposition} onChange={(e) => setSettlementForm({ ...settlementForm, disposition: e.target.value as 'RETURN' | 'CARRY_FORWARD' })}><option value="RETURN">Return to company</option><option value="CARRY_FORWARD">Keep as future advance</option></select></label>{settlementForm.disposition === 'RETURN' ? <label>Declared return (₹)<input type="number" value={settlementForm.declaredReturnAmount} onChange={(e) => setSettlementForm({ ...settlementForm, declaredReturnAmount: e.target.value })} /></label> : null}<div className="form-actions form-field-full"><button className="primary-button" type="submit">Create settlement</button></div></form> : null}
      </Modal>

      <Modal isOpen={Boolean(confirmation)} title="Confirm return and close" description="Use a different cashier from the creator and approver. This posts the cash movement and generates a receipt number." onClose={() => setConfirmation(null)}>
        {confirmation ? <form className="form-grid" onSubmit={confirmSettlement} data-testid="settlement-confirm-form"><label>Receiving account<select value={confirmation.accountId} onChange={(e) => setConfirmation({ ...confirmation, accountId: e.target.value })}><option value="">Unassigned company cash</option>{accounts.filter((account) => account.isActive).map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label><label>Payment mode<select value={confirmation.paymentMode} onChange={(e) => setConfirmation({ ...confirmation, paymentMode: e.target.value })}><option>CASH</option><option>BANK_TRANSFER</option><option>UPI</option><option>CHEQUE</option><option>OTHER</option></select></label><label className="form-field-full">Bank / cash reference<input value={confirmation.referenceNumber} onChange={(e) => setConfirmation({ ...confirmation, referenceNumber: e.target.value })} placeholder="Receipt, UTR, cheque or deposit reference" /></label><div className="form-actions form-field-full"><button type="button" className="secondary-button" onClick={() => setConfirmation(null)}>Cancel</button><button type="submit" className="primary-button">Post and close</button></div></form> : null}
      </Modal>

      <Modal isOpen={showPolicy} title="New trip allowance policy" description="Scheduling a matching trip creates the allowance automatically." onClose={() => setShowPolicy(false)} size="large">
        <form className="form-grid" onSubmit={savePolicy} data-testid="allowance-policy-form"><label>Policy name<input required value={policyForm.name} onChange={(e) => setPolicyForm({ ...policyForm, name: e.target.value })} /></label><label>Trip type<select value={policyForm.tripType} onChange={(e) => setPolicyForm({ ...policyForm, tripType: e.target.value })}><option value="">All trip types</option><option>TRANSFER</option><option>DELIVERY</option><option>PICKUP</option><option>SERVICE</option><option>INTERNAL</option></select></label><label>Base amount (₹)<input type="number" min="0" value={policyForm.baseAmount} onChange={(e) => setPolicyForm({ ...policyForm, baseAmount: e.target.value })} /></label><label>Per kilometre (₹)<input type="number" min="0" value={policyForm.perKmAmount} onChange={(e) => setPolicyForm({ ...policyForm, perKmAmount: e.target.value })} /></label><label>Maximum amount<input type="number" min="0" value={policyForm.maxAmount} onChange={(e) => setPolicyForm({ ...policyForm, maxAmount: e.target.value })} /></label><label>Auto-approve up to<input type="number" min="0" value={policyForm.autoApproveThreshold} onChange={(e) => setPolicyForm({ ...policyForm, autoApproveThreshold: e.target.value })} /></label><label>Wallet reuse<select value={policyForm.fundingMode} onChange={(e) => setPolicyForm({ ...policyForm, fundingMode: e.target.value })}><option value="USE_EXISTING_BALANCE">Use available balance first</option><option value="PRESERVE_EXISTING_BALANCE">Always issue full allowance</option></select></label><label>Funding account<select value={policyForm.accountId} onChange={(e) => setPolicyForm({ ...policyForm, accountId: e.target.value })}><option value="">Select at funding</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label><label className="checkbox-field"><input type="checkbox" checked={policyForm.autoFund} onChange={(e) => setPolicyForm({ ...policyForm, autoFund: e.target.checked })} /> Fund automatically after policy approval</label><div className="form-actions form-field-full"><button className="primary-button" type="submit">Create policy</button></div></form>
      </Modal>
    </section>
  );
}
