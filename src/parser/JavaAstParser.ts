import { parse } from 'java-parser';
import type { IJavaParser } from './IJavaParser';
import { RegexJavaParser } from './RegexJavaParser';
import type {
  IJavaClass,
  ClassType,
  SpringStereotype,
  IJavaField,
  IJavaMethod,
  IJavaParameter,
  Visibility,
  InjectionType,
} from '../models';

/**
 * Enterprise Java Parser using `java-parser` AST/CST with automatic fallback to RegexJavaParser.
 */
export class JavaAstParser implements IJavaParser {
  private readonly fallbackParser: RegexJavaParser;

  constructor() {
    this.fallbackParser = new RegexJavaParser();
  }

  public parse(rawContent: string, filePath: string): IJavaClass | undefined {
    if (!rawContent || !rawContent.trim() || filePath.endsWith('module-info.java')) {
      return undefined;
    }

    try {
      const cst = parse(rawContent);
      const result = this.parseCst(cst, rawContent, filePath);
      if (result) {
        return result;
      }
    } catch {
      // Fallback on CST parse errors (uncompilable source, non-standard syntax, etc.)
    }

    return this.fallbackParser.parse(rawContent, filePath);
  }

  private parseCst(cst: any, rawContent: string, filePath: string): IJavaClass | undefined {
    const _lines = rawContent.split(/\r?\n/);
    const lineCount = _lines.length;

    let packageName = '';
    const fullImports: string[] = [];
    const simpleImports: string[] = [];

    // Traverse compilationUnit (handling ordinaryCompilationUnit wrapper if present in java-parser v2.3+)
    const compilationUnit = cst.children?.ordinaryCompilationUnit?.[0]?.children || cst?.children;
    if (!compilationUnit) return undefined;

    // Package declaration
    if (compilationUnit.packageDeclaration) {
      const pkgDecl = compilationUnit.packageDeclaration[0];
      packageName = this.extractPackageName(pkgDecl);
    }

    // Import declarations
    if (compilationUnit.importDeclaration) {
      for (const imp of compilationUnit.importDeclaration) {
        const fullImp = this.extractImportName(imp);
        if (fullImp) {
          fullImports.push(fullImp);
          const parts = fullImp.split('.');
          simpleImports.push(parts[parts.length - 1]);
        }
      }
    }

    // Type declarations
    if (!compilationUnit.typeDeclaration) {
      return undefined;
    }

    for (const typeDecl of compilationUnit.typeDeclaration) {
      const classMeta = this.extractTypeDeclaration(typeDecl, _lines, rawContent);
      if (classMeta) {
        const fullyQualifiedName = packageName ? `${packageName}.${classMeta.className}` : classMeta.className;
        const stereotype = this.inferStereotype(classMeta.annotations);

        return {
          filePath,
          packageName,
          className: classMeta.className,
          fullyQualifiedName,
          classType: classMeta.classType,
          stereotype,
          annotations: classMeta.annotations,
          fields: classMeta.fields,
          methods: classMeta.methods,
          imports: simpleImports,
          superClass: classMeta.superClass,
          interfaces: classMeta.interfaces,
          lineCount,
          rawContent,
        };
      }
    }

    return undefined;
  }

  private extractPackageName(pkgDecl: any): string {
    try {
      const identifiers = pkgDecl.children.Identifier || pkgDecl.children.name?.[0]?.children?.Identifier || [];
      return identifiers.map((i: any) => i.image).join('.');
    } catch {
      return '';
    }
  }

  private extractImportName(impDecl: any): string {
    try {
      const identifiers = impDecl.children.Identifier || impDecl.children.packageOrTypeName?.[0]?.children?.Identifier || [];
      let name = identifiers.map((i: any) => i.image).join('.');
      if (impDecl.children.Star) {
        name += '.*';
      }
      return name;
    } catch {
      return '';
    }
  }

