// Starting wording for new organisations. Owners replace it with their own text in Settings → Documents.
// Lines starting with "## " are headings; a blank line starts a new paragraph.

export const PLACEHOLDERS = {
  AGREEMENT: [
    ['agreementDate', 'Date of the agreement'],
    ['city', 'City of the property'],
    ['organizationName', 'Your business name'],
    ['ownerName', 'Owner name'],
    ['ownerPhone', 'Owner phone'],
    ['ownerAddress', 'Business address'],
    ['tenantName', 'Resident name'],
    ['fatherName', "Resident's father / guardian"],
    ['tenantPhone', 'Resident phone'],
    ['permanentAddress', 'Resident permanent address'],
    ['idType', 'ID type'],
    ['idLast4', 'Last 4 digits of the ID'],
    ['propertyName', 'Property name'],
    ['propertyAddress', 'Property address'],
    ['roomNumber', 'Room number'],
    ['bedNumber', 'Bed number'],
    ['roomType', 'Room sharing'],
    ['startDate', 'Start date'],
    ['endDate', 'End date'],
    ['durationMonths', 'Length in months'],
    ['monthlyRent', 'Monthly rent with words'],
    ['deposit', 'Security deposit with words'],
    ['dueDay', 'Rent due day'],
    ['lockInMonths', 'Lock-in months'],
    ['noticePeriodDays', 'Notice period days'],
    ['lateFeeRule', 'Late fee rule'],
  ],
  RESIDENT_DECLARATION: [
    ['tenantName', 'Resident name'],
    ['propertyName', 'Property name'],
    ['organizationName', 'Your business name'],
    ['dueDay', 'Rent due day'],
    ['noticePeriodDays', 'Notice period days'],
    ['lateFeeRule', 'Late fee rule'],
  ],
}

export const DEFAULT_TEMPLATES = {
  AGREEMENT: {
    title: 'Leave and License Agreement',
    body: `## LEAVE AND LICENSE AGREEMENT

This Leave and License Agreement is made at {{city}} on {{agreementDate}}.

BETWEEN

{{ownerName}}, for {{organizationName}}, {{ownerAddress}}, phone {{ownerPhone}}, hereinafter called the "LICENSOR", of the ONE PART;

AND

{{tenantName}}, son/daughter of {{fatherName}}, permanently residing at {{permanentAddress}}, phone {{tenantPhone}}, holding {{idType}} ending {{idLast4}}, hereinafter called the "LICENSEE", of the OTHER PART.

The Licensor runs the paying guest accommodation known as {{propertyName}}, {{propertyAddress}} (the "Premises"). The Licensee has asked to use a bed in the Premises on leave and license basis, and the parties agree as follows:

## TERMS

1. Accommodation. The Licensor allows the Licensee to use Bed {{bedNumber}} in Room {{roomNumber}} ({{roomType}} sharing) of the Premises, with the common areas, for residence only.

2. Period. This license is for {{durationMonths}} months, from {{startDate}} to {{endDate}}, unless it ends earlier under this agreement. It may be renewed by mutual consent.

3. License fee. The Licensee shall pay a monthly license fee of {{monthlyRent}}, in advance, on or before the {{dueDay}} day of every month. {{lateFeeRule}}

4. Security deposit. The Licensee has paid an interest-free, refundable security deposit of {{deposit}}. It will be refunded when the Licensee moves out, after deducting any unpaid dues and the cost of damage beyond normal wear and tear.

5. Lock-in and notice. The lock-in period is {{lockInMonths}} months. Either party may end this license by giving {{noticePeriodDays}} days' notice in writing; notice given in The Hostel Yard app counts as written notice. If the Licensee leaves without full notice, the fee for the short notice may be deducted from the deposit.

6. Use. The Licensee shall use the bed only for their own residence and shall not sublet it or let any other person stay in it.

7. House rules. The Licensee shall follow the house rules of the Premises, including timings, visitor rules and the ban on alcohol, smoking, drugs and any illegal activity inside the Premises.

8. Care of property. The Licensee shall take care of the furniture, fittings and appliances, and shall pay for any loss or damage caused by them or their visitors.

9. Inspection. The Licensor or the manager may enter the room for inspection, cleaning, repairs or in an emergency, with reasonable notice where possible.

10. No tenancy. This agreement is only a license. It does not create any tenancy, lease or other right in the Premises in favour of the Licensee.

11. Termination. The Licensor may end this license at once if the Licensee does not pay the license fee for two months, breaks the house rules seriously, or is involved in any unlawful act. The Licensee shall then vacate the bed and hand back the keys.

12. Verification. The Licensee confirms that the details and ID documents given are true, and agrees to their use for police verification as required by law.

13. Jurisdiction. Any dispute is subject to the courts at {{city}}.

Both parties have read and understood this agreement and sign it electronically below.`,
  },
  RESIDENT_DECLARATION: {
    title: 'Resident Form',
    body: `## HOUSE RULES

1. Rent is due on or before the {{dueDay}} day of every month. {{lateFeeRule}}

2. Give {{noticePeriodDays}} days' notice before moving out, through the app or in writing.

3. Visitors are allowed only in the common area and only during visiting hours. No visitor may stay overnight.

4. Alcohol, smoking, drugs and any illegal activity are not allowed inside the property.

5. Take care of the furniture and fittings. Damage caused by you or your visitors will be charged.

6. Switch off lights, fans and AC when you leave the room.

7. Keep your valuables locked. The management is not responsible for personal belongings.

## DECLARATION

I, {{tenantName}}, declare that the information in this form is true and complete and that the ID documents I have uploaded are genuine. I have read the house rules of {{propertyName}} and agree to follow them. I agree that {{organizationName}} may keep my details and documents for my stay and share them for police verification as required by law.`,
  },
}
