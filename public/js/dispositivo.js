// Elementos físicos del dispositivo: GPS, vibración y compartir
export const soportaGPS = () => 'geolocation' in navigator;

/** Posición actual como promesa. */
export function obtenerPosicion({ alta = true, espera = 15000 } = {}) {
  return new Promise((resolver, rechazar) => {
    if (!soportaGPS()) return rechazar(new Error('Este dispositivo no tiene geolocalización'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolver({ lat: p.coords.latitude, lng: p.coords.longitude, precision: p.coords.accuracy }),
      (e) =>
        rechazar(
          new Error(
            e.code === e.PERMISSION_DENIED ? 'Permiso de ubicación denegado' :
            e.code === e.TIMEOUT ? 'Se agotó el tiempo esperando la señal GPS' :
            'No se pudo obtener tu ubicación'
          )
        ),
      { enableHighAccuracy: alta, timeout: espera, maximumAge: 30000 }
    );
  });
}

/** Distancia en metros entre dos coordenadas (fórmula de Haversine). */
export function distanciaMetros(a, b) {
  const R = 6371000;
  const rad = (g) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Rumbo aproximado (N, NE, E…) desde a hacia b. */
export function rumbo(a, b) {
  const rad = (g) => (g * Math.PI) / 180;
  const y = Math.sin(rad(b.lng - a.lng)) * Math.cos(rad(b.lat));
  const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lng - a.lng));
  const grados = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  return ['norte', 'noreste', 'este', 'sureste', 'sur', 'suroeste', 'oeste', 'noroeste'][Math.round(grados / 45) % 8];
}

export const formatoDistancia = (m) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`);
export const minutosCaminando = (m) => Math.max(1, Math.round(m / 80)); // ~4.8 km/h

/** Ordena paradas por cercanía a una posición. */
export const ordenarPorCercania = (paradas, pos) =>
  paradas.map((p) => ({ ...p, distancia: distanciaMetros(pos, p) })).sort((a, b) => a.distancia - b.distancia);

export function vibrar(patron = [80]) {
  try { return navigator.vibrate?.(patron) ?? false; } catch { return false; }
}

/** Compartir con la hoja nativa del sistema; si no existe, copia el enlace. */
export async function compartir({ titulo, texto, url }) {
  if (navigator.share) {
    try {
      await navigator.share({ title: titulo, text: texto, url });
      return 'compartido';
    } catch (e) {
      if (e.name === 'AbortError') return 'cancelado';
    }
  }
  await navigator.clipboard?.writeText(`${texto} ${url}`);
  return 'copiado';
}
