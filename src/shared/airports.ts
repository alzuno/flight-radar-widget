export interface Airport {
  code: string
  name: string
  latitude: number
  longitude: number
}

export const NEARBY_AIRPORTS: Airport[] = [
  { code: 'LEMD', name: 'Adolfo Suárez Madrid-Barajas', latitude: 40.4719, longitude: -3.5626 },
  { code: 'LECU', name: 'Cuatro Vientos', latitude: 40.3728, longitude: -3.7847 },
  { code: 'LETO', name: 'Torrejón de Ardoz', latitude: 40.4967, longitude: -3.4458 },
  { code: 'LEGT', name: 'Getafe', latitude: 40.2967, longitude: -3.7239 }
]
