import { useAuth } from './contexts/AuthContext';
import { AuthPage } from './components/AuthPage';
import { MainApp } from './components/MainApp';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return <MainApp />;
}

export default App;
