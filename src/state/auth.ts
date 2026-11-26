// Local profiles only: this protects one profile from another on a shared laptop, not data from someone
// with access to the browser. There is no server and nothing leaves this machine.
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('')

export const newSalt = () => hex(crypto.getRandomValues(new Uint8Array(16)).buffer)

export async function hashPassword(password: string, salt: string) {
  if (!crypto.subtle) throw new Error('Passwords need a secure page. Open the app from http://localhost:5173.')
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', iterations: 100_000, salt: new TextEncoder().encode(salt) },
    key,
    256,
  )
  return hex(bits)
}
