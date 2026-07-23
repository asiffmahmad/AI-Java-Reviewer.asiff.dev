import type { IJavaClass } from '../models';

export interface IProjectMetadata {
  readonly totalClasses: number;
  readonly totalPackages: number;
  readonly totalMethods: number;
  readonly totalFields: number;
  readonly totalSpringBeans: number;
  readonly javaVersion?: string;
  readonly framework?: string;
}

export class ProjectIndex {
  private readonly classesByFqn = new Map<string, IJavaClass>();
  private readonly fqnBySimpleName = new Map<string, string[]>();
  private readonly springBeans = new Map<string, string>(); // BeanName (decapitalized or explicit) -> FQN
  private readonly interfaceImplementations = new Map<string, string[]>(); // Interface Simple/FQN -> Impl FQNs
  private readonly outgoingDependencies = new Map<string, Set<string>>(); // FQN -> Set of imported/referenced FQNs
  private readonly incomingDependencies = new Map<string, Set<string>>(); // FQN -> Set of FQNs that depend on it
  private readonly callGraph = new Map<string, Set<string>>(); // MethodKey (FQN.method) -> Set of called MethodKeys or ClassNames
  private readonly packageHierarchy = new Map<string, Set<string>>(); // PackageName -> Set of FQNs

  /**
   * Clears all indexed entries.
   */
  public clear(): void {
    this.classesByFqn.clear();
    this.fqnBySimpleName.clear();
    this.springBeans.clear();
    this.interfaceImplementations.clear();
    this.outgoingDependencies.clear();
    this.incomingDependencies.clear();
    this.callGraph.clear();
    this.packageHierarchy.clear();
  }

