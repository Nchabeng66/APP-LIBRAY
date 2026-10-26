import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLibrary } from '../context/LibraryContext.jsx';
import { Field, PageHead, PasswordInput } from '../components/uiComponents.jsx';
import { LOGIN_ERROR_MESSAGES } from '../library/constants.js';
import { onlyDigits, stripDigits, formatDate } from '../library/helpers.js';
import { validateSignupForm } from '../library/validation.js';
import { requestJson } from '../api/client.js';

const BLANK_SIGNUP = {
  name: '', idNumber: '', age: '', district: '', address: '', password: '', confirm: '',
};

function LoginPanel({ onSwitch }) {
  const { loginUser, showToast } = useLibrary();
  const [idNumber, setIdNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const user = await loginUser(idNumber, password);
      showToast(`Welcome back, ${user.name.split(' ')[0]}!`);
      navigate('/');
    } catch (err) {
      const key = err.message || '';
      setError(LOGIN_ERROR_MESSAGES[key] || err.message || 'Could not log in.');
    }
  }

  return (
    <section className="mode-panel gate-wrap">
      <form className="form-panel gate-form" onSubmit={handleSubmit} noValidate>
        <div className="gate-head">
          <h2 className="gate-title">Member Log In</h2>
          <p className="gate-sub">Enter your national ID number and password.</p>
        </div>
        <div className="field">
          <label htmlFor="field-login-id">National ID Number</label>
          <input id="field-login-id" type="text" inputMode="numeric" value={idNumber}
            onChange={(e) => setIdNumber(onlyDigits(e.target.value))} autoComplete="username" />
        </div>
        <div className="field">
          <label htmlFor="field-login-password">Password</label>
          <PasswordInput id="field-login-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <span className="field-error">{error}</span>
        <div className="form-actions gate-actions">
          <button type="submit" className="btn btn-accent btn-block">Log In</button>
        </div>
        <p className="gate-switch">
          Not a member yet?{' '}
          <button type="button" className="link-btn" onClick={() => onSwitch('signup')}>
            Apply for membership
          </button>
        </p>
      </form>
    </section>
  );
}

function SignupPanel({ onSwitch }) {
  const { users, requestSignup, showToast } = useLibrary();
  const [form, setForm] = useState(BLANK_SIGNUP);
  const [errors, setErrors] = useState({});
  const [districts, setDistricts] = useState([]);
  const [minAge, setMinAge] = useState(null);
  const [districtsLoading, setDistrictsLoading] = useState(true);
  const [districtError, setDistrictError] = useState('');

  useEffect(() => {
    let active = true;
    requestJson('/settings')
      .then((s) => {
        if (!active) return;
        const configuredDistricts = Array.isArray(s.districts) ? s.districts : [];
        setDistricts(configuredDistricts);
        setMinAge(s.minAge ?? null);
        if (configuredDistricts.length) {
          setForm((p) => ({ ...p, district: configuredDistricts[0] }));
        }
      })
      .catch((error) => {
        if (active) setDistrictError(error.message || 'Could not load districts.');
      })
      .finally(() => {
        if (active) setDistrictsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const change = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    const found = validateSignupForm(form, users);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    await requestSignup({
      name: form.name.trim(),
      idNumber: form.idNumber.trim(),
      age: Number(form.age),
      district: form.district,
      address: form.address.trim(),
      password: form.password,
    });
    setForm({ ...BLANK_SIGNUP, district: districts[0] || '' });
    setErrors({});
    showToast('Application submitted — a librarian will review it.');
    onSwitch('login');
  }

  return (
    <section className="mode-panel">
      <div className="signup-layout">
        <form className="form-panel signup-form" onSubmit={handleSubmit} noValidate>
          <h2 className="section-title">Apply for Membership</h2>
          <p className="text-soft small-label">A librarian will review and approve your application.</p>

          <p className="form-subhead">Personal Details</p>
          <div className="form-grid">
            <Field label="Full Name" htmlFor="field-su-name" error={errors.name}>
              <input id="field-su-name" name="name" type="text" value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: stripDigits(e.target.value) }))} autoComplete="name" />
            </Field>
            <Field label="ID Number" htmlFor="field-su-id" error={errors.idNumber}>
              <input id="field-su-id" name="idNumber" type="text" inputMode="numeric" value={form.idNumber}
                onChange={(e) => setForm((p) => ({ ...p, idNumber: onlyDigits(e.target.value) }))} autoComplete="off" />
            </Field>
            <Field label="Age" htmlFor="field-su-age" error={errors.age}>
              <input id="field-su-age" name="age" type="number" min="0" step="1" value={form.age} onChange={change} autoComplete="off" />
            </Field>
          </div>

          <p className="form-subhead">Address</p>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="field-su-district">District</label>
              <select id="field-su-district" name="district" value={form.district} onChange={change}
                disabled={districtsLoading || districts.length === 0}>
                {districts.length === 0 && (
                  <option value="">
                    {districtsLoading ? 'Loading…' : 'No districts available'}
                  </option>
                )}
                {districts.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <span className="field-error">
                {errors.district || districtError || (!districtsLoading && districts.length === 0
                  ? 'Districts are not configured. Please contact the library.'
                  : '')}
              </span>
            </div>
            <Field label="Home Address" htmlFor="field-su-address" error={errors.address} style={{ gridColumn: 'span 2' }}>
              <input id="field-su-address" name="address" type="text" value={form.address} onChange={change} autoComplete="street-address" />
            </Field>
          </div>

          <p className="form-subhead">Account Security</p>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="field-su-password">Choose a Password</label>
              <PasswordInput id="field-su-password" name="password" autoComplete="new-password" value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
              <span className="field-error">{errors.password || ''}</span>
            </div>
            <div className="field">
              <label htmlFor="field-su-confirm">Confirm Password</label>
              <PasswordInput id="field-su-confirm" name="confirm" autoComplete="new-password" value={form.confirm}
                onChange={(e) => setForm((p) => ({ ...p, confirm: e.target.value }))} />
              <span className="field-error">{errors.confirm || ''}</span>
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-accent btn-block">Submit Application</button>
          </div>
          <p className="gate-switch">
            Already a member?{' '}
            <button type="button" className="link-btn" onClick={() => onSwitch('login')}>Log in instead</button>
          </p>
        </form>

        <aside className="requirements-card">
          <h3>Membership requirements</h3>
          {minAge != null && <p>Must be at least {minAge} years old.</p>}
          <p>Must live in Lesotho — any listed district.</p>
          <p className="text-soft small-label">Applications are reviewed by a librarian.</p>
        </aside>
      </div>
    </section>
  );
}

