# AI Java Reviewer — Java Parser Audit

This document details the mechanics, capabilities, and limitations of the Java Parsing subsystem.

## 🛠️ Parser Engine Overview

The extension implements a hybrid parsing strategy defined in `JavaAstParser.ts` and `RegexJavaParser.ts`:
1. **Primary Parser**: `java-parser` npm library, which parses Java source code into a Concrete Syntax Tree (CST).
2. **Fallback Parser**: `RegexJavaParser` which uses customized regular expressions to extract class names, types, fields, methods, parameters, and annotations if the CST parser fails (due to syntax errors or newer language features).

---

## 🔍 Language Feature Support Matrix

| Java Feature / Framework | JavaAstParser Support | RegexJavaParser Fallback | Issues / Limitations |
| :--- | :--- | :--- | :--- |
| **Classes & Interfaces** | ✅ Full | ✅ Basic | Fully supported. |
| **Enums & Records** | ✅ Full | ✅ Basic | Fully supported. |
| **Generics** | ⚠️ Partial | ⚠️ Partial | Class declaration matching ignores generics. |
| **Annotations** | ✅ Full | ✅ Regex-based | In regex parser, parameters of annotations are sometimes stripped or unmatched. |
| **Spring Boot Beans** | ✅ Full | ✅ Basic | Stereotypes (`@RestController`, `@Service`, etc.) are inferred from the class annotations list. |
| **Field Injection** | ✅ Full | ✅ Regex-based | Detects `@Autowired` or `@Value` on class fields. |
| **Constructor Injection** | ✅ Full | ⚠️ None | Class constructors must be manually parsed to map constructor arguments. |
| **JPA / Repository** | ✅ Full | ✅ Basic | Inferred from stereotype annotation or class name ending in `Repository`. |
| **Method Bodies** | ❌ Syntactic | ⚠️ Regex-based | Both parsers do not produce a full statement-level AST inside methods; they only extract the method body as raw string content. |

---

## ⚠️ Limitations & Gaps

1. **No Statement-Level AST**:
   Neither parser parses the statements *inside* methods into a structured AST tree. Consequently, static rules searching for database query calls in loops, unpaginated calls, etc. must rely on raw text pattern matching (regex or substring checks) on the method body text.
2. **Annotation Package Resolution**:
   The parser only checks for simple annotation names (e.g. `@Transactional` instead of `org.springframework.transaction.annotation.Transactional`), which could lead to false positives if a custom user annotation has the same name.
