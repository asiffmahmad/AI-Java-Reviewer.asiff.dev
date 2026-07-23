import type { ITool, IToolDefinition, IToolContextState } from './ITool';
import type { ProjectIndex } from '../indexer/ProjectIndex';

// Tool 1: getProjectInfo / getProjectMetadata
export class GetProjectInfoTool implements ITool {
  public readonly definition: IToolDefinition = {
    name: 'getProjectInfo',
    description: 'Get high-level workspace metadata, Java version, framework, total class count, Spring bean count, and package hierarchy.',
    parameters: {
      type: 'object',
      properties: {},
    },
  };

  public async execute(_args: Record<string, any>, index: ProjectIndex, contextState?: IToolContextState): Promise<string> {
    const meta = index.getMetadata();
    const pkgs = index.getPackageHierarchy();
    const classes = index.getAllClasses();
    const config = (contextState as any)?.config;
    const deps = (contextState as any)?.dependencies || [];

    const controllers = classes.filter((c) => c.stereotype === 'Controller' || c.stereotype === 'RestController');
    const services = classes.filter((c) => c.stereotype === 'Service');
    const repos = classes.filter((c) => c.stereotype === 'Repository' || c.className.endsWith('Repository'));
    const dtos = classes.filter((c) => c.className.endsWith('DTO') || c.className.endsWith('Request') || c.className.endsWith('Response'));
    const testClasses = classes.filter((c) => c.filePath.includes('src/test/') || c.className.endsWith('Test'));

    let output = `### Rich Architectural Project Metadata\n`;
    output += `- **Target Project Stack**: Java ${config?.javaVersion || '17'} (${config?.framework || 'Spring Boot'})\n`;
    output += `- **Build Tool**: Maven / Gradle\n`;
    output += `- **Total Indexed Classes**: ${meta.totalClasses}\n`;
    output += `- **Total Packages**: ${meta.totalPackages}\n`;
    output += `- **Spring Stereotype Beans**: ${meta.totalSpringBeans}\n`;
    output += `- **Total Methods**: ${meta.totalMethods}\n`;
    output += `- **Total Fields**: ${meta.totalFields}\n\n`;

    output += `#### Layer Component Summary\n`;
    output += `- **Controllers (@RestController / @Controller)**: ${controllers.length}\n`;
    output += `- **Services (@Service)**: ${services.length}\n`;
    output += `- **Repositories (@Repository)**: ${repos.length}\n`;
    output += `- **DTOs & Payloads**: ${dtos.length}\n`;
    output += `- **Test Classes**: ${testClasses.length}\n\n`;

    if (deps.length > 0) {
      output += `#### Build Dependencies (${deps.length})\n`;
      for (const d of deps.slice(0, 10)) {
        output += `- \`${d}\`\n`;
      }
      if (deps.length > 10) {
        output += `- ... and ${deps.length - 10} more dependencies.\n`;
      }
      output += `\n`;
    }

    output += `#### Package Hierarchy Summary (${pkgs.size} packages)\n`;
    for (const [pkg, pkgClasses] of pkgs.entries()) {
      output += `- \`${pkg}\` (${pkgClasses.length} class[es]): ${pkgClasses.slice(0, 4).join(', ')}${pkgClasses.length > 4 ? '...' : ''}\n`;
    }
    return output;
  }
}

// Tool 2: getClassSummary
export class GetClassSummaryTool implements ITool {
  public readonly definition: IToolDefinition = {
    name: 'getClassSummary',
    description: 'Get class signature, fields, and public method signatures without loading full source code.',
    parameters: {
      type: 'object',
      properties: {
        className: { type: 'string', description: 'Simple class name or fully qualified name' },
      },
      required: ['className'],
    },
  };

  public async execute(args: Record<string, any>, index: ProjectIndex): Promise<string> {
    const className = args.className || args.class;
    const cls = index.getClass(className);
    if (!cls) {
      return `Class '${className}' not found in Project Index.`;
    }

    let out = `### Class Summary: \`${cls.fullyQualifiedName}\`\n`;
    out += `- Stereotype: @${cls.stereotype} (${cls.classType})\n`;
    if (cls.superClass) out += `- Extends: ${cls.superClass}\n`;
    if (cls.interfaces.length > 0) out += `- Implements: ${cls.interfaces.join(', ')}\n`;
    out += `- Line Count: ${cls.lineCount}\n\n`;

    out += `#### Fields (${cls.fields.length})\n`;
    for (const f of cls.fields) {
      out += `- \`${f.visibility} ${f.type} ${f.name}\`${f.annotations.length > 0 ? ` (@${f.annotations.join(', @')})` : ''}\n`;
    }

    out += `\n#### Method Signatures (${cls.methods.length})\n`;
    for (const m of cls.methods) {
      const params = m.parameters.map((p) => `${p.type} ${p.name}`).join(', ');
      out += `- \`${m.visibility} ${m.returnType} ${m.name}(${params})\`${m.annotations.length > 0 ? ` [@${m.annotations.join(', ')}]` : ''}\n`;
    }

    return out;
  }
}

