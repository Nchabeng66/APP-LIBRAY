import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import BookManagement from './pages/BookManagement.jsx';
import Transactions from './pages/Transactions.jsx';
import OnlineBooks from './pages/OnlineBooks.jsx';
import Membership from './pages/Membership.jsx';
import UserManagement from './pages/UserManagement.jsx';
import { useLibrary } from './context/LibraryContext.jsx';

function RequireAuth({ children }) {
  const { isAuthenticated } = useLibrary();
  return isAuthenticated ? children : <Navigate to="/members" replace />;
}

function RequireStaff({ children }) {
  const { isAuthenticated, isStaff } = useLibrary();
  if (!isAuthenticated) return <Navigate to="/members" replace />;
  return isStaff ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route
          index
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route
          path="books"
          element={
            <RequireStaff>
              <BookManagement />
            </RequireStaff>
          }
        />
        <Route
          path="transactions"
          element={
            <RequireAuth>
              <Transactions />
            </RequireAuth>
          }
        />
        <Route
          path="online"
          element={
            <RequireAuth>
              <OnlineBooks />
            </RequireAuth>
          }
        />
        <Route
          path="users"
          element={
            <RequireStaff>
              <UserManagement />
            </RequireStaff>
          }
        />
        <Route path="members" element={<Membership />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}