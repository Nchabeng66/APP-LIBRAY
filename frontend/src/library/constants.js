// Settings that are NOT business data — only display rules and limits.
// Real data (districts, minimum age, admin credentials) comes from the API.

export const CURRENCY = 'M';
export const LOW_STOCK_THRESHOLD = 2;
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // 2 MB

export const LOGIN_ERROR_MESSAGES = {
  'not-found': 'No account found with that ID number.',
  'bad-password': 'Incorrect password.',
  pending: 'Your application is still awaiting approval.',
  rejected: 'Your application was not approved. Contact the library.',
};