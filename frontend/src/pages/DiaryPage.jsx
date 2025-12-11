import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import api from '../api';
import '../styles/DiaryPage.css';

const MEAL_TYPES = [
  { key: 'breakfast', label: 'Śniadanie' },
  { key: 'second_breakfast', label: 'Śniadanie 2' },
  { key: 'lunch', label: 'Obiad' },
  { key: 'snacks', label: 'Przekąski' },
  { key: 'dinner', label: 'Kolacja' },
];

export default function DiaryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [meals, setMeals] = useState([]);
  const [dailyTotals, setDailyTotals] = useState({ kcal: 0, protein: 0, carbs: 0, fat: 0 });
  const [loading, setLoading] = useState(true);
  const [expandedMeals, setExpandedMeals] = useState({});
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingToMeal, setAddingToMeal] = useState(null);
  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState('100');
  
  // Ulubione w modalu
  const [favoriteProducts, setFavoriteProducts] = useState([]);
  const [showFavoritesInModal, setShowFavoritesInModal] = useState(false);
  
  // Edycja gramatury
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingQuantity, setEditingQuantity] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const fetchMeals = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const res = await api.get(`/meals/date/${selectedDate}`);
      setMeals(res.data.meals || []);
      setDailyTotals(res.data.dailyTotals || { kcal: 0, protein: 0, carbs: 0, fat: 0 });
    } catch (err) {
      console.error('Błąd pobierania posiłków:', err);
      setMeals([]);
      setDailyTotals({ kcal: 0, protein: 0, carbs: 0, fat: 0 });
    } finally {
      setLoading(false);
    }
  }, [selectedDate, user]);

  useEffect(() => {
    fetchMeals();
  }, [fetchMeals]);

  // Pobierz ulubione produkty
  const fetchFavorites = async () => {
    try {
      const res = await api.get('/favorites');
      setFavoriteProducts(res.data.favorites || []);
    } catch (err) {
      console.error('Błąd pobierania ulubionych:', err);
    }
  };

  const searchProducts = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await api.get(`/products?search=${encodeURIComponent(query)}&limit=10`);
      setSearchResults(res.data.products || []);
    } catch (err) {
      console.error('Błąd wyszukiwania:', err);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!showFavoritesInModal) {
        searchProducts(productSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [productSearch, showFavoritesInModal]);

  const openAddModal = async (mealType) => {
    console.log('openAddModal wywolany dla:', mealType);
    try {
      const res = await api.post('/meals', { date: selectedDate, meal_type: mealType });
      console.log('Odpowiedz z /meals:', res.data);
      setAddingToMeal({ mealId: res.data.meal.id, mealType });
      setShowAddModal(true);
      setProductSearch('');
      setSearchResults([]);
      setSelectedProduct(null);
      setQuantity('100');
      setShowFavoritesInModal(false);
      // Pobierz ulubione przy otwieraniu modalu
      fetchFavorites();
    } catch (err) {
      console.error('Błąd tworzenia posiłku:', err);
      alert('Błąd: ' + (err.response?.data?.message || err.message));
    }
  };

  const addProductToMeal = async () => {
    if (!selectedProduct || !addingToMeal) {
      console.log('Brak selectedProduct lub addingToMeal');
      return;
    }
    
    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) {
      alert('Podaj poprawną ilość');
      return;
    }

    try {
      console.log('Dodawanie produktu:', {
        meal_id: addingToMeal.mealId,
        product_id: selectedProduct.id,
        quantity_g: qty,
      });
      
      await api.post('/meals/items', {
        meal_id: addingToMeal.mealId,
        product_id: selectedProduct.id,
        quantity_g: qty,
      });
      setShowAddModal(false);
      fetchMeals();
    } catch (err) {
      console.error('Błąd dodawania produktu:', err);
      alert('Błąd dodawania produktu: ' + (err.response?.data?.message || err.message));
    }
  };

  const removeItem = async (itemId) => {
    if (!window.confirm('Usunąć ten produkt?')) return;
    
    try {
      await api.delete(`/meals/items/${itemId}`);
      fetchMeals();
    } catch (err) {
      console.error('Błąd usuwania:', err);
    }
  };

  // Rozpocznij edycje gramatury
  const startEditQuantity = (item) => {
    setEditingItemId(item.id);
    setEditingQuantity(Math.round(item.quantity_g).toString());
  };

  // Zapisz nowa gramature
  const saveQuantity = async (itemId) => {
    const newQuantity = parseFloat(editingQuantity);
    if (!newQuantity || newQuantity <= 0) {
      setEditingItemId(null);
      return;
    }

    try {
      await api.put(`/meals/items/${itemId}`, { quantity_g: newQuantity });
      setEditingItemId(null);
      fetchMeals();
    } catch (err) {
      console.error('Błąd aktualizacji:', err);
    }
  };

  // Anuluj edycje
  const cancelEdit = () => {
    setEditingItemId(null);
    setEditingQuantity('');
  };

  const toggleMeal = (mealType) => {
    setExpandedMeals((prev) => ({ ...prev, [mealType]: !prev[mealType] }));
  };

  const changeDate = (days) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const days = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
    const months = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const getMealData = (mealType) => {
    return meals.find((m) => m.meal_type === mealType) || { items: [], totals: { kcal: 0, protein: 0, carbs: 0, fat: 0 } };
  };

  const goals = {
    kcal: user?.daily_kcal_target || 2000,
    protein: user?.daily_protein_target_g || 150,
    carbs: user?.daily_carbs_target_g || 250,
    fat: user?.daily_fat_target_g || 70,
  };

  // Produkty do wyswietlenia w modalu
  const displayProducts = showFavoritesInModal ? favoriteProducts : searchResults;

  if (!user) return null;

  return (
    <div className="diary-container">
      {/* Nagłówek z datą */}
      <div className="diary-header">
        <button className="nav-btn" onClick={() => changeDate(-1)}>←</button>
        <div className="date-info">
          <h2>{formatDate(selectedDate)}</h2>
          <input
            type="date"
            className="date-input"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
        <button className="nav-btn" onClick={() => changeDate(1)}>→</button>
      </div>

      {/* Podsumowanie dzienne */}
      <div className="summary-card">
        <h3>Podsumowanie dnia</h3>
        <div className="summary-grid">
          <ProgressCard label="Kalorie" value={dailyTotals.kcal} max={goals.kcal} unit="kcal" color="red" />
          <ProgressCard label="Białko" value={dailyTotals.protein} max={goals.protein} unit="g" color="blue" />
          <ProgressCard label="Węglowodany" value={dailyTotals.carbs} max={goals.carbs} unit="g" color="yellow" />
          <ProgressCard label="Tłuszcz" value={dailyTotals.fat} max={goals.fat} unit="g" color="purple" />
        </div>
      </div>

      {/* Lista posiłków */}
      {loading ? (
        <div className="loading">Ładowanie...</div>
      ) : (
        <div className="meals-list">
          {MEAL_TYPES.map(({ key, label }) => {
            const meal = getMealData(key);
            const isExpanded = expandedMeals[key] ?? true;
            
            return (
              <div key={key} className="meal-card">
                <div className="meal-header" onClick={() => toggleMeal(key)}>
                  <div className="meal-info">
                    <div>
                      <div className="meal-name">{label}</div>
                      <div className="meal-stats">
                        {Math.round(meal.totals.kcal)} kcal | B: {Math.round(meal.totals.protein)}g | W: {Math.round(meal.totals.carbs)}g | T: {Math.round(meal.totals.fat)}g
                      </div>
                    </div>
                  </div>
                  <div className="meal-actions">
                    <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                    <button
                      className="add-btn"
                      onClick={(e) => { e.stopPropagation(); openAddModal(key); }}
                    >
                      +
                    </button>
                  </div>
                </div>

                {isExpanded && meal.items && meal.items.length > 0 && (
                  <div className="meal-items">
                    <table>
                      <thead>
                        <tr>
                          <th>Produkt</th>
                          <th className="center">Ilość</th>
                          <th className="center">Kalorie</th>
                          <th className="center hide-mobile">Białko</th>
                          <th className="center hide-mobile">Węgle</th>
                          <th className="center hide-mobile">Tłuszcz</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {meal.items.map((item) => (
                          <tr key={item.id}>
                            <td>
                              <div className="product-name">{item.product_name}</div>
                              {item.product_brand && <div className="product-brand">{item.product_brand}</div>}
                            </td>
                            <td className="center">
                              {editingItemId === item.id ? (
                                <div className="edit-quantity">
                                  <input
                                    type="number"
                                    step="1"
                                    min="0"
                                    value={editingQuantity}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      const cleaned = value.replace(/[.,eE+-]/g, '');
                                      if (cleaned === '' || /^\d+$/.test(cleaned)) {
                                        setEditingQuantity(cleaned);
                                      }
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') saveQuantity(item.id);
                                      if (e.key === 'Escape') cancelEdit();
                                      if (['e', 'E', '+', '-', ',', '.'].includes(e.key)) {
                                        e.preventDefault();
                                      }
                                    }}
                                    autoFocus
                                  />
                                  <button className="save-btn" onClick={() => saveQuantity(item.id)}>ok</button>
                                  <button className="cancel-btn" onClick={cancelEdit}>x</button>
                                </div>
                              ) : (
                                <span 
                                  className="editable-quantity" 
                                  onClick={() => startEditQuantity(item)}
                                  title="Kliknij aby edytować"
                                >
                                  {Math.round(item.quantity_g)}g
                                </span>
                              )}
                            </td>
                            <td className="center"><strong>{Math.round(item.kcal)} kcal</strong></td>
                            <td className="center hide-mobile">{Math.round(item.protein)}g</td>
                            <td className="center hide-mobile">{Math.round(item.carbs)}g</td>
                            <td className="center hide-mobile">{Math.round(item.fat)}g</td>
                            <td>
                              <button className="delete-btn" onClick={() => removeItem(item.id)}>x</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {isExpanded && (!meal.items || meal.items.length === 0) && (
                  <div className="meal-empty">
                    Brak produktów. Kliknij + aby dodać.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal dodawania produktu */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Dodaj do: {MEAL_TYPES.find(m => m.key === addingToMeal?.mealType)?.label}</h3>
              <button className="close-btn" onClick={() => setShowAddModal(false)}>x</button>
            </div>

            <div className="modal-search">
              <input
                type="text"
                placeholder="Szukaj produktu..."
                value={productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  setShowFavoritesInModal(false);
                }}
                autoFocus={!showFavoritesInModal}
              />
              <button
                className={`favorites-modal-btn ${showFavoritesInModal ? 'active' : ''}`}
                onClick={() => setShowFavoritesInModal(!showFavoritesInModal)}
              >
                Ulubione
              </button>
            </div>

            <div className="modal-results">
              {showFavoritesInModal && favoriteProducts.length === 0 && (
                <p className="no-results">Brak ulubionych produktów</p>
              )}
              {!showFavoritesInModal && searchResults.length === 0 && productSearch && (
                <p className="no-results">Brak wyników</p>
              )}
              {displayProducts.map((product) => (
                <div
                  key={product.id}
                  className={`result-item ${selectedProduct?.id === product.id ? 'selected' : ''}`}
                  onClick={() => setSelectedProduct(product)}
                >
                  <div className="name">{product.name}</div>
                  <div className="stats">
                    {Math.round(product.kcal_100)} kcal | B: {Math.round(product.protein_100)}g | W: {Math.round(product.carbs_100)}g | T: {Math.round(product.fat_100)}g (na 100g)
                  </div>
                </div>
              ))}
            </div>

            {selectedProduct && (
              <div className="modal-selected">
                <div className="selected-name">{selectedProduct.name}</div>
                <div className="quantity-row">
                  <input
                    type="number"
                    step="1"
                    min="0"
                    className="quantity-input"
                    value={quantity}
                    onChange={(e) => {
                      const value = e.target.value;
                      const cleaned = value.replace(/[.,eE+-]/g, '');
                      if (cleaned === '' || /^\d+$/.test(cleaned)) {
                        setQuantity(cleaned);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (['e', 'E', '+', '-', ',', '.'].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                  />
                  <span>gram</span>
                  <div className="calc-kcal">
                    = <strong>{Math.round(selectedProduct.kcal_100 * parseFloat(quantity || 0) / 100)}</strong> kcal
                  </div>
                </div>
                <button className="submit-btn" onClick={addProductToMeal}>
                  Dodaj produkt
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ProgressCard({ label, value, max, unit, color }) {
  const percent = Math.min(Math.round((value / max) * 100), 100);
  
  return (
    <div className="progress-card">
      <div className="label">{label}</div>
      <div className="value">
        {Math.round(value)}<span>/{Math.round(max)}{unit}</span>
      </div>
      <div className="progress-bar">
        <div className={`fill ${color}`} style={{ width: `${percent}%` }} />
      </div>
      <div className="percent">{percent}%</div>
    </div>
  );
}
