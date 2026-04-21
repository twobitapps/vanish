export type Encrypted = { ciphertext: string; iv: string };

export const PBKDF2_ITERATIONS = 600_000;
export const SALT_BYTES = 16;
export const KEY_BYTES = 32;
const HKDF_INFO = new TextEncoder().encode('vanish-v1-password');

export async function generateKeyRaw(): Promise<Uint8Array> {
  return crypto.getRandomValues(newBytes(KEY_BYTES));
}

export async function importAesGcmKey(raw: Uint8Array, usages: KeyUsage[]): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    'raw',
    raw as BufferSource,
    'AES-GCM',
    false,
    usages
  );
}

export async function derivePasswordKey(
  password: string,
  salt: Uint8Array,
  iterations = PBKDF2_ITERATIONS
): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password) as BufferSource,
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    keyMaterial,
    KEY_BYTES * 8
  );
  return new Uint8Array(bits);
}

export async function combineKeys(
  urlKeyRaw: Uint8Array,
  pwKeyRaw: Uint8Array,
  salt: Uint8Array
): Promise<CryptoKey> {
  const ikm = newBytes(urlKeyRaw.length + pwKeyRaw.length);
  ikm.set(urlKeyRaw, 0);
  ikm.set(pwKeyRaw, urlKeyRaw.length);
  const hkdfMaterial = await crypto.subtle.importKey(
    'raw',
    ikm as BufferSource,
    'HKDF',
    false,
    ['deriveKey']
  );
  return await crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: salt as BufferSource,
      info: HKDF_INFO as BufferSource,
    },
    hkdfMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export function randomSalt(bytes = SALT_BYTES): Uint8Array {
  return crypto.getRandomValues(newBytes(bytes));
}

export async function generateKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

export async function exportKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('raw', key);
  return base64url(new Uint8Array(raw));
}

export async function importKey(keyStr: string): Promise<CryptoKey> {
  const raw = fromBase64url(keyStr);
  return await crypto.subtle.importKey(
    'raw',
    raw as BufferSource,
    'AES-GCM',
    false,
    ['decrypt']
  );
}

export async function encrypt(plaintext: string, key: CryptoKey): Promise<Encrypted> {
  const iv = crypto.getRandomValues(newBytes(12));
  const enc = new TextEncoder();
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    enc.encode(plaintext) as BufferSource
  );
  return {
    iv: base64url(iv),
    ciphertext: base64url(new Uint8Array(ct)),
  };
}

export async function decrypt(ciphertext: string, iv: string, key: CryptoKey): Promise<string> {
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64url(iv) as BufferSource },
    key,
    fromBase64url(ciphertext) as BufferSource
  );
  return new TextDecoder().decode(pt);
}

export function base64url(bytes: Uint8Array): string {
  let str = '';
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64url(s: string): Uint8Array {
  const padLen = (4 - (s.length % 4)) % 4;
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(padLen);
  const bin = atob(b64);
  const out = newBytes(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function newBytes(n: number): Uint8Array {
  return new Uint8Array(new ArrayBuffer(n));
}
