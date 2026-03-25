export {
  setSecureItem,
  getSecureItem,
  removeSecureItem,
  clearSecureStorage,
  hasSecureItem,
  getItemExpiration as getSecureItemMetadata,
} from '../secure-storage'

export function isSecureStorageAvailable(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.crypto !== 'undefined' &&
    typeof window.crypto.subtle !== 'undefined' &&
    typeof localStorage !== 'undefined' &&
    typeof sessionStorage !== 'undefined'
  )
}
