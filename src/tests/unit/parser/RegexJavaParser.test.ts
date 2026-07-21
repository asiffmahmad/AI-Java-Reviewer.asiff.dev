import * as assert from 'assert';
import { RegexJavaParser } from '../../../parser/RegexJavaParser';

describe('RegexJavaParser', () => {
  const parser = new RegexJavaParser();

  it('should parse a basic Spring REST controller', () => {
    const javaCode = `
      package com.example.demo.controllers;

      import org.springframework.web.bind.annotation.RestController;
      import org.springframework.web.bind.annotation.RequestMapping;
      import org.springframework.beans.factory.annotation.Autowired;
      import com.example.demo.services.UserService;

      @RestController
      @RequestMapping("/api/users")
      public class UserController {
          
          @Autowired
          private UserService userService;

          @GetMapping("/{id}")
          public User getUserById(@PathVariable String id) {
              return userService.findById(id);
          }
      }
    `;

    const parsed = parser.parse(javaCode, '/src/main/java/com/example/demo/controllers/UserController.java');
    
    assert.ok(parsed, 'Parsed object should not be undefined');
    assert.strictEqual(parsed.className, 'UserController');
    assert.strictEqual(parsed.packageName, 'com.example.demo.controllers');
    assert.strictEqual(parsed.stereotype, 'RestController');
    assert.ok(parsed.annotations.includes('RestController'));
    
    assert.strictEqual(parsed.fields.length, 1);
    const field = parsed.fields[0];
    assert.strictEqual(field.name, 'userService');
    assert.strictEqual(field.type, 'UserService');
    assert.strictEqual(field.injectionType, 'field');
    assert.strictEqual(field.visibility, 'private');
    
    assert.strictEqual(parsed.methods.length, 1);
    const method = parsed.methods[0];
    assert.strictEqual(method.name, 'getUserById');
    assert.strictEqual(method.returnType, 'User');
    assert.strictEqual(method.visibility, 'public');
    assert.strictEqual(method.parameters.length, 1);
    assert.strictEqual(method.parameters[0].name, 'id');
  });

  it('should extract constructor injection fields correctly', () => {
    const javaCode = `
      package com.example.demo.services;
      import org.springframework.stereotype.Service;

      @Service
      public class MyService {
          private final DependencyA a;
          private DependencyB b;

          public MyService(DependencyA a, DependencyB b) {
              this.a = a;
              this.b = b;
          }
      }
    `;

    const parsed = parser.parse(javaCode, '/MyService.java');
    assert.ok(parsed);
    assert.strictEqual(parsed.stereotype, 'Service');
    assert.strictEqual(parsed.fields.length, 2);
    assert.strictEqual(parsed.fields[0].isFinal, true);
    assert.strictEqual(parsed.fields[1].isFinal, false);
    assert.strictEqual(parsed.fields[0].injectionType, 'none', 'Constructor injection fields do not have @Autowired directly');
  });
});
