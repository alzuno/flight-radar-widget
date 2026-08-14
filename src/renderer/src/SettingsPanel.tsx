import type React from 'react'
import { useState } from 'react'
import type { AppSettings, OpenSkyCredentials, SaveSettingsResult } from '../../shared/types'
import './SettingsPanel.css'

interface SettingsPanelProps {
  settings: AppSettings
  onSave: (settings: AppSettings) => Promise<SaveSettingsResult>
  onSaveCredentials: (credentials: OpenSkyCredentials) => Promise<SaveSettingsResult>
  onClose: () => void
}

interface FormState {
  homeLatitude: string
  homeLongitude: string
  bboxRadiusKm: string
  pollIntervalSeconds: string
  clientId: string
  clientSecret: string
}

function toFormState(settings: AppSettings): FormState {
  return {
    homeLatitude: String(settings.homeLatitude),
    homeLongitude: String(settings.homeLongitude),
    bboxRadiusKm: String(settings.bboxRadiusKm),
    pollIntervalSeconds: String(settings.pollIntervalSeconds),
    clientId: '',
    clientSecret: ''
  }
}

function SettingsPanel({
  settings,
  onSave,
  onSaveCredentials,
  onClose
}: SettingsPanelProps): React.JSX.Element {
  const [form, setForm] = useState<FormState>(toFormState(settings))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const handleChange = (field: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement>): void => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault()
    setSaving(true)
    setError(null)

    const result = await onSave({
      homeLatitude: Number(form.homeLatitude),
      homeLongitude: Number(form.homeLongitude),
      bboxRadiusKm: Number(form.bboxRadiusKm),
      pollIntervalSeconds: Number(form.pollIntervalSeconds)
    })

    if (!result.ok) {
      setSaving(false)
      setError(result.error)
      return
    }

    if (form.clientId.trim() || form.clientSecret.trim()) {
      const credentialsResult = await onSaveCredentials({
        clientId: form.clientId,
        clientSecret: form.clientSecret
      })
      if (!credentialsResult.ok) {
        setSaving(false)
        setError(credentialsResult.error)
        return
      }
    }

    setSaving(false)
    onClose()
  }

  return (
    <div className="settings-panel">
      <form className="settings-form" onSubmit={handleSubmit}>
        <h2 className="settings-title">Configuración</h2>

        <label className="settings-field">
          Latitud de casa
          <input
            type="number"
            step="any"
            value={form.homeLatitude}
            onChange={handleChange('homeLatitude')}
          />
        </label>

        <label className="settings-field">
          Longitud de casa
          <input
            type="number"
            step="any"
            value={form.homeLongitude}
            onChange={handleChange('homeLongitude')}
          />
        </label>

        <label className="settings-field">
          Radio de búsqueda (km)
          <input
            type="number"
            step="any"
            value={form.bboxRadiusKm}
            onChange={handleChange('bboxRadiusKm')}
          />
        </label>

        <label className="settings-field">
          Intervalo de polling (s)
          <input
            type="number"
            step="any"
            value={form.pollIntervalSeconds}
            onChange={handleChange('pollIntervalSeconds')}
          />
        </label>

        <div className="settings-section-title">Credenciales OpenSky (dejar en blanco para no cambiar)</div>

        <label className="settings-field">
          Client ID
          <input type="password" value={form.clientId} onChange={handleChange('clientId')} />
        </label>

        <label className="settings-field">
          Client Secret
          <input
            type="password"
            value={form.clientSecret}
            onChange={handleChange('clientSecret')}
          />
        </label>

        {error && <div className="settings-error">{error}</div>}

        <div className="settings-actions">
          <button type="button" className="settings-button" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button type="submit" className="settings-button settings-button-primary" disabled={saving}>
            Guardar
          </button>
        </div>
      </form>
    </div>
  )
}

export default SettingsPanel
