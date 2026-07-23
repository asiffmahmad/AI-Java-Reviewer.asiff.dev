import * as assert from 'assert';
import { ContextBuilder } from '../../../context/ContextBuilder';
import { ProjectIndex } from '../../../indexer/ProjectIndex';
import type { IJavaClass } from '../../../models';
import type { IReviewConfig } from '../../../configuration/ReviewConfig';

describe('ContextBuilder', () => {
  let builder: ContextBuilder;
  let index: ProjectIndex;

  beforeEach(() => {
    builder = new ContextBuilder();
    index = new ProjectIndex();
  });

  it('should generate an agentic seed context prompt for single target file', () => {
    const targetClass: IJavaClass = {
      filePath: 'src/main/java/com/example/service/UserService.java',
      packageName: 'com.example.service',
      className: 'UserService',
      fullyQualifiedName: 'com.example.service.UserService',
      classType: 'class',
      stereotype: 'Service',
      annotations: ['Service'],
      fields: [{ name: 'userRepo', type: 'UserRepository', annotations: ['Autowired'], injectionType: 'field', visibility: 'private', isStatic: false, isFinal: false, lineNumber: 8, rawSource: 'private UserRepository userRepo;' }],
      methods: [{ name: 'getUser', returnType: 'User', parameters: [{ name: 'id', type: 'Long', annotations: [] }], annotations: [], lineNumber: 12, visibility: 'public', isStatic: false, isAbstract: false, isSynchronized: false, body: 'return userRepo.findById(id);', throwsExceptions: [] }],
      imports: ['UserRepository'],
      interfaces: [],
      lineCount: 25,
      rawContent: 'public class UserService { private UserRepository userRepo; }',
    };

    index.updateClass(targetClass);
    const config: IReviewConfig = { javaVersion: '17', framework: 'spring-boot', provider: 'openai', model: 'gpt-4o' } as any;

    const seed = builder.buildSeedContext([targetClass], [], [], undefined, config, index);

    assert.ok(seed.includes('# AI Java Reviewer — Enterprise Agentic MCP Discovery Prompt'));
    assert.ok(seed.includes('Single File (`src/main/java/com/example/service/UserService.java`)'));
    assert.strictEqual(seed.includes('public class UserService'), false);
  });

  it('should format scope and base directories for multiple target files', () => {
    const class1: IJavaClass = {
      filePath: 'src/main/java/com/example/service/UserService.java',
      packageName: 'com.example.service',
      className: 'UserService',
      fullyQualifiedName: 'com.example.service.UserService',
      classType: 'class',
      stereotype: 'Service',
      annotations: [], fields: [], methods: [], imports: [], interfaces: [], lineCount: 10, rawContent: 'class UserService {}',
    };
    const class2: IJavaClass = {
      filePath: 'src/main/java/com/example/controller/UserController.java',
      packageName: 'com.example.controller',
      className: 'UserController',
      fullyQualifiedName: 'com.example.controller.UserController',
      classType: 'class',
      stereotype: 'Controller',
      annotations: [], fields: [], methods: [], imports: [], interfaces: [], lineCount: 15, rawContent: 'class UserController {}',
    };

    const config: IReviewConfig = {
      javaVersion: '17',
      framework: 'spring-boot',
      provider: 'openai',
      model: 'gpt-4o',
      rules: ['[dependency_injection] constructor injection only', '[spring] use @Service for business layer'],
      ruleOverrides: [{ id: 'RULE_FIELD_INJECTION', enabled: true, severity: 'CRITICAL', scoreDeduction: 5 }],
    } as any;

    const seed = builder.buildSeedContext([class1, class2], [], [], undefined, config, index);

    assert.ok(seed.includes('2 Java files across 2 module directories'));
    assert.ok(seed.includes('Mandatory Autonomous Discovery Sequence'));
    assert.strictEqual(seed.includes('class UserService'), false);
  });
});
