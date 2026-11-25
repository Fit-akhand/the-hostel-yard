import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { addDays, effectiveStatus, readLink, signLink, todayInIndia, visitDateProblem } from '../src/utils/passRules.js'
import { documentHash, numberToIndianWords, renderTemplate } from '../src/utils/documentText.js'
import { DEFAULT_TEMPLATES, PLACEHOLDERS } from '../src/constants/defaultTemplates.js'
import { lastFour, missingForSubmit } from '../src/services/kycService.js'
import { cleanEntries, todayKey } from '../src/services/foodMenuService.js'
import { slugify } from '../src/services/listingService.js'

describe('guest pass rules', () => {
  const id = '6ae36113907df34fff56c4f6'

  it('uses the calendar day in India', () => {
    assert.equal(todayInIndia(new Date('2026-11-25T20:00:00Z')), '2026-11-26')
    assert.equal(addDays('2026-12-31', 1), '2027-01-01')
  })

  it('allows today up to 14 days ahead only', () => {
    assert.equal(visitDateProblem('2026-11-26', '2026-11-26'), null)
    assert.equal(visitDateProblem('2026-12-10', '2026-11-26'), null)
    assert.match(visitDateProblem('2026-12-11', '2026-11-26'), /14 days/)
    assert.match(visitDateProblem('2026-11-25', '2026-11-26'), /past/)
    assert.ok(visitDateProblem('2026-02-30', '2026-02-01'))
    assert.ok(visitDateProblem('tomorrow', '2026-11-26'))
  })

  it('expires unused passes after their day', () => {
    assert.equal(effectiveStatus({ status: 'APPROVED', visitDate: '2026-11-25' }, '2026-11-26'), 'EXPIRED')
    assert.equal(effectiveStatus({ status: 'PENDING', visitDate: '2026-11-26' }, '2026-11-26'), 'PENDING')
    assert.equal(effectiveStatus({ status: 'CHECKED_IN', visitDate: '2026-11-25' }, '2026-11-26'), 'CHECKED_IN')
  })

  it('keeps a visitor link from approving, and rejects edited links', () => {
    const view = signLink('view', id, 'secret')
    assert.equal(readLink('view', view, 'secret'), id)
    assert.equal(readLink('approve', view, 'secret'), null)
    assert.equal(readLink('view', view, 'other-secret'), null)
    assert.equal(readLink('view', view.replace(id, id.replace(/6$/, '7')), 'secret'), null)
    assert.equal(readLink('view', 'rubbish', 'secret'), null)
  })
})

describe('documents', () => {
  it('writes rupees in Indian words', () => {
    assert.equal(numberToIndianWords(125000), 'One Lakh Twenty Five Thousand')
    assert.equal(numberToIndianWords(10500), 'Ten Thousand Five Hundred')
    assert.equal(numberToIndianWords(0), 'Zero')
  })

  it('fills placeholders and leaves a blank line for missing details', () => {
    assert.equal(renderTemplate('Name: {{ name }}, room {{room}}.', { name: 'Asha' }), 'Name: Asha, room ________.')
    assert.equal(renderTemplate('Pay on time. {{lateFee}}\nNext', { lateFee: '' }), 'Pay on time.\nNext')
  })

  it('changes the fingerprint when text or details change', () => {
    const a = documentHash('text', { rent: 1 })
    assert.notEqual(a, documentHash('text!', { rent: 1 }))
    assert.notEqual(a, documentHash('text', { rent: 2 }))
    assert.equal(a, documentHash('text', { rent: 1 }))
  })

  it('has no unknown placeholder in the standard wording', () => {
    for (const [kind, template] of Object.entries(DEFAULT_TEMPLATES)) {
      const known = new Set(PLACEHOLDERS[kind].map(([name]) => name))
      for (const [, name] of template.body.matchAll(/\{\{\s*(\w+)\s*\}\}/g)) assert.ok(known.has(name), `${kind}: ${name}`)
    }
  })
})

describe('resident form, menu and public page helpers', () => {
  it('keeps only the last four characters of an ID', () => {
    assert.equal(lastFour('1234 5678 9012'), '9012')
    assert.equal(lastFour('abcde1234f'), '234F')
    assert.equal(lastFour('12'), null)
  })

  it('lists what is still missing', () => {
    const missing = missingForSubmit({ kyc: { details: { fatherName: 'A' }, documents: [{ kind: 'PHOTO' }] } })
    assert.ok(missing.includes('ID card (front)'))
    assert.ok(!missing.includes('Your photo'))
  })

  it('stores only filled, valid menu cells', () => {
    const entries = cleanEntries([
      { day: 'mon', meal: 'lunch', items: ' Dal ' }, { day: 'MON', meal: 'LUNCH', items: 'Twice' },
      { day: 'TUE', meal: 'LUNCH', items: '' }, { day: 'XYZ', meal: 'LUNCH', items: 'No' },
    ])
    assert.deepEqual(entries, [{ day: 'MON', meal: 'LUNCH', items: 'Dal' }])
    assert.equal(todayKey(new Date('2026-11-26T04:00:00Z')), 'THU')
  })

  it('makes readable page addresses', () => {
    assert.equal(slugify('Sunrise PG, Sector 58!'), 'sunrise-pg-sector-58')
    assert.equal(slugify('   '), 'pg')
  })
})
