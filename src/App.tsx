import { useState } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import { StatusBadge } from './components/StatusBadge'
import { ProfileModal } from './components/ProfileModal'
import { useProfile } from './lib/store'
import { Bench } from './pages/Bench'
import { Jobs } from './pages/Jobs'
import { SkillGap } from './pages/SkillGap'
import { Talks } from './pages/Talks'
import { Competitions } from './pages/Competitions'
import { Scholarships } from './pages/Scholarships'
import './App.css'

const NAV = [
  { to: '/', label: 'Bench', end: true },
  { to: '/jobs', label: 'Jobs' },
  { to: '/skill-gap', label: 'Skill Gap' },
  { to: '/talks', label: 'Talks' },
  { to: '/competitions', label: 'Competitions' },
  { to: '/scholarships', label: 'Scholarships' },
]

function App() {
  const profile = useProfile()
  // First run: open the profile prompt once (no profile saved yet).
  const [showProfile, setShowProfile] = useState(() => profile === null)

  return (
    <div className="app">
      <header className="app-header">
        <div className="container app-header__inner">
          <NavLink to="/" className="app-header__brand">
            Workbench
          </NavLink>
          <nav className="app-nav" aria-label="Primary">
            {NAV.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `app-nav__link${isActive ? ' is-active' : ''}`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <button
            type="button"
            className="app-nav__link"
            onClick={() => setShowProfile(true)}
          >
            {profile?.name ? profile.name : 'Profile'}
          </button>
          <StatusBadge>OPEN</StatusBadge>
        </div>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<Bench />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/skill-gap" element={<SkillGap />} />
          <Route path="/talks" element={<Talks />} />
          <Route path="/competitions" element={<Competitions />} />
          <Route path="/scholarships" element={<Scholarships />} />
        </Routes>
      </main>

      <footer className="app-footer">
        <div className="container app-footer__inner">
          <span>Workbench — take stock of your shop</span>
          <span>$0 / use · no AI · free sources</span>
        </div>
      </footer>

      {showProfile && (
        <ProfileModal initial={profile} onClose={() => setShowProfile(false)} />
      )}
    </div>
  )
}

export default App