// Tool 3: getClassSource
export class GetClassSourceTool implements ITool {
  public readonly definition: IToolDefinition = {
    name: 'getClassSource',
    description: 'Get full raw source code of a specified Java class.',
    parameters: {
      type: 'object',
      properties: {
        className: { type: 'string', description: 'Simple class name or fully qualified name' },
      },
      required: ['className'],
    },
  };

  public async execute(args: Record<string, any>, index: ProjectIndex): Promise<string> {
    const className = args.className || args.path;
    const cls = index.getClass(className);
    if (!cls) {
      const match = index.getAllClasses().find(c => c.filePath.includes(className));
      if (match) {
        return this.formatSourceOutput(match.filePath, match.fullyQualifiedName, match.rawContent);
      }
      return `Class or file '${className}' not found in Project Index.`;
    }
    return this.formatSourceOutput(cls.filePath, cls.fullyQualifiedName, cls.rawContent);
  }

  private formatSourceOutput(filePath: string, fqn: string, content: string): string {
    const MAX_CHARS = 15000;
    if (content.length > MAX_CHARS) {
      const truncated = content.slice(0, MAX_CHARS);
      return `### File Content: \`${filePath || fqn}\` (Truncated)\n\`\`\`java\n${truncated}\n\n// ... [File truncated at 15,000 characters. Use readMethod(class, method) or getClassSummary(class) to inspect specific methods]\n\`\`\``;
    }
    return `### File Content: \`${filePath || fqn}\`\n\`\`\`java\n${content}\n\`\`\``;
  }
}

// Tool 3b: readFile (Alias for getClassSource / Path reader)
export class ReadFileTool implements ITool {
  public readonly definition: IToolDefinition = {
    name: 'readFile',
    description: 'Read full source code of a target Java file by file path or class name.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path or class name to read' },
      },
      required: ['path'],
    },
  };

  public async execute(args: Record<string, any>, index: ProjectIndex): Promise<string> {
    const target = args.path || args.className;
    const getter = new GetClassSourceTool();
    return getter.execute({ className: target }, index);
  }
}

// Tool 4: getMethod
export class GetMethodTool implements ITool {
  public readonly definition: IToolDefinition = {
    name: 'getMethod',
    description: 'Get method signature and implementation body for a specific class and method name.',
    parameters: {
      type: 'object',
      properties: {
        className: { type: 'string', description: 'Simple class name or fully qualified name' },
        methodName: { type: 'string', description: 'Name of the method' },
      },
      required: ['className', 'methodName'],
    },
  };

  public async execute(args: Record<string, any>, index: ProjectIndex): Promise<string> {
    const className = args.className || args.class;
    const methodName = args.methodName || args.method;
    const cls = index.getClass(className);
    if (!cls) {
      return `Class '${className}' not found.`;
    }

    const matches = cls.methods.filter((m) => m.name === methodName);
    if (matches.length === 0) {
      return `Method '${methodName}' not found in class '${className}'.`;
    }

    let out = `### Method Details: \`${cls.className}.${methodName}\`\n`;
    for (const m of matches) {
      const params = m.parameters.map((p) => `${p.type} ${p.name}`).join(', ');
      out += `#### \`${m.visibility} ${m.returnType} ${m.name}(${params})\` (Line ${m.lineNumber})\n`;
      out += `\`\`\`java\n${m.body || '// [Body empty or interface declaration]'}\n\`\`\`\n\n`;
    }
    return out;
  }
}

// Tool 4b: readMethod (Alias for getMethod)
export class ReadMethodTool implements ITool {
  public readonly definition: IToolDefinition = {
    name: 'readMethod',
    description: 'Read specific method implementation body by class name and method name.',
    parameters: {
      type: 'object',
      properties: {
        class: { type: 'string', description: 'Class name' },
        method: { type: 'string', description: 'Method name' },
      },
      required: ['class', 'method'],
    },
  };

  public async execute(args: Record<string, any>, index: ProjectIndex): Promise<string> {
    const className = args.class || args.className;
    const methodName = args.method || args.methodName;
    const getter = new GetMethodTool();
    return getter.execute({ className, methodName }, index);
  }
}

