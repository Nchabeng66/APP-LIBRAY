import { useState } from 'react';
import { useLibrary } from '../context/LibraryContext.jsx';
import {
  EmptyRow,
  Field,
  PageHead,
  Stamp,
  TableWrap,
  TextSoft,
} from '../components/uiComponents.jsx';
import { formatDate, isOverdue, onlyDigits } from '../library/helpers.js';

function LoanRow({ loan, showMember }) {
  const { returnLoan, showToast } = useLibrary();
  const overdue = isOverdue(loan);

  async function handleReturn() {
    await returnLoan(loan.id);
    showToast('Marked as returned.');
  }

  return (
    <tr>
      <td><strong>{loan.bookTitle}</strong></td>
      {showMember && <td>{loan.memberName || '—'}</td>}
      <td className="mono">{formatDate(loan.date)}</td>
      <td className="mono">{formatDate(loan.dueDate)}</td>
      <td><Stamp tone={overdue ? 'danger' : 'success'}>{overdue ? 'Overdue' : 'On Time'}</Stamp></td>
      <td>
        <button type="button" className="btn btn-outline btn-small" onClick={handleReturn}>
          Return
        </button>
      </td>
    </tr>
  );
}

function StaffPanel() {
  const { books, recordStockChange, showToast } = useLibrary();
  const [bookId, setBookId] = useState('');
  const [type, setType] = useState('add');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!bookId) { setError('Choose which book this transaction is for.'); return; }
    const copies = Number(amount);
    if (!amount || !Number.isInteger(copies) || copies <= 0) {
      setError('Enter a whole number of copies greater than 0.');
      return;
    }
    const book = books.find((b) => b.id === bookId);
    if (!book) { setError('That book no longer exists.'); return; }
    if (type === 'deduct' && copies > Number(book.quantity)) {
      setError(`Only ${book.quantity} copies in stock.`);
      return;
    }
    await recordStockChange({ bookId, type, quantity: copies, note: note.trim() });
    showToast(type === 'add' ? 'Stock added.' : 'Stock deducted.');
    setBookId(''); setAmount(''); setNote(''); setType('add');
  }

  return (
    <section className="section">
      <h2 className="section-title">Record a Transaction</h2>
      <form className="form-panel" onSubmit={handleSubmit} noValidate>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="field-book">Book</label>
            <select id="field-book" value={bookId} onChange={(e) => setBookId(e.target.value)}>
              <option value="">{books.length ? 'Select a book…' : 'No books catalogued yet'}</option>
              {books.map((b) => (
                <option key={b.id} value={b.id}>{b.title} — {b.quantity} in stock</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="field-amount">Copies</label>
            <input id="field-amount" type="number" min="1" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} autoComplete="off" />
          </div>
          <div className="field">
            <span>Type</span>
            <div className="tx-type-group">
              <label className="radio-pill">
                <input type="radio" name="tx-type" value="add" checked={type === 'add'} onChange={() => setType('add')} />
                <span>Add Stock</span>
              </label>
              <label className="radio-pill">
                <input type="radio" name="tx-type" value="deduct" checked={type === 'deduct'} onChange={() => setType('deduct')} />
                <span>Deduct Stock</span>
              </label>
            </div>
          </div>
          <div className="field">
            <label htmlFor="field-note">Note <TextSoft>(optional)</TextSoft></label>
            <input id="field-note" type="text" value={note} onChange={(e) => setNote(e.target.value)} autoComplete="off" />
          </div>
        </div>
        <span className="field-error">{error}</span>
        <div className="form-actions">
          <button type="submit" className="btn btn-accent">Record Transaction</button>
        </div>
      </form>
    </section>
  );
}

function LoansPanel() {
  const { outstandingLoans } = useLibrary();
  return (
    <section className="section">
      <h2 className="section-title">Outstanding Loans</h2>
      <TableWrap headers={['Book', 'Member', 'Ordered', 'Due Back', 'Status', 'Action']}>
        {outstandingLoans.length === 0 ? (
          <EmptyRow colSpan={6}>Nothing is currently on loan.</EmptyRow>
        ) : (
          outstandingLoans.map((loan) => <LoanRow key={loan.id} loan={loan} showMember />)
        )}
      </TableWrap>
    </section>
  );
}

function MemberOrderPanel() {
  const { books, currentUser, outstandingLoans, placeOrder, showToast, maxBorrowed, borrowDays } = useLibrary();
  const [bookId, setBookId] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [error, setError] = useState('');
  const inStock = books.filter((b) => Number(b.quantity) > 0);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!currentUser) { setError('You must be logged in to order a book.'); return; }
    if (!bookId) { setError('Choose a book to order.'); return; }
    if (!idNumber.trim()) { setError('Enter your membership ID number to confirm.'); return; }
    if (idNumber.trim() !== currentUser.idNumber) { setError('That ID number does not match your account.'); return; }
    const book = books.find((b) => b.id === bookId);
    if (!book) { setError('That book no longer exists.'); return; }
    if (Number(book.quantity) < 1) { setError('That book is out of stock.'); return; }
    const alreadyOut = outstandingLoans.filter((e2) => e2.memberId === currentUser.id).length;
    if (maxBorrowed != null && alreadyOut >= maxBorrowed) {
      setError(`You already have ${maxBorrowed} books out — return one first.`);
      return;
    }
    const due = await placeOrder(book, currentUser);
    showToast(`Order placed — due back ${formatDate(due)}${borrowDays ? ` (${borrowDays} days)` : ''}.`);
    setBookId(''); setIdNumber('');
  }

  return (
    <section className="section">
      <h2 className="section-title">Order a Book</h2>
      <form className="form-panel" onSubmit={handleSubmit} noValidate>
        <div className="form-grid">
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="field-order-book">Book</label>
            <select id="field-order-book" value={bookId} onChange={(e) => setBookId(e.target.value)}>
              <option value="">{inStock.length ? 'Select a book…' : 'No books currently in stock'}</option>
              {inStock.map((b) => (
                <option key={b.id} value={b.id}>{b.title} — {b.quantity} in stock</option>
              ))}
            </select>
          </div>
          <Field label="Your Membership ID Number" htmlFor="field-order-idnumber">
            <input id="field-order-idnumber" type="text" inputMode="numeric" value={idNumber} onChange={(e) => setIdNumber(onlyDigits(e.target.value))} autoComplete="off" />
          </Field>
        </div>
        <span className="field-error">{error}</span>
        <div className="form-actions">
          <button type="submit" className="btn btn-accent">Place Order</button>
        </div>
      </form>
    </section>
  );
}

