import * as assert from 'assert';
import { ProjectIndex } from '../../../indexer/ProjectIndex';
import { ToolRegistry } from '../../../tools/ToolRegistry';
import type { IJavaClass, IFinding, IProjectScore, ICategoryScore } from '../../../models';

describe('ProjectTools & ToolRegistry', () => {
  let registry: ToolRegistry;
  let index: ProjectIndex;

  beforeEach(() => {
    registry = new ToolRegistry();
    index = new ProjectIndex();

    const sampleClass: IJavaClass = {
      filePath: '/path/to/PaymentService.java',
      packageName: 'com.example.service',
      className: 'PaymentService',
      fullyQualifiedName: 'com.example.service.PaymentService',
      classType: 'class',
      stereotype: 'Service',
      annotations: ['Service'],
      fields: [{ name: 'amount', type: 'double', annotations: [], injectionType: 'none', visibility: 'private', isStatic: false, isFinal: false, lineNumber: 5, rawSource: 'private double amount;' }],
      methods: [{ name: 'pay', returnType: 'boolean', parameters: [{ name: 'val', type: 'double', annotations: [] }], annotations: [], lineNumber: 10, visibility: 'public', isStatic: false, isAbstract: false, isSynchronized: false, body: 'return val > 0;', throwsExceptions: [] }],
      imports: [],
      interfaces: [],
      lineCount: 20,
      rawContent: 'public class PaymentService { private double amount; public boolean pay(double val) { return val > 0; } }',
    };

    index.updateClass(sampleClass);
  });

  it('should register expanded default MCP discovery tools including readFile and readMethod', () => {
    const tools = registry.getToolDefinitions();
    assert.strictEqual(tools.length, 33);
  });

  it('readFile tool should return raw file content', async () => {
    const result = await registry.execute('readFile', { path: 'PaymentService.java' }, index);
    assert.ok(result.includes('public class PaymentService'));
  });

  it('readMethod tool should return method body', async () => {
    const result = await registry.execute('readMethod', { class: 'PaymentService', method: 'pay' }, index);
    assert.ok(result.includes('boolean pay(double val)'));
    assert.ok(result.includes('return val > 0;'));
  });

  it('getClassSummary tool should return class summary metadata', async () => {
    const result = await registry.execute('getClassSummary', { className: 'PaymentService' }, index);
    assert.ok(result.includes('PaymentService'));
    assert.ok(result.includes('amount'));
    assert.ok(result.includes('pay'));
  });

  it('getClassSource tool should return raw source code', async () => {
    const result = await registry.execute('getClassSource', { className: 'PaymentService' }, index);
    assert.ok(result.includes('public class PaymentService'));
  });

  it('getMethod tool should return specific method body', async () => {
    const result = await registry.execute('getMethod', { className: 'PaymentService', methodName: 'pay' }, index);
    assert.ok(result.includes('boolean pay(double val)'));
    assert.ok(result.includes('return val > 0;'));
  });

  it('findSpringBeans tool should return categorized beans', async () => {
    const result = await registry.execute('findSpringBeans', {}, index);
    assert.ok(result.includes('@Service'));
    assert.ok(result.includes('paymentService'));
  });

  it('getStaticFindings tool should return formatted findings from contextState', async () => {
    const mockFindings: IFinding[] = [
      {
        ruleId: 'FIELD_INJECTION',
        ruleName: 'Field Injection',
        severity: 'major',
        category: 'architecture',
        message: 'Use constructor injection',
        recommendation: 'Refactor to constructor injection',
        filePath: '/path/to/PaymentService.java',
        lineNumber: 5,
        scoreDeduction: 10,
      },
    ];

    const result = await registry.execute('getStaticFindings', {}, index, { findings: mockFindings });
    assert.ok(result.includes('Use constructor injection'));
    assert.ok(result.includes('Refactor to constructor injection'));
  });

  it('getScorecard tool should return quality score from contextState', async () => {
    const mockCategory: ICategoryScore = { category: 'test', score: 90, maxScore: 100, percentage: 90, deductions: [] };
    const mockScore: IProjectScore = {
      finalScore: 90,
      grade: 'A',
      architecture: mockCategory,
      security: mockCategory,
      performance: mockCategory,
      maintainability: mockCategory,
      testing: mockCategory,
    };

    const result = await registry.execute('getScorecard', {}, index, { score: mockScore });
    assert.ok(result.includes('Grade: A'));
    assert.ok(result.includes('90 / 100'));
  });

  it('getDependencies tool should return dependency list from contextState', async () => {
    const mockDeps = ['org.springframework.boot:spring-boot-starter-web:2.7.0'];
    const result = await registry.execute('getDependencies', {}, index, { dependencies: mockDeps });
    assert.ok(result.includes('spring-boot-starter-web'));
  });
});
