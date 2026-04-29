import React, { FormEvent, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import './AuthPage.css'

export function LoginPage() {
  const { login, currentUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const destination = (location.state as { from?: string } | undefined)?.from || '/editor'
  if (currentUser) return <Navigate to={destination} replace />

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    const result = login({ email, password })
    if (!result.ok) {
      setError(result.error)
      return
    }
    navigate(destination, { replace: true })
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">✈ AIRWAYBILL APP</div>
        <p className="auth-sub">Inicia sesión para acceder al editor y a tus documentos.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="operaciones@empresa.com" />
          </div>

          <div className="auth-field">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="******" />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="auth-submit">
            Entrar
          </button>
        </form>

        <p className="auth-switch">
          ¿Aún no tienes cuenta? <Link to="/signup">Crear cuenta</Link>
        </p>
      </div>
    </div>
  )
}
