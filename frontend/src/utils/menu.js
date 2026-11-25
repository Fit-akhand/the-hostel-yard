export const DAYS = [
  { id: 'MON', label: 'Monday' }, { id: 'TUE', label: 'Tuesday' }, { id: 'WED', label: 'Wednesday' },
  { id: 'THU', label: 'Thursday' }, { id: 'FRI', label: 'Friday' }, { id: 'SAT', label: 'Saturday' }, { id: 'SUN', label: 'Sunday' },
]

export const MEALS = [
  { id: 'BREAKFAST', label: 'Breakfast', hint: '7:30 - 9:30 AM' },
  { id: 'LUNCH', label: 'Lunch', hint: '12:30 - 2:30 PM' },
  { id: 'SNACKS', label: 'Snacks', hint: '5:00 - 6:00 PM' },
  { id: 'DINNER', label: 'Dinner', hint: '8:00 - 10:00 PM' },
]

// The server keeps a list of { day, meal, items }; screens use a "DAY:MEAL" lookup.
export const toGrid = (entries = []) => Object.fromEntries(entries.map((e) => [`${e.day}:${e.meal}`, e.items]))

export const fromGrid = (grid) =>
  Object.entries(grid)
    .map(([key, items]) => { const [day, meal] = key.split(':'); return { day, meal, items: items.trim() } })
    .filter((e) => e.items)