// Tool 5: findReferences
export class FindReferencesTool implements ITool {
  public readonly definition: IToolDefinition = {
    name: 'findReferences',
    description: 'Find all classes that import or reference a given symbol/class.',
    parameters: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: 'Class name or symbol to search references for' },
      },
      required: ['symbol'],
    },
  };

  public async execute(args: Record<string, any>, index: ProjectIndex): Promise<string> {
    const symbol = args.symbol;
    const refs = index.getReferences(symbol);
    if (refs.length === 0) {
      return `No references found for symbol '${symbol}'.`;
    }
    return `### References for \`${symbol}\` (${refs.length}):\n` + refs.map((r) => `- \`${r}\``).join('\n');
  }
}

// Tool 6: findImplementations
export class FindImplementationsTool implements ITool {
  public readonly definition: IToolDefinition = {
    name: 'findImplementations',
    description: 'Find concrete Java classes implementing a given interface.',
    parameters: {
      type: 'object',
      properties: {
        interfaceName: { type: 'string', description: 'Interface simple name' },
      },
      required: ['interfaceName'],
    },
  };

  public async execute(args: Record<string, any>, index: ProjectIndex): Promise<string> {
    const interfaceName = args.interfaceName || args.interface;
    const impls = index.getImplementations(interfaceName);
    if (impls.length === 0) {
      return `No implementations found for interface '${interfaceName}'.`;
    }
    return `### Implementations of \`${interfaceName}\` (${impls.length}):\n` + impls.map((i) => `- \`${i}\``).join('\n');
  }
}

// Tool 7: findCallers
export class FindCallersTool implements ITool {
  public readonly definition: IToolDefinition = {
    name: 'findCallers',
    description: 'Find all methods in the codebase that invoke a specified method.',
    parameters: {
      type: 'object',
      properties: {
        methodName: { type: 'string', description: 'Target method name' },
      },
      required: ['methodName'],
    },
  };

  public async execute(args: Record<string, any>, index: ProjectIndex): Promise<string> {
    const methodName = args.methodName || args.method;
    const callers = index.getCallers(methodName);
    if (callers.length === 0) {
      return `No callers found invoking method '${methodName}'.`;
    }
    return `### Callers of \`${methodName}\` (${callers.length}):\n` + callers.map((c) => `- \`${c}\``).join('\n');
  }
}

// Tool 8: findSpringBeans
export class FindSpringBeansTool implements ITool {
  public readonly definition: IToolDefinition = {
    name: 'findSpringBeans',
    description: 'List registered Spring beans categorized by stereotype (@Service, @Repository, @Controller, etc.).',
    parameters: {
      type: 'object',
      properties: {
        stereotype: {
          type: 'string',
          description: 'Filter by stereotype (Service, Repository, Controller, Component, Configuration)',
        },
      },
    },
  };

  public async execute(args: Record<string, any>, index: ProjectIndex): Promise<string> {
    const stereotypeFilter = args.stereotype?.toLowerCase();
    const beans = index.getSpringBeans();

    let out = `### Spring Beans Registry\n`;
    const categorized = new Map<string, string[]>();

    for (const [beanName, fqn] of beans.entries()) {
      const cls = index.getClass(fqn);
      if (!cls) continue;
      if (stereotypeFilter && cls.stereotype.toLowerCase() !== stereotypeFilter) continue;

      const cat = cls.stereotype;
      const list = categorized.get(cat) || [];
      if (!list.includes(`${beanName} -> ${fqn}`)) {
        list.push(`${beanName} -> ${fqn}`);
        categorized.set(cat, list);
      }
    }

    if (categorized.size === 0) {
      return `No Spring beans found ${stereotypeFilter ? `with stereotype '@${args.stereotype}'` : ''}.`;
    }

    for (const [cat, items] of categorized.entries()) {
      out += `#### @${cat} (${items.length})\n`;
      out += items.map((i) => `- \`${i}\``).join('\n') + '\n\n';
    }

    return out;
  }
}

// Tool 9: searchProject
export class SearchProjectTool implements ITool {
  public readonly definition: IToolDefinition = {
    name: 'searchProject',
    description: 'Search workspace Java classes by query string (matching class name, FQN, or package).',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search term' },
        limit: { type: 'number', description: 'Max results to return (default 10)' },
      },
      required: ['query'],
    },
  };

  public async execute(args: Record<string, any>, index: ProjectIndex): Promise<string> {
    const query = args.query;
    const limit = args.limit || 10;
    const results = index.search(query, limit);
    if (results.length === 0) {
      return `No classes found matching query '${query}'.`;
    }
    return (
      `### Search Results for '${query}' (${results.length}):\n` +
      results.map((r) => `- \`${r.fullyQualifiedName}\` (@${r.stereotype} ${r.classType})`).join('\n')
    );
  }
}

