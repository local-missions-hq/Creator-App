import * as Crypto from 'expo-crypto';

import type { OidcCryptoBoundary } from './oidc-client';

function hexToBytes(value: string): Uint8Array {
  if (!/^[0-9a-f]+$/iu.test(value) || value.length % 2 !== 0) {
    throw new Error('Digest output was invalid.');
  }
  return Uint8Array.from(value.match(/.{2}/gu) ?? [], (pair) => Number.parseInt(pair, 16));
}

export const expoOidcCryptoBoundary: OidcCryptoBoundary = {
  randomBytes: (length) => Crypto.getRandomBytesAsync(length),
  async sha256(value) {
    const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value, {
      encoding: Crypto.CryptoEncoding.HEX,
    });
    return hexToBytes(digest);
  },
};
