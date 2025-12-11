import { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../AuthContext';
import '../styles/RegisterPage.css';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const passwordConfirmRef = useRef(null);
  const usernameRef = useRef(null);
  const formKeyRef = useRef(Date.now());

  const [form, setForm] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    username: '',
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
    setForm({ email: '', password: '', passwordConfirm: '', username: '' });
    
    // Wyczyść pola w DOM bezpośrednio
    if (emailRef.current) emailRef.current.value = '';
    if (passwordRef.current) passwordRef.current.value = '';
    if (passwordConfirmRef.current) passwordConfirmRef.current.value = '';
    if (usernameRef.current) usernameRef.current.value = '';
    
    // Usuń readOnly po krótkim czasie, żeby przeglądarka nie wypełniła pól
    const timer = setTimeout(() => {
      setIsReadOnly(false);
      // Wyczyść jeszcze raz po usunięciu readOnly
      setForm({ email: '', password: '', passwordConfirm: '', username: '' });
      if (emailRef.current) emailRef.current.value = '';
      if (passwordRef.current) passwordRef.current.value = '';
      if (passwordConfirmRef.current) passwordConfirmRef.current.value = '';
      if (usernameRef.current) usernameRef.current.value = '';
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
    } else if (form.password.length < 8) {
      newErrors.password = 'Hasło musi mieć minimum 8 znaków';
    }

    if (!form.passwordConfirm) {
      newErrors.passwordConfirm = 'Powtórz hasło';
    } else if (form.password !== form.passwordConfirm) {
      newErrors.passwordConfirm = 'Hasła nie są identyczne';
    }

    if (!form.username.trim()) {
      newErrors.username = 'Nazwa użytkownika jest wymagana';
    } else if (form.username.trim().length < 3) {
      newErrors.username = 'Nazwa użytkownika musi mieć minimum 3 znaki';
    } else if (!/^[a-zA-Z0-9_]+$/.test(form.username)) {
      newErrors.username = 'Nazwa użytkownika może zawierać tylko litery, cyfry i podkreślenia';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Mapuj nazwy pól
    let fieldName = name;
    if (name.includes('mail')) fieldName = 'email';
    else if (name.includes('pass-confirm') || name.includes('passwordConfirm')) fieldName = 'passwordConfirm';
    else if (name.includes('pass')) fieldName = 'password';
    else if (name.includes('user')) fieldName = 'username';
    
    setForm((f) => ({ ...f, [fieldName]: value }));
    // Usuń błąd dla tego pola gdy użytkownik zaczyna pisać
    if (errors[fieldName]) {
      setErrors((prev) => ({ ...prev, [fieldName]: '' }));
    }
    // Jeśli zmieniamy hasło, sprawdź ponownie potwierdzenie
    if (fieldName === 'password' && form.passwordConfirm) {
      if (value !== form.passwordConfirm) {
        setErrors((prev) => ({ ...prev, passwordConfirm: 'Hasła nie są identyczne' }));
      } else {
        setErrors((prev) => ({ ...prev, passwordConfirm: '' }));
      }
    }
    // Jeśli zmieniamy potwierdzenie hasła, sprawdź czy się zgadza
    if (fieldName === 'passwordConfirm') {
      if (value !== form.password) {
        setErrors((prev) => ({ ...prev, passwordConfirm: 'Hasła nie są identyczne' }));
      } else {
        setErrors((prev) => ({ ...prev, passwordConfirm: '' }));
      }
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
      const res = await api.post('/auth/register', form);
      const { token, user } = res.data;
      login(token, user);
      navigate('/profile');
    } catch (err) {
      console.error(err);
      const errorMessage = err.response?.data?.message || 'Błąd rejestracji. Sprawdź dane i spróbuj ponownie.';
      setServerError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <h2>Rejestracja</h2>
      
      {serverError && <div className="register-error">{serverError}</div>}

      {/* Ukryte pola, żeby oszukać przeglądarkę */}
      <input type="text" name="fake-username" autoComplete="username" style={{ position: 'absolute', left: '-9999px', opacity: 0 }} tabIndex={-1} readOnly />
      <input type="email" name="fake-email" autoComplete="email" style={{ position: 'absolute', left: '-9999px', opacity: 0 }} tabIndex={-1} readOnly />
      <input type="password" name="fake-password" autoComplete="new-password" style={{ position: 'absolute', left: '-9999px', opacity: 0 }} tabIndex={-1} readOnly />
      
      <form key={formKeyRef.current} onSubmit={handleSubmit} className="register-form" noValidate autoComplete="off" data-form-type="other">
        <div className="form-field">
          {/* Fake input oszukujący przeglądarkę */}
          <input type="text" style={{ display: 'none' }} autoComplete="username" tabIndex={-1} />
          <input
            ref={emailRef}
            name="x-reg-mail-field"
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
            name="x-reg-pass-field"
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

        <div className="form-field">
          <input
            ref={passwordConfirmRef}
            name="x-reg-pass-confirm-field"
            type="password"
            placeholder="Powtórz hasło"
            value={form.passwordConfirm}
            onChange={handleChange}
            className={errors.passwordConfirm ? 'error' : ''}
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
          {errors.passwordConfirm && <span className="field-error">{errors.passwordConfirm}</span>}
        </div>

        <div className="form-field">
          {/* Fake input oszukujący przeglądarkę */}
          <input type="text" style={{ display: 'none' }} autoComplete="name" tabIndex={-1} />
          <input
            ref={usernameRef}
            name="x-reg-user-field"
            type="text"
            placeholder="Nazwa użytkownika"
            value={form.username}
            onChange={handleChange}
            className={errors.username ? 'error' : ''}
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
          {errors.username && <span className="field-error">{errors.username}</span>}
        </div>

        <button type="submit" disabled={loading} className="submit-btn">
          {loading ? 'Rejestrowanie...' : 'Zarejestruj'}
        </button>
      </form>

      <p className="register-link">
        Masz już konto? <Link to="/login">Zaloguj się</Link>
      </p>
    </div>
  );
}
