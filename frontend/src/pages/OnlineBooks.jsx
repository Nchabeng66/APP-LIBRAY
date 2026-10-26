import { useLibrary } from '../context/LibraryContext.jsx';
import OnlineBookCard from '../components/OnlineBookCard.jsx';
import { PageHead } from '../components/uiComponents.jsx';

export default function OnlineBooks() {
  const { onlineBooks } = useLibrary();
  return (
    <section className="view">
      <PageHead eyebrow="Digital Access" title="Online Books">
        Titles the library links to online — free to read. Log in to open them.
      </PageHead>
      <section className="section">
        {onlineBooks.length === 0 ? (
          <p className="text-soft">No online books linked yet.</p>
        ) : (
          <div className="card-grid">
            {onlineBooks.map((book) => <OnlineBookCard key={book.id} book={book} />)}
          </div>
        )}
      </section>
    </section>
  );
}