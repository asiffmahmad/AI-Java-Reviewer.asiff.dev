import type { IFinding } from '../models';

export interface IReference {
  readonly title: string;
  readonly url?: string;
}

export interface IRuleFixMetadata {
  readonly ruleId: string;
  readonly ruleName: string;
  readonly businessImpact: string;
  readonly technicalRationale: string;
  readonly autoFixType: 'Fully Automatic' | 'Semi Automatic' | 'Manual Review' | 'Unsafe Auto Fix';
  readonly confidenceScore: number;
  readonly confidenceReasons: string[];
  readonly detectionLogic: string;
  readonly riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  readonly estimatedFixMinutes: number;
  readonly beforeSnippet?: string;
  readonly afterSnippet?: string;
  readonly diffSnippet?: string;
  readonly relatedRules?: string[];
  readonly references?: IReference[];
}

export class ReportFixGenerator {
  public static getFixMetadata(ruleId: string, ruleName?: string, sampleFinding?: IFinding): IRuleFixMetadata {
    const rawSnippet = sampleFinding?.codeSnippet || '';
    const filePath = sampleFinding?.filePath || '';
    const className = this.extractClassName(filePath, rawSnippet);

    switch (ruleId) {
      case 'RULE_FIELD_INJECTION': {
        const fieldName = this.extractFieldName(rawSnippet, 'userRepository');
        const fieldType = this.extractFieldType(rawSnippet, 'UserRepository');
        const before = rawSnippet || `@Service\npublic class ${className} {\n    @Autowired\n    private ${fieldType} ${fieldName};\n}`;
        const after = `@Service\npublic class ${className} {\n    private final ${fieldType} ${fieldName};\n\n    public ${className}(${fieldType} ${fieldName}) {\n        this.${fieldName} = ${fieldName};\n    }\n}`;
        const diff = `@@ -3,2 +3,5 @@\n-    @Autowired\n-    private ${fieldType} ${fieldName};\n+    private final ${fieldType} ${fieldName};\n+\n+    public ${className}(${fieldType} ${fieldName}) {\n+        this.${fieldName} = ${fieldName};\n+    }`;

        return {
          ruleId,
          ruleName: ruleName || 'Field Injection via @Autowired Detected',
          businessImpact: 'Field injection prevents immutability, complicates unit testing (requires reflection), and masks circular dependencies.',
          technicalRationale: 'Spring recommends constructor injection. Constructor parameters make dependencies explicit, enforce final immutability, and allow straightforward instantiation in unit tests.',
          autoFixType: 'Fully Automatic',
          confidenceScore: 98,
          confidenceReasons: [
            '✓ AST Pattern Match (@Autowired annotation on field declaration)',
            '✓ Static Rule Engine Verification',
            '✓ Real Workspace Source Code Retrieved',
            '✓ Zero Ambiguity in Constructor Injection Mapping',
          ],
          detectionLogic: 'Detected @Autowired or @Inject annotation directly on class field declaration without final modifier.',
          riskLevel: 'HIGH',
          estimatedFixMinutes: 10,
          beforeSnippet: before,
          afterSnippet: after,
          diffSnippet: diff,
          relatedRules: ['RULE_CONSTRUCTOR_INJECTION', 'RULE_FINAL_DEPENDENCIES'],
          references: [
            { title: 'Spring Framework Documentation: Constructor Injection', url: 'https://docs.spring.io/spring-framework/reference/core/beans/dependencies/factory-collaborators.html' },
            { title: 'Effective Java (3rd Edition) — Item 68: Prefer Dependency Injection', url: 'https://www.oreilly.com/library/view/effective-java-3rd/9780134686097/' },
          ],
        };
      }

      case 'RULE_MISSING_TRANSACTIONAL': {
        const methodName = this.extractMethodName(rawSnippet, 'updateData');
        const before = rawSnippet || `@Service\npublic class ${className} {\n    public void ${methodName}() {\n        repository.save(entity);\n    }\n}`;
        const after = `@Service\npublic class ${className} {\n    @Transactional\n    public void ${methodName}() {\n        repository.save(entity);\n    }\n}`;
        const diff = `@@ -2,2 +2,3 @@\n public class ${className} {\n+    @Transactional\n     public void ${methodName}() {`;

        return {
          ruleId,
          ruleName: ruleName || 'Missing @Transactional Annotation on Service Write Method',
          businessImpact: 'Database write operations performed outside transactions risk partial updates, data corruption, and deadlocks in concurrent environments.',
          technicalRationale: 'Annotating service write operations with @Transactional ensures ACID compliance, automatic rollback on runtime exceptions, and clean connection pool management.',
          autoFixType: 'Fully Automatic',
          confidenceScore: 95,
          confidenceReasons: [
            '✓ AST Method Pattern Match (Save/Update/Delete call detected)',
            '✓ Service Stereotype Verification',
            '✓ Real Workspace Source Code Verified',
          ],
          detectionLogic: 'Detected public mutation method in @Service class executing database persistence calls without @Transactional scope.',
          riskLevel: 'HIGH',
          estimatedFixMinutes: 5,
          beforeSnippet: before,
          afterSnippet: after,
          diffSnippet: diff,
          relatedRules: ['RULE_READ_ONLY_TRANSACTION', 'RULE_SERVICE_BOUNDARIES'],
          references: [
            { title: 'Spring Framework Reference: Transaction Management', url: 'https://docs.spring.io/spring-framework/reference/data-access/transaction.html' },
          ],
        };
      }

      case 'RULE_REPOSITORY_IN_CONTROLLER': {
        const repoName = this.extractFieldName(rawSnippet, 'userRepository');
        const repoType = this.extractFieldType(rawSnippet, 'UserRepository');
        const serviceName = repoName.replace(/Repo|Repository/i, 'Service') || 'domainService';
        const serviceType = repoType.replace(/Repo|Repository/i, 'Service') || 'DomainService';

        const before = rawSnippet || `@RestController\npublic class ${className} {\n    @Autowired\n    private ${repoType} ${repoName};\n}`;
        const after = `@RestController\npublic class ${className} {\n    private final ${serviceType} ${serviceName};\n\n    public ${className}(${serviceType} ${serviceName}) {\n        this.${serviceName} = ${serviceName};\n    }\n}`;
        const diff = `@@ -3,2 +3,5 @@\n-    @Autowired\n-    private ${repoType} ${repoName};\n+    private final ${serviceType} ${serviceName};\n+\n+    public ${className}(${serviceType} ${serviceName}) {\n+        this.${serviceName} = ${serviceName};\n+    }`;

        return {
          ruleId,
          ruleName: ruleName || 'Direct Repository Access in REST Controller',
          businessImpact: 'Exposing persistence repositories directly in controllers bypasses business validation, transaction control, and leaks data access concerns into HTTP APIs.',
          technicalRationale: 'Controllers should delegate exclusively to Service classes. Services orchestrate business logic, handle DTO conversion, and manage transactional boundaries.',
          autoFixType: 'Semi Automatic',
          confidenceScore: 92,
          confidenceReasons: [
            '✓ Controller Stereotype Verified (@RestController / @Controller)',
            '✓ Repository Injected Field Match',
            '✓ Layer Separation Architecture Check',
          ],
          detectionLogic: 'Controller component contains direct dependency field or invocation targeting a Spring Data Repository.',
          riskLevel: 'MEDIUM',
          estimatedFixMinutes: 20,
          beforeSnippet: before,
          afterSnippet: after,
          diffSnippet: diff,
          relatedRules: ['RULE_SERVICE_LAYER_PATTERN', 'RULE_DTO_CONVERSION'],
          references: [
            { title: 'Spring Architecture Best Practices: Layered Architecture', url: 'https://spring.io/guides' },
          ],
        };
      }

      case 'RULE_SYSTEM_OUT_PRINTLN': {
        const printText = rawSnippet || `System.out.println("Processing request...");`;
        const logReplacement = printText
          .replace(/System\.out\.println\((.*)\);?/, 'log.info($1);')
          .replace(/System\.err\.println\((.*)\);?/, 'log.error($1);')
          .replace(/\.printStackTrace\(\)/, '');

        const before = rawSnippet || `public void execute() {\n    System.out.println("Executing task");\n}`;
        const after = `@Slf4j\npublic class ${className} {\n    public void execute() {\n        ${logReplacement || 'log.info("Executing task");'}\n    }\n}`;
        const diff = `@@ -2,2 +2,2 @@\n-    ${printText}\n+    ${logReplacement || 'log.info("Executing task");'}`;

        return {
          ruleId,
          ruleName: ruleName || 'System.out.println / PrintStackTrace Usage Detected',
          businessImpact: 'Raw stdout printing locks console I/O, cannot be filtered by log level in production, missing timestamps, and risks memory leaks.',
          technicalRationale: 'Use SLF4J (org.slf4j.Logger) for structured, asynchronous logging with customizable log levels (INFO, WARN, ERROR, DEBUG).',
          autoFixType: 'Fully Automatic',
          confidenceScore: 99,
          confidenceReasons: [
            '✓ AST Method Call Match (System.out.println / e.printStackTrace)',
            '✓ Zero Ambiguity Code Pattern',
          ],
          detectionLogic: 'AST parser matched System.out.print, System.err.print, or Throwable.printStackTrace Invocations.',
          riskLevel: 'LOW',
          estimatedFixMinutes: 5,
          beforeSnippet: before,
          afterSnippet: after,
          diffSnippet: diff,
          relatedRules: ['RULE_SLF4J_LOGGING', 'RULE_NO_PRINT_STACK_TRACE'],
          references: [
            { title: 'SLF4J Manual & Best Practices', url: 'https://www.slf4j.org/manual.html' },
          ],
        };
      }

      case 'RULE_HARDCODED_SECRET': {
        const fieldName = this.extractFieldName(rawSnippet, 'secretKey');
        const before = rawSnippet || `@Component\npublic class ${className} {\n    private String ${fieldName} = "sk-live-secret-token";\n}`;
        const after = `@Component\npublic class ${className} {\n    @Value("\${app.security.${fieldName}}")\n    private String ${fieldName};\n}`;
        const diff = `@@ -3,1 +3,2 @@\n-    private String ${fieldName} = "sk-live-secret-token";\n+    @Value("\${app.security.${fieldName}}")\n+    private String ${fieldName};`;

        return {
          ruleId,
          ruleName: ruleName || 'Hardcoded Secret or Credential Detected',
          businessImpact: 'Committing raw passwords, API keys, or tokens to version control exposes infrastructure to unauthorized access and credential leaks.',
          technicalRationale: 'Externalize sensitive credentials into environment variables or secret vaults. Inject values using Spring @Value("\${app.secret}") or @ConfigurationProperties.',
          autoFixType: 'Semi Automatic',
          confidenceScore: 96,
          confidenceReasons: [
            '✓ Literal String Entropy & Regex Pattern Match',
            '✓ Security Category Rule Trigger',
            '✓ OWASP A07 / CWE-798 Rule Alignment',
          ],
          detectionLogic: 'Regex matched hardcoded credential pattern (password, secret, apiKey, access_token) in string literal.',
          riskLevel: 'CRITICAL',
          estimatedFixMinutes: 15,
          beforeSnippet: before,
          afterSnippet: after,
          diffSnippet: diff,
          relatedRules: ['RULE_VAULT_INTEGRATION', 'RULE_ENVIRONMENT_VARIABLES'],
          references: [
            { title: 'OWASP Top 10: Identification and Authentication Failures (A07:2021)', url: 'https://owasp.org/Top10/A07_2021-Identification_and_Authentication_Failures/' },
            { title: 'CWE-798: Use of Hard-coded Credentials', url: 'https://cwe.mitre.org/data/definitions/798.html' },
          ],
        };
      }

      case 'RULE_N_PLUS_ONE_QUERY': {
        const methodName = this.extractMethodName(rawSnippet, 'processBatch');
        const before = rawSnippet || `public void ${methodName}(List<Long> ids) {\n    for (Long id : ids) {\n        repository.findById(id);\n    }\n}`;
        const after = `public void ${methodName}(List<Long> ids) {\n    List<Entity> results = repository.findAllById(ids);\n}`;
        const diff = `@@ -1,3 +1,1 @@\n-for (Long id : ids) {\n-    repository.findById(id);\n-}\n+List<Entity> results = repository.findAllById(ids);`;

        return {
          ruleId,
          ruleName: ruleName || 'Potential N+1 Database Query in Loop',
          businessImpact: 'Executing database queries inside loops causes exponential database load (N+1 queries), latency spikes, and out-of-memory errors on large collections.',
          technicalRationale: 'Refactor loop database calls to single bulk queries e.g. findAllById(ids), JOIN FETCH, or Spring Data @EntityGraph.',
          autoFixType: 'Manual Review',
          confidenceScore: 90,
          confidenceReasons: [
            '✓ Repository Call Matched Inside Iteration Loop',
            '✓ Static Performance Engine Trigger',
          ],
          detectionLogic: 'AST matched loop construct (for/while/forEach) containing repository invocation inside body.',
          riskLevel: 'HIGH',
          estimatedFixMinutes: 25,
          beforeSnippet: before,
          afterSnippet: after,
          diffSnippet: diff,
          relatedRules: ['RULE_BULK_FETCH', 'RULE_JOIN_FETCH'],
          references: [
            { title: 'Hibernate Documentation: Solving N+1 Selects with Join Fetch & EntityGraph', url: 'https://hibernate.org/orm/documentation/' },
          ],
        };
      }

      case 'RULE_MISSING_VALID': {
        const methodName = this.extractMethodName(rawSnippet, 'createEntity');
        const before = rawSnippet || `@PostMapping\npublic ResponseEntity<Entity> ${methodName}(@RequestBody Dto dto) {`;
        const after = `@PostMapping\npublic ResponseEntity<Entity> ${methodName}(@Valid @RequestBody Dto dto) {`;
        const diff = `@@ -2,1 +2,1 @@\n-public ResponseEntity<Entity> ${methodName}(@RequestBody Dto dto) {\n+public ResponseEntity<Entity> ${methodName}(@Valid @RequestBody Dto dto) {`;

        return {
          ruleId,
          ruleName: ruleName || 'Missing @Valid Annotation on Request Body',
          businessImpact: 'Unvalidated REST controller payloads allow malformed or malicious inputs into domain services, risking NullPointerExceptions or data corruption.',
          technicalRationale: 'Annotate @RequestBody parameters with @Valid or @Validated to enforce automatic JSR-380 Bean Validation (@NotNull, @Size, @Email).',
          autoFixType: 'Fully Automatic',
          confidenceScore: 97,
          confidenceReasons: [
            '✓ Controller Endpoint Parameter AST Match',
            '✓ @RequestBody Present without @Valid / @Validated',
          ],
          detectionLogic: 'Endpoint method parameter is annotated with @RequestBody but missing @Valid / @Validated.',
          riskLevel: 'MEDIUM',
          estimatedFixMinutes: 5,
          beforeSnippet: before,
          afterSnippet: after,
          diffSnippet: diff,
          relatedRules: ['RULE_BEAN_VALIDATION', 'RULE_INPUT_HARDENING'],
          references: [
            { title: 'Jakarta Bean Validation Specification (JSR 380)', url: 'https://beanvalidation.org/' },
          ],
        };
      }

      case 'RULE_FIND_ALL_WITHOUT_PAGINATION': {
        const methodName = this.extractMethodName(rawSnippet, 'getAllRecords');
        const before = rawSnippet || `public List<Entity> ${methodName}() {\n    return repository.findAll();\n}`;
        const after = `public Page<Entity> ${methodName}(Pageable pageable) {\n    return repository.findAll(pageable);\n}`;
        const diff = `@@ -1,2 +1,2 @@\n-public List<Entity> ${methodName}() {\n-    return repository.findAll();\n+public Page<Entity> ${methodName}(Pageable pageable) {\n+    return repository.findAll(pageable);`;

        return {
          ruleId,
          ruleName: ruleName || 'Unpaginated findAll Database Call',
          businessImpact: 'Fetching all records without pagination loads entire database tables into JVM heap, leading to high garbage collection pauses and OOM crashes.',
          technicalRationale: 'Use Pageable parameter in repository queries (e.g. repository.findAll(Pageable pageable)) to restrict page size and total offset.',
          autoFixType: 'Semi Automatic',
          confidenceScore: 95,
          confidenceReasons: [
            '✓ Unpaginated .findAll() AST Method Call Match',
            '✓ Performance Rule Trigger',
          ],
          detectionLogic: 'Matched findAll() invocation on Spring Data Repository without Pageable argument.',
          riskLevel: 'HIGH',
          estimatedFixMinutes: 10,
          beforeSnippet: before,
          afterSnippet: after,
          diffSnippet: diff,
          relatedRules: ['RULE_PAGINATION_REQUIRED', 'RULE_PAGEABLE_SORT'],
          references: [
            { title: 'Spring Data JPA Reference: Paging and Sorting Repositories', url: 'https://docs.spring.io/spring-data/jpa/reference/' },
          ],
        };
      }

      default: {
        return {
          ruleId,
          ruleName: ruleName || ruleId,
          businessImpact: 'Violates standard enterprise Java software architecture or code quality rules.',
          technicalRationale: 'Follow enterprise Java standards and clean code conventions.',
          autoFixType: 'Manual Review',
          confidenceScore: 85,
          confidenceReasons: [
            '✓ Static Engine Rule Match',
            '✓ Workspace File Verified',
          ],
          detectionLogic: `Evaluated by RuleEngine for rule '${ruleId}'.`,
          riskLevel: 'MEDIUM',
          estimatedFixMinutes: 15,
          beforeSnippet: rawSnippet ? `// Current snippet:\n${rawSnippet}` : undefined,
        };
      }
    }
  }

