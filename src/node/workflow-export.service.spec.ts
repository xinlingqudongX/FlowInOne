import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { WorkflowExportService } from './workflow-export.service';
import { NodeMetadataEntity } from './entities/node-metadata.entity';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeNode(overrides: Partial<NodeMetadataEntity> = {}): NodeMetadataEntity {
  return Object.assign(new NodeMetadataEntity(), {
    nodeId: 'node-1',
    nodeType: 'text',
    requirement: '',
    prompt: undefined,
    attributes: undefined,
    status: 'pending' as const,
    project: { id: 'proj-1' } as any,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

function makeNodeRepo(nodes: NodeMetadataEntity[] = []) {
  return {
    find: jest.fn().mockResolvedValue(nodes),
  } as any;
}

function makeProjectService(project: any = { id: 'proj-1', name: 'Test Project', workflowJson: null }) {
  return {
    findOne: jest.fn().mockResolvedValue(project),
  } as any;
}

function makeEm() {
  return {
    persist: jest.fn(),
    flush: jest.fn().mockResolvedValue(undefined),
    persistAndFlush: jest.fn().mockResolvedValue(undefined),
    find: jest.fn().mockResolvedValue([]),
  } as any;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('WorkflowExportService', () => {
  let nodeRepo: ReturnType<typeof makeNodeRepo>;
  let projectService: ReturnType<typeof makeProjectService>;
  let em: ReturnType<typeof makeEm>;
  let service: WorkflowExportService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 1. throws NotFoundException when project does not exist
  it('throws NotFoundException when project does not exist', async () => {
    projectService = makeProjectService();
    projectService.findOne.mockRejectedValue(new NotFoundException('Project not found'));
    nodeRepo = makeNodeRepo();
    em = makeEm();

    service = new WorkflowExportService(nodeRepo, projectService, em);

    await expect(service.exportWorkflow('proj-missing')).rejects.toThrow(NotFoundException);
  });

  // 2. returns empty export when workflowJson is null
  it('returns empty export when workflowJson is null', async () => {
    const project = { id: 'proj-1', name: 'Test Project', workflowJson: null };
    projectService = makeProjectService(project);
    nodeRepo = makeNodeRepo();
    em = makeEm();

    service = new WorkflowExportService(nodeRepo, projectService, em);

    const result = await service.exportWorkflow('proj-1');

    expect(result.nodes).toEqual([]);
    expect(result.execution_order).toEqual([]);
    expect(result.executable_now).toEqual([]);
    expect(result.total_nodes).toBe(0);
    expect(result.projectId).toBe('proj-1');
    expect(result.projectName).toBe('Test Project');
  });

  // 3. returns empty export when workflowJson.edges is empty and no synced nodes
  it('returns empty export when workflowJson.edges is empty and no synced nodes', async () => {
    const project = { id: 'proj-1', name: 'Test Project', workflowJson: { edges: [] } };
    projectService = makeProjectService(project);
    nodeRepo = makeNodeRepo([]);
    em = makeEm();

    service = new WorkflowExportService(nodeRepo, projectService, em);

    const result = await service.exportWorkflow('proj-1');

    expect(result.nodes).toEqual([]);
    expect(result.execution_order).toEqual([]);
    expect(result.executable_now).toEqual([]);
    expect(result.total_nodes).toBe(0);
  });

  // 4. exported node contains all required fields (EXPORT-02)
  it('exported node contains all required fields (EXPORT-02)', async () => {
    const node = makeNode({
      nodeId: 'A',
      nodeType: 'text',
      requirement: 'req',
      prompt: 'p',
      attributes: [{ key: 'k', value: 'v' }],
      status: 'pending',
    });
    const project = { id: 'proj-1', name: 'Test Project', workflowJson: { edges: [] } };
    projectService = makeProjectService(project);
    nodeRepo = makeNodeRepo([node]);
    em = makeEm();

    service = new WorkflowExportService(nodeRepo, projectService, em);

    const result = await service.exportWorkflow('proj-1');

    expect(result.nodes).toHaveLength(1);
    const exported = result.nodes[0];
    expect(exported).toHaveProperty('nodeId', 'A');
    expect(exported).toHaveProperty('type', 'text');
    expect(exported).toHaveProperty('requirement', 'req');
    expect(exported).toHaveProperty('prompt', 'p');
    expect(exported).toHaveProperty('attributes');
    expect(exported.attributes).toEqual([{ key: 'k', value: 'v' }]);
    expect(exported).toHaveProperty('status', 'pending');
    expect(exported).toHaveProperty('dependencies');
    expect(exported).toHaveProperty('can_execute');
  });

  // 5. dangling edges are silently skipped
  it('dangling edges are silently skipped — node B depends on unsynced node X', async () => {
    const nodeB = makeNode({ nodeId: 'B', status: 'pending' });
    const project = {
      id: 'proj-1',
      name: 'Test Project',
      workflowJson: { edges: [{ sourceNodeId: 'X', targetNodeId: 'B' }] },
    };
    projectService = makeProjectService(project);
    nodeRepo = makeNodeRepo([nodeB]);
    em = makeEm();

    service = new WorkflowExportService(nodeRepo, projectService, em);

    const result = await service.exportWorkflow('proj-1');

    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].dependencies).toEqual([]);
  });

  // 6. can_execute=true for isolated node (no dependencies)
  it('can_execute=true for isolated node (no dependencies)', async () => {
    const node = makeNode({ nodeId: 'node-1', status: 'pending' });
    const project = { id: 'proj-1', name: 'Test Project', workflowJson: { edges: [] } };
    projectService = makeProjectService(project);
    nodeRepo = makeNodeRepo([node]);
    em = makeEm();

    service = new WorkflowExportService(nodeRepo, projectService, em);

    const result = await service.exportWorkflow('proj-1');

    expect(result.nodes[0].can_execute).toBe(true);
  });

  // 7. can_execute=true when all in-scope dependency nodes are completed
  it('can_execute=true when all in-scope dependency nodes are completed', async () => {
    const nodeA = makeNode({ nodeId: 'A', status: 'completed' });
    const nodeB = makeNode({ nodeId: 'B', status: 'pending' });
    const project = {
      id: 'proj-1',
      name: 'Test Project',
      workflowJson: { edges: [{ sourceNodeId: 'A', targetNodeId: 'B' }] },
    };
    projectService = makeProjectService(project);
    nodeRepo = makeNodeRepo([nodeA, nodeB]);
    em = makeEm();

    service = new WorkflowExportService(nodeRepo, projectService, em);

    const result = await service.exportWorkflow('proj-1');

    const exportedB = result.nodes.find((n) => n.nodeId === 'B');
    expect(exportedB).toBeDefined();
    expect(exportedB!.can_execute).toBe(true);
  });

  // 8. can_execute=false when at least one dependency is not completed
  it('can_execute=false when at least one dependency is not completed', async () => {
    const nodeA = makeNode({ nodeId: 'A', status: 'pending' });
    const nodeB = makeNode({ nodeId: 'B', status: 'pending' });
    const project = {
      id: 'proj-1',
      name: 'Test Project',
      workflowJson: { edges: [{ sourceNodeId: 'A', targetNodeId: 'B' }] },
    };
    projectService = makeProjectService(project);
    nodeRepo = makeNodeRepo([nodeA, nodeB]);
    em = makeEm();

    service = new WorkflowExportService(nodeRepo, projectService, em);

    const result = await service.exportWorkflow('proj-1');

    const exportedB = result.nodes.find((n) => n.nodeId === 'B');
    expect(exportedB).toBeDefined();
    expect(exportedB!.can_execute).toBe(false);
  });

  // 9. can_execute=true when dependency is out of export scope (deleted/unsynced)
  it('can_execute=true when dependency is out of export scope (deleted/unsynced)', async () => {
    // node B only, A not in nodeRepo; edge A->B
    const nodeB = makeNode({ nodeId: 'B', status: 'pending' });
    const project = {
      id: 'proj-1',
      name: 'Test Project',
      workflowJson: { edges: [{ sourceNodeId: 'A', targetNodeId: 'B' }] },
    };
    projectService = makeProjectService(project);
    nodeRepo = makeNodeRepo([nodeB]);
    em = makeEm();

    service = new WorkflowExportService(nodeRepo, projectService, em);

    const result = await service.exportWorkflow('proj-1');

    const exportedB = result.nodes.find((n) => n.nodeId === 'B');
    expect(exportedB).toBeDefined();
    // Out-of-scope dep treated as satisfied => can_execute = true
    expect(exportedB!.can_execute).toBe(true);
  });

  // 10. execution_order contains all node IDs in valid topological order (EXPORT-04)
  it('execution_order contains all node IDs in valid topological order (EXPORT-04)', async () => {
    const nodeA = makeNode({ nodeId: 'A', status: 'pending' });
    const nodeB = makeNode({ nodeId: 'B', status: 'pending' });
    const nodeC = makeNode({ nodeId: 'C', status: 'pending' });
    const project = {
      id: 'proj-1',
      name: 'Test Project',
      workflowJson: {
        edges: [
          { sourceNodeId: 'A', targetNodeId: 'B' },
          { sourceNodeId: 'B', targetNodeId: 'C' },
        ],
      },
    };
    projectService = makeProjectService(project);
    nodeRepo = makeNodeRepo([nodeA, nodeB, nodeC]);
    em = makeEm();

    service = new WorkflowExportService(nodeRepo, projectService, em);

    const result = await service.exportWorkflow('proj-1');

    const order = result.execution_order;
    expect(order).toHaveLength(3);
    expect(order.indexOf('A')).toBeLessThan(order.indexOf('B'));
    expect(order.indexOf('B')).toBeLessThan(order.indexOf('C'));
  });

  // 11. isolated node appears in execution_order
  it('isolated node appears in execution_order', async () => {
    const node = makeNode({ nodeId: 'node-1', status: 'pending' });
    const project = { id: 'proj-1', name: 'Test Project', workflowJson: { edges: [] } };
    projectService = makeProjectService(project);
    nodeRepo = makeNodeRepo([node]);
    em = makeEm();

    service = new WorkflowExportService(nodeRepo, projectService, em);

    const result = await service.exportWorkflow('proj-1');

    expect(result.execution_order).toEqual(['node-1']);
  });

  // 12. executable_now contains exactly the can_execute=true node IDs (EXPORT-05)
  it('executable_now contains exactly the can_execute=true node IDs (EXPORT-05)', async () => {
    // A (completed, no deps) → can_execute=true
    // B (pending, depends on A which is completed) → can_execute=true
    // C (pending, no deps) → can_execute=true
    const nodeA = makeNode({ nodeId: 'A', status: 'completed' });
    const nodeB = makeNode({ nodeId: 'B', status: 'pending' });
    const nodeC = makeNode({ nodeId: 'C', status: 'pending' });
    const project = {
      id: 'proj-1',
      name: 'Test Project',
      workflowJson: { edges: [{ sourceNodeId: 'A', targetNodeId: 'B' }] },
    };
    projectService = makeProjectService(project);
    nodeRepo = makeNodeRepo([nodeA, nodeB, nodeC]);
    em = makeEm();

    service = new WorkflowExportService(nodeRepo, projectService, em);

    const result = await service.exportWorkflow('proj-1');

    expect(result.executable_now).toContain('A');
    expect(result.executable_now).toContain('B');
    expect(result.executable_now).toContain('C');
    expect(result.executable_now).toHaveLength(3);
  });

  // 13. cyclic dependency returns UnprocessableEntityException with error and cycle fields (EXPORT-06)
  it('cyclic dependency returns UnprocessableEntityException with error and cycle fields (EXPORT-06)', async () => {
    const nodeA = makeNode({ nodeId: 'A', status: 'pending' });
    const nodeB = makeNode({ nodeId: 'B', status: 'pending' });
    const project = {
      id: 'proj-1',
      name: 'Test Project',
      workflowJson: {
        edges: [
          { sourceNodeId: 'A', targetNodeId: 'B' },
          { sourceNodeId: 'B', targetNodeId: 'A' },
        ],
      },
    };
    projectService = makeProjectService(project);
    nodeRepo = makeNodeRepo([nodeA, nodeB]);
    em = makeEm();

    service = new WorkflowExportService(nodeRepo, projectService, em);

    let thrownError: any;
    try {
      await service.exportWorkflow('proj-1');
      fail('Expected UnprocessableEntityException to be thrown');
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).toBeInstanceOf(UnprocessableEntityException);
    const response = thrownError.getResponse();
    expect(response).toHaveProperty('error', 'Cyclic dependency detected');
    expect(response).toHaveProperty('cycle');
    const cycle: string[] = response.cycle;
    expect(Array.isArray(cycle)).toBe(true);
    expect(cycle.includes('A') || cycle.includes('B')).toBe(true);
  });

  // 14. cycle array in 422 starts and ends with the same node ID
  it('cycle array in 422 starts and ends with the same node ID', async () => {
    const nodeA = makeNode({ nodeId: 'A', status: 'pending' });
    const nodeB = makeNode({ nodeId: 'B', status: 'pending' });
    const project = {
      id: 'proj-1',
      name: 'Test Project',
      workflowJson: {
        edges: [
          { sourceNodeId: 'A', targetNodeId: 'B' },
          { sourceNodeId: 'B', targetNodeId: 'A' },
        ],
      },
    };
    projectService = makeProjectService(project);
    nodeRepo = makeNodeRepo([nodeA, nodeB]);
    em = makeEm();

    service = new WorkflowExportService(nodeRepo, projectService, em);

    let thrownError: any;
    try {
      await service.exportWorkflow('proj-1');
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).toBeInstanceOf(UnprocessableEntityException);
    const response = thrownError.getResponse();
    const cycle: string[] = response.cycle;
    expect(cycle.length).toBeGreaterThanOrEqual(2);
    expect(cycle[0]).toBe(cycle[cycle.length - 1]);
  });
});
