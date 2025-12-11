import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import api from '../api';
import '../styles/StepsPage.css';

export default function StepsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  // stepsInput – wartość wpisywana w formularzu
  const [stepsInput, setStepsInput] = useState('');
  // currentSteps – aktualnie zapisane w bazie kroki dla danej daty
  const [currentSteps, setCurrentSteps] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  useEffect(() => {
    const fetchSteps = async () => {
      if (!user) return;

      setLoading(true);
      setMessage('');
      // Czyścimy pole formularza przy zmianie daty / wejściu na stronę
      setStepsInput('');
      try {
        const res = await api.get(`/steps/${selectedDate}`);
        if (res.data?.stepsLog && typeof res.data.stepsLog.steps === 'number') {
          setCurrentSteps(res.data.stepsLog.steps);
        } else {
          // Brak wpisu w bazie – traktujemy jako 0 kroków
          setCurrentSteps(0);
        }
      } catch (err) {
        console.error('Błąd pobierania kroków:', err);
        setCurrentSteps(0);
      } finally {
        setLoading(false);
      }
    };

    fetchSteps();
  }, [selectedDate, user]);

  if (!user) return null;

  const dailyTarget = user.daily_steps_target || 7000;
  const numericSteps = Number(currentSteps) || 0;
  const isGoalReached = numericSteps >= dailyTarget;
  const percent = Math.min(
    dailyTarget > 0 ? Math.round((numericSteps / dailyTarget) * 100) : 0,
    100
  );

  const changeDate = (days) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    const value = Number(stepsInput);
    if (!Number.isFinite(value) || value < 0) {
      setMessage('Podaj poprawną, nieujemną liczbę kroków.');
      return;
    }

    try {
      await api.post('/steps', {
        date: selectedDate,
        steps: value,
      });
      setMessage('Kroki zostały zapisane.');
      setCurrentSteps(value);
      // Po zapisie czyścimy pole formularza
      setStepsInput('');
    } catch (err) {
      console.error('Błąd zapisu kroków:', err);
      setMessage(
        err.response?.data?.message || 'Wystąpił błąd podczas zapisywania kroków.'
      );
    }
  };

  return (
    <div className="steps-container">
      <h2>Kroki</h2>
      <p>
        Twój dzienny cel kroków:{' '}
        <strong>{dailyTarget.toLocaleString('pl-PL')} kroków</strong>
      </p>

      <div className="date-navigation">
        <button type="button" onClick={() => changeDate(-1)}>
          ←
        </button>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
        <button type="button" onClick={() => changeDate(1)}>
          →
        </button>
      </div>

      <form onSubmit={handleSubmit} className="steps-form">
        <label>
          Liczba kroków w tym dniu:
          <input
            type="number"
            step="1"
            min="0"
            value={stepsInput}
            onChange={(e) => {
              const value = e.target.value;
              // Usuń przecinki, kropki, "e", "E", "+", "-"
              const cleaned = value.replace(/[.,eE+-]/g, '');
              if (cleaned === '' || /^\d+$/.test(cleaned)) {
                setStepsInput(cleaned);
              }
            }}
            onKeyDown={(e) => {
              // Blokuj przecinki, kropki, "e", "E", "+", "-"
              if (['e', 'E', '+', '-', ',', '.'].includes(e.key)) {
                e.preventDefault();
              }
            }}
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? 'Zapisywanie...' : 'Zapisz kroki'}
        </button>
      </form>

      {message && <p className="message">{message}</p>}

      <div className="steps-summary">
        <div className="steps-count">
          <strong>{numericSteps.toLocaleString('pl-PL')}</strong> /{' '}
          <strong>{dailyTarget.toLocaleString('pl-PL')}</strong> kroków
        </div>

        <div className="steps-status">
          {isGoalReached
            ? 'Cel kroków na dziś został osiągnięty!'
            : `Pozostało ${Math.max(
                dailyTarget - numericSteps,
                0
              ).toLocaleString('pl-PL')} kroków`}
        </div>

        <div className="progress-bar">
          <div
            className="fill"
            style={{ width: `${percent}%` }}
          />
        </div>

        <div className="steps-percent">
          Realizacja celu: <strong>{percent}%</strong>
        </div>
      </div>
    </div>
  );
}


