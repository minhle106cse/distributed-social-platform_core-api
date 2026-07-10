import type { ISpaceRepository } from '@/modules/tenant/domain/repositories/space.repository'
import { CreateSpaceHandler } from './create-space.handler'
import { CreateSpaceCommand } from './create-space.command'

describe('CreateSpaceHandler', () => {
  let handler: CreateSpaceHandler
  let mockSpaceRepo: jest.Mocked<ISpaceRepository>

  beforeEach(() => {
    mockSpaceRepo = {
      findById: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<ISpaceRepository>

    handler = new CreateSpaceHandler(mockSpaceRepo)
  })

  it('should create and persist a space with the requested visibility, returning its id', async () => {
    const command = new CreateSpaceCommand('org-1', 'Engineering', 'PRIVATE')

    const spaceId = await handler.execute(command)

    expect(mockSpaceRepo.save).toHaveBeenCalledTimes(1)
    const savedSpace = mockSpaceRepo.save.mock.calls[0][0]
    expect(savedSpace.id).toBe(spaceId)
    expect(savedSpace.orgId).toBe('org-1')
    expect(savedSpace.name).toBe('Engineering')
    expect(savedSpace.visibility).toBe('PRIVATE')
  })
})
