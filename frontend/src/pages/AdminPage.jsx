import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import '../styles/AdminPage.css';

const TIP_CATEGORIES = [
  { key: 'nutrition', label: 'Zdrowe odżywianie' },
  { key: 'activity', label: 'Aktywność fizyczna' },
  { key: 'goals', label: 'Cele i postępy' },
  { key: 'hydration', label: 'Nawodnienie' },
];

export default function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [tips, setTips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Formularz porady
  const [tipForm, setTipForm] = useState({
    id: null,
    title: '',
    content: '',
    category: 'nutrition',
    is_active: true,
  });
  const [showTipForm, setShowTipForm] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchStats();
  }, [user, navigate]);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'tips') fetchTips();
  }, [activeTab]);

  const fetchStats = async () => {
    try {
      const res = await api.get('/admin/stats');
      setStats(res.data.stats);
    } catch (err) {
      console.error('Błąd pobierania statystyk:', err);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data.users);
    } catch (err) {
      setError('Błąd pobierania użytkowników');
    } finally {
      setLoading(false);
    }
  };

  const fetchTips = async () => {
    setLoading(true);
    try {
      const res = await api.get('/tips/admin/all');
      setTips(res.data.tips);
    } catch (err) {
      setError('Błąd pobierania porad');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Na pewno usunąć tego użytkownika?')) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      setUsers(users.filter(u => u.id !== userId));
    } catch (err) {
      alert(err.response?.data?.message || 'Błąd usuwania');
    }
  };

  const handleChangeRole = async (userId, newRole) => {
    try {
      await api.put(`/admin/users/${userId}/role`, { role: newRole });
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      alert(err.response?.data?.message || 'Błąd zmiany roli');
    }
  };

  const openTipForm = (tip = null) => {
    if (tip) {
      setTipForm({
        id: tip.id,
        title: tip.title,
        content: tip.content,
        category: tip.category,
        is_active: tip.is_active,
      });
    } else {
      setTipForm({
        id: null,
        title: '',
        content: '',
        category: 'nutrition',
        is_active: true,
      });
    }
    setShowTipForm(true);
  };

  const closeTipForm = () => {
    setShowTipForm(false);
    setTipForm({ id: null, title: '', content: '', category: 'nutrition', is_active: true });
  };

  const handleSaveTip = async (e) => {
    e.preventDefault();
    try {
      if (tipForm.id) {
        await api.put(`/tips/admin/${tipForm.id}`, tipForm);
      } else {
        await api.post('/tips/admin', tipForm);
      }
      fetchTips();
      closeTipForm();
    } catch (err) {
      alert(err.response?.data?.message || 'Błąd zapisywania porady');
    }
  };

  const handleDeleteTip = async (tipId) => {
    if (!window.confirm('Na pewno usunąć tę poradę?')) return;
    try {
      await api.delete(`/tips/admin/${tipId}`);
      setTips(tips.filter(t => t.id !== tipId));
    } catch (err) {
      alert(err.response?.data?.message || 'Błąd usuwania');
    }
  };

  const handleToggleTipActive = async (tip) => {
    try {
      await api.put(`/tips/admin/${tip.id}`, { is_active: !tip.is_active });
      setTips(tips.map(t => t.id === tip.id ? { ...t, is_active: !t.is_active } : t));
    } catch (err) {
      alert('Błąd aktualizacji');
    }
  };

  const getCategoryLabel = (key) => {
    const cat = TIP_CATEGORIES.find(c => c.key === key);
    return cat ? cat.label : key;
  };

  if (!user || user.role !== 'admin') {
    return <div className="admin-container"><p>Brak dostepu</p></div>;
  }

  return (
    <div className="admin-container">
      <h1>Panel Administratora</h1>

      <div className="admin-tabs">
        <button
          className={activeTab === 'dashboard' ? 'active' : ''}
          onClick={() => setActiveTab('dashboard')}
        >
          Dashboard
        </button>
        <button
          className={activeTab === 'users' ? 'active' : ''}
          onClick={() => setActiveTab('users')}
        >
          Uzytkownicy
        </button>
        <button
          className={activeTab === 'tips' ? 'active' : ''}
          onClick={() => setActiveTab('tips')}
        >
          Porady
        </button>
      </div>

      {error && <p className="admin-error">{error}</p>}

      {/* Dashboard */}
      {activeTab === 'dashboard' && stats && (
        <div className="admin-dashboard">
          <div className="stat-card">
            <span className="stat-value">{stats.users}</span>
            <span className="stat-label">Uzytkownicy</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.products}</span>
            <span className="stat-label">Produkty</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.tips}</span>
            <span className="stat-label">Porady</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.meals}</span>
            <span className="stat-label">Posiłki</span>
          </div>
        </div>
      )}

      {/* Lista użytkowników */}
      {activeTab === 'users' && (
        <div className="admin-users">
          {loading ? (
            <p>Ładowanie...</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nazwa</th>
                  <th>Email</th>
                  <th>Rola</th>
                  <th>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td>{u.username}</td>
                    <td>{u.email}</td>
                    <td>
                      <select
                        value={u.role}
                        onChange={(e) => handleChangeRole(u.id, e.target.value)}
                        disabled={u.id === user.id}
                      >
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                    <td>
                      <button
                        className="btn-delete"
                        onClick={() => handleDeleteUser(u.id)}
                        disabled={u.id === user.id}
                      >
                        Usuń
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Lista porad */}
      {activeTab === 'tips' && (
        <div className="admin-tips">
          <button className="btn-add" onClick={() => openTipForm()}>
            + Dodaj porade
          </button>

          {loading ? (
            <p>Ładowanie...</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Tytul</th>
                  <th>Kategoria</th>
                  <th>Aktywna</th>
                  <th>Akcje</th>
                </tr>
              </thead>
              <tbody>
                {tips.map(tip => (
                  <tr key={tip.id} className={!tip.is_active ? 'inactive' : ''}>
                    <td>{tip.title}</td>
                    <td>{getCategoryLabel(tip.category)}</td>
                    <td>
                      <button
                        className={`btn-toggle ${tip.is_active ? 'active' : ''}`}
                        onClick={() => handleToggleTipActive(tip)}
                      >
                        {tip.is_active ? 'Tak' : 'Nie'}
                      </button>
                    </td>
                    <td>
                      <button className="btn-edit" onClick={() => openTipForm(tip)}>
                        Edytuj
                      </button>
                      <button className="btn-delete" onClick={() => handleDeleteTip(tip.id)}>
                        Usuń
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Formularz porady */}
      {showTipForm && (
        <div className="modal-overlay" onClick={closeTipForm}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{tipForm.id ? 'Edytuj porade' : 'Nowa porada'}</h3>
            <form onSubmit={handleSaveTip}>
              <div className="form-group">
                <label>Tytul:</label>
                <input
                  type="text"
                  value={tipForm.title}
                  onChange={e => setTipForm({ ...tipForm, title: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Kategoria:</label>
                <select
                  value={tipForm.category}
                  onChange={e => setTipForm({ ...tipForm, category: e.target.value })}
                >
                  {TIP_CATEGORIES.map(cat => (
                    <option key={cat.key} value={cat.key}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Tresc:</label>
                <textarea
                  value={tipForm.content}
                  onChange={e => setTipForm({ ...tipForm, content: e.target.value })}
                  required
                  rows={4}
                />
              </div>
              <div className="form-group checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={tipForm.is_active}
                    onChange={e => setTipForm({ ...tipForm, is_active: e.target.checked })}
                  />
                  Aktywna
                </label>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-save">Zapisz</button>
                <button type="button" className="btn-cancel" onClick={closeTipForm}>Anuluj</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

