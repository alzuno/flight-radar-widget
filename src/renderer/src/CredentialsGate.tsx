import type React from 'react'
import { useState } from 'react'
import type { OpenSkyCredentials, SaveSettingsResult } from '../../shared/types'
import './SettingsPanel.css'

interface CredentialsGateProps {
  onSave: (credentials: OpenSkyCredentials) => Promise<SaveSettingsResult>
  onSaved: () => void
}

function CredentialsGate({ onSave, onSaved }: CredentialsGateProps): React.JSX.Element {
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault()
    setSaving(true)
    setError(null)

    const result = await onSave({ clientId, clientSecret })

    setSaving(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    onSaved()
  }

  return (
    <div className="settings-panel">
      <form className="settings-form" onSubmit={handleSubmit}>
        <h2 className="settings-title">Configura tus credenciales de OpenSky</h2>

        <label className="settings-field">
          Client ID
          <input
            type="password"
            value={clientId}
            onChange={(event) => setClientId(event.target.value)}
            autoFocus
          />
        </label>

        <label className="settings-field">
          Client Secret
          <input
            type="password"
            value={clientSecret}
            onChange={(event) => setClientSecret(event.target.value)}
          />
        </label>

        {error && <div className="settings-error">{error}</div>}

        <div className="settings-actions">
          <button type="submit" className="settings-button settings-button-primary" disabled={saving}>
            Guardar
          </button>
        </div>
      </form>
    </div>
  )
}

export default CredentialsGate
