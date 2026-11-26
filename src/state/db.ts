import { openDB, type DBSchema } from 'idb'
import type { Event, Reading } from './series'

export type Source = 'device' | 'simulated'
export type SessionMeta = { id: number; name: string; start: number; end: number; source: Source; userId?: number; deviceName?: string }
export type Device = { id: string; name: string; url: string }
export type User = { id: number; name: string; key: string; salt: string; hash: string; devices: Device[] }
type Chunk = { sessionId: number; readings: Reading[]; events: Event[] }

interface Schema extends DBSchema {
  sessions: { key: number; value: SessionMeta }
  chunks: { key: number; value: Chunk; indexes: { session: number } }
  users: { key: number; value: User; indexes: { key: string } }
}

const dbp = openDB<Schema>('pulmosense', 2, {
  upgrade(d, old) {
    if (old < 1) {
      d.createObjectStore('sessions', { keyPath: 'id', autoIncrement: true })
      d.createObjectStore('chunks', { autoIncrement: true }).createIndex('session', 'sessionId')
    }
    if (old < 2) d.createObjectStore('users', { keyPath: 'id', autoIncrement: true }).createIndex('key', 'key', { unique: true })
  },
})

// ---- users (local profiles; see auth.ts)
export async function addUser(u: Omit<User, 'id'>): Promise<User> {
  const id = await (await dbp).add('users', u as User) // id assigned by autoIncrement
  return { ...u, id }
}
export const getUser = async (id: number) => (await dbp).get('users', id)
export const findUser = async (name: string) => (await dbp).getFromIndex('users', 'key', name.trim().toLowerCase())
export const userCount = async () => (await dbp).count('users')
export async function putUser(u: User) {
  await (await dbp).put('users', u)
}

/** Sessions recorded before accounts existed belong to the first profile created. */
export async function adoptOrphans(userId: number) {
  const tx = (await dbp).transaction('sessions', 'readwrite')
  for (let c = await tx.store.openCursor(); c; c = await c.continue())
    if (c.value.userId === undefined) await c.update({ ...c.value, userId })
  await tx.done
}

export async function createSession(m: Omit<SessionMeta, 'id'>): Promise<number> {
  return (await dbp).add('sessions', m as SessionMeta) // id assigned by autoIncrement
}

export async function putSession(m: SessionMeta) {
  await (await dbp).put('sessions', m)
}

/** One transaction: the chunk and the session's updated end time land together. */
export async function saveChunk(m: SessionMeta, readings: Reading[], events: Event[]) {
  const tx = (await dbp).transaction(['sessions', 'chunks'], 'readwrite')
  tx.objectStore('chunks').add({ sessionId: m.id, readings, events })
  tx.objectStore('sessions').put(m)
  await tx.done
}

export async function listSessions() {
  return (await dbp).getAll('sessions')
}

export async function loadSession(id: number) {
  const chunks = await (await dbp).getAllFromIndex('chunks', 'session', id)
  return { readings: chunks.flatMap((c) => c.readings), events: chunks.flatMap((c) => c.events) }
}

export async function deleteSession(id: number) {
  const tx = (await dbp).transaction(['sessions', 'chunks'], 'readwrite')
  tx.objectStore('sessions').delete(id)
  const chunks = tx.objectStore('chunks')
  for (let c = await chunks.index('session').openKeyCursor(id); c; c = await c.continue()) chunks.delete(c.primaryKey)
  await tx.done
}
