import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../AuthContext';
import '../styles/ProfilePage.css';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [activityLevels, setActivityLevels] = useState([]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    async function fetchData() {
      try {
        // Pobierz profil użytkownika
        const profileRes = await api.get('/user/profile');
        const u = profileRes.data.user;
        setForm({
          gender: u.gender || 'male',
          age_years: u.age_years ?? '',
          height_cm: u.height_cm ?? '',
          weight_kg: u.weight_kg ?? '',
          activity_level: u.activity_level || 'moderate',
          goal_type: u.goal_type || 'maintain',
        });

        // Pobierz poziomy aktywności z bazy danych
        const activityRes = await api.get('/user/activity-levels');
        setActivityLevels(activityRes.data.activityLevels || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Dla pól liczbowych - usuń przecinki, kropki, "e", "E", "+", "-"
    if (name === 'age_years' || name === 'height_cm' || name === 'weight_kg') {
      const cleaned = value.replace(/[.,eE+-]/g, '');
      if (cleaned === '' || /^\d+$/.test(cleaned)) {
        setForm((f) => ({ ...f, [name]: cleaned }));
      }
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      const res = await api.put('/user/profile', form);
      const updatedUser = res.data.user;
      setMessage('Profil zaktualizowany. Nowe cele zostały wyliczone.');

      updateUser(updatedUser);

      navigate('/account');
    } catch (err) {
      console.error(err);
      setMessage(err.response?.data?.message || 'Błąd aktualizacji profilu');
    }
  };

  if (loading || !form) {
    return <div className="profile-loading">Ładowanie profilu...</div>;
  }

  return (
    <div className="profile-container">
      <h2>Profil użytkownika</h2>
      {message && <p className="profile-message">{message}</p>}

      <form onSubmit={handleSubmit} className="profile-form">
        <label>Płeć:</label>
        <select name="gender" value={form.gender} onChange={handleChange}>
          <option value="male">Mężczyzna</option>
          <option value="female">Kobieta</option>
        </select>

        <label>Wiek (w latach):</label>
        <input
          type="number"
          step="1"
          min="0"
          name="age_years"
          placeholder="Wiek"
          value={form.age_years}
          onChange={handleChange}
          onKeyDown={(e) => {
            if (['e', 'E', '+', '-', ',', '.'].includes(e.key)) {
              e.preventDefault();
            }
          }}
        />

        <label>Wzrost (cm):</label>
        <input
          type="number"
          step="1"
          min="0"
          name="height_cm"
          placeholder="Wzrost (cm)"
          value={form.height_cm}
          onChange={handleChange}
          onKeyDown={(e) => {
            if (['e', 'E', '+', '-', ',', '.'].includes(e.key)) {
              e.preventDefault();
            }
          }}
        />

        <label>Waga (kg):</label>
        <input
          type="number"
          step="1"
          min="0"
          name="weight_kg"
          placeholder="Waga (kg)"
          value={form.weight_kg}
          onChange={handleChange}
          onKeyDown={(e) => {
            if (['e', 'E', '+', '-', ',', '.'].includes(e.key)) {
              e.preventDefault();
            }
          }}
        />

        <label>Poziom aktywności:</label>
        <select
          name="activity_level"
          value={form.activity_level}
          onChange={handleChange}
        >
          {activityLevels.length > 0 ? (
            activityLevels.map((level) => (
              <option key={level.code} value={level.code}>
                {level.label_pl}
              </option>
            ))
          ) : (
            <>
              <option value="sedentary">Siedzący tryb życia</option>
              <option value="light">Lekka aktywność</option>
              <option value="moderate">Umiarkowana aktywność</option>
              <option value="active">Aktywny</option>
              <option value="very_active">Bardzo aktywny</option>
            </>
          )}
        </select>

        <label>Cel:</label>
        <select name="goal_type" value={form.goal_type} onChange={handleChange}>
          <option value="lose">Schudnąć</option>
          <option value="maintain">Utrzymać wagę</option>
          <option value="gain">Przytyć</option>
        </select>

        <button type="submit">Zapisz profil</button>
      </form>
    </div>
  );
}
