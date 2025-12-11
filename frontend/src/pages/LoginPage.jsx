import { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../AuthContext';
import '../styles/LoginPage.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const formKeyRef = useRef(Date.now());

  const [form, setForm] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [isReadOnly, setIsReadOnly] = useState(true);

  useEffect(() => {
    if (user) {
      navigate('/');
      return;
    }
    
    // Wyczyść pola natychmiast
    setForm({ email: '', password: '' });
    
    // Wyczyść pola w DOM bezpośrednio
    if (emailRef.current) {
      emailRef.current.value = '';
    }
    if (passwordRef.current) {
      passwordRef.current.value = '';
    }
    
    // Usuń readOnly po krótkim czasie, żeby przeglądarka nie wypełniła pól
    const timer = setTimeout(() => {
      setIsReadOnly(false);
      // Wyczyść jeszcze raz po usunięciu readOnly
      setForm({ email: '', password: '' });
      if (emailRef.current) {
        emailRef.current.value = '';
      }
      if (passwordRef.current) {
        passwordRef.current.value = '';
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [user, navigate]);

  const validateForm = () => {
    const newErrors = {};

    if (!form.email.trim()) {
      newErrors.email = 'Email jest wymagany';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Podaj poprawny adres email';
    }

    if (!form.password) {
      newErrors.password = 'Hasło jest wymagane';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Mapuj nazwy pól
    const fieldName = name.includes('mail') ? 'email' : name.includes('pass') ? 'password' : name;
    setForm((f) => ({ ...f, [fieldName]: value }));
    // Usuń błąd dla tego pola gdy użytkownik zaczyna pisać
    if (errors[fieldName]) {
      setErrors((prev) => ({ ...prev, [fieldName]: '' }));
    }
    if (serverError) {
      setServerError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const res = await api.post('/auth/login', form);
      const { token, user } = res.data;
      login(token, user);

      if (user.daily_kcal_target) {
        navigate('/account');
      } else {
        navigate('/profile');
      }
    } catch (err) {
      console.error(err);
      const errorMessage = err.response?.data?.message || 'Błąd logowania. Sprawdź dane i spróbuj ponownie.';
      setServerError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h2>Logowanie</h2>
      
      {serverError && <div className="login-error">{serverError}</div>}

      {/* Ukryte pole, żeby oszukać przeglądarkę */}
      <input type="text" name="fake-username" autoComplete="username" style={{ position: 'absolute', left: '-9999px', opacity: 0 }} tabIndex={-1} readOnly />
      <input type="password" name="fake-password" autoComplete="current-password" style={{ position: 'absolute', left: '-9999px', opacity: 0 }} tabIndex={-1} readOnly />
      
      <form key={formKeyRef.current} onSubmit={handleSubmit} className="login-form" noValidate autoComplete="off" data-form-type="other">
        <div className="form-field">
          {/* Fake input oszukujący przeglądarkę */}
          <input type="text" style={{ display: 'none' }} autoComplete="username" tabIndex={-1} />
          <input
            ref={emailRef}
            name="x-login-mail-field"
            type="text"
            inputMode="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            className={errors.email ? 'error' : ''}
            disabled={loading || isReadOnly}
            readOnly={isReadOnly}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            data-lpignore="true"
            data-1p-ignore="true"
            data-form-type="other"
          />
          {errors.email && <span className="field-error">{errors.email}</span>}
        </div>

        <div className="form-field">
          {/* Fake inputs oszukujące przeglądarkę */}
          <input type="text" style={{ display: 'none' }} autoComplete="username" tabIndex={-1} />
          <input type="password" style={{ display: 'none' }} autoComplete="new-password" tabIndex={-1} />
          <input
            ref={passwordRef}
            name="x-login-pass-field"
            type="password"
            placeholder="Hasło"
            value={form.password}
            onChange={handleChange}
            className={errors.password ? 'error' : ''}
            disabled={loading || isReadOnly}
            readOnly={isReadOnly}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            data-lpignore="true"
            data-1p-ignore="true"
            data-form-type="other"
          />
          {errors.password && <span className="field-error">{errors.password}</span>}
        </div>

        <button type="submit" disabled={loading} className="submit-btn">
          {loading ? 'Logowanie...' : 'Zaloguj'}
        </button>
      </form>

      <p className="login-link">
        Nie masz konta? <Link to="/register">Zarejestruj się</Link>
      </p>
    </div>
  );
}
