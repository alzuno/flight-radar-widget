import type React from 'react'
import { useEffect, useState } from 'react'
import type { FlightState, HomeLocation } from '../../shared/types'
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
    <div style={{ color: 'white', fontFamily: 'sans-serif', textAlign: 'center' }}>
      {home ? <Radar home={home} flights={flights} /> : 'Cargando...'}
    </div>
  )
}

export default App
