import type React from 'react'
import { useEffect, useState } from 'react'
import type { FlightState, HomeLocation } from '../../shared/types'
import './App.css'
import Radar from './Radar'

function App(): React.JSX.Element {
  const [home, setHome] = useState<HomeLocation | null>(null)
  const [flights, setFlights] = useState<FlightState[]>([])

  useEffect(() => {
    window.api.getHomeLocation().then(setHome)
  }, [])

  useEffect(() => {
    return window.api.onFlightsUpdate((received) => {
      console.log('[renderer] vuelos recibidos:', received)
      setFlights(received)
    })
  }, [])

  return (
    <div
      className="app-drag-region"
      style={{
        color: 'white',
        fontFamily: 'sans-serif',
        textAlign: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {home ? <Radar home={home} flights={flights} /> : 'Cargando...'}
    </div>
  )
}

export default App
