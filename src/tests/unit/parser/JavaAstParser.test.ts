import * as assert from 'assert';
import { JavaAstParser } from '../../../parser/JavaAstParser';

describe('JavaAstParser', () => {
  let parser: JavaAstParser;

  beforeEach(() => {
    parser = new JavaAstParser();
  });

  it('should parse a Spring Boot REST controller correctly', () => {
    const code = `
      package com.example.demo.controller;

      import org.springframework.web.bind.annotation.RestController;
      import org.springframework.web.bind.annotation.GetMapping;
      import org.springframework.beans.factory.annotation.Autowired;
      import com.example.demo.service.UserService;

      @RestController
      public class UserController {
        @Autowired
        private UserService userService;

        @GetMapping("/users")
        public String getUsers() {
          return userService.findAll();
        }
      }
    `;

    const result = parser.parse(code, '/path/to/UserController.java');
    assert.ok(result !== undefined);
    assert.strictEqual(result?.className, 'UserController');
    assert.strictEqual(result?.packageName, 'com.example.demo.controller');
    assert.strictEqual(result?.stereotype, 'RestController');
    assert.strictEqual(result?.fields.length, 1);
    assert.strictEqual(result?.fields[0].name, 'userService');
    assert.strictEqual(result?.fields[0].type, 'UserService');
    assert.strictEqual(result?.methods.length, 1);
    assert.strictEqual(result?.methods[0].name, 'getUsers');
  });

  it('should fall back gracefully to RegexJavaParser on AST parse error', () => {
    const codeWithSyntaxError = `
      package com.example.fallback;
      public class FallbackClass {
        public void badMethod() {
          if (
        }
      }
    `;

    const result = parser.parse(codeWithSyntaxError, '/path/to/FallbackClass.java');
    assert.ok(result !== undefined);
    assert.strictEqual(result?.className, 'FallbackClass');
  });
});
