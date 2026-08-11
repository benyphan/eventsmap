import AsyncStorage from "@react-native-async-storage/async-storage";
import { x25519 } from "@noble/curves/ed25519.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { gcm } from "@noble/ciphers/aes";
import { getMe, updateMe } from "../api/client";

const PRIV_KEY = "e2e_private_key";
const PUB_KEY = "e2e_public_key";

// ---------- UTF-8 ----------
function utf8ToBytes(str) {
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    let code = str.codePointAt(i);
    if (code > 0xffff) i++;
    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0x10000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f)
      );
    }
  }
  return new Uint8Array(bytes);
}

function bytesToUtf8(bytes) {
  const chunks = [];
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (b < 0x80) {
      chunks.push(b);
    } else if (b < 0xe0) {
      chunks.push(((b & 0x1f) << 6) | (bytes[i + 1] & 0x3f));
      i++;
    } else if (b < 0xf0) {
      chunks.push(((b & 0x0f) << 12) | ((bytes[i + 1] & 0x3f) << 6) | (bytes[i + 2] & 0x3f));
      i += 2;
    } else {
      chunks.push(
        ((b & 0x07) << 18) |
          ((bytes[i + 1] & 0x3f) << 12) |
          ((bytes[i + 2] & 0x3f) << 6) |
          (bytes[i + 3] & 0x3f)
      );
      i += 3;
    }
  }
  return String.fromCodePoint(...chunks);
}

// ---------- Base64 (byte-safe) ----------
const B64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export function bytesToBase64(bytes) {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0;
    out += B64_CHARS[b0 >> 2];
    out += B64_CHARS[((b0 & 3) << 4) | (b1 >> 4)];
    out += i + 1 < bytes.length ? B64_CHARS[((b1 & 15) << 2) | (b2 >> 6)] : "=";
    out += i + 2 < bytes.length ? B64_CHARS[b2 & 63] : "=";
  }
  return out;
}

export function base64ToBytes(str) {
  str = str.replace(/=+$/, "");
  const len = str.length;
  const bytes = [];
  for (let i = 0; i < len; i += 4) {
    const c0 = B64_CHARS.indexOf(str[i]);
    const c1 = B64_CHARS.indexOf(str[i + 1]);
    const c2 = i + 2 < len ? B64_CHARS.indexOf(str[i + 2]) : 0;
    const c3 = i + 3 < len ? B64_CHARS.indexOf(str[i + 3]) : 0;
    bytes.push((c0 << 2) | (c1 >> 4));
    if (i + 2 < len) bytes.push(((c1 & 15) << 4) | (c2 >> 2));
    if (i + 3 < len) bytes.push(((c2 & 3) << 6) | c3);
  }
  return new Uint8Array(bytes);
}

// ---------- Random ----------
function randomBytes(n) {
  if (typeof globalThis !== "undefined" && globalThis.crypto && globalThis.crypto.getRandomValues) {
    const arr = new Uint8Array(n);
    globalThis.crypto.getRandomValues(arr);
    return arr;
  }
  const arr = new Uint8Array(n);
  for (let i = 0; i < n; i++) arr[i] = Math.floor(Math.random() * 256);
  return arr;
}

// ---------- Ключи ----------
export async function ensureKeys() {
  let priv = await AsyncStorage.getItem(PRIV_KEY);
  let pub = await AsyncStorage.getItem(PUB_KEY);
  if (!priv || !pub) {
    const seed = randomBytes(32);
    priv = bytesToBase64(seed);
    pub = bytesToBase64(x25519.getPublicKey(seed));
    await AsyncStorage.multiSet([
      [PRIV_KEY, priv],
      [PUB_KEY, pub],
    ]);
  }
  // Публичный ключ на сервере (чтобы другие могли шифровать нам)
  try {
    const me = await getMe();
    if (me.e2e_public_key !== pub) {
      await updateMe({ e2e_public_key: pub });
    }
  } catch (e) {
    console.log("Не удалось синхронизировать e2e-ключ", e.message);
  }
  return { privateKey: priv, publicKey: pub };
}

function sharedSecret(myPrivB64, theirPubB64) {
  const priv = base64ToBytes(myPrivB64);
  const pub = base64ToBytes(theirPubB64);
  return x25519.getSharedSecret(priv, pub);
}

// ---------- Шифрование ----------
export async function encryptFor(myPrivB64, theirPubB64, plaintext) {
  const secret = sharedSecret(myPrivB64, theirPubB64);
  const key = sha256(secret);
  const nonce = randomBytes(12);
  const cipher = gcm(key, nonce);
  const ct = cipher.encrypt(utf8ToBytes(plaintext));
  const envelope = new Uint8Array(nonce.length + ct.length);
  envelope.set(nonce, 0);
  envelope.set(ct, nonce.length);
  return bytesToBase64(envelope);
}

export function decryptFrom(myPrivB64, theirPubB64, contentEncB64) {
  try {
    const secret = sharedSecret(myPrivB64, theirPubB64);
    const key = sha256(secret);
    const envelope = base64ToBytes(contentEncB64);
    const nonce = envelope.subarray(0, 12);
    const ct = envelope.subarray(12);
    const cipher = gcm(key, nonce);
    const plain = cipher.decrypt(ct);
    return bytesToUtf8(plain);
  } catch (e) {
    console.log("Не удалось расшифровать сообщение", e.message);
    return null;
  }
}
