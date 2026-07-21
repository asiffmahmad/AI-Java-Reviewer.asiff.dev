import * as assert from 'assert';
import { DependencyParser } from '../../../parser/DependencyParser';

describe('DependencyParser', () => {
  const parser = new DependencyParser();

  it('should parse maven pom.xml', () => {
    const pom = `
      <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <version>1.18.20</version>
        </dependency>
      </dependencies>
    `;

    const deps = parser.parsePom(pom);
    assert.strictEqual(deps.length, 2);
    assert.strictEqual(deps[0], 'org.springframework.boot:spring-boot-starter-web');
    assert.strictEqual(deps[1], 'org.projectlombok:lombok:1.18.20');
  });

  it('should parse gradle build scripts', () => {
    const gradle = `
      dependencies {
          implementation 'org.springframework.boot:spring-boot-starter-web'
          testImplementation("org.junit.jupiter:junit-jupiter-api:5.7.0")
          compileOnly "org.projectlombok:lombok"
      }
    `;

    const deps = parser.parseGradle(gradle);
    assert.strictEqual(deps.length, 3);
    assert.strictEqual(deps[0], 'org.springframework.boot:spring-boot-starter-web');
    assert.strictEqual(deps[1], 'org.junit.jupiter:junit-jupiter-api:5.7.0');
    assert.strictEqual(deps[2], 'org.projectlombok:lombok');
  });
});
