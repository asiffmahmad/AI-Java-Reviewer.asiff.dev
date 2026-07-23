import * as assert from 'assert';
import { HardcodedSecretRule } from '../../../rules/HardcodedSecretRule';
import { NPlusOneQueryRule } from '../../../rules/NPlusOneQueryRule';
import { MissingValidationRule } from '../../../rules/MissingValidationRule';
import { FindAllWithoutPaginationRule } from '../../../rules/FindAllWithoutPaginationRule';
import type { IJavaClass } from '../../../models';
import type { IReviewConfig } from '../../../configuration/ReviewConfig';

describe('Expanded Static Analysis Rules', () => {
  const dummyConfig = { ruleOverrides: [] } as unknown as IReviewConfig;

  it('HardcodedSecretRule detects raw hardcoded password strings', () => {
    const rule = new HardcodedSecretRule();
    const testClass: IJavaClass = {
      filePath: 'src/main/java/com/example/config/DbConfig.java',
      packageName: 'com.example.config',
      className: 'DbConfig',
      fullyQualifiedName: 'com.example.config.DbConfig',
      classType: 'class',
      stereotype: 'Configuration',
      annotations: [],
      fields: [
        {
          name: 'dbPassword',
          type: 'String',
          annotations: [],
          injectionType: 'none',
          visibility: 'private',
          isStatic: false,
          isFinal: false,
          lineNumber: 10,
          rawSource: 'private String dbPassword = "SecretPassword123!";',
        },
      ],
      methods: [],
      imports: [],
      interfaces: [],
      lineCount: 20,
      rawContent: '',
    };

    const findings = rule.evaluate(testClass, dummyConfig);
    assert.strictEqual(findings.length, 1);
    assert.strictEqual(findings[0].ruleId, 'RULE_HARDCODED_SECRET');
    assert.strictEqual(findings[0].category, 'security');
  });

  it('NPlusOneQueryRule detects repository call in loop', () => {
    const rule = new NPlusOneQueryRule();
    const testClass: IJavaClass = {
      filePath: 'src/main/java/com/example/service/OrderService.java',
      packageName: 'com.example.service',
      className: 'OrderService',
      fullyQualifiedName: 'com.example.service.OrderService',
      classType: 'class',
      stereotype: 'Service',
      annotations: ['Service'],
      fields: [],
      methods: [
        {
          name: 'processOrders',
          returnType: 'void',
          parameters: [],
          annotations: [],
          lineNumber: 15,
          visibility: 'public',
          isStatic: false,
          isAbstract: false,
          isSynchronized: false,
          body: 'for (Long id : ids) { userRepo.findById(id); }',
          throwsExceptions: [],
        },
      ],
      imports: [],
      interfaces: [],
      lineCount: 30,
      rawContent: '',
    };

    const findings = rule.evaluate(testClass, dummyConfig);
    assert.strictEqual(findings.length, 1);
    assert.strictEqual(findings[0].ruleId, 'RULE_N_PLUS_ONE_QUERY');
    assert.strictEqual(findings[0].category, 'performance');
  });

  it('MissingValidationRule detects @RequestBody without @Valid', () => {
    const rule = new MissingValidationRule();
    const testClass: IJavaClass = {
      filePath: 'src/main/java/com/example/controller/UserController.java',
      packageName: 'com.example.controller',
      className: 'UserController',
      fullyQualifiedName: 'com.example.controller.UserController',
      classType: 'class',
      stereotype: 'RestController',
      annotations: ['RestController'],
      fields: [],
      methods: [
        {
          name: 'createUser',
          returnType: 'ResponseEntity',
          parameters: [
            {
              name: 'dto',
              type: 'UserDTO',
              annotations: ['RequestBody'],
            },
          ],
          annotations: ['PostMapping'],
          lineNumber: 22,
          visibility: 'public',
          isStatic: false,
          isAbstract: false,
          isSynchronized: false,
          body: '',
          throwsExceptions: [],
        },
      ],
      imports: [],
      interfaces: [],
      lineCount: 40,
      rawContent: '',
    };

    const findings = rule.evaluate(testClass, dummyConfig);
    assert.strictEqual(findings.length, 1);
    assert.strictEqual(findings[0].ruleId, 'RULE_MISSING_VALID');
  });

  it('FindAllWithoutPaginationRule detects unpaginated findAll() calls', () => {
    const rule = new FindAllWithoutPaginationRule();
    const testClass: IJavaClass = {
      filePath: 'src/main/java/com/example/service/ItemService.java',
      packageName: 'com.example.service',
      className: 'ItemService',
      fullyQualifiedName: 'com.example.service.ItemService',
      classType: 'class',
      stereotype: 'Service',
      annotations: ['Service'],
      fields: [],
      methods: [
        {
          name: 'getAllItems',
          returnType: 'List<Item>',
          parameters: [],
          annotations: [],
          lineNumber: 18,
          visibility: 'public',
          isStatic: false,
          isAbstract: false,
          isSynchronized: false,
          body: 'return itemRepository.findAll();',
          throwsExceptions: [],
        },
      ],
      imports: [],
      interfaces: [],
      lineCount: 30,
      rawContent: '',
    };

    const findings = rule.evaluate(testClass, dummyConfig);
    assert.strictEqual(findings.length, 1);
    assert.strictEqual(findings[0].ruleId, 'RULE_FIND_ALL_WITHOUT_PAGINATION');
  });
});
