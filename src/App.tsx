import { HashRouter, Routes, Route } from 'react-router-dom'
import Auth from './pages/Auth'
import LobbyList from './pages/LobbyList'
import Chat from './pages/Chat'
import Friends from './pages/Friends'
import Settings from './pages/Settings'
import Layout from './components/Layout'
import { SettingsProvider } from './context/SettingsContext'

function App() {
  return (
    <SettingsProvider>
      <HashRouter>
        <div className="min-h-screen bg-background text-white font-sans">
          <Routes>
            <Route path="/" element={<Auth />} />
            <Route element={<Layout />}>
              <Route path="/lobbies" element={<LobbyList />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/friends" element={<Friends />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Routes>
        </div>
      </HashRouter>
    </SettingsProvider>
  )
}

export default App