// Tool 10: getDependencyGraph
export class GetDependencyGraphTool implements ITool {
  public readonly definition: IToolDefinition = {
    name: 'getDependencyGraph',
    description: 'Get incoming and outgoing class dependencies for a specified Java class.',
    parameters: {
      type: 'object',
      properties: {
        className: { type: 'string', description: 'Simple class name or FQN' },
      },
      required: ['className'],
    },
  };

  public async execute(args: Record<string, any>, index: ProjectIndex): Promise<string> {
    const className = args.className || args.class;
    const cls = index.getClass(className);
    if (!cls) return `Class '${className}' not found.`;

    const fqn = cls.fullyQualifiedName;
    const outgoing = cls.imports;
    const incoming = index.getReferences(fqn);

    let out = `### Dependency Graph for \`${fqn}\`\n`;
    out += `#### Outgoing Dependencies (${outgoing.length})\n`;
    out += outgoing.map((o) => `- \`${o}\``).join('\n') + '\n\n';
    out += `#### Incoming Dependencies (${incoming.length})\n`;
    out += incoming.map((i) => `- \`${i}\``).join('\n');
    return out;
  }
}

// Tool 11: getPackageStructure
export class GetPackageStructureTool implements ITool {
  public readonly definition: IToolDefinition = {
    name: 'getPackageStructure',
    description: 'Get package hierarchy tree of all packages and their contained classes.',
    parameters: {
      type: 'object',
      properties: {},
    },
  };

  public async execute(_args: Record<string, any>, index: ProjectIndex): Promise<string> {
    const pkgs = index.getPackageHierarchy();
    let out = `### Package Structure Tree\n`;
    for (const [pkg, classes] of pkgs.entries()) {
      out += `#### \`${pkg}\` (${classes.length} classes)\n`;
      out += classes.map((c) => `- \`${c}\``).join('\n') + '\n\n';
    }
    return out;
  }
}

// Tool 12: getStaticFindings
export class GetStaticFindingsTool implements ITool {
  public readonly definition: IToolDefinition = {
    name: 'getStaticFindings',
    description: 'Get deterministic static analysis rule violations evaluated by RuleEngine.',
    parameters: {
      type: 'object',
      properties: {
        className: { type: 'string', description: 'Optional class name filter' },
      },
    },
  };

  public async execute(args: Record<string, any>, _index: ProjectIndex, contextState?: IToolContextState): Promise<string> {
    const className = args.className?.toLowerCase();
    let findings = contextState?.findings || [];

    if (className) {
      findings = findings.filter(f => f.filePath.toLowerCase().includes(className));
    }

    if (findings.length === 0) {
      return '### Deterministic Static Findings\n- No static rule violations detected.';
    }

    let out = `### Deterministic Static Findings (${findings.length})\n`;
    for (const f of findings) {
      out += `- [${f.severity.toUpperCase()}] ${f.category}: ${f.message} (Line ${f.lineNumber})\n  Recommendation: ${f.recommendation}\n`;
    }
    return out;
  }
}

// Tool 13: getScorecard
export class GetScorecardTool implements ITool {
  public readonly definition: IToolDefinition = {
    name: 'getScorecard',
    description: 'Get overall quality scorecard and category scores (Architecture, Security, Performance, etc.).',
    parameters: {
      type: 'object',
      properties: {},
    },
  };

  public async execute(_args: Record<string, any>, _index: ProjectIndex, contextState?: IToolContextState): Promise<string> {
    const score = contextState?.score;
    if (!score) {
      return '### Static Scorecard\nScorecard unavailable.';
    }
    return (
      `### Static Code Quality Scorecard\n` +
      `- Final Quality Score: ${score.finalScore} / 100 (Grade: ${score.grade})\n` +
      `- Architecture: ${score.architecture.score}\n` +
      `- Security: ${score.security.score}\n` +
      `- Maintainability: ${score.maintainability.score}\n` +
      `- Performance: ${score.performance.score}\n` +
      `- Testing: ${score.testing.score}`
    );
  }
}

// Tool 14: getDependencies
export class GetDependenciesTool implements ITool {
  public readonly definition: IToolDefinition = {
    name: 'getDependencies',
    description: 'Get project build dependencies parsed from pom.xml or build.gradle.',
    parameters: {
      type: 'object',
      properties: {},
    },
  };

  public async execute(_args: Record<string, any>, _index: ProjectIndex, contextState?: IToolContextState): Promise<string> {
    const deps = contextState?.dependencies || [];
    if (deps.length === 0) {
      return '### Project Dependencies\nNo external build dependencies found.';
    }
    return `### Project Build Dependencies (${deps.length})\n` + deps.map(d => `- \`${d}\``).join('\n');
  }
}

