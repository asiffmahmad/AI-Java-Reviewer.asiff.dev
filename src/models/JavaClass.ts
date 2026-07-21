import type { IJavaField } from './JavaField';
import type { IJavaMethod } from './JavaMethod';

/**
 * The structural kind of the Java type declaration.
 */
export type ClassType = 'class' | 'interface' | 'enum' | 'abstract' | 'record';

/**
 * Spring Framework stereotype inferred from class-level annotations.
 * Used by the Rule Engine to apply context-specific rules.
 */
export type SpringStereotype =
  | 'Controller'
  | 'RestController'
  | 'Service'
  | 'Repository'
  | 'Component'
  | 'Configuration'
  | 'none';

/**
 * The fully parsed representation of a single Java source file.
 * Produced by the JavaParser and consumed by the Rule Engine.
 */
export interface IJavaClass {
  /** Absolute filesystem path to the .java file */
  readonly filePath: string;
  /** Java package declaration, e.g. "com.example.service" */
  readonly packageName: string;
  /** Simple class name, e.g. "UserService" */
  readonly className: string;
  /** Fully qualified class name, e.g. "com.example.service.UserService" */
  readonly fullyQualifiedName: string;
  readonly classType: ClassType;
  /** Spring stereotype inferred from class-level annotations */
  readonly stereotype: SpringStereotype;
  /** All class-level annotation names (without @), e.g. ["Service", "Transactional"] */
  readonly annotations: string[];
  readonly fields: IJavaField[];
  readonly methods: IJavaMethod[];
  /** Import statements (simple names only) */
  readonly imports: string[];
  /** Super class simple name if present */
  readonly superClass?: string;
  /** Implemented interface simple names */
  readonly interfaces: string[];
  /** Total line count of the source file */
  readonly lineCount: number;
  /** Full raw source content — sent to AI only when relevant */
  readonly rawContent: string;
}
