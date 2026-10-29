// Decorative product preview for the login panel. Figures are illustrative only.
const BEDS = Array.from({ length: 28 }, (_, i) => (i % 7 === 3 || i === 20 ? 'free' : 'busy'))

function Ring({ value = 87 }) {
  const r = 38
  const c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 100 100" className="h-24 w-24 -rotate-90" aria-hidden="true">
      <circle cx="50" cy="50" r={r} fill="none" strokeWidth="9" style={{ stroke: 'var(--color-line)' }} />
      <circle
        cx="50" cy="50" r={r} fill="none" stroke="url(#ringGrad)" strokeWidth="9" strokeLinecap="round"
        strokeDasharray={`${(c * value) / 100} ${c}`}
      />
      <defs>
        <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fb7185" />
          <stop offset="100%" stopColor="#ef4444" />
        </linearGradient>
      </defs>
    </svg>
  )
}

const glass = 'rounded-2xl border border-white/60 bg-white/55 backdrop-blur-xl shadow-[0_20px_50px_rgba(60,70,140,.18),inset_0_1px_0_rgba(255,255,255,.8)] dark:border-white/15 dark:bg-white/[0.08] dark:shadow-[0_20px_50px_rgba(0,0,0,.35),inset_0_1px_0_rgba(255,255,255,.18)]'

export function LoginVisual() {
  return (
    <div className="relative mt-10 h-[330px] w-full max-w-[520px]" aria-hidden="true">
      <div className="absolute left-6 top-4 h-44 w-44 rounded-full bg-brand/25 blur-3xl" />
      <div className="absolute bottom-0 right-6 h-48 w-48 rounded-full bg-indigo-400/30 blur-3xl" />

      {/* Occupancy */}
      <div className={`${glass} login-float absolute left-0 top-0 w-[250px] p-5`}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-600">Occupancy</p>
        <div className="mt-3 flex items-center gap-4">
          <div className="relative">
            <Ring value={87} />
            <span className="absolute inset-0 grid place-items-center text-lg font-bold text-ink-950">87%</span>
          </div>
          <div>
            <p className="text-2xl font-bold text-ink-950">628</p>
            <p className="text-xs text-ink-600">of 696 beds</p>
          </div>
        </div>
      </div>

      {/* Rent */}
      <div className={`${glass} login-float-slow absolute right-0 top-10 w-[240px] p-5`}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-600">Rent collected</p>
        <p className="mt-2 text-2xl font-bold text-ink-950">₹12.4L</p>
        <svg viewBox="0 0 200 56" className="mt-3 h-14 w-full">
          <defs>
            <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity=".45" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0 44 C20 40 30 28 50 32 S86 46 108 26 S150 14 172 18 S190 8 200 6 V56 H0Z" fill="url(#sparkFill)" />
          <path d="M0 44 C20 40 30 28 50 32 S86 46 108 26 S150 14 172 18 S190 8 200 6" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        <div className="mt-2 flex gap-2 text-[10px] font-semibold">
          <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-success">112 paid</span>
          <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-warning">9 pending</span>
        </div>
      </div>

      {/* Beds */}
      <div className={`${glass} login-float absolute bottom-0 left-16 w-[300px] p-5`} style={{ animationDelay: '-2s' }}>
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-600">Rooms &amp; beds</p>
          <p className="text-[10px] text-ink-500">live</p>
        </div>
        <div className="mt-3 grid grid-cols-14 gap-1.5" style={{ gridTemplateColumns: 'repeat(14, minmax(0, 1fr))' }}>
          {BEDS.map((s, i) => (
            <span
              key={i}
              className={`h-4 rounded-md ${s === 'busy' ? 'bg-ink-300' : 'bg-brand shadow-[0_0_12px_rgba(239,68,68,.7)]'}`}
            />
          ))}
        </div>
        <div className="mt-3 flex gap-4 text-[10px] text-ink-600">
          <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-ink-300" />Occupied</span>
          <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-brand" />Vacant</span>
        </div>
      </div>
    </div>
  )
}
