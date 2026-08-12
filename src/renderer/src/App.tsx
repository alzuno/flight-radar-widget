import type React from 'react'
import { useEffect, useState } from 'react'

function App(): React.JSX.Element {
  const [flightCount, setFlightCount] = useState<number | null>(null)

  useEffect(() => {
    return window.api.onFlightsUpdate((flights) => {
      console.log('[renderer] vuelos recibidos:', flights)
      setFlightCount(flights.length)
    })
  }, [])

  return (
    <div style={{ color: 'white', fontFamily: 'sans-serif', textAlign: 'center', marginTop: '40%' }}>
      Flight Radar Widget
      <div>{flightCount === null ? 'Cargando...' : `${flightCount} aeronaves`}</div>
    </div>
  )
}

export default App
