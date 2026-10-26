import {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
  useEffect,
} from 'react';
import { requestJson, uploadFile } from '../api/client.js';

const SESSION_KEY = 'library_member_session';

const LibraryContext = createContext(null);

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibrary must be used inside <LibraryProvider>');
  return ctx;
}

function readSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function LibraryProvider({ children }) {
  const [books, setBooks] = useState([]);
  const [onlineBooks, setOnlineBooks] = useState([]);
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [purchases, setPurchases] = useState([]);

  const [session, setSession] = useState(readSession);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message) => {
    setToast({ message, id: Date.now() });
  }, []);
  const clearToast = useCallback(() => setToast(null), []);

  const persistSession = useCallback((next) => {
    setSession(next);
    if (next) sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
    else sessionStorage.removeItem(SESSION_KEY);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [booksRes, onlineRes, usersRes, txRes, purchasesRes] = await Promise.all([
        requestJson('/books'),
        requestJson('/online-books'),
        requestJson('/users'),
        requestJson('/transactions'),
        requestJson('/purchases'),
      ]);
      setBooks(booksRes || []);
      setOnlineBooks(onlineRes || []);
      setUsers(usersRes || []);
      setTransactions(txRes || []);
      setPurchases(purchasesRes || []);
    } catch (error) {
      setLoadError(error.message || 'Could not load library data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const currentUser = useMemo(() => {
    if (!session || session.role === 'Admin') return null;
    return users.find((u) => u.id === session.userId) || null;
  }, [session, users]);

  const isAdmin = session?.role === 'Admin';
  const isAuthenticated = Boolean(session);
  const isStaff = isAdmin || (currentUser && currentUser.role === 'Librarian');

  const findBook = useCallback((id) => books.find((b) => b.id === id) || null, [books]);

  // ---- Auth ----

  const loginUser = useCallback(
    async (idNumber, password) => {
      const result = await requestJson('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ idNumber, password }),
      });
      persistSession({ userId: result.user.id, role: result.user.role });
      return result.user;
    },
    [persistSession],
  );

  const loginAdmin = useCallback(
    async (username, password) => {
      const result = await requestJson('/auth/admin-login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      persistSession({ userId: result.user.id, role: 'Admin' });
      return result.user;
    },
    [persistSession],
  );

  const logout = useCallback(() => persistSession(null), [persistSession]);

  // ---- Books ----

  const addBook = useCallback(async (book, file) => {
    const created = await requestJson('/books', {
      method: 'POST',
      body: JSON.stringify(book),
    });
    let final = created;
    if (file) {
      final = await uploadFile(`/books/${created.id}/file`, file);
    }
    setBooks((prev) => [...prev, final]);
    return final;
  }, []);

  const updateBook = useCallback(async (id, changes, file) => {
    let updated = await requestJson(`/books/${id}`, {
      method: 'PUT',
      body: JSON.stringify(changes),
    });
    if (file) {
      updated = await uploadFile(`/books/${id}/file`, file);
    }
    setBooks((prev) => prev.map((b) => (b.id === id ? updated : b)));
    return updated;
  }, []);

  const removeBook = useCallback(async (id) => {
    await requestJson(`/books/${id}`, { method: 'DELETE' });
    setBooks((prev) => prev.filter((b) => b.id !== id));
  }, []);

  // ---- Online books ----

  const addOnlineBook = useCallback(async (book) => {
    const created = await requestJson('/online-books', {
      method: 'POST',
      body: JSON.stringify(book),
    });
    setOnlineBooks((prev) => [...prev, created]);
    return created;
  }, []);

  const updateOnlineBook = useCallback(async (id, changes) => {
    const updated = await requestJson(`/online-books/${id}`, {
      method: 'PUT',
      body: JSON.stringify(changes),
    });
    setOnlineBooks((prev) => prev.map((b) => (b.id === id ? updated : b)));
    return updated;
  }, []);

  const removeOnlineBook = useCallback(async (id) => {
    await requestJson(`/online-books/${id}`, { method: 'DELETE' });
    setOnlineBooks((prev) => prev.filter((b) => b.id !== id));
  }, []);

  // ---- Users ----

  const addUser = useCallback(async (user) => {
    const created = await requestJson('/users', {
      method: 'POST',
      body: JSON.stringify(user),
    });
    setUsers((prev) => [...prev, created]);
    return created;
  }, []);

  const updateUser = useCallback(async (id, changes) => {
    const updated = await requestJson(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(changes),
    });
    setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
    return updated;
  }, []);

  const removeUser = useCallback(async (id) => {
    await requestJson(`/users/${id}`, { method: 'DELETE' });
    setUsers((prev) => prev.filter((u) => u.id !== id));
  }, []);

  const requestSignup = useCallback(async (data) => {
    const created = await requestJson('/users/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setUsers((prev) => [...prev, created]);
    return created;
  }, []);

  const approveUser = useCallback(
    async (id) => {
      const updated = await requestJson(`/users/${id}/approve`, { method: 'POST' });
      setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
      return updated;
    },
    [],
  );

  const rejectUser = useCallback(async (id) => {
    const updated = await requestJson(`/users/${id}/reject`, { method: 'POST' });
    setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
    return updated;
  }, []);

  const meetsRequirements = useCallback((user, rules) => {
    if (!rules) return { ageOk: false, districtOk: false, allOk: false };
    const ageOk = typeof user.age === 'number' && user.age >= rules.minAge;
    const districtOk = Array.isArray(rules.districts) && rules.districts.includes(user.district);
    return { ageOk, districtOk, allOk: ageOk && districtOk };
  }, []);

  // ---- Transactions ----

  const recordStockChange = useCallback(
    async ({ bookId, type, quantity, note, memberId, memberName, dueDate }) => {
      const created = await requestJson('/transactions', {
        method: 'POST',
        body: JSON.stringify({
          bookId,
          type,
          quantity,
          note,
          memberId,
          memberName,
          dueDate,
        }),
      });
      setTransactions((prev) => [created.transaction, ...prev]);
      setBooks((prev) =>
        prev.map((b) => (b.id === created.transaction.bookId ? created.book : b)),
      );
      return created.transaction;
    },
    [],
  );

  const returnLoan = useCallback(async (loanId) => {
    const result = await requestJson(`/transactions/${loanId}/return`, { method: 'POST' });
    setTransactions((prev) => prev.map((t) => (t.id === loanId ? result.loan : t)));
    setBooks((prev) =>
      prev.map((b) => (b.id === result.book.id ? result.book : b)),
    );
    setTransactions((prev) => [result.returnTransaction, ...prev]);
  }, []);

  const placeOrder = useCallback(
    async (book, member) => {
      const result = await requestJson('/transactions/order', {
        method: 'POST',
        body: JSON.stringify({ bookId: book.id, memberId: member.id }),
      });
      setTransactions((prev) => [result.transaction, ...prev]);
      setBooks((prev) => prev.map((b) => (b.id === book.id ? result.book : b)));
      return result.transaction.dueDate;
    },
    [],
  );

  const outstandingLoans = useMemo(
    () => transactions.filter((t) => t.memberId && t.type === 'deduct' && !t.returnedAt),
    [transactions],
  );

  // ---- Purchases ----

  const addPurchase = useCallback(async (entry, file) => {
    let saved;
    if (file) {
      const form = new FormData();
      Object.entries(entry).forEach(([k, v]) => form.append(k, v));
      form.append('proof', file);
      saved = await requestJson('/purchases', { method: 'POST', body: form });
    } else {
      saved = await requestJson('/purchases', {
        method: 'POST',
        body: JSON.stringify(entry),
      });
    }
    setPurchases((prev) => [saved, ...prev]);
    return saved;
  }, []);

  const updatePurchase = useCallback(async (id, changes) => {
    const updated = await requestJson(`/purchases/${id}`, {
      method: 'PUT',
      body: JSON.stringify(changes),
    });
    setPurchases((prev) => prev.map((p) => (p.id === id ? updated : p)));
    return updated;
  }, []);

  const approvePurchase = useCallback(
    async (id) => updatePurchase(id, { status: 'approved' }),
    [updatePurchase],
  );
  const rejectPurchase = useCallback(
    async (id) => updatePurchase(id, { status: 'rejected' }),
    [updatePurchase],
  );

  const purchaseRequestFor = useCallback(
    (userId, bookId) =>
      purchases.find((p) => p.userId === userId && p.bookId === bookId) || null,
    [purchases],
  );

  const value = {
    books,
    onlineBooks,
    users,
    transactions,
    purchases,
    outstandingLoans,
    pendingUsers: users.filter((u) => u.status === 'pending'),
    pendingPurchases: purchases.filter((p) => p.status === 'pending'),

    currentUser,
    isAdmin,
    isAuthenticated,
    isStaff,
    session,
    loginUser,
    loginAdmin,
    logout,

    loading,
    loadError,
    reload: loadAll,

    findBook,
    addBook,
    updateBook,
    removeBook,

    addOnlineBook,
    updateOnlineBook,
    removeOnlineBook,

    addUser,
    updateUser,
    removeUser,
    requestSignup,
    approveUser,
    rejectUser,
    meetsRequirements,

    recordStockChange,
    placeOrder,
    returnLoan,

    addPurchase,
    approvePurchase,
    rejectPurchase,
    purchaseRequestFor,

    toast,
    showToast,
    clearToast,
  };

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}