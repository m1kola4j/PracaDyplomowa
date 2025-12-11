import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import AccountPage from './pages/AccountPage.jsx';
import ProductsPage from './pages/ProductsPage.jsx';
import DiaryPage from './pages/DiaryPage.jsx';
import StepsPage from './pages/StepsPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import './styles/App.css';

function Navbar() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/" onClick={closeMenu}>NutritionApp</Link>
        <button 
          className="navbar-toggle" 
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu"
        >
          <span className={`hamburger ${menuOpen ? 'open' : ''}`}></span>
        </button>
      </div>
      
      <div className={`navbar-menu ${menuOpen ? 'open' : ''}`}>
        {user ? (
          <>
            <Link to="/diary" onClick={closeMenu}>Dziennik</Link>
            <Link to="/products" onClick={closeMenu}>Produkty</Link>
            <Link to="/steps" onClick={closeMenu}>Kroki</Link>
            <Link to="/profile" onClick={closeMenu}>Profil</Link>
            <Link to="/account" onClick={closeMenu}>Konto</Link>
            {user.role === 'admin' && (
              <Link to="/admin" onClick={closeMenu}>Admin</Link>
            )}
            <button onClick={() => { logout(); closeMenu(); }} className="logout-btn">
              Wyloguj
            </button>
          </>
        ) : (
          <>
            <Link to="/login" onClick={closeMenu}>Logowanie</Link>
            <Link to="/register" onClick={closeMenu}>Rejestracja</Link>
          </>
        )}
      </div>
    </nav>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/diary" element={<DiaryPage />} />
            <Route path="/steps" element={<StepsPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Routes>
        </main>
      </Router>
    </AuthProvider>
  );
}

export default App;
