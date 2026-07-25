// Local-development / test secrets provider. Stores values in an in-memory
// Map — nothing ever touches disk. This is intentionally NOT persistent:
// restarting the dev server forgets every stored token, which is fine for
// local development and keeps this file safe (there is no plaintext secrets
// file anywhere in the repo to accidentally commit).
//
// NEVER use this provider in a deployed environment. Selection happens in
// secretsService.js based on SECRETS_PROVIDER.

const store = new Map()

export const localSecretsProvider = {
  async putSecret(name, value) {
    store.set(name, value)
    return name
  },

  async getSecret(name) {
    return store.has(name) ? store.get(name) : null
  },

  async deleteSecret(name) {
    store.delete(name)
  },
}
