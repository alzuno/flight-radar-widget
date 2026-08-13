import type React from 'react'
import { useState } from 'react'
import type { AppSettings } from '../../shared/types'
import './SettingsPanel.css'

interface SettingsPanelProps {
  settings: AppSettings
  onSave: (settings: AppSettings) => Promise<{ ok: true } | { ok: false; error: string }>
  onClose: () => void
}

interface FormState {
  homeLatitude: string
  homeLongitude: string
  bboxRadiusKm: string
  pollIntervalSeconds: string
}

function toFormState(settings: AppSettings): FormState {
  return {
    homeLatitude: String(settings.homeLatitude),
    homeLongitude: String(settings.homeLongitude),
    bboxRadiusKm: String(settings.bboxRadiusKm),
    pollIntervalSeconds: String(settings.pollIntervalSeconds)
  }
}

function SettingsPanel({ settings, onSave, onClose }: SettingsPanelProps): React.JSX.Element {
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

    setSaving(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
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
