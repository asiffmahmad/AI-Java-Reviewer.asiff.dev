import type { IJavaParser } from './IJavaParser';
import type {
  IJavaClass,
  ClassType,
  SpringStereotype,
  IJavaField,
  IJavaMethod,
  IJavaParameter,
  InjectionType,
  Visibility,
} from '../models';

export class RegexJavaParser implements IJavaParser {
  public parse(rawContent: string, filePath: string): IJavaClass | undefined {
    // Basic sanitisation: remove block comments and normalise line endings
    const noComments = this.removeComments(rawContent);
    const lines = rawContent.split(/\r?\n/);
    const lineCount = lines.length;

    const packageName = this.extractPackage(noComments);
    const imports = this.extractImports(noComments);

    const classMeta = this.extractClassMeta(noComments);
    if (!classMeta) {
      return undefined; // Not a parseable class/interface
    }

    const annotations = this.extractClassAnnotations(noComments, classMeta.startIndex);
    const stereotype = this.inferStereotype(annotations);

    const fields = this.extractFields(noComments, lines);
    const methods = this.extractMethods(noComments);

    return {
      filePath,
      packageName,
      className: classMeta.className,
      fullyQualifiedName: packageName ? `${packageName}.${classMeta.className}` : classMeta.className,
      classType: classMeta.classType,
      stereotype,
      annotations,
      fields,
      methods,
      imports,
      superClass: classMeta.superClass,
      interfaces: classMeta.interfaces,
      lineCount,
      rawContent,
    };
  }

  // ── Pre-processing ──────────────────────────────────────────────────────────

  private removeComments(source: string): string {
    // Removes block comments /* ... */ and line comments // ...
    // Caveat: might strip things inside strings, but for our heuristic needs, this is acceptable.
    return source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
  }

  // ── Package & Imports ───────────────────────────────────────────────────────

  private extractPackage(source: string): string {
    const match = /^\s*package\s+([a-zA-Z0-9_.]+)\s*;/m.exec(source);
    return match ? match[1] : '';
  }

  private extractImports(source: string): string[] {
    const imports: string[] = [];
    const regex = /^\s*import\s+(?:static\s+)?([a-zA-Z0-9_.]+)\s*(?:\.\*)?\s*;/gm;
    let match;
    while ((match = regex.exec(source)) !== null) {
      const parts = match[1].split('.');
      imports.push(parts[parts.length - 1]);
    }
    return imports;
  }

  // ── Class Metadata ──────────────────────────────────────────────────────────

  private extractClassMeta(source: string): {
    className: string;
    classType: ClassType;
    superClass?: string;
    interfaces: string[];
    startIndex: number;
  } | undefined {
    // Matches: public abstract class MyClass<T> extends Base implements I1, I2 {
    const regex = /(?:public|protected|private|abstract|final|static|\s)*\b(class|interface|enum|record)\s+([a-zA-Z0-9_]+)(?:\s*<[^>]*>)?(?:\s+extends\s+([a-zA-Z0-9_<>,.?\s]+))?(?:\s+implements\s+([a-zA-Z0-9_<>,.?\s]+))?\s*\{/g;
    const match = regex.exec(source);
    if (!match) { return undefined; }

    const classType = match[1] as ClassType;
    const className = match[2];
    const extendsClause = match[3] ? match[3].split('<')[0].trim() : undefined;
    const implementsClause = match[4]
      ? match[4].split(',').map(s => s.split('<')[0].trim())
      : [];

    return {
      className,
      classType,
      superClass: extendsClause,
      interfaces: implementsClause,
      startIndex: match.index,
    };
  }

  private extractClassAnnotations(source: string, classStartIndex: number): string[] {
    const preamble = source.substring(0, classStartIndex);
    const annotations: string[] = [];
    const regex = /@([a-zA-Z0-9_]+)/g;
    let match;
    while ((match = regex.exec(preamble)) !== null) {
      annotations.push(match[1]);
    }
    return annotations;
  }

  private inferStereotype(annotations: string[]): SpringStereotype {
    if (annotations.includes('RestController')) { return 'RestController'; }
    if (annotations.includes('Controller')) { return 'Controller'; }
    if (annotations.includes('Service')) { return 'Service'; }
    if (annotations.includes('Repository')) { return 'Repository'; }
    if (annotations.includes('Component')) { return 'Component'; }
    if (annotations.includes('Configuration')) { return 'Configuration'; }
    return 'none';
  }

  // ── Fields ──────────────────────────────────────────────────────────────────

  private extractFields(source: string, originalLines: string[]): IJavaField[] {
    const fields: IJavaField[] = [];
    // A simplified regex for fields. Look for visibility, type, name, semicolon.
    // Skips fields initialized with complex expressions by looking only up to = or ;
    const regex = /^\s*(?:(@[a-zA-Z0-9_]+(?:\([^)]*\))?)\s*)*(private|protected|public|package)\s+(?:(static|final)\s+)*(?:(static|final)\s+)*([a-zA-Z0-9_<>?[\]]+)\s+([a-zA-Z0-9_]+)\s*(?:=|;)/gm;
    
    let match;
    while ((match = regex.exec(source)) !== null) {
      // Exclude method declarations that somehow matched
      if (match[0].includes('(') && !match[0].includes('@')) {
        continue;
      }

      const rawMatch = match[0];
      const visibility = match[2] as Visibility;
      const mod1 = match[3];
      const mod2 = match[4];
      const type = match[5];
      const name = match[6];
      
      const isStatic = mod1 === 'static' || mod2 === 'static';
      const isFinal = mod1 === 'final' || mod2 === 'final';

      // Extract annotations that were captured in the rawMatch
      const annotations: string[] = [];
      const annRegex = /@([a-zA-Z0-9_]+)/g;
      let annMatch;
      while ((annMatch = annRegex.exec(rawMatch)) !== null) {
        annotations.push(annMatch[1]);
      }

      let injectionType: InjectionType = 'none';
      if (annotations.includes('Autowired') || annotations.includes('Inject') || annotations.includes('Value')) {
        injectionType = 'field';
      }

      const lineNumber = this.getLineNumber(match.index, source);
      const rawSource = originalLines[lineNumber - 1] || rawMatch.trim();

      fields.push({
        name,
        type,
        annotations,
        injectionType,
        visibility,
        isStatic,
        isFinal,
        lineNumber,
        rawSource: rawSource.trim(),
      });
    }

    return fields;
  }

