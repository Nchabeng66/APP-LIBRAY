import { useEffect, useState } from 'react';
import { useLibrary } from '../context/LibraryContext.jsx';
import {
  EmptyRow,
  Field,
  PageHead,
  Stamp,
  TableWrap,
} from '../components/uiComponents.jsx';
import { onlyDigits, stripDigits } from '../library/helpers.js';
import { validateUserForm } from '../library/validation.js';
import { requestJson } from '../api/client.js';

const BLANK_USER = { name: '', idNumber: '', role: 'Member', password: '' };

function MembersAdmin() {
  const { users, addUser, updateUser, removeUser, showToast } = useLibrary();
  const [form, setForm] = useState(BLANK_USER);
  const [errors, setErrors] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [roles, setRoles] = useState(['Member', 'Librarian']);

  useEffect(() => {
    requestJson('/settings')
      .then((s) => { if (Array.isArray(s.roles) && s.roles.length) setRoles(s.roles); })
      .catch(() => {});
  }, []);

  const editingUser = editingId ? users.find((u) => u.id === editingId) : null;
  const change = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  function reset() {
    setForm(BLANK_USER);
    setErrors({});
    setEditingId(null);
  }

  function startEdit(user) {
    setEditingId(user.id);
    setForm({ name: user.name, idNumber: user.idNumber, role: user.role, password: '' });
    setErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const found = validateUserForm(form, users, editingId);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    const payload = { name: form.name.trim(), idNumber: form.idNumber.trim(), role: form.role };
    if (form.password) payload.password = form.password;
    if (editingId) {
      await updateUser(editingId, payload);
      showToast('User updated.');
    } else {
      await addUser(payload);
      showToast('User registered.');
    }
    reset();
  }

  async function handleDelete(user) {
    if (!window.confirm(`Remove "${user.name}" from the register?`)) return;
    await removeUser(user.id);
    if (editingId === user.id) reset();
    showToast('User removed.');
  }

  const statusTone = { approved: 'success', pending: 'warning', rejected: 'danger' };

  return (
    <>
      <section className="section" style={{ marginTop: 0 }}>
        <h2 className="section-title">
          {editingUser ? `Editing "${editingUser.name}"` : 'Register a New User'}
        </h2>
        <form className="form-panel" onSubmit={handleSubmit} noValidate>
          <div className="form-grid">
            <Field label="Full Name" htmlFor="field-name" error={errors.name}>
              <input id="field-name" name="name" type="text" value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: stripDigits(e.target.value) }))} autoComplete="off" />
            </Field>
            <Field label="ID Number" htmlFor="field-idnum" error={errors.idNumber}>
              <input id="field-idnum" name="idNumber" type="text" inputMode="numeric" value={form.idNumber}
                onChange={(e) => setForm((p) => ({ ...p, idNumber: onlyDigits(e.target.value) }))} autoComplete="off" />
            </Field>
            <div className="field">
              <label htmlFor="field-role">Role</label>
              <select id="field-role" name="role" value={form.role} onChange={change}>
                {roles.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <Field label="Password" htmlFor="field-password-admin" error={errors.password}>
              <input id="field-password-admin" name="password" type="password" value={form.password}
                onChange={change} autoComplete="new-password" />
            </Field>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-accent">
              {editingId ? 'Save Changes' : 'Add User'}
            </button>
            {editingId && <button type="button" className="btn btn-outline" onClick={reset}>Cancel Edit</button>}
          </div>
        </form>
      </section>

      <section className="section">
        <h2 className="section-title">All Members</h2>
        <TableWrap headers={['Name', 'Membership ID', 'Role', 'Status', 'Actions']}>
          {users.length === 0 ? (
            <EmptyRow colSpan={5}>No users registered yet.</EmptyRow>
          ) : (
            users.map((user) => (
              <tr key={user.id}>
                <td><strong>{user.name}</strong></td>
                <td className="mono">{user.membershipId || '—'}</td>
                <td><Stamp tone={user.role === 'Librarian' ? 'success' : 'neutral'}>{user.role}</Stamp></td>
                <td><Stamp tone={statusTone[user.status] || 'neutral'}>{user.status}</Stamp></td>
                <td>
                  <div className="row-actions">
                    <button type="button" className="btn btn-outline btn-small" onClick={() => startEdit(user)}>Edit</button>
                    <button type="button" className="btn btn-danger btn-small" onClick={() => handleDelete(user)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </TableWrap>
      </section>
    </>
  );
}

function PendingList() {
  const { pendingUsers, approveUser, rejectUser, meetsRequirements, showToast } = useLibrary();
  const [rules, setRules] = useState(null);

  useEffect(() => {
    requestJson('/settings').then(setRules).catch(() => {});
  }, []);

  if (pendingUsers.length === 0) return <p className="text-soft">No applications waiting for review.</p>;

  return (
    <div className="approval-list">
      {pendingUsers.map((user) => {
        const checks = rules ? meetsRequirements(user, rules) : null;
        return (
          <article className="approval-card" key={user.id}>
            <div className="approval-head">
              <h3>{user.name}</h3>
              <span className="mono text-soft">{user.idNumber}</span>
            </div>
            <div className="approval-meta">
              <span><strong>Age: </strong>{user.age}</span>
              <span><strong>District: </strong>{user.district}</span>
              <span><strong>Address: </strong>{user.address}</span>
            </div>
            {checks && (
              <div className="approval-checks">
                <Stamp tone={checks.ageOk ? 'success' : 'danger'}>{checks.ageOk ? 'Age OK' : 'Age fails'}</Stamp>
                <Stamp tone={checks.districtOk ? 'success' : 'danger'}>{checks.districtOk ? 'District OK' : 'District fails'}</Stamp>
              </div>
            )}
            <div className="row-actions">
              <button type="button" className="btn btn-primary btn-small"
                onClick={async () => { await approveUser(user.id); showToast(`${user.name} approved.`); }}>
                Approve
              </button>
              <button type="button" className="btn btn-danger btn-small"
                onClick={async () => {
                  if (!window.confirm(`Reject ${user.name}'s application?`)) return;
                  await rejectUser(user.id);
                  showToast('Application rejected.');
                }}>
                Reject
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function PurchasesList() {
  const { pendingPurchases, approvePurchase, rejectPurchase, showToast } = useLibrary();

  if (pendingPurchases.length === 0) return <p className="text-soft">No payments waiting for review.</p>;

  return (
    <div className="approval-list">
      {pendingPurchases.map((req) => {
        const isImage = (req.proofFileType || '').startsWith('image/');
        return (
          <article className="approval-card" key={req.id}>
            <div className="approval-head">
              <h3>{req.bookTitle}</h3>
              <span className="mono text-soft">{req.amount}</span>
            </div>
            <div className="approval-meta">
              <span><strong>Buyer: </strong>{req.userName}</span>
            </div>
            {req.proofFilePath && (
              <div style={{ margin: '4px 0 12px' }}>
                {isImage ? (
                  <a href={req.proofFilePath} target="_blank" rel="noopener noreferrer">
                    <img className="proof-thumb" src={req.proofFilePath} alt={`Proof from ${req.userName}`} />
                  </a>
                ) : (
                  <a className="btn btn-outline btn-small" href={req.proofFilePath} target="_blank" rel="noopener noreferrer">
                    View File ({req.proofFileName})
                  </a>
                )}
              </div>
            )}
            <div className="row-actions">
              <button type="button" className="btn btn-primary btn-small"
                onClick={async () => { await approvePurchase(req.id); showToast(`Access granted to ${req.userName}.`); }}>
                Approve
              </button>
              <button type="button" className="btn btn-danger btn-small"
                onClick={async () => {
                  if (!window.confirm(`Reject this payment?`)) return;
                  await rejectPurchase(req.id);
                  showToast('Payment rejected.');
                }}>
                Reject
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export default function UserManagement() {
  const { pendingUsers, pendingPurchases } = useLibrary();
  const [tab, setTab] = useState('pending');

  return (
    <section className="view">
      <PageHead eyebrow="Staff" title="User Management">
        Approve applications, verify payments, and manage member accounts.
      </PageHead>

      <div className="admin-tabs">
        <button type="button" className={`admin-tab${tab === 'pending' ? ' active' : ''}`} onClick={() => setTab('pending')}>
          Pending Approvals <span className="tab-count">{pendingUsers.length}</span>
        </button>
        <button type="button" className={`admin-tab${tab === 'purchases' ? ' active' : ''}`} onClick={() => setTab('purchases')}>
          Book Purchases <span className="tab-count">{pendingPurchases.length}</span>
        </button>
        <button type="button" className={`admin-tab${tab === 'members' ? ' active' : ''}`} onClick={() => setTab('members')}>
          Members
        </button>
      </div>

      {tab === 'pending' && <PendingList />}
      {tab === 'purchases' && <PurchasesList />}
      {tab === 'members' && <MembersAdmin />}
    </section>
  );
}