  /**
   * Index or update a single Java class representation.
   */
  public updateClass(javaClass: IJavaClass): void {
    const fqn = javaClass.fullyQualifiedName || javaClass.className;
    const simpleName = javaClass.className;

    // Remove existing indexes for this FQN if re-indexing
    if (this.classesByFqn.has(fqn)) {
      this.removeClass(fqn);
    }

    this.classesByFqn.set(fqn, javaClass);

    // Simple Name Mapping
    const existing = this.fqnBySimpleName.get(simpleName) || [];
    if (!existing.includes(fqn)) {
      existing.push(fqn);
      this.fqnBySimpleName.set(simpleName, existing);
    }

    // Package Hierarchy
    const pkg = javaClass.packageName || 'default';
    const pkgSet = this.packageHierarchy.get(pkg) || new Set<string>();
    pkgSet.add(fqn);
    this.packageHierarchy.set(pkg, pkgSet);

    // Spring Bean Registration
    if (javaClass.stereotype && javaClass.stereotype !== 'none') {
      const beanName = simpleName.charAt(0).toLowerCase() + simpleName.slice(1);
      this.springBeans.set(beanName, fqn);
      this.springBeans.set(simpleName, fqn);
    }

    // Interface Implementations
    if (javaClass.interfaces && javaClass.interfaces.length > 0) {
      for (const iface of javaClass.interfaces) {
        const impls = this.interfaceImplementations.get(iface) || [];
        if (!impls.includes(fqn)) {
          impls.push(fqn);
          this.interfaceImplementations.set(iface, impls);
        }
      }
    }

    // Outgoing & Incoming Dependencies via imports and references
    const depSet = new Set<string>();
    if (javaClass.superClass) depSet.add(javaClass.superClass);
    if (javaClass.interfaces) javaClass.interfaces.forEach(i => depSet.add(i));
    if (javaClass.imports) javaClass.imports.forEach(i => depSet.add(i));

    for (const f of javaClass.fields) {
      if (f.type) depSet.add(f.type);
    }

    this.outgoingDependencies.set(fqn, depSet);
    for (const dep of depSet) {
      const incoming = this.incomingDependencies.get(dep) || new Set<string>();
      incoming.add(fqn);
      this.incomingDependencies.set(dep, incoming);
    }

    // Call Graph Parsing heuristics from method bodies
    for (const m of javaClass.methods) {
      const methodKey = `${fqn}.${m.name}`;
      const called = new Set<string>();
      if (m.body) {
        // Look for method invocation patterns like repo.save(), service.process(), etc.
        const matches = m.body.matchAll(/\b([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\s*\(/g);
        for (const match of matches) {
          const varOrClass = match[1];
          const methodCalled = match[2];
          called.add(`${varOrClass}.${methodCalled}`);
        }
      }
      this.callGraph.set(methodKey, called);
    }
  }

  /**
   * Remove a class from the index.
   */
  public removeClass(fqn: string): void {
    const cls = this.classesByFqn.get(fqn);
    if (!cls) return;

    this.classesByFqn.delete(fqn);

    // Remove simple name mapping
    const existing = this.fqnBySimpleName.get(cls.className) || [];
    const updated = existing.filter(item => item !== fqn);
    if (updated.length > 0) {
      this.fqnBySimpleName.set(cls.className, updated);
    } else {
      this.fqnBySimpleName.delete(cls.className);
    }

    // Remove package hierarchy
    const pkg = cls.packageName || 'default';
    const pkgSet = this.packageHierarchy.get(pkg);
    if (pkgSet) {
      pkgSet.delete(fqn);
    }
  }

  // ── Queries & Lookups ───────────────────────────────────────────────────────

  public getClass(classNameOrFqn: string): IJavaClass | undefined {
    if (this.classesByFqn.has(classNameOrFqn)) {
      return this.classesByFqn.get(classNameOrFqn);
    }
    const fqns = this.fqnBySimpleName.get(classNameOrFqn);
    if (fqns && fqns.length > 0) {
      return this.classesByFqn.get(fqns[0]);
    }
    return undefined;
  }

  public getAllClasses(): IJavaClass[] {
    return Array.from(this.classesByFqn.values());
  }

  public getSpringBeans(): Map<string, string> {
    return new Map(this.springBeans);
  }

  public getImplementations(interfaceName: string): string[] {
    return this.interfaceImplementations.get(interfaceName) || [];
  }

  public getCallers(methodName: string): string[] {
    const callers: string[] = [];
    for (const [callerMethod, calledSet] of this.callGraph.entries()) {
      for (const called of calledSet) {
        if (called.endsWith(`.${methodName}`) || called === methodName) {
          callers.push(callerMethod);
          break;
        }
      }
    }
    return callers;
  }

  public getReferences(symbol: string): string[] {
    const refs: string[] = [];
    const incoming = this.incomingDependencies.get(symbol);
    if (incoming) {
      refs.push(...Array.from(incoming));
    }
    return refs;
  }

  public getPackageHierarchy(): Map<string, string[]> {
    const result = new Map<string, string[]>();
    for (const [pkg, fqns] of this.packageHierarchy.entries()) {
      result.set(pkg, Array.from(fqns));
    }
    return result;
  }

  public search(query: string, limit = 20): IJavaClass[] {
    const lq = query.toLowerCase();
    const matches: IJavaClass[] = [];

    for (const c of this.classesByFqn.values()) {
      if (
        c.className.toLowerCase().includes(lq) ||
        c.fullyQualifiedName.toLowerCase().includes(lq) ||
        c.packageName.toLowerCase().includes(lq)
      ) {
        matches.push(c);
        if (matches.length >= limit) break;
      }
    }
    return matches;
  }

  public getMetadata(): IProjectMetadata {
    let totalMethods = 0;
    let totalFields = 0;

    for (const c of this.classesByFqn.values()) {
      totalMethods += c.methods?.length || 0;
      totalFields += c.fields?.length || 0;
    }

    return {
      totalClasses: this.classesByFqn.size,
      totalPackages: this.packageHierarchy.size,
      totalMethods,
      totalFields,
      totalSpringBeans: new Set(this.springBeans.values()).size,
      javaVersion: '17',
      framework: 'Spring Boot',
    };
  }
}
