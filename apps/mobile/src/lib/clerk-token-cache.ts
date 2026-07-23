import type { TokenCache } from "@clerk/expo";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { createMMKV } from "react-native-mmkv";

const ENCRYPTION_KEY_NAME = "clerk-mmkv-encryption-key";
const ENCRYPTION_KEY_SERVICE = "ai.chinasupply.mobile.clerk-token-cache";
const TOKEN_STORAGE_ID = "chinasupply.clerk-token-cache";
const KEY_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

type TokenStorage = Pick<
  ReturnType<typeof createMMKV>,
  "getString" | "remove" | "set"
>;

interface TokenCacheDependencies {
  createStorage: (encryptionKey: string) => TokenStorage;
  getEncryptionKey: () => Promise<string | null>;
  randomBytes: (length: number) => Uint8Array;
  saveEncryptionKey: (value: string) => Promise<void>;
}

const secureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  keychainService: ENCRYPTION_KEY_SERVICE,
} as const;

const defaultDependencies: TokenCacheDependencies = {
  createStorage: (encryptionKey) =>
    createMMKV({
      encryptionKey,
      id: TOKEN_STORAGE_ID,
    }),
  getEncryptionKey: () =>
    SecureStore.getItemAsync(ENCRYPTION_KEY_NAME, secureStoreOptions),
  randomBytes: Crypto.getRandomBytes,
  saveEncryptionKey: (value) =>
    SecureStore.setItemAsync(ENCRYPTION_KEY_NAME, value, secureStoreOptions),
};

function createEncryptionKey(randomBytes: Uint8Array): string {
  return Array.from(randomBytes, (byte) => KEY_ALPHABET[byte & 63]).join("");
}

export function createEncryptedTokenCache(
  dependencies: TokenCacheDependencies = defaultDependencies,
): TokenCache {
  let storagePromise: Promise<TokenStorage> | undefined;

  const getStorage = () => {
    storagePromise ??= (async () => {
      let encryptionKey = await dependencies.getEncryptionKey();

      if (encryptionKey === null) {
        encryptionKey = createEncryptionKey(dependencies.randomBytes(16));
        await dependencies.saveEncryptionKey(encryptionKey);
      }

      return dependencies.createStorage(encryptionKey);
    })();

    return storagePromise;
  };

  return {
    async clearToken(key) {
      const storage = await getStorage();
      storage.remove(key);
    },
    async getToken(key) {
      const storage = await getStorage();
      return storage.getString(key) ?? null;
    },
    async saveToken(key, token) {
      const storage = await getStorage();
      storage.set(key, token);
    },
  };
}

export const clerkTokenCache = createEncryptedTokenCache();
