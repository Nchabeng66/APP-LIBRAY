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
import { MAX_UPLOAD_BYTES } from '../library/constants.js';
import { hasFile, isFree, isLowStock, onlyDigits, priceLabel, stripDigits } from '../library/helpers.js';
import { validateBookForm, validateOnlineBookForm } from '../library/validation.js';

const BLANK_BOOK = { title: '', author: '', genre: '', isbn: '', quantity: '', price: '' };
const BLANK_ONLINE = { title: '', author: '', genre: '', url: '' };

function BookForm() {
  const { books, addBook, updateBook, showToast } = useLibrary();
  const [form, setForm] = useState(BLANK_BOOK);
  const [errors, setErrors] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [file, setFile] = useState(null);
  const [fileLabel, setFileLabel] = useState('');
  const [fileKey, setFileKey] = useState(0);

  const editingBook = editingId ? books.find((b) => b.id === editingId) : null;

  const change = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  const changeNoDigits = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: stripDigits(e.target.value) }));
  const changeIsbn = (e) => setForm((p) => ({ ...p, isbn: onlyDigits(e.target.value) }));

  function reset() {
    setForm(BLANK_BOOK);
    setErrors({});
    setEditingId(null);
    setFile(null);
    setFileLabel('');
    setFileKey((k) => k + 1);
  }

  function startEdit(book) {
    setEditingId(book.id);
    setForm({
      title: book.title,
      author: book.author,
      genre: book.genre,
      isbn: book.isbn,
      quantity: String(book.quantity),
      price: book.price ? String(book.price) : '',
    });
    setErrors({});
    setFile(null);
    setFileKey((k) => k + 1);
    setFileLabel(book.fileName ? `Current file: ${book.fileName}` : '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleFileChosen(e) {
    const chosen = e.target.files[0];
    if (!chosen) {
      setFile(null);
      setFileLabel('');
      return;
    }
    if (chosen.size > MAX_UPLOAD_BYTES) {
      setErrors((p) => ({
        ...p,
        file: `Keep uploads under ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB.`,
      }));
      setFile(null);
      setFileLabel('');
      setFileKey((k) => k + 1);
      return;
    }
    setErrors((p) => ({ ...p, file: '' }));
    setFile(chosen);
    setFileLabel(`Selected: ${chosen.name} (${Math.round(chosen.size / 1024)}KB)`);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const found = validateBookForm(form, books, editingId);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const payload = {
      title: form.title.trim(),
      author: form.author.trim(),
      genre: form.genre.trim(),
      isbn: form.isbn.trim(),
      quantity: Number(form.quantity),
      price: form.price === '' ? 0 : Number(form.price),
    };

    if (editingId) {
      await updateBook(editingId, payload, file);
      showToast('Book updated.');
    } else {
      await addBook(payload, file);
      showToast('Book added to the catalog.');
    }
    reset();
  }

  return (
    <>
      <section className="section">
        <h2 className="section-title">
          {editingBook ? `Editing "${editingBook.title}"` : 'Add a New Book'}
        </h2>
        <form className="form-panel" onSubmit={handleSubmit} noValidate>
          <div className="form-grid">
            <Field label="Title" htmlFor="field-title" error={errors.title}>
              <input id="field-title" name="title" type="text" value={form.title} onChange={changeNoDigits} autoComplete="off" />
            </Field>
            <Field label="Author" htmlFor="field-author" error={errors.author}>
              <input id="field-author" name="author" type="text" value={form.author} onChange={changeNoDigits} autoComplete="off" />
            </Field>
            <Field label="Genre" htmlFor="field-genre" error={errors.genre}>
              <input id="field-genre" name="genre" type="text" value={form.genre} onChange={change} autoComplete="off" />
            </Field>
            <Field label="ISBN" htmlFor="field-isbn" error={errors.isbn}>
              <input id="field-isbn" name="isbn" type="text" inputMode="numeric" value={form.isbn} onChange={changeIsbn} autoComplete="off" />
            </Field>
            <Field label="Initial Quantity" htmlFor="field-quantity" error={errors.quantity}>
              <input id="field-quantity" name="quantity" type="number" min="0" step="1" value={form.quantity} onChange={change} autoComplete="off" />
            </Field>
            <Field label={<>Price <TextSoft>(leave blank if free)</TextSoft></>} htmlFor="field-price" error={errors.price}>
              <input id="field-price" name="price" type="number" min="0" step="1" placeholder="0" value={form.price} onChange={change} autoComplete="off" />
            </Field>
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="field-file">Book File <TextSoft>(optional, max 2MB)</TextSoft></label>
              <input key={fileKey} id="field-file" type="file" accept=".pdf,.epub,.txt,.doc,.docx" onChange={handleFileChosen} />
              <span className="text-soft small-label">{fileLabel}</span>
              <span className="field-error">{errors.file || ''}</span>
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-accent">
              {editingId ? 'Save Changes' : 'Add Book'}
            </button>
            {editingId && (
              <button type="button" className="btn btn-outline" onClick={reset}>
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      </section>

      <BookTable onEdit={startEdit} editingId={editingId} onCancelEdit={reset} />
    </>
  );
}

function BookTable({ onEdit, editingId, onCancelEdit }) {
  const { books, removeBook, showToast } = useLibrary();

  async function handleDelete(book) {
    if (!window.confirm(`Remove "${book.title}" from the catalog?`)) return;
    await removeBook(book.id);
    if (editingId === book.id) onCancelEdit();
    showToast('Book removed.');
  }

  return (
    <section className="section">
      <h2 className="section-title">Catalog</h2>
      <TableWrap headers={['Title', 'Author', 'Genre', 'ISBN', 'Qty', 'Price', 'File', 'Actions']}>
        {books.length === 0 ? (
          <EmptyRow colSpan={8}>No books catalogued yet — add one using the form above.</EmptyRow>
        ) : (
          books.map((book) => (
            <tr key={book.id}>
              <td><strong>{book.title}</strong></td>
              <td>{book.author}</td>
              <td>{book.genre}</td>
              <td className="mono">{book.isbn}</td>
              <td>
                <span className={`qty-badge${isLowStock(book) ? ' low' : ''}`}>{book.quantity}</span>
              </td>
              <td><Stamp tone={isFree(book) ? 'success' : 'neutral'}>{priceLabel(book)}</Stamp></td>
              <td className="text-soft">{hasFile(book) ? 'Uploaded' : '—'}</td>
              <td>
                <div className="row-actions">
                  <button type="button" className="btn btn-outline btn-small" onClick={() => onEdit(book)}>Edit</button>
                  <button type="button" className="btn btn-danger btn-small" onClick={() => handleDelete(book)}>Delete</button>
                </div>
              </td>
            </tr>
          ))
        )}
      </TableWrap>
    </section>
  );
}

function OnlineBookSection() {
  const { onlineBooks, addOnlineBook, updateOnlineBook, removeOnlineBook, showToast } = useLibrary();
  const [form, setForm] = useState(BLANK_ONLINE);
  const [errors, setErrors] = useState({});
  const [editingId, setEditingId] = useState(null);

  const editingBook = editingId ? onlineBooks.find((b) => b.id === editingId) : null;
  const change = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  const changeNoDigits = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: stripDigits(e.target.value) }));

  function reset() {
    setForm(BLANK_ONLINE);
    setErrors({});
    setEditingId(null);
  }

  function startEdit(book) {
    setEditingId(book.id);
    setForm({ title: book.title, author: book.author, genre: book.genre, url: book.url });
    setErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const found = validateOnlineBookForm(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    const payload = {
      title: form.title.trim(),
      author: form.author.trim(),
      genre: form.genre.trim(),
      url: form.url.trim(),
    };
    if (editingId) {
      await updateOnlineBook(editingId, payload);
      showToast('Online book updated.');
    } else {
      await addOnlineBook(payload);
      showToast('Online book added.');
    }
    reset();
  }

  async function handleDelete(book) {
    if (!window.confirm(`Remove "${book.title}"?`)) return;
    await removeOnlineBook(book.id);
    if (editingId === book.id) reset();
    showToast('Online book removed.');
  }

  return (
    <>
      <section className="section">
        <h2 className="section-title">
          {editingBook ? `Editing "${editingBook.title}"` : 'Add an Online Book'}
        </h2>
        <p className="text-soft small-label">
          For books without an uploaded file — paste a link instead.
        </p>
        <form className="form-panel" onSubmit={handleSubmit} noValidate>
          <div className="form-grid">
            <Field label="Title" htmlFor="field-ob-title" error={errors.title}>
              <input id="field-ob-title" name="title" type="text" value={form.title} onChange={changeNoDigits} autoComplete="off" />
            </Field>
            <Field label="Author" htmlFor="field-ob-author" error={errors.author}>
              <input id="field-ob-author" name="author" type="text" value={form.author} onChange={changeNoDigits} autoComplete="off" />
            </Field>
            <Field label="Genre" htmlFor="field-ob-genre" error={errors.genre}>
              <input id="field-ob-genre" name="genre" type="text" value={form.genre} onChange={change} autoComplete="off" />
            </Field>
            <Field label="Link to the book" htmlFor="field-ob-url" error={errors.url} style={{ gridColumn: '1 / -1' }}>
              <input id="field-ob-url" name="url" type="url" placeholder="https://..." value={form.url} onChange={change} autoComplete="off" />
            </Field>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-accent">
              {editingId ? 'Save Changes' : 'Add Online Book'}
            </button>
            {editingId && (
              <button type="button" className="btn btn-outline" onClick={reset}>Cancel Edit</button>
            )}
          </div>
        </form>
      </section>

      <section className="section">
        <h2 className="section-title">Online Books</h2>
        <TableWrap headers={['Title', 'Author', 'Genre', 'Link', 'Actions']}>
          {onlineBooks.length === 0 ? (
            <EmptyRow colSpan={5}>No online books linked yet.</EmptyRow>
          ) : (
            onlineBooks.map((book) => (
              <tr key={book.id}>
                <td><strong>{book.title}</strong></td>
                <td>{book.author}</td>
                <td>{book.genre}</td>
                <td><a className="mono" href={book.url} target="_blank" rel="noopener noreferrer">Open</a></td>
                <td>
                  <div className="row-actions">
                    <button type="button" className="btn btn-outline btn-small" onClick={() => startEdit(book)}>Edit</button>
                    <button type="button" className="btn btn-danger btn-small" onClick={() => handleDelete(book)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </TableWrap>
      </section>
    </>
  );
}

export default function BookManagement() {
  return (
    <section className="view">
      <PageHead eyebrow="Catalog" title="Book Management">
        Add new titles, correct existing records, or withdraw books no longer on the shelf.
      </PageHead>
      <BookForm />
      <OnlineBookSection />
    </section>
  );
}