import * as assert from 'assert';
import { PromptGenerator } from '../../../ai/PromptGenerator';
import type { IJavaClass, IFinding, IProjectScore, ICategoryScore } from '../../../models';

describe('PromptGenerator', () => {
  const generator = new PromptGenerator();

  const emptyCategory: ICategoryScore = {
    category: 'test',
    score: 100,
    maxScore: 100,
    percentage: 100,
    deductions: []
  };

  const mockScore: IProjectScore = {
    architecture: emptyCategory,
    security: emptyCategory,
    performance: emptyCategory,
    maintainability: emptyCategory,
    testing: emptyCategory,
    finalScore: 100,
    grade: 'A'
  };

  it('generates a formatted prompt including findings and code', () => {
    const classes: IJavaClass[] = [{
      className: 'Test',
      filePath: '/Test.java',
      rawContent: 'public class Test {}',
      packageName: '',
      fullyQualifiedName: 'Test',
      classType: 'class',
      stereotype: 'none',
      annotations: [],
      fields: [],
      methods: [],
      interfaces: [],
      imports: [],
      lineCount: 1
    }];
    const deps = ['org.springframework.boot:spring-boot-starter-web'];
    const findings: IFinding[] = [{
      ruleId: 'TEST',
      ruleName: 'Test',
      severity: 'major',
      category: 'architecture',
      message: 'A test finding',
      recommendation: 'Fix it',
      filePath: '/Test.java',
      lineNumber: 1,
      scoreDeduction: 10
    }];

    const mockConfig = {
      systemPrompt: 'You are an expert enterprise Java software architect and reviewer.',
      taskPrompt: 'Based on the provided source code, dependencies, and deterministic findings:\\n1. Summarize the overall quality of the code.\\n2. Elaborate on the deterministic findings if necessary.\\n3. Point out any OTHER design flaws, logic bugs, or security vulnerabilities not caught by the deterministic rules.\\n4. Provide actionable recommendations.'
    } as any;

    const prompt = generator.generate(classes, deps, findings, mockScore, mockConfig);

    assert.ok(prompt.includes('A test finding'));
    assert.ok(prompt.includes('Fix it'));
    assert.ok(prompt.includes('public class Test {}'));
    assert.ok(prompt.includes('spring-boot-starter-web'));
    assert.ok(prompt.includes('Grade: A'));
    assert.ok(prompt.includes('You are an expert'));
  });

  it('handles empty inputs gracefully', () => {
    const mockConfig = { systemPrompt: 'System Prompt', taskPrompt: 'Task Prompt' } as any;
    const prompt = generator.generate([], [], [], mockScore, mockConfig);
    assert.ok(prompt.includes('No deterministic issues found.'));
    assert.ok(prompt.includes('No relevant dependencies found.'));
  });

  it('respects maxContextChars configuration by truncating large input files', () => {
    const classes: IJavaClass[] = [
      {
        className: 'ClassA',
        filePath: '/ClassA.java',
        rawContent: 'A'.repeat(500),
        packageName: '',
        fullyQualifiedName: 'ClassA',
        classType: 'class',
        stereotype: 'none',
        annotations: [],
        fields: [],
        methods: [],
        interfaces: [],
        imports: [],
        lineCount: 10
      },
      {
        className: 'ClassB',
        filePath: '/ClassB.java',
        rawContent: 'B'.repeat(500),
        packageName: '',
        fullyQualifiedName: 'ClassB',
        classType: 'class',
        stereotype: 'none',
        annotations: [],
        fields: [],
        methods: [],
        interfaces: [],
        imports: [],
        lineCount: 10
      }
    ];

    const mockConfig = {
      systemPrompt: 'System Prompt',
      taskPrompt: 'Task Prompt',
      maxContextChars: 600
    } as any;

    const prompt = generator.generate(classes, [], [], mockScore, mockConfig);
    assert.ok(prompt.includes('ClassA.java'));
    assert.ok(prompt.includes('omitted to fit within maxContextChars limit'));
  });
});
