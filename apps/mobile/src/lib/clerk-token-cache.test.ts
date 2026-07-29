import { createEncryptedTokenCache } from "./clerk-token-cache";

function createTestDependencies(savedKey: string | null = null) {
  const storage = {
    clearAll: jest.fn(),
    getString: jest.fn(),
    remove: jest.fn(),
    set: jest.fn(),
  };
  const dependencies = {
    createStorage: jest.fn(() => storage),
    getEncryptionKey: jest.fn(async () => savedKey),
    randomBytes: jest.fn(() => new Uint8Array(16).fill(7)),
    saveEncryptionKey: jest.fn(async () => undefined),
  };

  return { dependencies, storage };
}

describe("encrypted Clerk token cache", () => {
  it("creates one 16-character encryption key and reuses one MMKV instance", async () => {
    const { dependencies } = createTestDependencies();
    const cache = createEncryptedTokenCache(dependencies);

    await cache.saveToken("session", "token-value");
    await cache.getToken("session");

    expect(dependencies.saveEncryptionKey).toHaveBeenCalledWith(
      expect.stringMatching(/^H{16}$/),
    );
    expect(dependencies.createStorage).toHaveBeenCalledTimes(1);
  });

  it("reads, writes, and clears tokens without replacing an existing key", async () => {
    const { dependencies, storage } =
      createTestDependencies("existing-key-123");
    storage.getString.mockReturnValue("persisted-token");
    const cache = createEncryptedTokenCache(dependencies);

    await expect(cache.getToken("session")).resolves.toBe("persisted-token");
    await cache.saveToken("session", "new-token");
    await cache.clearToken?.("session");

    expect(dependencies.saveEncryptionKey).not.toHaveBeenCalled();
    expect(storage.set).toHaveBeenCalledWith("session", "new-token");
    expect(storage.remove).toHaveBeenCalledWith("session");
  });

  it("returns null when a token is absent", async () => {
    const { dependencies } = createTestDependencies("existing-key-123");
    const cache = createEncryptedTokenCache(dependencies);

    await expect(cache.getToken("missing")).resolves.toBeNull();
  });

  it("clears every encrypted MMKV token without deleting its SecureStore key", async () => {
    const { dependencies, storage } =
      createTestDependencies("existing-key-123");
    const cache = createEncryptedTokenCache(dependencies);

    await cache.clearAllTokens();

    expect(storage.clearAll).toHaveBeenCalledTimes(1);
    expect(dependencies.saveEncryptionKey).not.toHaveBeenCalled();
  });
});
