import { useState, useCallback } from 'react';
import { AppLayout } from './components/Layout/AppLayout';
import { SplashScreen } from './components/SplashScreen';
import { useAppInit } from './hooks/useAppInit';

export default function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { activate, status } = useAppInit();

  const handleStart = useCallback(async () => {
    try {
      setError(null);
      await activate();
      setReady(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize resources');
    }
  }, [activate]);

  if (error) {
    return (
      <div className="app-error">
        <div className="app-error-box">
          <h2>Initialization Error</h2>
          <p>{error}</p>
          <button onClick={handleStart}>Retry</button>
        </div>
      </div>
    );
  }

  if (!ready) {
    return <SplashScreen status={status} onStart={handleStart} />;
  }

  return <AppLayout />;
}