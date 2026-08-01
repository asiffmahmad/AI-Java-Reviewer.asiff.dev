import * as fs from 'fs';
import * as path from 'path';
import type { IJavaClass, IFinding, IProjectScore } from '../models';
import type { IReviewConfig } from '../configuration/ReviewConfig';
import { PromptValidator } from './PromptValidator';

export class PromptGenerator {
  /**
   * Generates a clean, highly structured prompt for the LLM using the company's
   * authoritative Java_Code_Review_Agent.md instructions.
   */
  public generate(
    classes: IJavaClass[],
    dependencies: string[],
    findings: IFinding[],
    score: IProjectScore,
    config: IReviewConfig,
    mrDetails?: { mrUrl?: string; isCatalogServices?: boolean; impactedFiles?: Array<{ filePath: string; status: string; lineRanges: string[] }>; rawDiff?: string },
    workspaceRoot?: string
  ): string {
    const stages: string[] = [];

    // Header
    stages.push(`# AI Java Reviewer — Senior Code Reviewer Prompt\n`);

    // 1. Company Authoritative Review Agent Prompt (from .agents/Java_Code_Review_Agent.md or built-in copy)
    const agentPromptText = this.loadCompanyAgentPrompt(workspaceRoot, mrDetails);
    stages.push(agentPromptText);

    // 2. Target Scope & File Details
    const scopeCtx = this.buildSpecializedScopeContext(classes);
    if (scopeCtx) {
      stages.push(scopeCtx);
    }

    // 3. Impacted Files & Line Ranges Scope (for MR/PR review)
    if (mrDetails?.impactedFiles && mrDetails.impactedFiles.length > 0) {
      stages.push(this.buildImpactedFilesScope(mrDetails.impactedFiles));
    }

    // 4. Project & Build Context
    stages.push(this.buildProjectContext(classes, dependencies, config));

    // 5. Deterministic Static Engine Findings
    stages.push(this.buildFindingsBlock(findings));

    // 6. Scorecard Baseline
    stages.push(this.buildScorecardBlock(score));

    // 7. Potentially Unused / Unreferenced Files Analysis
    const unusedFiles = this.detectUnusedClasses(classes);
    if (unusedFiles.length > 0) {
      let unusedBlock = '## Potentially Unused / Unreferenced Files\n';
      unusedBlock += 'The static analyzer identified the following Java files that have no references or imports from other classes in the project context:\n';
      unusedFiles.forEach(u => {
        unusedBlock += `- \`${u.relPath}\` (${u.packageName ? u.packageName + '.' : ''}${u.className}) — No imports or references detected across other workspace files.\n`;
      });
      stages.push(unusedBlock.trim());
    }

    // 8. Raw Diff Hunks or Source Files
    if (mrDetails?.rawDiff) {
      stages.push(`## Unified Git Diff / Patch\n\`\`\`diff\n${mrDetails.rawDiff}\n\`\`\``);
    }
    // Default smart context window budget (~24k chars / ~6k tokens) to prevent token bloat
    stages.push(this.buildSourceFilesBlock(classes, findings, config.maxContextChars ?? 24000, mrDetails));

    const rawPrompt = stages.join('\n\n');
    return PromptValidator.validateAndSanitize(rawPrompt);
  }

