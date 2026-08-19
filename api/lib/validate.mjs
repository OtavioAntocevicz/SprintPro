export function isStrongPassword(password) {
  if (typeof password !== 'string') return false
  if (password.length < 8) return false
  return /[A-Za-z]/.test(password) && /\d/.test(password)
}
