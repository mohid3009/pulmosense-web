import { expect, it } from 'vitest'
import { hashPassword, newSalt } from './auth'

it('hash is repeatable for the same salt and password, different otherwise', async () => {
  const s = newSalt()
  expect(await hashPassword('pw', s)).toBe(await hashPassword('pw', s))
  expect(await hashPassword('pw', s)).not.toBe(await hashPassword('pw2', s))
  expect(await hashPassword('pw', s)).not.toBe(await hashPassword('pw', newSalt()))
})
