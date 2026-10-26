import { useNavigate } from 'react-router-dom';
import { useLibrary } from '../context/LibraryContext.jsx';
import { Stamp } from './uiComponents.jsx';

export default function OnlineBookCard({ book }) {
  const { currentUser, isAdmin } = useLibrary();
  const navigate = useNavigate();
  const canOpen = Boolean(currentUser) || isAdmin;

  return (
    <article className="catalog-card">
      <span className="card-genre">{book.genre || 'Uncategorised'}</span>
      <h3 className="card-title">{book.title}</h3>
      <p className="card-author">by {book.author}</p>
      <div className="card-meta">
        <Stamp tone="success">Free — Online</Stamp>
      </div>
      <div className="card-access">
        {canOpen ? (
          <a
            className="btn btn-primary btn-small"
            href={book.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open Online Book
          </a>
        ) : (
          <button
            type="button"
            className="btn btn-outline btn-small"
            onClick={() => navigate('/members')}
          >
            Log In to Access
          </button>
        )}
      </div>
    </article>
  );
}