import type { IJavaClass } from '../models/JavaClass';

/**
 * Interface for parsing Java source files into structural representations.
 */
export interface IJavaParser {
  /**
   * Parses the raw contents of a Java file.
   *
   * @param rawContent The text of the .java file.
   * @param filePath The absolute path for context/metadata.
   * @returns A structured representation of the class, or undefined if unparseable.
   */
  parse(rawContent: string, filePath: string): IJavaClass | undefined;
}
