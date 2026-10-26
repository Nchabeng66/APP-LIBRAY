import { useMemo } from 'react';
import { useLibrary } from '../context/LibraryContext.jsx';
import BookCard from '../components/BookCard.jsx';
import { PageHead, LoadingScreen, ErrorBanner } from '../components/uiComponents.jsx';
import { isFree, isLowStock } from '../library/helpers.js';

function StatStrip() {
  const { books, users } = useLibrary();
  const stats = useMemo(() => {
    const lowStock = books.filter(isLowStock).length;
    return [
      { num: books.length, label: 'Titles catalogued' },
      { num: books.reduce((sum, b) => sum + Number(b.quantity), 0), label: 'Copies in stock' },
      { num: lowStock, label: 'Titles low on stock', warn: lowStock > 0 },
      { num: users.length, label: 'Registered users' },
    ];
  }, [books, users]);

  return (
    <section className="stat-strip">
      {stats.map((s) => (
        <div key={s.label} className={`stat-card${s.warn ? ' warn' : ''}`}>
          <span className="stat-num">{s.num}</span>
          <span className="stat-label">{s.label}</span>
        </div>
      ))}
    </section>
  );
}

function BookGrid({ books, emptyMessage }) {
  if (books.length === 0) {
    return <p className="text-soft">{emptyMessage}</p>;
  }
  const sorted = [...books].sort((a, b) => Number(a.quantity) - Number(b.quantity));
  return (
    <div className="card-grid">
      {sorted.map((book) => (
        <BookCard key={book.id} book={book} />
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { books, loading, loadError, reload } = useLibrary();

  if (loading) return <LoadingScreen />;

  const empty = books.length === 0;
  const freeBooks = books.filter(isFree);
  const paidBooks = books.filter((b) => !isFree(b));

  return (
    <section className="view">
      <PageHead eyebrow="Overview" title="Dashboard">
        Live snapshot of the catalog. Titles with fewer than two copies are marked Low Stock and float to the top.
      </PageHead>

      <ErrorBanner message={loadError} onRetry={reload} />
      <StatStrip />

      <section className="section">
        <h2 className="section-title">Free Books</h2>
        <BookGrid
          books={freeBooks}
          emptyMessage={empty ? 'No books catalogued yet.' : 'No free titles yet.'}
        />
      </section>

      <section className="section">
        <h2 className="section-title">Paid Books</h2>
        <BookGrid
          books={paidBooks}
          emptyMessage={empty ? 'No books catalogued yet.' : 'No paid titles yet.'}
        />
      </section>
    </section>
  );
}