// Reads a bank statement that was downloaded as CSV (HDFC, SBI, ICICI and most banks offer it).
// Everything here runs in the browser: the file is never uploaded anywhere.

// Splits CSV text into rows of cells. Handles quoted cells that contain commas, quotes or line breaks.
export const parseCsv = (text) => {
  const rows = []
  let row = []
  let cell = ''
  let quoted = false
  const source = String(text).replace(/^﻿/, '')

  for (let i = 0; i < source.length; i++) {
    const c = source[i]
    if (quoted) {
      if (c === '"' && source[i + 1] === '"') { cell += '"'; i++ }
      else if (c === '"') quoted = false
      else cell += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && source[i + 1] === '\n') i++
      row.push(cell); rows.push(row); row = []; cell = ''
    } else cell += c
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row) }
  return rows.filter((r) => r.some((c) => String(c).trim() !== ''))
}

export const toNumber = (value) => {
  const n = Number(String(value ?? '').replace(/[,₹\s]/g, ''))
  return Number.isFinite(n) ? n : 0
}

const find = (header, pattern) => header.findIndex((h) => pattern.test(h))

// Finds the header row and the columns we need, then returns only the money that came IN.
export const extractCredits = (rows) => {
  const headerIndex = rows.findIndex((r) => {
    const h = r.map((c) => String(c).trim().toLowerCase())
    return h.some((c) => /narration|description|particulars|remarks/.test(c)) && h.some((c) => /deposit|credit|amount/.test(c))
  })
  if (headerIndex < 0) throw new Error('Could not find the column headings. Download the statement as CSV and upload it without editing.')

  const header = rows[headerIndex].map((c) => String(c).trim().toLowerCase())
  const col = {
    date: find(header, /^(txn |transaction |value )?date|^date/),
    narration: find(header, /narration|description|particulars|remarks/),
    ref: find(header, /ref|chq|cheque/),
    credit: find(header, /deposit|credit|cr amount|amount in/),
    amount: find(header, /^amount/),
    type: find(header, /dr\s*\/\s*cr|cr\s*\/\s*dr|^type/),
  }
  if (col.credit < 0 && col.amount < 0) throw new Error('Could not find the deposit / credit column in this statement.')

  const credits = []
  for (const r of rows.slice(headerIndex + 1)) {
    let amount = col.credit >= 0 ? toNumber(r[col.credit]) : 0
    // One "Amount" column with a Dr/Cr marker instead of separate columns.
    if (!amount && col.credit < 0 && col.amount >= 0 && /^cr/i.test(String(r[col.type] || '').trim())) amount = toNumber(r[col.amount])
    if (amount > 0) {
      credits.push({
        date: col.date >= 0 ? String(r[col.date]).trim() : '',
        narration: String(r[col.narration] ?? '').trim(),
        ref: col.ref >= 0 ? String(r[col.ref] ?? '').trim() : '',
        amount,
      })
    }
  }
  return credits
}
