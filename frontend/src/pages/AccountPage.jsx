import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import api from '../api';
import '../styles/AccountPage.css';

export default function AccountPage() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchLatestProfile = async () => {
      try {
        const res = await api.get('/user/profile');
        updateUser(res.data.user);
      } catch (err) {
        console.error(err);
      }
    };

    fetchLatestProfile();
  }, [user, navigate, updateUser]);

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      setDeleteError('Wpisz hasło');
      return;
    }

    setDeleting(true);
    setDeleteError('');

    try {
      await api.delete('/user/account', { data: { password: deletePassword } });
      logout();
      navigate('/');
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Błąd usuwania konta');
    } finally {
      setDeleting(false);
    }
  };

  const openDeleteModal = () => {
    setShowDeleteModal(true);
    setDeletePassword('');
    setDeleteError('');
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDeletePassword('');
    setDeleteError('');
  };

  if (!user) {
    return null;
  }

  const hasTargets = !!user.daily_kcal_target;

  return (
    <div className="account-container">
      <h2>Twoje konto</h2>
      <p>Cześć, {user.username}!</p>

      {hasTargets ? (
        <>
          <h3>Twoje dzienne cele</h3>
          <div className="account-goals">
            <div className="goal-row">
              <span>Kalorie:</span>
              <strong>{user.daily_kcal_target} kcal</strong>
            </div>
            <div className="goal-row">
              <span>Białko:</span>
              <strong>{user.daily_protein_target_g ?? '-'} g</strong>
            </div>
            <div className="goal-row">
              <span>Węglowodany:</span>
              <strong>{user.daily_carbs_target_g ?? '-'} g</strong>
            </div>
            <div className="goal-row">
              <span>Tłuszcz:</span>
              <strong>{user.daily_fat_target_g ?? '-'} g</strong>
            </div>
            <div className="goal-row">
              <span>Kroków dziennie:</span>
              <strong>{user.daily_steps_target ?? '-'}</strong>
            </div>
          </div>

          <p className="account-edit-link">
            Chcesz zmienić dane? Przejdź do{' '}
            <Link to="/profile">profilu użytkownika</Link>.
          </p>
        </>
      ) : (
        <>
          <p>Nie masz jeszcze ustawionych celów.</p>
          <p>
            Uzupełnij dane w <Link to="/profile">profilu</Link>, aby
            wyliczyć swoje zapotrzebowanie kaloryczne i makroskładniki.
          </p>
        </>
      )}

      {/* Sekcja usuwania konta */}
      <div className="account-settings">
        <h3>Ustawienia konta</h3>
        <div className="settings-item">
          <div className="settings-info">
            <span className="settings-label">Usuń konto</span>
            <span className="settings-desc">Trwale usuń konto i wszystkie dane</span>
          </div>
          <button className="btn-delete-account" onClick={openDeleteModal}>
            Usuń
          </button>
        </div>
      </div>

      {/* Modal potwierdzenia */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={closeDeleteModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Usuń konto</h3>
            <p>Czy na pewno chcesz usunąć swoje konto?</p>
            <p className="modal-warning">
              Ta operacja jest nieodwracalna. Wszystkie Twoje dane (posiłki, kroki, ulubione produkty) zostaną trwale usunięte.
            </p>
            
            <div className="form-group">
              <label>Wpisz hasło aby potwierdzić:</label>
              {/* Fake input oszukujący przeglądarkę */}
              <input type="text" style={{ display: 'none' }} autoComplete="username" />
              <input type="password" style={{ display: 'none' }} autoComplete="new-password" />
              <input
                type="password"
                value={deletePassword}
                onChange={e => setDeletePassword(e.target.value)}
                placeholder="Twoje hasło"
                autoComplete="new-password"
                data-lpignore="true"
                data-1p-ignore="true"
                data-form-type="other"
              />
            </div>

            {deleteError && <p className="modal-error">{deleteError}</p>}

            <div className="modal-actions">
              <button 
                className="btn-cancel" 
                onClick={closeDeleteModal}
                disabled={deleting}
              >
                Anuluj
              </button>
              <button 
                className="btn-confirm-delete" 
                onClick={handleDeleteAccount}
                disabled={deleting}
              >
                {deleting ? 'Usuwanie...' : 'Usuń konto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
