// Rótulo da sessão no core, para uma lista de aparelhos no futuro.
export function deviceName(userAgent = navigator.userAgent): string {
  const browser =
    [
      ['Edg/', 'Edge'],
      ['OPR/', 'Opera'],
      ['SamsungBrowser', 'Samsung Internet'],
      ['Firefox/', 'Firefox'],
      ['Chrome/', 'Chrome'],
      ['Safari/', 'Safari'],
    ].find(([token]) => userAgent.includes(token!))?.[1] ?? 'Navegador'
  const system =
    [
      ['Android', 'Android'],
      ['iPhone', 'iPhone'],
      ['iPad', 'iPad'],
      ['Windows', 'Windows'],
      ['Mac OS X', 'macOS'],
      ['CrOS', 'ChromeOS'],
      ['Linux', 'Linux'],
    ].find(([token]) => userAgent.includes(token!))?.[1] ?? 'aparelho desconhecido'
  return `${browser} no ${system}`
}