function BorrowedPanel() {
  const { currentUser, outstandingLoans, maxBorrowed } = useLibrary();
  const loans = currentUser ? outstandingLoans.filter((e) => e.memberId === currentUser.id) : [];
  return (
    <section className="section">
      <h2 className="section-title">My Borrowed Books</h2>
      {maxBorrowed != null && (
        <p className="text-soft small-label">You can have up to {maxBorrowed} books out at a time.</p>
      )}
      <TableWrap headers={['Book', 'Ordered', 'Due Back', 'Status', 'Action']}>
        {loans.length === 0 ? (
          <EmptyRow colSpan={5}>You don&apos;t have any books out right now.</EmptyRow>
        ) : (
          loans.map((loan) => <LoanRow key={loan.id} loan={loan} showMember={false} />)
        )}
      </TableWrap>
    </section>
  );
}

function HistorySection() {
  const { transactions, isStaff, currentUser } = useLibrary();
  const source = isStaff
    ? transactions
    : transactions.filter((e) => currentUser && e.memberId === currentUser.id);
  const entries = source.slice(0, 50);

  return (
    <section className="section">
      <h2 className="section-title">{isStaff ? 'Transaction History' : 'Your Order History'}</h2>
      <TableWrap headers={['When', 'Book', 'Type', 'Change', 'Resulting Stock', 'Note']}>
        {entries.length === 0 ? (
          <EmptyRow colSpan={6}>
            {isStaff ? 'No transactions recorded yet.' : 'You have not placed any orders yet.'}
          </EmptyRow>
        ) : (
          entries.map((entry) => {
            const isAdd = entry.type === 'add';
            const isOrder = Boolean(entry.memberId);
            const isReturn = isOrder && isAdd;
            const label = isReturn ? 'Returned' : isOrder ? 'Ordered' : isAdd ? 'Stock In' : 'Stock Out';
            return (
              <tr key={entry.id}>
                <td className="mono">{formatDate(entry.date)}</td>
                <td><strong>{entry.bookTitle}</strong></td>
                <td><Stamp tone={isAdd ? 'success' : 'warning'}>{label}</Stamp></td>
                <td className="mono">{isAdd ? '+' : '-'}{entry.quantity}</td>
                <td className="mono">{entry.resultingStock}</td>
                <td className="text-soft">{entry.note || '—'}</td>
              </tr>
            );
          })
        )}
      </TableWrap>
    </section>
  );
}

export default function Transactions() {
  const { isStaff } = useLibrary();
  return (
    <section className="view">
      <PageHead eyebrow="Circulation" title="Transactions">
        Log stock arriving on the shelf or copies going out to borrowers.
      </PageHead>
      {isStaff ? (
        <>
          <StaffPanel />
          <LoansPanel />
        </>
      ) : (
        <>
          <MemberOrderPanel />
          <BorrowedPanel />
        </>
      )}
      <HistorySection />
    </section>
  );
}