  private extractTypeDeclaration(typeDecl: any, _lines: string[], rawContent: string): {
    className: string;
    classType: ClassType;
    annotations: string[];
    superClass?: string;
    interfaces: string[];
    fields: IJavaField[];
    methods: IJavaMethod[];
  } | undefined {
    try {
      const children = typeDecl.children;
      let declarationNode: any = undefined;
      let classType: ClassType = 'class';

      if (children.classDeclaration) {
        declarationNode = children.classDeclaration[0];
        classType = 'class';
      } else if (children.interfaceDeclaration) {
        declarationNode = children.interfaceDeclaration[0];
        classType = 'interface';
      } else if (children.enumDeclaration) {
        declarationNode = children.enumDeclaration[0];
        classType = 'enum';
      } else if (children.recordDeclaration) {
        declarationNode = children.recordDeclaration[0];
        classType = 'record';
      }

      if (!declarationNode) return undefined;

      const classHeader = declarationNode.children.normalClassDeclaration?.[0]?.children ||
                          declarationNode.children.normalInterfaceDeclaration?.[0]?.children ||
                          declarationNode.children.enumDeclaration?.[0]?.children ||
                          declarationNode.children.recordDeclaration?.[0]?.children ||
                          declarationNode.children;

      const className = classHeader.typeIdentifier?.[0]?.children?.Identifier?.[0]?.image ||
                        classHeader.Identifier?.[0]?.image ||
                        '';

      if (!className) return undefined;

      const classAnnotations = this.extractAnnotations(
        typeDecl.children?.classModifier || declarationNode.children?.classModifier || classHeader.classModifier
      );

      let superClass: string | undefined = undefined;
      if (classHeader.superclass) {
        const superClassId = classHeader.superclass[0]?.children?.classOrInterfaceType?.[0]?.children?.typeIdentifier?.[0]?.children?.Identifier?.[0]?.image;
        if (superClassId) superClass = superClassId;
      }

      const interfaces: string[] = [];
      if (classHeader.superinterfaces) {
        const interfaceTypes = classHeader.superinterfaces[0]?.children?.interfaceTypeList?.[0]?.children?.interfaceType || [];
        for (const it of interfaceTypes) {
          const name = it.children?.classType?.[0]?.children?.typeIdentifier?.[0]?.children?.Identifier?.[0]?.image;
          if (name) interfaces.push(name);
        }
      }

      const fields: IJavaField[] = [];
      const methods: IJavaMethod[] = [];

      const body = classHeader.classBody?.[0] || classHeader.interfaceBody?.[0];
      if (body && body.children && body.children.classBodyDeclaration) {
        for (const decl of body.children.classBodyDeclaration) {
          const memberDecl = decl.children.memberDeclaration?.[0] || decl.children.classMemberDeclaration?.[0];
          if (!memberDecl) continue;

          // Field Declaration
          if (memberDecl.children.fieldDeclaration) {
            const fieldNode = memberDecl.children.fieldDeclaration[0];
            const modifiers = decl.children?.modifier || decl.children?.fieldModifier || fieldNode.children?.fieldModifier;
            const parsedFields = this.parseField(fieldNode, modifiers, rawContent);
            fields.push(...parsedFields);
          }

          // Method Declaration
          if (memberDecl.children.methodDeclaration) {
            const methodNode = memberDecl.children.methodDeclaration[0];
            const modifiers = decl.children?.modifier || decl.children?.methodModifier || methodNode.children?.methodModifier || methodNode.children?.methodHeader?.[0]?.children?.methodModifier;
            const parsedMethod = this.parseMethod(methodNode, modifiers, rawContent);
            if (parsedMethod) methods.push(parsedMethod);
          }

          // Constructor Declaration
          if (memberDecl.children.constructorDeclaration) {
            const ctorNode = memberDecl.children.constructorDeclaration[0];
            const modifiers = decl.children?.modifier || decl.children?.constructorModifier || ctorNode.children?.constructorModifier;
            const parsedCtor = this.parseConstructor(ctorNode, modifiers, className, rawContent);
            if (parsedCtor) methods.push(parsedCtor);
          }
        }
      }

      return {
        className,
        classType,
        annotations: classAnnotations,
        superClass,
        interfaces,
        fields,
        methods,
      };
    } catch {
      return undefined;
    }
  }