  // ── Methods ─────────────────────────────────────────────────────────────────

  private extractMethods(source: string): IJavaMethod[] {
    const methods: IJavaMethod[] = [];
    // Simplistic regex for method signature: visibility, optional static/final, return type, name, parameters
    const regex = /^\s*(?:(@[a-zA-Z0-9_]+(?:\([^)]*\))?)\s*)*(public|protected|private)\s+(?:(static|final|abstract|synchronized)\s+)*(?:(static|final|abstract|synchronized)\s+)*([a-zA-Z0-9_<>[\]]+)\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)\s*(?:throws\s+([^{]+))?\s*\{?/gm;

    let match;
    while ((match = regex.exec(source)) !== null) {
      const isClassDecl = match[0].includes(' class ') || match[0].includes(' interface ');
      if (isClassDecl) { continue; }

      const rawMatch = match[0];
      const visibility = match[2] as Visibility;
      const mod1 = match[3];
      const mod2 = match[4];
      const returnType = match[5];
      const name = match[6];
      const paramsRaw = match[7];
      const throwsRaw = match[8];

      const isStatic = mod1 === 'static' || mod2 === 'static';
      const isAbstract = mod1 === 'abstract' || mod2 === 'abstract';
      const isSynchronized = mod1 === 'synchronized' || mod2 === 'synchronized';

      const parameters = this.parseParameters(paramsRaw);
      const throwsExceptions = throwsRaw ? throwsRaw.split(',').map(s => s.trim()) : [];

      // Extract annotations that were captured in the rawMatch
      const annotations: string[] = [];
      const annRegex = /@([a-zA-Z0-9_]+)/g;
      let annMatch;
      while ((annMatch = annRegex.exec(rawMatch)) !== null) {
        annotations.push(annMatch[1]);
      }

      const lineNumber = this.getLineNumber(match.index, source);

      // Attempt to extract body up to the matching closing brace
      let body = '';
      if (!isAbstract && rawMatch.includes('{')) {
        const bodyStart = match.index + rawMatch.indexOf('{');
        body = this.extractBalancedBraces(source, bodyStart);
      }

      methods.push({
        name,
        returnType,
        parameters,
        annotations,
        lineNumber,
        visibility,
        isStatic,
        isAbstract,
        isSynchronized,
        body,
        throwsExceptions,
      });
    }

    return methods;
  }

  private parseParameters(paramsRaw: string): IJavaParameter[] {
    if (!paramsRaw.trim()) { return []; }
    return paramsRaw.split(',').map(p => {
      const parts = p.trim().split(/\s+/);
      const name = parts.pop() || '';
      
      const annotations: string[] = [];
      let type = '';
      
      for (const part of parts) {
        if (part.startsWith('@')) {
          annotations.push(part.substring(1).split('(')[0]);
        } else {
          type += part;
        }
      }

      return { name, type, annotations };
    });
  }

  private extractBalancedBraces(source: string, startIndex: number): string {
    let braceCount = 0;
    let i = startIndex;
    for (; i < source.length; i++) {
      if (source[i] === '{') { braceCount++; }
      if (source[i] === '}') { braceCount--; }
      if (braceCount === 0) {
        return source.substring(startIndex, i + 1);
      }
    }
    return source.substring(startIndex);
  }

  private getLineNumber(index: number, source: string): number {
    const upToIndex = source.substring(0, index);
    return (upToIndex.match(/\n/g) || []).length + 1;
  }
}
