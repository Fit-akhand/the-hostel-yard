import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { Button, Card, Field, Input } from '../../components/ui'
import { authApi } from '../../services/authApi'
import { fieldErrors } from '../../services/apiClient'
import { useAuthStore } from '../../store/authStore'
import { toast } from '../../store/toastStore'
import { passwordStrength } from '../../utils/format'
import { managerApi, staffApi, tenantApi } from '../../services/apis'
import { homePath } from '../../config/authz'

function PasswordField({ id, value, onChange, error, label = 'Password', autoComplete = 'current-password' }) {
  const [show, setShow] = useState(false)
  return (
    <Field label={label} htmlFor={id} required error={error}>
      <div className="relative">
        <Input id={id} type={show ? 'text' : 'password'} value={value} onChange={onChange} autoComplete={autoComplete} />
        <button
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </Field>
  )
}

export function LoginPage() {
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState({})

  async function onSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setErrors({})
    try {
      const user = await login({ identifier, password })
      toast.success('Welcome back.')
      navigate(homePath(user.role), { replace: true })
    } catch (err) {
      setErrors(fieldErrors(err))
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-8">
      <p className="text-xs uppercase tracking-[0.2em] text-brand">Sign in</p>
      <h1 className="mt-2 font-display text-3xl text-ink-950">Welcome back</h1>
      <p className="mt-1 text-sm text-ink-600">Use your email or phone and password.</p>
      <form className="mt-8 grid gap-4" onSubmit={onSubmit}>
        <Field label="Email or phone" htmlFor="identifier" required error={errors.identifier}>
          <Input id="identifier" value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" />
        </Field>
        <PasswordField id="password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} />
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button type="submit" loading={loading} className="w-full" size="lg">
          Continue
        </Button>
      </form>
      <div className="mt-6 flex justify-between text-sm text-ink-600">
        <Link to="/forgot-password" className="underline-offset-4 hover:underline">
          Forgot password
        </Link>
        <Link to="/setup-owner" className="underline-offset-4 hover:underline">
          First-time setup
        </Link>
      </div>
    </Card>
  )
}

export function SetupOwnerPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '', organizationName: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState({})

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function onSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setErrors({})
    try {
      const payload = await authApi.setupOwner(form)
      const verificationId = payload?.verificationId || payload
      sessionStorage.setItem('thy_verification_id', verificationId)
      toast.success('OTP sent. Check the backend console in development.')
      navigate('/verify-owner')
    } catch (err) {
      setErrors(fieldErrors(err))
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-8">
      <p className="text-xs uppercase tracking-[0.2em] text-brand">Onboarding</p>
      <h1 className="mt-2 font-display text-3xl text-ink-950">Set up the business owner</h1>
      <form className="mt-8 grid gap-4" onSubmit={onSubmit}>
        <Field label="Full name" required error={errors.name}>
          <Input value={form.name} onChange={(e) => set('name', e.target.value)} />
        </Field>
        <Field label="Phone" required error={errors.phone}>
          <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} />
        </Field>
        <Field label="Email" required error={errors.email}>
          <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
        </Field>
        <PasswordField id="setup-password" value={form.password} onChange={(e) => set('password', e.target.value)} error={errors.password} autoComplete="new-password" />
        <Field label="Organization name" required error={errors.organizationName}>
          <Input value={form.organizationName} onChange={(e) => set('organizationName', e.target.value)} />
        </Field>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button type="submit" loading={loading} className="w-full">
          Send verification code
        </Button>
      </form>
      <p className="mt-6 text-sm text-ink-600">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </Card>
  )
}

