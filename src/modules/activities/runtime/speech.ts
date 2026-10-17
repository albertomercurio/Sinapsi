/**
 * Reads instructions aloud with an ON-DEVICE voice only. Network voices (e.g.
 * some "Google …" voices in Chrome) would send text to a third party, so they
 * are never used. Returns false when no local voice exists for the language.
 */
export function speak(text: string, lang: string): boolean {
  if (typeof speechSynthesis === 'undefined') return false
  const voices = speechSynthesis
    .getVoices()
    .filter((v) => v.localService && v.lang.toLowerCase().startsWith(lang))
  const voice = voices.find((v) => v.default) ?? voices[0]
  if (!voice) return false
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.voice = voice
  u.lang = voice.lang
  u.rate = 0.92
  speechSynthesis.speak(u)
  return true
}

export function stopSpeaking() {
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel()
}

export function hasLocalVoice(lang: string): boolean {
  if (typeof speechSynthesis === 'undefined') return false
  return speechSynthesis
    .getVoices()
    .some((v) => v.localService && v.lang.toLowerCase().startsWith(lang))
}