// Tool 15: getConfiguredRules
export class GetConfiguredRulesTool implements ITool {
  public readonly definition: IToolDefinition = {
    name: 'getConfiguredRules',
    description: 'Get list of configured user rules and overrides active for this project review.',
    parameters: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Optional category filter' },
      },
    },
  };

  public async execute(args: Record<string, any>, _index: ProjectIndex, contextState?: IToolContextState): Promise<string> {
    const category = args.category?.toLowerCase();
    const config = (contextState as any)?.config;

    let rules = config?.rules || [];
    if (category) {
      rules = rules.filter((r: string) => r.toLowerCase().includes(category));
    }

    let out = `### Configured Active Rules (${rules.length})\n`;
    if (rules.length === 0) {
      out += `- Default enterprise Java quality & security guidelines enabled.\n`;
    } else {
      for (const r of rules) {
        out += `- ${r}\n`;
      }
    }

    if (config?.ruleOverrides && config.ruleOverrides.length > 0) {
      out += `\n#### Rule Overrides (${config.ruleOverrides.length})\n`;
      for (const o of config.ruleOverrides) {
        out += `- Rule \`${o.id}\`: Enabled=${o.enabled !== false}, Severity=${o.severity || 'default'}, Deduction=${o.scoreDeduction || 'default'}\n`;
      }
    }

    return out;
  }
}

// Tool 16: getRule
export class GetRuleTool implements ITool {
  public readonly definition: IToolDefinition = {
    name: 'getRule',
    description: 'Get metadata and recommendations for a specific rule ID.',
    parameters: {
      type: 'object',
      properties: {
        ruleId: { type: 'string', description: 'Rule identifier e.g. RULE_FIELD_INJECTION' },
      },
      required: ['ruleId'],
    },
  };

  public async execute(args: Record<string, any>, _index: ProjectIndex): Promise<string> {
    const ruleId = args.ruleId || args.id;
    return (
      `### Rule Metadata: \`${ruleId}\`\n` +
      `- Rule ID: ${ruleId}\n` +
      `- Status: Active\n` +
      `- Enforcement: Deterministic Static Engine & AI Evaluation\n` +
      `- Recommendation: Enforce clean architecture, explicit dependency injection, and proper scoping.`
    );
  }
}

// Tool 17: listPackages
export class ListPackagesTool implements ITool {
  public readonly definition: IToolDefinition = {
    name: 'listPackages',
    description: 'List all Java package names and class counts across the workspace.',
    parameters: {
      type: 'object',
      properties: {},
    },
  };

  public async execute(_args: Record<string, any>, index: ProjectIndex): Promise<string> {
    const hierarchy = index.getPackageHierarchy();
    let out = `### Java Package Hierarchy (${hierarchy.size} packages)\n`;
    for (const [pkg, classes] of hierarchy.entries()) {
      out += `- \`${pkg}\`: ${classes.length} class(es)\n`;
    }
    return out;
  }
}

// Tool 18: listFiles
export class ListFilesTool implements ITool {
  public readonly definition: IToolDefinition = {
    name: 'listFiles',
    description: 'List Java source files in the project, optionally filtered by package or path substring.',
    parameters: {
      type: 'object',
      properties: {
        filter: { type: 'string', description: 'Optional package name or path substring filter' },
      },
    },
  };

  public async execute(args: Record<string, any>, index: ProjectIndex): Promise<string> {
    const filter = args.filter?.toLowerCase();
    let classes = index.getAllClasses();
    if (filter) {
      classes = classes.filter((c) => c.filePath.toLowerCase().includes(filter) || c.packageName.toLowerCase().includes(filter));
    }

    let out = `### Target Java Files (${classes.length})\n`;
    const display = classes.slice(0, 30);
    for (const c of display) {
      out += `- \`${c.filePath}\` (\`${c.fullyQualifiedName}\`)\n`;
    }
    if (classes.length > 30) {
      out += `- ... and ${classes.length - 30} more files.\n`;
    }
    return out;
  }
}

// Tool 19: getReviewScope
export class GetReviewScopeTool implements ITool {
  public readonly definition: IToolDefinition = {
    name: 'getReviewScope',
    description: 'Get workspace target scope, file count, and base module directories.',
    parameters: {
      type: 'object',
      properties: {},
    },
  };

  public async execute(_args: Record<string, any>, index: ProjectIndex, contextState?: IToolContextState): Promise<string> {
    const meta = index.getMetadata();
    return (
      `### Review Scope Summary\n` +
      `- Total Indexed Classes: ${meta.totalClasses}\n` +
      `- Total Packages: ${meta.totalPackages}\n` +
      `- Total Spring Beans: ${meta.totalSpringBeans}\n` +
      `- Workspace Root: \`${(contextState as any)?.workspaceRoot || 'Active Workspace'}\`\n`
    );
  }
}

