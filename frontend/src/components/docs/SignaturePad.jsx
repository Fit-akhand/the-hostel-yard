import { useCallback, useEffect, useRef, useState } from 'react'
import { Eraser } from 'lucide-react'

// Draw-to-sign box. Works with a finger, a stylus or a mouse. Calls onChange with a PNG data URL once
// there is enough ink to count as a signature (so a single dot does not), and with null after clearing.
const MIN_INK = 80 // pixels of line drawn
export function SignaturePad({ onChange, height = 180 }) {
  const canvasRef = useRef(null)
  const drawing = useRef(false)
  const last = useRef(null)
  const ink = useRef(0)
  const [empty, setEmpty] = useState(true)

  const setup = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    const { width } = canvas.getBoundingClientRect()
    canvas.width = Math.round(width * ratio)
    canvas.height = Math.round(height * ratio)
    const ctx = canvas.getContext('2d')
    ctx.scale(ratio, ratio)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = 2.4
    ctx.strokeStyle = '#0b1020'
    ink.current = 0
    setEmpty(true)
    onChange?.(null)
  }, [height, onChange])

  useEffect(() => {
    setup()
    // Resizing clears the canvas, so only redo it when the width really changes (not on mobile scroll).
    let width = canvasRef.current?.getBoundingClientRect().width
    const onResize = () => {
      const next = canvasRef.current?.getBoundingClientRect().width
      if (next && Math.abs(next - width) > 2) { width = next; setup() }
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [setup])

  const position = (event) => {
    const rect = canvasRef.current.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  const start = (event) => {
    event.preventDefault()
    canvasRef.current.setPointerCapture?.(event.pointerId)
    drawing.current = true
    last.current = position(event)
  }

  const move = (event) => {
    if (!drawing.current) return
    event.preventDefault()
    const ctx = canvasRef.current.getContext('2d')
    const point = position(event)
    ctx.beginPath()
    ctx.moveTo(last.current.x, last.current.y)
    ctx.lineTo(point.x, point.y)
    ctx.stroke()
    ink.current += Math.hypot(point.x - last.current.x, point.y - last.current.y)
    last.current = point
  }

  const end = () => {
    if (!drawing.current) return
    drawing.current = false
    if (ink.current > MIN_INK) {
      setEmpty(false)
      onChange?.(canvasRef.current.toDataURL('image/png'))
    }
  }

  return (
    <div className="grid gap-2">
      <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-ink-200 bg-white">
        <canvas
          ref={canvasRef}
          style={{ height, touchAction: 'none' }}
          className="block w-full cursor-crosshair"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          onPointerCancel={end}
          aria-label="Signature box: draw your signature"
          role="img"
        />
        {empty ? (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-400">
            Sign here with your finger or mouse
          </span>
        ) : null}
        <span className="pointer-events-none absolute bottom-8 left-6 right-6 border-b border-slate-300" aria-hidden="true" />
      </div>
      <button type="button" onClick={setup} className="inline-flex w-fit items-center gap-1.5 text-sm text-ink-600 hover:text-ink-950">
        <Eraser size={15} /> Clear and sign again
      </button>
    </div>
  )
}