  private loadCompanyAgentPrompt(workspaceRoot?: string, mrDetails?: { mrUrl?: string }): string {
    let rawText = '';
    // Attempt to load workspace rule files (.reviewai-rules.md, .agents/rules.md)
    if (workspaceRoot) {
      const candidates = [
        path.join(workspaceRoot, '.reviewai-rules.md'),
        path.join(workspaceRoot, '.agents', 'rules.md'),
        path.join(workspaceRoot, '.agents', 'Java_Code_Review_Agent.md'),
      ];
      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
          try {
            rawText = fs.readFileSync(candidate, 'utf-8');
            if (rawText.trim()) break;
          } catch {
            // continue fallback
          }
        }
      }
    }

    if (!rawText) {
      rawText = this.getBuiltInCompanyPrompt();
    }

    // Strip hardcoded sample MR URL block if present
    rawText = rawText.replace(/---\s*MR\s*\/\s*PR\s*GIT\s*URL:\s*---[\s\S]*$/i, '').trim();

    // If MR URL is provided, append the actual MR URL
    if (mrDetails?.mrUrl) {
      rawText += `\n\n---\nMR / PR GIT URL:\n---\n${mrDetails.mrUrl}`;
    }

    // Token optimization: Compress excessive blank lines and repetitive whitespace
    return rawText
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]+/g, ' ')
      .trim();
  }

  private getBuiltInCompanyPrompt(): string {
    let prompt = `You are a senior software engineer and meticulous code reviewer. You are an expert in modern Java and the common backend stacks used in this organization (e.g. Spring Boot + Spring Data JPA, or Play Framework + Akka + Ebean), plus general clean-architecture, security, and concurrency best practices.

---
REVIEW WORKFLOW (follow in order)
---
1. Inspect the provided files and diff hunks.
2. DETECT THE CONTEXT before reviewing:
   * Language(s), build tool, and framework/stack (e.g. Spring Boot + JPA, Play + Akka + Ebean, Quarkus, plain Java, etc.).
   * The project's EXISTING layered architecture and conventions.
   * Apply the checklist using the project's own conventions as the baseline.
3. Identify all IMPACTED FILES:
   * NEW files -> review the ENTIRE content of the file.
   * MODIFIED files -> review ONLY the impacted (added/changed) lines listed in the captured ranges, plus minimal surrounding context. Do NOT report issues on unchanged pre-existing lines unless a changed line breaks them.
4. Apply the checklist below to every in-scope file/line.

---
REVIEW CHECKLIST
---

### 1. ARCHITECTURE & LAYERING (respect the project's existing structure – do not deviate)
* Is the project's layered flow respected end to end? (Spring: Controller -> Service -> Repository -> DB. Play/Akka: Controller -> Actor -> UseCase -> Gateway -> Ebean/DB.)
* No business logic in controllers; no direct DB access from controllers, actors, processors, writers, or listeners – those must go through the Service layer.
* Repositories/DAOs contain data-access queries ONLY – no business logic and no computed helper methods; move any method implementation/logic out of the repository into the Service.
* Do repository/DAO interfaces carry the project's stereotype annotation (@Repository) where the convention requires it?
* Entity/model classes hold state and mapping ONLY – no business logic (e.g. no isTopNode()-style decision methods); move such logic to the Service.
* Mappers map field-to-field ONLY – no DB access and no computation. Compute in the Service and pass the result into the mapper.
* Do NOT hand-write object-to-object conversion inside processors/services/controllers (e.g. a private dtoToModel() / modelToDto() that copies fields one-by-one) – delete it and use the project's mapper layer (MapStruct/dedicated Mapper).
* Do not return projections when the entity/model can be returned; return the model to the service and map only the needed fields into the DTO there. Delete unnecessary projection classes.
* Put each query in the repository that owns that table/entity.
* Processors/handlers must not return persistence entities as their result – return a dedicated Result/DTO.
* Deduplicate identical helper methods across classes.

### 2. MODERN JAVA
* Are records used instead of plain POJOs/DTOs where applicable?
* Are immutable value/row/holder classes converted to records instead of using @Builder on a mutable class?
* Are sealed classes/interfaces used for closed type hierarchies?
* Is pattern-matching instanceof used (no redundant manual casts)?
* Are switch expressions (arrow syntax) used instead of switch statements?
* Are text blocks used for multiline strings (SQL, JSON, HTML)?
* Is local variable type inference (var) used where it improves readability?
* Are redundant boxing/unboxing conversions avoided?
* Do NOT reimplement standard library/framework utilities (StringUtils.hasText, Objects.requireNonNullElse).
* Remove redundant explicit null checks that guard a call to an already null-safe utility.

### 3. NAMING & PACKAGE STRUCTURE
* Do class/method/variable names follow Java conventions (*Request, *Response, *Service, *Repository, *Model)?
* Are ALL DTO/model fields camelCase (never PascalCase/UpperCamel like IsGCFOrder, OrderNumber)? Audit EVERY DTO.
* Do variable names reflect their CURRENT type/content after a refactor?
* Do entity/model classes carry the project's entity suffix AND match their DB table name (e.g. XxumoPsQueueVModel)?
* Do repository names reflect the entity/table they serve (full-table-name convention)?
* Are packages named for their real contents (e.g. SQS payloads in 'message' package)?
* Are DB columns UPPER_SNAKE_CASE in @Column and mapped to correctly-typed fields?

### 4. DATA ACCESS / ORM / DATABASE
* Are queries built with the project's standard data-access API (Spring Data derived queries / @Query; Ebean finder API)?
* Is a single-result API used for single results (findOne() / Optional) instead of findList().get(0)?
* Are transactions correctly bounded (declarative @Transactional with rollbackFor)?
* Are N+1 problems avoided (fetch/join; select only needed columns)?
* Are raw/native queries fully parameterized (never string concatenation)? Flag SQL-injection risk.
* Is pagination used for large result sets? Guard empty IN () clauses.
* Do new tables/models have audit columns (createdBy/createdDate/modifiedBy/modifiedDate)?
* Length check and truncation before persisting into narrower columns (e.g. SUBSTR at DB level or StringUtils.left in code).
* Replace repeated repository.save(entity) calls on JPA repository with native write queries for SYSDATE consistency.
* Correct key types end to end (numeric IMS/order numbers passed as numeric types, not String).
* For core/domain DTOs, verify FIELD COMPLETENESS against source model/table/contract.
* LEGACY XML -> JSON MIGRATION: verify EVERY piece of data that legacy consumers depended on is preserved.
* Use ONE consistent DB current-time function across all queries on a table/column.
* Never derive "current time" from LocalDate/LocalDateTime.now() – use shared getCurrentDateTime(zoneId) utility.
* DB SCRIPT PLACEMENT: Verify new DB scripts live in the CORRECT release folder for this MR's target release.

### 5. VALIDATION
* Request objects declare field-level validation (@NotNull, @NotBlank, @Size, @Pattern, @Email).
* Validation failures surfaced consistently at controller boundary (@Valid).

### 6. SECURITY
* All endpoints explicitly authorized. Untrusted input validated and bounded.
* Sensitive fields (passwords, tokens, PII) kept out of logs and responses.
* SQL/command injection risks flagged.
* Secrets read from Secret Manager at runtime, NOT hardcoded in Java or properties.

### 7. EXCEPTION HANDLING & LOGGING
* Exceptions caught at right layer (not silently swallowed).
* Logger called with exception OBJECT as last argument (logger.error("msg", e)).
* Type casts guarded with instanceof.
* Entry methods guarded against NULL domain inputs before dereferencing.
* Try-with-resources used for all AutoCloseable resources.
* Parameterized log messages (no string concatenation).
* Audit/history records persisted ONLY AFTER governing DB transaction commits.
* Preserve thread interrupt state on InterruptedException (Thread.currentThread().interrupt()).
* In batch/loop processing, catch per-item failures locally so one failing item does not abort the whole batch.

### 8. ASYNC / PERFORMANCE / CACHING
* Non-blocking request flows where stack expects it.
* Avoid blocking .get()/join calls or supply timeouts.
* Avoid DB calls inside loops.
* Render/compute expensive artifacts ONCE and reuse. Skip expensive work when output is unused.
* Reused singletons for template engines, ObjectMapper, HTTP client.
* Distributed cache (Redis) with declarative @Cacheable(..., sync = true) to prevent cache stampede.
* Scope mutable state per-execution (no static ConcurrentHashMap cleared across parallel runs).

### 9. MESSAGING / QUEUES (SQS / Kafka)
* Deterministic deduplication ID (derived from business keys, SHA-256 hashed) for FIFO queues.
* Shared client created via project's shared configuration.
* Request system attributes (ApproximateReceiveCount) when reading receive counts.
* IDEMPOTENT REDELIVERY (poison-safety): treat redelivery of already-processed items as successful no-op (ACK).

### 10. CODE QUALITY
* Single Responsibility Principle followed per class/method. Refactor methods >30-40 lines.
* Magic numbers/strings replaced with named constants/enums.
* Do NOT embed default values for externalized config in code (@Value("\${x:default}")). Let startup fail if missing.
* Remove dead/commented code, unused methods, fields, parameters, and imports.
* Consolidate near-duplicate helper methods into single parameterized helper.
* Container-managed beans used instead of 'new' for components requiring DI.

### 12. REPORT / TEMPLATE GENERATION
* RAW SOCKET PRINTING THROUGHPUT: flag manual chunking + Thread.sleep() throttling on port-9100 socket writes.

### 13. PROJECT REVIEW RULES FROM PRIOR REVIEW COMMENTS
* TRACEABILITY & LOGGING: Every method MUST emit a start log.
* SECRETS & CONFIG: Store keys in properties files, read at runtime. No inline property defaults.
* TIMEZONE / DATE-TIME: Replace LocalDateTime/LocalDate.now() with shared getCurrentDateTime(timeZoneId).
* MAPPERS / CONVERSION: Delete hand-written conversion methods (dtoToModel()); mappers map field-to-field only.
* ENTITY / MODEL NAMING: Must append 'Model' suffix AND match DB table name.
* PROCESSOR / LAYERING: Do NOT return persistence model as result payload – return dedicated Result object.
* REPOSITORY OWNERSHIP: Put each query in the repository that owns that table/entity.
* SQS / MESSAGING: Centralized SQS config, deterministic deduplication ID, idempotent redelivery ACK.
* DTO NAMING & COMPLETENESS: All DTO fields camelCase; audit every DTO field completeness against DB table.

---
OUTPUT FORMAT
---

Start with an IMPACTED FILES section. For MODIFIED files, append line ranges:
* NEW (full review):
  <file>
* MODIFIED (impacted lines only):
  <file> <line-ranges>
* DELETED / RENAMED:
  <file>

Then, for each issue found, use one line in this exact format:
🔴 CRITICAL | <file>:<line> | <issue> | <fix>
🔴 MAJOR    | <file>:<line> | <issue> | <fix>
🟡 MINOR    | <file>:<line> | <issue> | <fix>
🔵 SUGGESTION | <file>:<line> | <modern/idiomatic alternative for the detected stack>

Rules:
* For MODIFIED files, review ONLY impacted lines. Every reported <line> MUST fall within one of the changed line ranges listed for that file in the IMPACTED FILES section. Do not comment on unchanged lines.
* For NEW files, any line is in scope.
* If an in-scope file/range has no issues, state so explicitly.

Then provide:
* SUMMARY – overall code-health score (1–10 or 1-100) with a one-line justification.
* LIST ALL PRIORITY FIXES – the highest-impact items to address first.
* MODERNISATION OPPORTUNITIES – modern/idiomatic patterns for the detected stack.`;

    return prompt;
  }

  private buildSpecializedScopeContext(classes: IJavaClass[]): string | null {
    if (classes.length !== 1) return null;
    const c = classes[0];
    const relPath = this.sanitizeFilePath(c.filePath);
    let ctx = '## Target File Details\n';
    ctx += `- Target File: ${relPath}\n`;
    if (c.packageName) ctx += `- Package: ${c.packageName}\n`;
    if (c.className) ctx += `- Class: ${c.className} (${c.classType || 'class'})\n`;
    if (c.stereotype && c.stereotype !== 'none') ctx += `- Stereotype: @${c.stereotype}\n`;

    if (c.methods && c.methods.length > 0) {
      const methodList = c.methods.slice(0, 10).map(m => `${m.name}()`).join(', ');
      ctx += `- Methods (${c.methods.length}): ${methodList}${c.methods.length > 10 ? '...' : ''}\n`;
    }
    return ctx.trim();
  }

  private buildImpactedFilesScope(files: Array<{ filePath: string; status: string; lineRanges: string[] }>): string {
    let block = '--- IMPACTED FILES & LINE RANGES ---\n';
    files.forEach(f => {
      if (f.status === 'NEW') {
        block += `* NEW (full review):\n  ${f.filePath}\n`;
      } else if (f.status === 'MODIFIED') {
        block += `* MODIFIED (impacted lines only):\n  ${f.filePath} ${f.lineRanges.join(', ')}\n`;
      } else {
        block += `* ${f.status}:\n  ${f.filePath}\n`;
      }
    });
    return block.trim();
  }



  private buildProjectContext(classes: IJavaClass[], dependencies: string[], config: IReviewConfig): string {
    const javaVersion = config.javaVersion || '17';
    const framework = config.framework || 'spring-boot';
    const buildTool = this.detectBuildTool(dependencies);

    let ctx = '## Project Context\n';
    ctx += `- Language: Java ${javaVersion}\n`;
    ctx += `- Framework: ${framework}\n`;
    ctx += `- Build Tool: ${buildTool}\n`;
    ctx += `- Files in Context: ${classes.length}\n`;

    if (config.rules) {
      ctx += '\n## Custom Organizational Rules (.reviewai.yml)\n';
      if (Array.isArray(config.rules)) {
        config.rules.forEach(r => ctx += `- ${r}\n`);
      } else if (typeof config.rules === 'object') {
        for (const [cat, rList] of Object.entries(config.rules)) {
          ctx += `### ${cat}\n`;
          if (Array.isArray(rList)) {
            rList.forEach(r => ctx += `- ${r}\n`);
          }
        }
      }
    }

    ctx += '\n' + this.buildDependenciesBlock(dependencies);
    return ctx;
  }

  private buildDependenciesBlock(dependencies: string[]): string {
    let block = '## Dependencies\n';
    if (!dependencies || dependencies.length === 0) {
      return block + 'No relevant dependencies found.';
    }
    const uniqueDeps = Array.from(new Set(dependencies));
    return block + uniqueDeps.map(d => `- ${d}`).join('\n');
  }

  private buildFindingsBlock(findings: IFinding[]): string {
    let block = '## Existing Rule Violations (Deterministic Engine)\n';
    if (!findings || findings.length === 0) {
      block += '- No deterministic issues found.';
      return block;
    }
    const lines = findings.map(f => `- [${f.severity.toUpperCase()}] ${this.sanitizeFilePath(f.filePath)}:${f.lineNumber} | ${f.ruleId || f.category} | ${f.message}${f.recommendation ? ` | Rec: ${f.recommendation}` : ''}`);
    return block + lines.join('\n');
  }

  private buildScorecardBlock(score: IProjectScore): string {
    return '## Scorecard Baseline\n' +
      `- Final Quality Score: ${score.finalScore} / 100 (Grade: ${score.grade})`;
  }

  private buildSourceFilesBlock(
    classes: IJavaClass[],
    findings: IFinding[],
    maxChars: number,
    mrDetails?: { impactedFiles?: Array<{ filePath: string; status: string; lineRanges: string[] }> }
  ): string {
    let block = '## In-Scope Target File Paths\n';
    block += 'Read and inspect the source code directly from these relative file paths using available discovery tools (readFile, getClassSource, getMethod, etc.):\n\n';
    if (!classes || classes.length === 0) return block + 'No source file paths provided.';

    // 1. Filter MR files if MR review mode
    let targetClasses = classes;
    if (mrDetails?.impactedFiles && mrDetails.impactedFiles.length > 0) {
      const impactedPaths = mrDetails.impactedFiles.map(f => f.filePath.replace(/\\/g, '/'));
      targetClasses = classes.filter(c => {
        const rel = this.sanitizeFilePath(c.filePath);
        return impactedPaths.some(ip => ip.endsWith(rel) || rel.endsWith(ip));
      });
      if (targetClasses.length === 0) targetClasses = classes;
    }

    // 2. Sort classes to prioritize files with static findings and Spring component annotations
    const findingFilePaths = new Set(findings.map(f => this.sanitizeFilePath(f.filePath)));
    const prioritizedClasses = [...targetClasses].sort((a, b) => {
      const aPath = this.sanitizeFilePath(a.filePath);
      const bPath = this.sanitizeFilePath(b.filePath);
      const aHasFinding = findingFilePaths.has(aPath) ? 1 : 0;
      const bHasFinding = findingFilePaths.has(bPath) ? 1 : 0;
      if (aHasFinding !== bHasFinding) return bHasFinding - aHasFinding;

      const aIsSpring = (a.stereotype && a.stereotype !== 'none') || a.annotations?.length > 0 ? 1 : 0;
      const bIsSpring = (b.stereotype && b.stereotype !== 'none') || b.annotations?.length > 0 ? 1 : 0;
      return bIsSpring - aIsSpring;
    });

    let accumulatedChars = 0;
    for (let i = 0; i < prioritizedClasses.length; i++) {
      const c = prioritizedClasses[i];
      const relPath = this.sanitizeFilePath(c.filePath);
      const lineEntry = `- \`${relPath}\` | Class: ${c.className || 'N/A'} (${c.classType || 'class'}) | Stereo: @${c.stereotype || 'none'}${c.packageName ? ` | Pkg: ${c.packageName}` : ''}\n`;

      if (accumulatedChars + lineEntry.length > maxChars) {
        const omittedCount = prioritizedClasses.length - i;
        block += `*(Additional ${omittedCount} source file path${omittedCount > 1 ? 's' : ''} omitted to fit within maxContextChars limit of ${maxChars} characters)*\n`;
        break;
      }
      block += lineEntry;
      accumulatedChars += lineEntry.length;
    }
    return block.trim();
  }

  private detectUnusedClasses(classes: IJavaClass[]): Array<{ className: string; relPath: string; packageName: string }> {
    if (classes.length <= 1) return [];
    const unused: Array<{ className: string; relPath: string; packageName: string }> = [];

    for (const target of classes) {
      if (!target.className) continue;

      const isEntrypoint =
        target.rawContent.includes('public static void main') ||
        target.annotations?.some(a => ['SpringBootApplication', 'Controller', 'RestController', 'Configuration', 'Component', 'Service', 'Repository'].includes(a)) ||
        ['Controller', 'RestController', 'Configuration', 'Component', 'Service', 'Repository'].includes(target.stereotype);

      if (isEntrypoint) continue;

      const isReferenced = classes.some(other => {
        if (other === target) return false;
        return (
          other.imports?.includes(target.className) ||
          other.imports?.includes(target.fullyQualifiedName) ||
          other.superClass === target.className ||
          other.interfaces?.includes(target.className) ||
          other.rawContent.includes(target.className)
        );
      });

      if (!isReferenced) {
        unused.push({
          className: target.className,
          relPath: this.sanitizeFilePath(target.filePath),
          packageName: target.packageName,
        });
      }
    }

    return unused;
  }

  private detectBuildTool(dependencies: string[]): string {
    if (!dependencies || dependencies.length === 0) return 'Maven / Gradle';
    return dependencies.some(d => d.includes('implementation') || d.includes('api')) ? 'Gradle' : 'Maven';
  }

  private sanitizeFilePath(filePath: string): string {
    if (!filePath) return '';
    let clean = filePath.replace(/\\/g, '/');
    const srcIdx = clean.toLowerCase().indexOf('src/');
    if (srcIdx !== -1) return clean.slice(srcIdx);
    return clean;
  }

}
