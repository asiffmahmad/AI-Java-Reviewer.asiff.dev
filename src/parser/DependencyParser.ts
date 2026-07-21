/**
 * Parses dependencies from Maven pom.xml and Gradle build scripts.
 * Uses regex extraction to gather dependency names and versions.
 */
export class DependencyParser {
  /**
   * Parses a pom.xml file to extract a list of dependencies.
   * Returns a list of strings in the format "groupId:artifactId:version"
   */
  public parsePom(content: string): string[] {
    const dependencies: string[] = [];
    const dependencyBlockRegex = /<dependency>([\s\S]*?)<\/dependency>/g;
    
    let match;
    while ((match = dependencyBlockRegex.exec(content)) !== null) {
      const block = match[1];
      const groupIdMatch = /<groupId>\s*(.*?)\s*<\/groupId>/.exec(block);
      const artifactIdMatch = /<artifactId>\s*(.*?)\s*<\/artifactId>/.exec(block);
      const versionMatch = /<version>\s*(.*?)\s*<\/version>/.exec(block);
      
      if (groupIdMatch && artifactIdMatch) {
        let dep = `${groupIdMatch[1]}:${artifactIdMatch[1]}`;
        if (versionMatch) {
          dep += `:${versionMatch[1]}`;
        }
        dependencies.push(dep);
      }
    }
    
    return dependencies;
  }

  /**
   * Parses a build.gradle or build.gradle.kts file.
   * Returns a list of strings like "org.springframework.boot:spring-boot-starter-web"
   */
  public parseGradle(content: string): string[] {
    const dependencies: string[] = [];
    // Matches: implementation 'org.springframework.boot:spring-boot-starter-web:2.5.4'
    // Matches: testImplementation("org.junit.jupiter:junit-jupiter-api")
    const regex = /(?:implementation|api|compileOnly|runtimeOnly|testImplementation|testCompile|testRuntimeOnly)\s*\(?['"]([^'"]+:[^'"]+(?::[^'"]+)?)['"]\)?/g;
    
    let match;
    while ((match = regex.exec(content)) !== null) {
      dependencies.push(match[1]);
    }
    
    return dependencies;
  }
}
