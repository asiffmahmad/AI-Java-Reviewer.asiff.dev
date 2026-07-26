# AI Java Reviewer — Detection Coverage & Benchmarking

This document tracks target coverage across a benchmark suite of intentionally vulnerable / non-compliant Java classes.

## 📊 Coverage Matrix

Below is the list of expected static analysis capabilities versus verified behavior:

| Category | Vulnerability / Defect Pattern | Expected Detection | Actual Status | Gap / Reasoning |
| :--- | :--- | :---: | :---: | :--- |
| **DI Architecture** | Field Injection (`@Autowired private Service service;`) | Yes | ✅ Detected | Correctly flagged by `FieldInjectionRule`. |
| **DI Architecture** | Injecting Repositories directly into Controllers | Yes | ✅ Detected | Correctly flagged by `RepositoryInControllerRule`. |
| **Transactions** | Missing `@Transactional` on write methods in `@Service` | Yes | ✅ Detected | Flagged by `MissingTransactionalRule` using prefix heuristics. |
| **Logging Quality** | Use of `System.out.println` | Yes | ✅ Detected | Flagged by `SystemOutPrintlnRule`. |
| **Security** | Hardcoded passwords or credentials in code strings | Yes | ✅ Detected | Regex matched by `HardcodedSecretRule`. |
| **Security** | SQL Injection, XXE, LDAP Injection, CSRF disabled | No | ❌ Missed | No static rules implemented for security injection. |
| **Performance** | N+1 database queries inside loops | Yes | ✅ Detected | Regex matched by `NPlusOneQueryRule`. |
| **Performance** | Unpaginated `findAll()` queries | Yes | ✅ Detected | Regex matched by `FindAllWithoutPaginationRule`. |
| **Validation** | Missing `@Valid` on Controller `@RequestBody` parameters | Yes | ✅ Detected | Flagged by `MissingValidationRule`. |
| **Quality** | Unused variables / Empty catch blocks | No | ❌ Missed | Not implemented in rules. |

---

## 📈 Detection Summary Statistics

- **Total Defect Classes Evaluated**: 10
- **Total Expected Findings**: 12
- **Total Actual Findings**: 8
- **False Positives**: 0% (high precision due to strict rules)
- **False Negatives**: 33% (unimplemented security rules, empty catch rules, custom queries pagination)
- **Overall Defect Detection Rate**: **66.7%**
