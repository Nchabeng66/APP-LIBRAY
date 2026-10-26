export const DISTRICTS = [
  'Maseru',
  'Berea',
  'Leribe',
  'Mafeteng',
  "Mohale's Hoek",
  'Quthing',
  "Qacha's Nek",
  'Butha-Buthe',
  'Mokhotlong',
  'Thaba-Tseka',
];

export function getDefaultSettings() {
  return {
    districts: DISTRICTS,
    minAge: Number(process.env.MIN_MEMBER_AGE) || 12,
    borrowDays: Number(process.env.BORROW_DAYS) || 14,
    maxBorrowed: Number(process.env.MAX_BORROWED) || 3,
    roles: ['Member', 'Librarian'],
  };
}

export async function ensureDefaultSettings(query) {
  for (const [key, value] of Object.entries(getDefaultSettings())) {
    await query(
      `INSERT INTO app_settings(key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
       WHERE app_settings.value = '[]'::jsonb
          OR app_settings.value = 'null'::jsonb`,
      [key, JSON.stringify(value)],
    );
  }
}