export function VerifyOwnerPage() {
  const navigate = useNavigate()
  const [verificationId, setVerificationId] = useState('')
  const [otp, setOtp] = useState('')
  const [seconds, setSeconds] = useState(60)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setVerificationId(sessionStorage.getItem('thy_verification_id') || '')
  }, [])

  useEffect(() => {
    if (seconds <= 0) return undefined
    const t = window.setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => window.clearTimeout(t)
  }, [seconds])

  async function onSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await authApi.verifySetup({ verificationId, otp })
      sessionStorage.removeItem('thy_verification_id')
      toast.success('Owner account created. Please sign in.')
      navigate('/login')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-8">
      <h1 className="font-display text-3xl text-ink-950">Verify your number</h1>
      <p className="mt-2 text-sm text-ink-600">Enter the 6-digit OTP. In development it is printed in the backend terminal.</p>
      <form className="mt-8 grid gap-4" onSubmit={onSubmit}>
        <Field label="Verification ID" required>
          <Input value={verificationId} onChange={(e) => setVerificationId(e.target.value)} />
        </Field>
        <Field label="OTP" required>
          <Input inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value)} />
        </Field>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button type="submit" loading={loading} disabled={otp.length !== 6}>
          Verify and create account
        </Button>
      </form>
      <p className="mt-4 text-sm text-ink-400">
        {seconds > 0 ? `You can request a new OTP in ${seconds}s from setup.` : 'Return to setup to request a new OTP.'}
      </p>
    </Card>
  )
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await authApi.forgotPassword({ email })
      setDone(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-8">
      <h1 className="font-display text-3xl text-ink-950">Reset password</h1>
      {done ? (
        <p className="mt-4 text-sm text-ink-600">
          If an account exists with this email, a password reset link has been sent.
        </p>
      ) : (
        <form className="mt-8 grid gap-4" onSubmit={onSubmit}>
          <Field label="Email" required>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" loading={loading}>
            Send reset link
          </Button>
        </form>
      )}
      <Link className="mt-6 inline-block text-sm" to="/login">
        Back to sign in
      </Link>
    </Card>
  )
}

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const strength = passwordStrength(password)

  async function onSubmit(e) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await authApi.resetPassword({ token, password })
      toast.success('Password reset successfully. Please sign in.')
      navigate('/login')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-8">
      <h1 className="font-display text-3xl text-ink-950">Choose a new password</h1>
      <form className="mt-8 grid gap-4" onSubmit={onSubmit}>
        <PasswordField id="new-password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" label="New password" />
        <div>
          <div className="h-1.5 overflow-hidden rounded-full bg-ink-100">
            <div className="h-full bg-navy-900 transition-all" style={{ width: `${(strength.score / 5) * 100}%` }} />
          </div>
          <p className="mt-1 text-xs text-ink-400">{strength.label}</p>
        </div>
        <PasswordField id="confirm-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" label="Confirm password" />
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button type="submit" loading={loading} disabled={!token}>
          Update password
        </Button>
      </form>
    </Card>
  )
}

export function AcceptTenantPage() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function onSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await tenantApi.acceptInvite({ token, password })
      toast.success('Account activated. Please sign in.')
      navigate('/login')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-8">
      <h1 className="font-display text-3xl text-ink-950">Activate tenant account</h1>
      <form className="mt-8 grid gap-4" onSubmit={onSubmit}>
        <PasswordField id="tenant-password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button type="submit" loading={loading} disabled={!token}>
          Activate
        </Button>
      </form>
    </Card>
  )
}

export function ActivateManagerPage() {
  const token = window.location.pathname.split('/').pop()
  const navigate = useNavigate()
  const [info, setInfo] = useState(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    managerApi.getInvitation(token).then(setInfo).catch((err) => setError(err.message))
  }, [token])

  async function onSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await managerApi.activate(token, { password, confirmPassword })
      toast.success('Manager account activated. Please sign in.')
      navigate('/login')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-8">
      <h1 className="font-display text-3xl text-ink-950">Activate manager account</h1>
      {info ? <p className="mt-2 text-sm text-ink-600">{info.manager?.name || info.managerName} · {info.property?.name}</p> : null}
      <form className="mt-8 grid gap-4" onSubmit={onSubmit}>
        <PasswordField id="mgr-pass" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        <PasswordField id="mgr-confirm" label="Confirm password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button type="submit" loading={loading}>
          Activate
        </Button>
      </form>
    </Card>
  )
}

export function ActivateStaffPage() {
  const token = window.location.pathname.split('/').pop()
  const navigate = useNavigate()
  const [info, setInfo] = useState(null)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    staffApi.getInvitation(token).then(setInfo).catch((err) => setError(err.message))
  }, [token])

  async function onSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await staffApi.activate({ token, password })
      toast.success('Staff account activated. Please sign in.')
      navigate('/login')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-8">
      <h1 className="font-display text-3xl text-ink-950">Activate staff account</h1>
      {info?.staff ? <p className="mt-2 text-sm text-ink-600">{info.staff.name} · {info.staff.designation}</p> : null}
      <form className="mt-8 grid gap-4" onSubmit={onSubmit}>
        <PasswordField id="staff-pass" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <Button type="submit" loading={loading}>
          Activate
        </Button>
      </form>
    </Card>
  )
}
