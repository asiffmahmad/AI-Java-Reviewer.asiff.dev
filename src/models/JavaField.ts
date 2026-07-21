/**
 * Visibility modifier of a Java class member.
 */
export type Visibility = 'public' | 'private' | 'protected' | 'package';

/**
 * Describes how a Spring bean dependency is injected into this field.
 *
 * field       → @Autowired on field (discouraged)
 * constructor → injected via constructor parameter (preferred)
 * setter      → injected via @Autowired setter method (acceptable)
 * none        → not an injected bean
 */
export type InjectionType = 'field' | 'constructor' | 'setter' | 'none';

/**
 * Represents a field declaration parsed from a Java class.
 */
export interface IJavaField {
  readonly name: string;
  readonly type: string;
  readonly annotations: string[];
  readonly injectionType: InjectionType;
  readonly lineNumber: number;
  readonly isStatic: boolean;
  readonly isFinal: boolean;
  readonly visibility: Visibility;
  /** Raw source line for snippet display in reports */
  readonly rawSource: string;
}