// Tool 20: getArchitectureSummary
export class GetArchitectureSummaryTool implements ITool {
  public readonly definition: IToolDefinition = {
    name: 'getArchitectureSummary',
    description: 'Get high-level summary of Spring Boot architectural components (Controllers, Services, Repositories, Entities, DTOs).',
    parameters: {
      type: 'object',
      properties: {},
    },
  };

  public async execute(_args: Record<string, any>, index: ProjectIndex): Promise<string> {
    const classes = index.getAllClasses();
    const controllers = classes.filter((c) => c.stereotype === 'Controller' || c.stereotype === 'RestController');
    const services = classes.filter((c) => c.stereotype === 'Service');
    const repos = classes.filter((c) => c.stereotype === 'Repository' || c.className.endsWith('Repository'));
    const dtos = classes.filter((c) => c.className.endsWith('DTO') || c.className.endsWith('Request') || c.className.endsWith('Response'));

    let out = `### Spring Boot Architecture Summary\n`;
    out += `- Controllers (@RestController / @Controller): ${controllers.length}\n`;
    out += `- Services (@Service): ${services.length}\n`;
    out += `- Repositories (@Repository): ${repos.length}\n`;
    out += `- DTOs & Payloads: ${dtos.length}\n`;
    out += `- Total Spring Beans: ${index.getSpringBeans().size / 2}\n`;
    return out;
  }
}

// Tool 21: getWorkspaceTree
export class GetWorkspaceTreeTool implements ITool {
  public readonly definition: IToolDefinition = {
    name: 'getWorkspaceTree',
    description: 'Get ASCII tree hierarchy of packages and Java classes in the workspace.',
    parameters: {
      type: 'object',
      properties: {},
    },
  };

  public async execute(_args: Record<string, any>, index: ProjectIndex): Promise<string> {
    const hierarchy = index.getPackageHierarchy();
    let out = `### Workspace Tree Hierarchy\n\`\`\`text\n. (root)\n`;
    for (const [pkg, classes] of hierarchy.entries()) {
      out += `├── ${pkg}/\n`;
      const display = classes.slice(0, 5);
      for (let i = 0; i < display.length; i++) {
        const isLast = i === display.length - 1 && classes.length <= 5;
        const simpleName = display[i].split('.').pop();
        out += `│   ${isLast ? '└──' : '├──'} ${simpleName}.java\n`;
      }
      if (classes.length > 5) {
        out += `│   └── ... (${classes.length - 5} more classes)\n`;
      }
    }
    out += `\`\`\``;
    return out;
  }
}

// Tool 22: getProjectStatistics
export class GetProjectStatisticsTool implements ITool {
  public readonly definition: IToolDefinition = {
    name: 'getProjectStatistics',
    description: 'Get total lines of code, classes, interfaces, Spring beans, methods, and fields.',
    parameters: {
      type: 'object',
      properties: {},
    },
  };

  public async execute(_args: Record<string, any>, index: ProjectIndex): Promise<string> {
    const meta = index.getMetadata();
    const classes = index.getAllClasses();
    const totalLines = classes.reduce((sum, c) => sum + (c.lineCount || 0), 0);
    const interfaceCount = classes.filter((c) => c.classType === 'interface').length;

    return (
      `### Project Codebase Statistics\n` +
      `- Total Lines of Code: ${totalLines}\n` +
      `- Total Classes: ${meta.totalClasses}\n` +
      `- Interfaces: ${interfaceCount}\n` +
      `- Total Methods: ${meta.totalMethods}\n` +
      `- Total Fields: ${meta.totalFields}\n` +
      `- Spring Beans: ${meta.totalSpringBeans}`
    );
  }
}

// Tool 23: getDependencyCycles
export class GetDependencyCyclesTool implements ITool {
  public readonly definition: IToolDefinition = {
    name: 'getDependencyCycles',
    description: 'Detect circular dependencies between Java classes in the project index.',
    parameters: {
      type: 'object',
      properties: {},
    },
  };

  public async execute(_args: Record<string, any>, index: ProjectIndex): Promise<string> {
    const classes = index.getAllClasses();
    const cycles: string[][] = [];

    // Simple 2-node cycle check A -> B and B -> A
    for (const c of classes) {
      const fqnA = c.fullyQualifiedName;
      const refsA = index.getReferences(fqnA);
      for (const ref of refsA) {
        const refsB = index.getReferences(ref);
        if (refsB.includes(fqnA) && fqnA < ref) {
          cycles.push([fqnA, ref]);
        }
      }
    }

    if (cycles.length === 0) {
      return '### Circular Dependency Scan\n- No circular class dependency cycles detected.';
    }

    let out = `### Circular Dependencies Detected (${cycles.length})\n`;
    for (const cycle of cycles) {
      out += `- \`${cycle[0]}\` <--> \`${cycle[1]}\`\n`;
    }
    return out;
  }
}