function ProfilePanel() {
  const { currentUser, logout } = useLibrary();
  const navigate = useNavigate();
  if (!currentUser) return null;
  return (
    <section className="mode-panel gate-wrap">
      <div className="form-panel profile-card">
        <h2>{currentUser.name}</h2>
        <p className="text-soft">{currentUser.role}</p>
        <dl className="profile-meta">
          <dt>Membership ID</dt><dd className="mono">{currentUser.membershipId || '—'}</dd>
          <dt>Status</dt><dd>{currentUser.status}</dd>
          {currentUser.createdAt && (
            <>
              <dt>Member since</dt><dd>{formatDate(currentUser.createdAt)}</dd>
            </>
          )}
        </dl>
        <div className="form-actions">
          <button type="button" className="btn btn-outline" onClick={() => { logout(); navigate('/members'); }}>
            Log Out
          </button>
        </div>
      </div>
    </section>
  );
}

export default function Membership() {
  const { currentUser, isAdmin } = useLibrary();
  const [mode, setMode] = useState('login');

  if (currentUser) return <section className="view"><PageHead eyebrow="Membership" title="Membership">Your account.</PageHead><ProfilePanel /></section>;

  return (
    <section className="view">
      <PageHead eyebrow="Membership" title="Membership">
        Join the library or sign in to your account. Administrators use the login page with their admin credentials.
      </PageHead>

      <div className="mode-tabs" role="tablist">
        <button type="button" role="tab" className={`mode-tab${mode === 'login' ? ' active' : ''}`} onClick={() => setMode('login')}>Member Log In</button>
        <button type="button" role="tab" className={`mode-tab${mode === 'signup' ? ' active' : ''}`} onClick={() => setMode('signup')}>Sign Up</button>
        <button type="button" role="tab" className={`mode-tab${mode === 'admin' ? ' active' : ''}`} onClick={() => setMode('admin')}>Administrator</button>
      </div>

      {mode === 'login' && <LoginPanel onSwitch={setMode} />}
      {mode === 'signup' && <SignupPanel onSwitch={setMode} />}
      {mode === 'admin' && <AdminLogin onSwitch={setMode} />}
    </section>
  );
}

function AdminLogin({ onSwitch }) {
  const { loginAdmin, showToast } = useLibrary();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await loginAdmin(username, password);
      showToast('Signed in as Administrator.');
      navigate('/users');
    } catch {
      setError('Incorrect username or password.');
    }
  }

  return (
    <section className="mode-panel gate-wrap">
      <form className="form-panel gate-form" onSubmit={handleSubmit} noValidate>
        <div className="gate-head">
          <h2 className="gate-title">Administrator</h2>
          <p className="gate-sub">Staff access only.</p>
        </div>
        <div className="field">
          <label htmlFor="field-admin-user">Username</label>
          <input id="field-admin-user" type="text" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
        </div>
        <div className="field">
          <label htmlFor="field-admin-pass">Password</label>
          <PasswordInput id="field-admin-pass" value={password} onChange={(e) => setPassword(e.target.value)} />
          <span className="field-error">{error}</span>
        </div>
        <div className="form-actions gate-actions">
          <button type="submit" className="btn btn-accent btn-block">Log In</button>
        </div>
        <p className="gate-switch">
          Library member?{' '}
          <button type="button" className="link-btn" onClick={() => onSwitch('login')}>Log in here</button>
        </p>
      </form>
    </section>
  );
}