  private extractAnnotations(modifiers: any[]): string[] {
    const annotations: string[] = [];
    if (!modifiers) return annotations;
    for (const mod of modifiers) {
      if (mod.children && mod.children.annotation) {
        for (const ann of mod.children.annotation) {
          const annName = ann.children?.typeName?.[0]?.children?.Identifier?.map((i: any) => i.image).join('.');
          if (annName) annotations.push(annName);
        }
      }
    }
    return annotations;
  }

  private parseField(fieldNode: any, modifiers: any[], _rawContent: string): IJavaField[] {
    const fields: IJavaField[] = [];
    try {
      const typeName = this.extractTypeString(fieldNode.children.unannType?.[0]);
      const annotations = this.extractAnnotations(modifiers);
      const visibility = this.extractVisibility(modifiers);
      const isStatic = this.hasModifier(modifiers, 'static');
      const isFinal = this.hasModifier(modifiers, 'final');

      let injectionType: InjectionType = 'none';
      if (annotations.includes('Autowired') || annotations.includes('Inject') || annotations.includes('Value')) {
        injectionType = 'field';
      }

      const declarators = fieldNode.children.variableDeclaratorList?.[0]?.children?.variableDeclarator || [];
      for (const decl of declarators) {
        const name = decl.children?.variableDeclaratorId?.[0]?.children?.Identifier?.[0]?.image || '';
        const startLine = decl.location?.startLine || 1;
        if (name) {
          fields.push({
            name,
            type: typeName,
            annotations,
            injectionType,
            visibility,
            isStatic,
            isFinal,
            lineNumber: startLine,
            rawSource: `${visibility} ${typeName} ${name};`,
          });
        }
      }
    } catch {
      // Ignore individual field parse errors
    }
    return fields;
  }

  private parseMethod(methodNode: any, modifiers: any[], rawContent: string): IJavaMethod | undefined {
    try {
      const header = methodNode.children.methodHeader?.[0]?.children;
      if (!header) return undefined;

      const name = header.methodDeclarator?.[0]?.children?.Identifier?.[0]?.image || '';
      if (!name) return undefined;

      const returnType = this.extractTypeString(header.result?.[0]);
      const annotations = this.extractAnnotations(modifiers);
      const visibility = this.extractVisibility(modifiers);
      const isStatic = this.hasModifier(modifiers, 'static');
      const isAbstract = this.hasModifier(modifiers, 'abstract');
      const isSynchronized = this.hasModifier(modifiers, 'synchronized');

      const parameters = this.parseParameters(header.methodDeclarator?.[0]?.children?.formalParameterList?.[0]);
      const throwsExceptions: string[] = [];
      if (header.throws?.[0]?.children?.exceptionTypeList?.[0]?.children?.exceptionType) {
        for (const ex of header.throws[0].children.exceptionTypeList[0].children.exceptionType) {
          const exName = ex.children?.classType?.[0]?.children?.typeIdentifier?.[0]?.children?.Identifier?.[0]?.image;
          if (exName) throwsExceptions.push(exName);
        }
      }

      const startLine = methodNode.location?.startLine || 1;
      const body = methodNode.children.methodBody?.[0] && methodNode.location ? rawContent.substring(methodNode.location.startOffset, methodNode.location.endOffset + 1) : '';

      return {
        name,
        returnType,
        parameters,
        annotations,
        lineNumber: startLine,
        visibility,
        isStatic,
        isAbstract,
        isSynchronized,
        body,
        throwsExceptions,
      };
    } catch {
      return undefined;
    }
  }