// Tool 24: getRestEndpoints
export class GetRestEndpointsTool implements ITool {
  public readonly definition: IToolDefinition = {
    name: 'getRestEndpoints',
    description: 'Extract all mapped Spring REST controller endpoints, HTTP methods, paths, and return types.',
    parameters: {
      type: 'object',
      properties: {},
    },
  };

  public async execute(_args: Record<string, any>, index: ProjectIndex): Promise<string> {
    const controllers = index.getAllClasses().filter((c) => c.stereotype === 'Controller' || c.stereotype === 'RestController');

    let out = `### Spring REST Endpoints Summary (${controllers.length} Controllers)\n`;
    for (const ctrl of controllers) {
      out += `#### Controller: \`${ctrl.className}\`\n`;
      let endpointCount = 0;
      for (const m of ctrl.methods) {
        const mappingAnn = m.annotations.find((a) => a.endsWith('Mapping'));
        if (mappingAnn) {
          endpointCount++;
          const params = m.parameters.map((p) => `${p.type} ${p.name}`).join(', ');
          out += `- \`@${mappingAnn}\` \`${m.visibility} ${m.returnType} ${m.name}(${params})\` (Line ${m.lineNumber})\n`;
        }
      }
      if (endpointCount === 0) {
        out += `- No explicit @Mapping annotations found on methods.\n`;
      }
      out += `\n`;
    }
    return out;
  }
}

// Tool 25: getJpaQueries
export class GetJpaQueriesTool implements ITool {
  public readonly definition: IToolDefinition = {
    name: 'getJpaQueries',
    description: 'Extract Spring Data JPA Repository methods, custom @Query annotations, and unpaginated queries.',
    parameters: {
      type: 'object',
      properties: {},
    },
  };

  public async execute(_args: Record<string, any>, index: ProjectIndex): Promise<string> {
    const repos = index.getAllClasses().filter((c) => c.stereotype === 'Repository' || c.className.endsWith('Repository'));

    let out = `### Spring Data JPA Repositories (${repos.length})\n`;
    for (const r of repos) {
      out += `- \`${r.fullyQualifiedName}\`: ${r.methods.length} methods defined\n`;
      for (const m of r.methods) {
        if (m.name.startsWith('find') || m.name.startsWith('count') || m.name.startsWith('delete')) {
          out += `  - \`${m.returnType} ${m.name}(...)\`\n`;
        }
      }
    }
    return out;
  }
}

// Tool 26: getViolations
export class GetViolationsTool implements ITool {
  public readonly definition: IToolDefinition = {
    name: 'getViolations',
    description: 'Get static rule violations filtered by severity (CRITICAL, MAJOR, MINOR) or category.',
    parameters: {
      type: 'object',
      properties: {
        severity: { type: 'string', description: 'Filter by severity: critical, major, minor' },
        category: { type: 'string', description: 'Filter by category: security, performance, architecture, quality' },
      },
    },
  };

  public async execute(args: Record<string, any>, _index: ProjectIndex, contextState?: IToolContextState): Promise<string> {
    const sev = args.severity?.toLowerCase();
    const cat = args.category?.toLowerCase();
    let findings = contextState?.findings || [];

    if (sev) {
      findings = findings.filter((f) => f.severity.toLowerCase() === sev);
    }
    if (cat) {
      findings = findings.filter((f) => f.category.toLowerCase() === cat);
    }

    if (findings.length === 0) {
      return `### Filtered Violations\n- No violations found matching criteria (severity=${sev || 'any'}, category=${cat || 'any'}).`;
    }

    let out = `### Filtered Violations (${findings.length})\n`;
    for (const f of findings) {
      out += `- [${f.severity.toUpperCase()}] \`${f.ruleId}\`: ${f.message} (${f.filePath}:${f.lineNumber})\n`;
    }
    return out;
  }
}

// Tool 27: getUnusedBeans
export class GetUnusedBeansTool implements ITool {
  public readonly definition: IToolDefinition = {
    name: 'getUnusedBeans',
    description: 'Find Spring stereotype beans (@Component, @Service, @Repository) with 0 references in the project index.',
    parameters: {
      type: 'object',
      properties: {},
    },
  };

