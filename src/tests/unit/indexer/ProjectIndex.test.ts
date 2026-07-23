import * as assert from 'assert';
import { ProjectIndex } from '../../../indexer/ProjectIndex';
import type { IJavaClass } from '../../../models';

describe('ProjectIndex', () => {
  let index: ProjectIndex;

  beforeEach(() => {
    index = new ProjectIndex();
  });

  it('should store and query class symbols, spring beans, and interfaces', () => {
    const serviceClass: IJavaClass = {
      filePath: '/path/to/PaymentServiceImpl.java',
      packageName: 'com.example.service',
      className: 'PaymentServiceImpl',
      fullyQualifiedName: 'com.example.service.PaymentServiceImpl',
      classType: 'class',
      stereotype: 'Service',
      annotations: ['Service'],
      fields: [{ name: 'repo', type: 'PaymentRepository', annotations: ['Autowired'], injectionType: 'field', visibility: 'private', isStatic: false, isFinal: false, lineNumber: 10, rawSource: 'private PaymentRepository repo;' }],
      methods: [{ name: 'processPayment', returnType: 'void', parameters: [], annotations: [], lineNumber: 15, visibility: 'public', isStatic: false, isAbstract: false, isSynchronized: false, body: 'repo.save();', throwsExceptions: [] }],
      imports: ['com.example.repository.PaymentRepository', 'com.example.service.PaymentService'],
      interfaces: ['PaymentService'],
      lineCount: 30,
      rawContent: 'public class PaymentServiceImpl implements PaymentService {}',
    };

    index.updateClass(serviceClass);

    assert.deepStrictEqual(index.getClass('PaymentServiceImpl'), serviceClass);
    assert.strictEqual(index.getSpringBeans().get('paymentServiceImpl'), 'com.example.service.PaymentServiceImpl');
    assert.ok(index.getImplementations('PaymentService').includes('com.example.service.PaymentServiceImpl'));
    assert.strictEqual(index.getMetadata().totalClasses, 1);
    assert.strictEqual(index.getMetadata().totalSpringBeans, 1);
  });

  it('should search classes by substring query', () => {
    const cls: IJavaClass = {
      filePath: '/path/to/UserController.java',
      packageName: 'com.example.controller',
      className: 'UserController',
      fullyQualifiedName: 'com.example.controller.UserController',
      classType: 'class',
      stereotype: 'RestController',
      annotations: ['RestController'],
      fields: [],
      methods: [],
      imports: [],
      interfaces: [],
      lineCount: 20,
      rawContent: 'public class UserController {}',
    };

    index.updateClass(cls);

    const matches = index.search('User');
    assert.strictEqual(matches.length, 1);
    assert.strictEqual(matches[0].className, 'UserController');
  });
});
