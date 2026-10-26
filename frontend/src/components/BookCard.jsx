import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLibrary } from '../context/LibraryContext.jsx';
import { CURRENCY, MAX_UPLOAD_BYTES } from '../library/constants.js';
import { hasFile, isFree, isLowStock, triggerDownload } from '../library/helpers.js';
import { Stamp } from './uiComponents.jsx';

function BuyForm({ book, member, onDone }) {
  const { addPurchase, showToast } = useLibrary();
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!file) {
      setError('Choose a screenshot or file showing proof of payment.');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError(`Keep the file under ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB.`);
      return;
    }
    await addPurchase(
      {
        bookId: book.id,
        bookTitle: book.title,
        userId: member.id,
        userName: member.name,
        amount: book.price,
      },
      file,
    );
    showToast('Proof of payment submitted — pending approval.');
    onDone();
  }

  return (
    <div className="buy-form">
      <label className="text-soft small-label">Upload proof of payment</label>
      <input
        type="file"
        accept="image/*,.pdf"
        onChange={(e) => {
          setFile(e.target.files[0] || null);
          setError('');
        }}
      />
      <span className="field-error">{error}</span>
      <div className="row-actions">
        <button type="button" className="btn btn-primary btn-small" onClick={handleSubmit}>
          Submit Proof
        </button>
        <button type="button" className="btn btn-outline btn-small" onClick={onDone}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function AccessSection({ book }) {
  const { currentUser, isAdmin, purchaseRequestFor, showToast } = useLibrary();
  const [buyOpen, setBuyOpen] = useState(false);
  const navigate = useNavigate();

  if (!hasFile(book)) {
    return (
      <div className="card-access">
        <span className="text-soft">No file uploaded yet</span>
      </div>
    );
  }

  const download = () => {
    triggerDownload(book);
    showToast(`Downloading "${book.title}"…`);
  };

  if (!currentUser && !isAdmin) {
    return (
      <div className="card-access">
        <button type="button" className="btn btn-outline btn-small" onClick={() => navigate('/members')}>
          Log In to Access
        </button>
      </div>
    );
  }

  if (isFree(book) || isAdmin) {
    return (
      <div className="card-access">
        <button type="button" className="btn btn-primary btn-small" onClick={download}>
          Download
        </button>
      </div>
    );
  }

  const req = purchaseRequestFor(currentUser.id, book.id);
  if (req && req.status === 'approved') {
    return (
      <div className="card-access">
        <button type="button" className="btn btn-primary btn-small" onClick={download}>
          Download
        </button>
      </div>
    );
  }
  if (req && req.status === 'pending') {
    return (
      <div className="card-access">
        <Stamp tone="neutral">Pending Approval</Stamp>
      </div>
    );
  }

  return (
    <div className="card-access">
      {buyOpen ? (
        <BuyForm book={book} member={currentUser} onDone={() => setBuyOpen(false)} />
      ) : (
        <button type="button" className="btn btn-accent btn-small" onClick={() => setBuyOpen(true)}>
          {req && req.status === 'rejected'
            ? 'Payment Not Confirmed — Retry'
            : `Buy for ${CURRENCY}${book.price}`}
        </button>
      )}
    </div>
  );
}

export default function BookCard({ book }) {
  const low = isLowStock(book);
  return (
    <article className="catalog-card">
      <span className="card-genre">{book.genre || 'Uncategorised'}</span>
      <h3 className="card-title">{book.title}</h3>
      <p className="card-author">by {book.author}</p>
      <div className="card-meta">
        <span className="mono">{book.isbn}</span>
        <Stamp tone={low ? 'warning' : 'success'}>
          {low ? 'Low Stock' : `${book.quantity} in stock`}
        </Stamp>
      </div>
      <div className="card-meta">
        <Stamp tone={isFree(book) ? 'success' : 'neutral'}>
          {isFree(book) ? 'Free' : `${CURRENCY}${book.price}`}
        </Stamp>
      </div>
      <AccessSection book={book} />
    </article>
  );
}