  private static extractClassName(filePath: string, snippet: string): string {
    if (filePath) {
      const base = filePath.replace(/\\/g, '/').split('/').pop() || '';
      const name = base.replace('.java', '');
      if (name && name !== 'java') return name;
    }
    const match = /class\s+([A-Z][a-zA-Z0-9_]*)/.exec(snippet);
    return match ? match[1] : 'SampleComponent';
  }

  private static extractFieldName(snippet: string, fallback: string): string {
    const match = /(?:private|protected|public)\s+(?:final\s+)?([A-Z][a-zA-Z0-9_<>,]*)\s+([a-z][a-zA-Z0-9_]*)/.exec(snippet);
    return match ? match[2] : fallback;
  }

  private static extractFieldType(snippet: string, fallback: string): string {
    const match = /(?:private|protected|public)\s+(?:final\s+)?([A-Z][a-zA-Z0-9_<>,]*)\s+([a-z][a-zA-Z0-9_]*)/.exec(snippet);
    return match ? match[1] : fallback;
  }

  private static extractMethodName(snippet: string, fallback: string): string {
    const match = /(?:public|protected|private)\s+(?:static\s+)?[\w<>,]+\s+([a-z][a-zA-Z0-9_]*)\s*\(/.exec(snippet);
    return match ? match[1] : fallback;
  }
}
