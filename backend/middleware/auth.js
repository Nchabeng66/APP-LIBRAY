// Lightweight header-based role guard. The frontend stores the role in its
// session, so we trust it. For a stricter app, replace with JWT.
export function requireStaff(req, res, next) {
  const role = req.header('x-user-role');
  if (role !== 'Admin' && role !== 'Librarian') {
    return res.status(403).json({ error: 'Staff access required.' });
  }
  next();
}

export function requireAdmin(req, res, next) {
  const role = req.header('x-user-role');
  if (role !== 'Admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
}