  private parseConstructor(ctorNode: any, modifiers: any[], className: string, rawContent: string): IJavaMethod | undefined {
    try {
      const declarator = ctorNode.children.constructorDeclarator?.[0]?.children;
      const name = className;
      const annotations = this.extractAnnotations(modifiers);
      const visibility = this.extractVisibility(modifiers);

      const parameters = this.parseParameters(declarator?.formalParameterList?.[0]);
      const startLine = ctorNode.location?.startLine || 1;
      const body = ctorNode.location ? rawContent.substring(ctorNode.location.startOffset, ctorNode.location.endOffset + 1) : '';

      return {
        name,
        returnType: 'void',
        parameters,
        annotations,
        lineNumber: startLine,
        visibility,
        isStatic: false,
        isAbstract: false,
        isSynchronized: false,
        body,
        throwsExceptions: [],
      };
    } catch {
      return undefined;
    }
  }

  private parseParameters(paramList: any): IJavaParameter[] {
    const params: IJavaParameter[] = [];
    if (!paramList || !paramList.children) return params;

    const formalParams = paramList.children.formalParameter || [];
    for (const p of formalParams) {
      try {
        const typeName = this.extractTypeString(p.children.unannType?.[0]);
        const name = p.children.variableDeclaratorId?.[0]?.children?.Identifier?.[0]?.image || '';
        const annotations = this.extractAnnotations(p.children.variableModifier);
        if (name) {
          params.push({ name, type: typeName, annotations });
        }
      } catch {
        // Skip parameter on error
      }
    }
    return params;
  }

  private extractTypeString(unannTypeNode: any): string {
    if (!unannTypeNode) return 'void';
    try {
      if (unannTypeNode.children?.primitiveType) {
        const prim = unannTypeNode.children.primitiveType[0].children;
        if (prim?.Boolean) return 'boolean';
        const intType = prim?.NumericType?.[0]?.children?.IntegralType?.[0]?.children;
        if (intType?.Int) return 'int';
        if (intType?.Long) return 'long';
        if (intType?.Short) return 'short';
        if (intType?.Byte) return 'byte';
        if (intType?.Char) return 'char';
        const floatType = prim?.NumericType?.[0]?.children?.FloatingPointType?.[0]?.children;
        if (floatType?.Float) return 'float';
        if (floatType?.Double) return 'double';
        return 'void';
      }
      const refNode = unannTypeNode.children?.referenceType?.[0] || unannTypeNode.children?.unannReferenceType?.[0];
      if (refNode) {
        const classType = refNode.children?.classOrInterfaceType?.[0] ||
                          refNode.children?.unannClassOrInterfaceType?.[0];
        const unannClassType = classType?.children?.unannClassType?.[0] || classType?.children?.classType?.[0] || classType;
        const id = unannClassType?.children?.Identifier?.[0]?.image ||
                   unannClassType?.children?.typeIdentifier?.[0]?.children?.Identifier?.[0]?.image;
        if (id) return id;
      }
    } catch {
      // Fallback
    }
    return 'Object';
  }

  private extractVisibility(modifiers: any[]): Visibility {
    if (!modifiers) return 'package';
    for (const mod of modifiers) {
      if (mod.children?.Public) return 'public';
      if (mod.children?.Protected) return 'protected';
      if (mod.children?.Private) return 'private';
    }
    return 'package';
  }

  private hasModifier(modifiers: any[], modifierName: string): boolean {
    if (!modifiers) return false;
    for (const mod of modifiers) {
      if (modifierName === 'static' && mod.children?.Static) return true;
      if (modifierName === 'final' && mod.children?.Final) return true;
      if (modifierName === 'abstract' && mod.children?.Abstract) return true;
      if (modifierName === 'synchronized' && mod.children?.Synchronized) return true;
    }
    return false;
  }

  private inferStereotype(annotations: string[]): SpringStereotype {
    if (annotations.includes('RestController')) return 'RestController';
    if (annotations.includes('Controller')) return 'Controller';
    if (annotations.includes('Service')) return 'Service';
    if (annotations.includes('Repository')) return 'Repository';
    if (annotations.includes('Component')) return 'Component';
    if (annotations.includes('Configuration')) return 'Configuration';
    return 'none';
  }
}
