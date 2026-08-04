import { SagaCompensationRegistry } from './saga-compensation.registry'

describe('SagaCompensationRegistry', () => {
  let registry: SagaCompensationRegistry

  beforeEach(() => {
    registry = new SagaCompensationRegistry()
  })

  it('should return the registered runner for a known actionType', async () => {
    const runner = jest.fn().mockResolvedValue(undefined)
    registry.register('cancel-provisioned-user', runner)

    await registry.get('cancel-provisioned-user')({ userId: 'u-1' })

    expect(runner).toHaveBeenCalledWith({ userId: 'u-1' })
  })

  it('should throw when registering the same actionType twice', () => {
    registry.register('archive-org', jest.fn())

    expect(() => registry.register('archive-org', jest.fn())).toThrow(/Duplicate/)
  })

  it('should throw when looking up an unregistered actionType', () => {
    expect(() => registry.get('unknown-action')).toThrow(/No compensation runner registered/)
  })
})
