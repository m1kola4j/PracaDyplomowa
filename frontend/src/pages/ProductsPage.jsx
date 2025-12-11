import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import api from '../api';
import '../styles/ProductsPage.css';

// Funkcja do obliczania kalorii na podstawie makroskladnikow
const calculateCalories = (protein, carbs, fat) => {
  const p = parseFloat(protein) || 0;
  const c = parseFloat(carbs) || 0;
  const f = parseFloat(fat) || 0;
  return Math.round((p * 4 + c * 4 + f * 9) * 10) / 10;
};

// Czysci input liczbowy tak, aby pozostaly tylko cyfry
const cleanIntegerInput = (value) => {
  const cleaned = value.replace(/[.,eE+-]/g, '');
  if (cleaned === '' || /^\d+$/.test(cleaned)) {
    return cleaned;
  }
  return null;
};

export default function ProductsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [newProduct, setNewProduct] = useState({
    name: '',
    category: '',
    kcal_100: '',
    protein_100: '',
    carbs_100: '',
    fat_100: '',
  });
  const [message, setMessage] = useState('');
  
  // Ulubione
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [favoriteProducts, setFavoriteProducts] = useState([]);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);

  const LIMIT = 20;

  // Przekieruj na logowanie jesli niezalogowany
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  // Pobierz liste ulubionych ID
  const fetchFavoriteIds = useCallback(async () => {
    try {
      const res = await api.get('/favorites/ids');
      setFavoriteIds(new Set(res.data.favoriteIds));
    } catch (err) {
      console.error('Błąd pobierania ulubionych:', err);
    }
  }, []);

  // Pobierz wszystkie ulubione produkty
  const fetchFavoriteProducts = useCallback(async () => {
    try {
      const res = await api.get('/favorites');
      setFavoriteProducts(res.data.favorites || []);
    } catch (err) {
      console.error('Błąd pobierania ulubionych produktów:', err);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchFavoriteIds();
      fetchFavoriteProducts();
    }
  }, [user, fetchFavoriteIds, fetchFavoriteProducts]);

  const fetchProducts = useCallback(async (searchTerm = '', offset = 0) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: LIMIT,
        offset: offset,
      });
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }

      const res = await api.get(`/products?${params.toString()}`);
      setProducts(res.data.products);
      setTotal(res.data.total);
    } catch (err) {
      console.error('Błąd pobierania produktów:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts(search, page * LIMIT);
  }, [page, search, fetchProducts]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(0);
    fetchProducts(search, 0);
  };

  // Toggle ulubione
  const toggleFavorite = async (productId) => {
    const isFavorite = favoriteIds.has(productId);
    
    try {
      if (isFavorite) {
        await api.delete(`/favorites/${productId}`);
        setFavoriteIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(productId);
          return newSet;
        });
        // Usuń z listy ulubionych produktów
        setFavoriteProducts(prev => prev.filter(p => p.id !== productId));
      } else {
        await api.post(`/favorites/${productId}`);
        setFavoriteIds(prev => new Set(prev).add(productId));
        // Dodaj do listy ulubionych - pobierz ponownie
        fetchFavoriteProducts();
      }
    } catch (err) {
      console.error('Błąd zmiany ulubionych:', err);
    }
  };

  // Aktualizacja makroskladnikow z automatycznym liczeniem kalorii
  const handleMacroChange = (field, value) => {
    const cleaned = cleanIntegerInput(value);
    if (cleaned === null) {
      return;
    }

    const updated = { ...newProduct, [field]: cleaned };

    if (field === 'protein_100' || field === 'carbs_100' || field === 'fat_100') {
      updated.kcal_100 = calculateCalories(
        field === 'protein_100' ? cleaned : updated.protein_100,
        field === 'carbs_100' ? cleaned : updated.carbs_100,
        field === 'fat_100' ? cleaned : updated.fat_100
      );
    }

    setNewProduct(updated);
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!newProduct.name || !newProduct.kcal_100 || !newProduct.protein_100 || !newProduct.carbs_100 || !newProduct.fat_100) {
      setMessage('Wypelnij wszystkie wymagane pola');
      return;
    }

    const p = parseFloat(newProduct.protein_100) || 0;
    const c = parseFloat(newProduct.carbs_100) || 0;
    const f = parseFloat(newProduct.fat_100) || 0;

    if (p < 0 || p > 100 || c < 0 || c > 100 || f < 0 || f > 100) {
      setMessage('Białko, węglowodany i tłuszcz muszą być w zakresie 0-100 g na 100 g produktu.');
      return;
    }

    if (p + c + f > 100) {
      setMessage('Suma białka, węglowodanów i tłuszczu nie może przekraczać 100 g na 100 g produktu.');
      return;
    }

    try {
      const payload = {
        name: newProduct.name,
        category: newProduct.category || null,
        kcal_100: parseFloat(newProduct.kcal_100),
        protein_100: parseFloat(newProduct.protein_100),
        carbs_100: parseFloat(newProduct.carbs_100),
        fat_100: parseFloat(newProduct.fat_100),
      };

      if (editingProductId) {
        await api.put(`/products/${editingProductId}`, payload);
        setMessage('Produkt zaktualizowany!');
      } else {
        await api.post('/products', payload);
        setMessage('Produkt dodany!');
      }
      setNewProduct({
        name: '',
        category: '',
        kcal_100: '',
        protein_100: '',
        carbs_100: '',
        fat_100: '',
      });
      setEditingProductId(null);
      setShowAddForm(false);
      fetchProducts(search, page * LIMIT);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Błąd dodawania produktu');
    }
  };

  const startEditProduct = (product) => {
    setNewProduct({
      name: product.name || '',
      category: product.category || '',
      kcal_100: String(Math.round(product.kcal_100 || 0)),
      protein_100: String(Math.round(product.protein_100 || 0)),
      carbs_100: String(Math.round(product.carbs_100 || 0)),
      fat_100: String(Math.round(product.fat_100 || 0)),
    });
    setEditingProductId(product.id);
    setShowAddForm(true);
    setMessage('Edytujesz istniejący produkt. Zapis nadpisze wartości.');
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Na pewno usunąć ten produkt?')) return;
    try {
      await api.delete(`/products/${productId}`);
      fetchProducts(search, page * LIMIT);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Błąd usuwania produktu');
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  // Wyswietlane produkty - wszystkie ulubione lub normalna lista
  const displayedProducts = showOnlyFavorites
    ? favoriteProducts
    : products;

  // Nie renderuj nic jesli niezalogowany
  if (!user) {
    return null;
  }

  return (
    <div className="products-container">
      <h2>Baza produktów</h2>

      {/* Wyszukiwarka */}
      <form onSubmit={handleSearch} className="search-form">
        <input
          type="text"
          placeholder="Szukaj produktu..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit">Szukaj</button>
      </form>

      {/* Filtry i przyciski */}
      <div className="filter-row">
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className={`add-product-btn ${showAddForm ? 'active' : ''}`}
        >
          {showAddForm ? 'Anuluj' : '+ Dodaj własny produkt'}
        </button>
        
        <button
          onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
          className={`add-product-btn ${showOnlyFavorites ? 'active' : ''}`}
        >
          Ulubione
        </button>
      </div>

      {/* Formularz dodawania produktu */}
      {showAddForm && (
        <div className="add-form-container">
          <h3>Dodaj nowy produkt</h3>
          {message && (
            <p className={`message ${message.includes('Błąd') ? 'error' : 'success'}`}>
              {message}
            </p>
          )}
          <form onSubmit={handleAddProduct}>
            <div className="form-grid">
              <div className="form-group">
                <label>Nazwa produktu *</label>
                <input
                  type="text"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Kategoria (opcjonalnie)</label>
                <input
                  type="text"
                  value={newProduct.category}
                  onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Bialko (g na 100g) *</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={newProduct.protein_100}
                  onChange={(e) => handleMacroChange('protein_100', e.target.value)}
                  onKeyDown={(e) => {
                    if (['e', 'E', '+', '-', ',', '.'].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  required
                />
              </div>
              <div className="form-group">
                <label>Weglowodany (g na 100g) *</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={newProduct.carbs_100}
                  onChange={(e) => handleMacroChange('carbs_100', e.target.value)}
                  onKeyDown={(e) => {
                    if (['e', 'E', '+', '-', ',', '.'].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  required
                />
              </div>
              <div className="form-group">
                <label>Tluszcz (g na 100g) *</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={newProduct.fat_100}
                  onChange={(e) => handleMacroChange('fat_100', e.target.value)}
                  onKeyDown={(e) => {
                    if (['e', 'E', '+', '-', ',', '.'].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  required
                />
              </div>
              <div className="form-group">
                <label>
                  Kalorie (na 100g) * 
                  <span style={{ fontSize: '0.8em', color: '#888', marginLeft: '0.5rem' }}>
                    (auto)
                  </span>
                </label>
                <div className="calories-field">
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={newProduct.kcal_100}
                    disabled
                    required
                  />
                </div>
              </div>
            </div>
            <button type="submit" className="submit-product-btn">
              Dodaj produkt
            </button>
          </form>
        </div>
      )}

      {/* Informacja o liczbie wynikow */}
      <p className="results-info">
        Znaleziono: <strong>{total}</strong> produktów
        {showOnlyFavorites && ` | Wyswietlono: ${displayedProducts.length} ulubionych`}
      </p>

      {/* Lista produktów */}
      {loading ? (
        <div className="loading-state">Ładowanie produktów...</div>
      ) : displayedProducts.length === 0 ? (
        <div className="empty-state">
          {showOnlyFavorites ? 'Brak ulubionych produktów' : 'Brak produktów do wyświetlenia'}
        </div>
      ) : (
        <div className="products-table-wrapper">
          <table className="products-table">
            <thead>
              <tr>
                <th>Nazwa</th>
                <th className="center">kcal/100g</th>
                <th className="center hide-mobile">B/100g</th>
                <th className="center hide-mobile">W/100g</th>
                <th className="center hide-mobile">T/100g</th>
                <th className="center">Ulub.</th>
                <th className="center">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {displayedProducts.map((product) => {
                const isOwner = product.added_by_user_id === user.id;
                const isFavorite = favoriteIds.has(product.id);
                return (
                  <tr key={product.id}>
                    <td>
                      <span className="product-name">{product.name}</span>
                      {product.category && (
                        <span className="product-brand">({product.category})</span>
                      )}
                    </td>
                    <td className="center">{Math.round(product.kcal_100)}</td>
                    <td className="center hide-mobile">{Math.round(product.protein_100)}g</td>
                    <td className="center hide-mobile">{Math.round(product.carbs_100)}g</td>
                    <td className="center hide-mobile">{Math.round(product.fat_100)}g</td>
                    <td className="center">
                      <button
                        className={`favorite-btn ${isFavorite ? 'active' : ''}`}
                        onClick={() => toggleFavorite(product.id)}
                      >
                        {isFavorite ? '*' : '-'}
                      </button>
                    </td>
                    <td className="center actions-cell">
                      {isOwner ? (
                        <>
                          <button
                            className="action-btn edit-btn"
                            onClick={() => startEditProduct(product)}
                          >
                            Edytuj
                          </button>
                          <button
                            className="action-btn delete-btn"
                            onClick={() => handleDeleteProduct(product.id)}
                          >
                            Usuń
                          </button>
                        </>
                      ) : (
                        <span className="no-actions">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginacja */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            Poprzednia
          </button>
          <span>Strona {page + 1} z {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
          >
            Nastepna
          </button>
        </div>
      )}
    </div>
  );
}
