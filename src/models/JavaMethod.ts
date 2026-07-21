import type { Visibility } from './JavaField';

/**
 * A single parameter in a Java method signature.
 */
export interface IJavaParameter {
  readonly name: string;
  /** Simple or fully-qualified type name */
  readonly type: string;
  /** Parameter-level annotations, e.g. ["@Valid", "@RequestBody"] */
  readonly annotations: string[];
}

/**
 * Represents a method declaration parsed from a Java class.
 */
export interface IJavaMethod {
  readonly name: string;
  readonly returnType: string;
  readonly parameters: IJavaParameter[];
  readonly annotations: string[];
  readonly lineNumber: number;
  readonly visibility: Visibility;
  readonly isStatic: boolean;
  readonly isAbstract: boolean;
  readonly isSynchronized: boolean;
  /**
   * Method body source. May be truncated for methods > 200 lines.
   * Used by the Rule Engine to detect patterns (loops, repo calls, etc.)
   */
  readonly body: string;
  /** Checked exception types declared in the throws clause */
  readonly throwsExceptions: string[];
}
