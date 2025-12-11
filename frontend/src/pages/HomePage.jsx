import { useState } from 'react';
import { useAuth } from '../AuthContext';
import api from '../api';
import '../styles/HomePage.css';

const CATEGORIES = [
  { key: 'nutrition', label: 'Zdrowe odżywianie' },
  { key: 'activity', label: 'Aktywność fizyczna' },
  { key: 'goals', label: 'Cele i postępy' },
  { key: 'hydration', label: 'Nawodnienie' },
];

export default function HomePage() {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [tips, setTips] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchTipsByCategory = async (category) => {
    setLoading(true);
    try {
      const res = await api.get(`/tips/category/${category}`);
      setTips(res.data.tips);
    } catch (err) {
      console.error('Blad pobierania porad:', err);
      setTips([]);
    } finally {
      setLoading(false);
    }
  };

  const openCategory = (category) => {
    setSelectedCategory(category);
    fetchTipsByCategory(category);
  };

  const closeModal = () => {
    setSelectedCategory(null);
    setTips([]);
  };

  const getCategoryLabel = (key) => {
    const cat = CATEGORIES.find(c => c.key === key);
    return cat ? cat.label : key;
  };

  return (
    <div className="home-container">
      <div className="home-header">
        <h1>NutritionApp</h1>
        <p className="home-subtitle">Twój asystent zdrowego stylu życia</p>
      </div>

      {!user ? (
        <div className="home-guest">
          <p>Zadbaj o swoje zdrowie z NutritionApp</p>
        </div>
      ) : (
        <div className="home-user">
          <p className="home-welcome">Cześć, <strong>{user.username}</strong>!</p>
          
          {user.daily_kcal_target && (
            <div className="home-goals-summary">
              <div className="goal-item">
                <span className="goal-value">{user.daily_kcal_target}</span>
                <span className="goal-label">kcal/dzień</span>
              </div>
              <div className="goal-item">
                <span className="goal-value">{user.daily_steps_target || '-'}</span>
                <span className="goal-label">kroków/dzień</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Karty kategorii porad */}
      <div className="tips-section">
        <h2>Porady</h2>
        <div className="tips-categories">
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              className="tip-category-card"
              onClick={() => user ? openCategory(cat.key) : null}
              disabled={!user}
              title={!user ? 'Zaloguj się aby zobaczyć porady' : ''}
            >
              <span className="tip-category-label">{cat.label}</span>
              <span className="tip-category-action">porady</span>
            </button>
          ))}
        </div>
      </div>

      {/* Modal z poradami */}
      {selectedCategory && (
        <div className="tips-modal-overlay" onClick={closeModal}>
          <div className="tips-modal" onClick={e => e.stopPropagation()}>
            <div className="tips-modal-header">
              <h3>{getCategoryLabel(selectedCategory)}</h3>
              <button className="tips-modal-close" onClick={closeModal}>X</button>
            </div>
            <div className="tips-modal-content">
              {loading ? (
                <p className="tips-loading">Ładowanie...</p>
              ) : tips.length === 0 ? (
                <p className="tips-empty">Brak porad w tej kategorii</p>
              ) : (
                <div className="tips-list">
                  {tips.map(tip => (
                    <div key={tip.id} className="tip-item">
                      <h4>{tip.title}</h4>
                      <p>{tip.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <footer className="home-footer">
        <p>NutritionApp - Twoje zdrowie, Twoje cele</p>
      </footer>
    </div>
  );
}