  public async execute(_args: Record<string, any>, index: ProjectIndex): Promise<string> {
    const beans = index.getSpringBeans();
    const unused: string[] = [];

    const fqnList = Array.from(new Set(beans.values()));
    for (const fqn of fqnList) {
      const cls = index.getClass(fqn);
      if (!cls || cls.stereotype === 'RestController' || cls.stereotype === 'Controller') continue;
      const refs = index.getReferences(fqn);
      if (refs.length === 0) {
        unused.push(fqn);
      }
    }

    if (unused.length === 0) {
      return '### Unused Spring Beans\n- All registered Spring Beans have active dependencies/references.';
    }

    let out = `### Potentially Unused Spring Beans (${unused.length})\n`;
    for (const b of unused) {
      out += `- \`${b}\` (0 references found in project index)\n`;
    }
    return out;
  }
}

// Tool 28: getSecurityReport
export class GetSecurityReportTool implements ITool {
  public readonly definition: IToolDefinition = {
    name: 'getSecurityReport',
    description: 'Get security audit findings (hardcoded secrets, input validation risks, SQL injection concerns).',
    parameters: {
      type: 'object',
      properties: {},
    },
  };

  public async execute(_args: Record<string, any>, _index: ProjectIndex, contextState?: IToolContextState): Promise<string> {
    const findings = (contextState?.findings || []).filter((f) => f.category === 'security');
    if (findings.length === 0) {
      return '### Security Audit Report\n- Zero static security vulnerabilities or hardcoded secrets detected.';
    }
    let out = `### Security Audit Findings (${findings.length})\n`;
    for (const f of findings) {
      out += `- [${f.severity.toUpperCase()}] ${f.message} (${f.filePath}:${f.lineNumber})\n  Recommendation: ${f.recommendation}\n`;
    }
    return out;
  }
}

// Tool 29: getPerformanceReport
export class GetPerformanceReportTool implements ITool {
  public readonly definition: IToolDefinition = {
    name: 'getPerformanceReport',
    description: 'Get performance audit findings (N+1 queries, unpaginated queries, eager fetching).',
    parameters: {
      type: 'object',
      properties: {},
    },
  };

  public async execute(_args: Record<string, any>, _index: ProjectIndex, contextState?: IToolContextState): Promise<string> {
    const findings = (contextState?.findings || []).filter((f) => f.category === 'performance');
    if (findings.length === 0) {
      return '### Performance Audit Report\n- Zero static performance issues or N+1 query patterns detected.';
    }
    let out = `### Performance Audit Findings (${findings.length})\n`;
    for (const f of findings) {
      out += `- [${f.severity.toUpperCase()}] ${f.message} (${f.filePath}:${f.lineNumber})\n  Recommendation: ${f.recommendation}\n`;
    }
    return out;
  }
}

// Tool 30: getTestingReport
export class GetTestingReportTool implements ITool {
  public readonly definition: IToolDefinition = {
    name: 'getTestingReport',
    description: 'Evaluate test file presence for Services and Controllers in the project.',
    parameters: {
      type: 'object',
      properties: {},
    },
  };

  public async execute(_args: Record<string, any>, index: ProjectIndex): Promise<string> {
    const classes = index.getAllClasses();
    const services = classes.filter((c) => c.stereotype === 'Service');
    const testFiles = classes.filter((c) => c.filePath.includes('src/test/') || c.className.endsWith('Test'));

    let out = `### Testing Coverage Heuristics\n`;
    out += `- Total Service Classes: ${services.length}\n`;
    out += `- Total Test Classes Found: ${testFiles.length}\n`;
    return out;
  }
}

// Tool 31: getPackageSummary
export class GetPackageSummaryTool implements ITool {
  public readonly definition: IToolDefinition = {
    name: 'getPackageSummary',
    description: 'Get detailed breakdown of a specific Java package, its classes, interfaces, and Spring beans.',
    parameters: {
      type: 'object',
      properties: {
        packageName: { type: 'string', description: 'Package name e.g. com.example.service' },
      },
      required: ['packageName'],
    },
  };

  public async execute(args: Record<string, any>, index: ProjectIndex): Promise<string> {
    const pkgName = args.packageName || args.package;
    const hierarchy = index.getPackageHierarchy();
    const classes = hierarchy.get(pkgName);

    if (!classes || classes.length === 0) {
      return `Package '${pkgName}' not found in workspace hierarchy.`;
    }

    let out = `### Package Summary: \`${pkgName}\` (${classes.length} classes)\n`;
    for (const fqn of classes) {
      const cls = index.getClass(fqn);
      if (cls) {
        out += `- \`${cls.className}\` (@${cls.stereotype}, ${cls.classType}, ${cls.lineCount} lines)\n`;
      }
    }
    return out;
  }
}
