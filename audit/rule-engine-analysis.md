# AI Java Reviewer — Rule Engine Audit

This document audits the static analysis rule execution and matching algorithms.

## 🛠️ Implemented Rules Inventory

The extension registers **8 static analysis rules**:

| Rule ID | Rule Class | Category | Severity | Detection Mechanism |
| :--- | :--- | :--- | :--- | :--- |
| `RULE_FIELD_INJECTION` | `FieldInjectionRule` | Architecture | Major | Checks fields for `injectionType === 'field'`. |
| `RULE_MISSING_TRANSACTIONAL` | `MissingTransactionalRule` | Architecture | Major | Checks Service methods with names starting with save, update, delete, etc. for `@Transactional`. |
| `RULE_REPOSITORY_IN_CONTROLLER` | `RepositoryInControllerRule` | Architecture | Major | Checks Controller fields for types containing the word "Repository". |
| `RULE_SYSTEM_OUT_PRINTLN` | `SystemOutPrintlnRule` | Quality | Minor | Checks method bodies for `System.out.println` or `System.err.println`. |
| `RULE_HARDCODED_SECRET` | `HardcodedSecretRule` | Security | Critical | Regex scan on field definitions and method bodies for keys, tokens, and credentials. |
| `RULE_N_PLUS_ONE_QUERY` | `NPlusOneQueryRule` | Performance | Major | Regex check on method bodies for loops or stream `.forEach` calling repository methods. |
| `RULE_MISSING_VALID` | `MissingValidationRule` | Quality | Major | Checks Controller method parameters for `@RequestBody` without `@Valid` or `@Validated`. |
| `RULE_FIND_ALL_WITHOUT_PAGINATION` | `FindAllWithoutPaginationRule` | Performance | Major | Regex check on method bodies invoking `.findAll()` with no arguments. |

---

## 🔍 Critical Rule Gaps

1. **Circular Dependency Detection**:
   Defined in `RULE_IDS` (`RULE_CIRCULAR_DEPENDENCY`), but **no corresponding rule implementation class** is registered.
2. **Missing Exception Handlers & Logging**:
   `RULE_MISSING_EXCEPTION_HANDLER` and `RULE_MISSING_LOGGING` are defined in `RULE_IDS` but **not implemented**.
3. **Dead / Unused Beans**:
   `RULE_UNUSED_BEAN` is defined but not implemented.
4. **Spring Boot Integration Testing**:
   `RULE_MISSING_SPRING_BOOT_TEST` is defined but not implemented.
5. **No Pagination on Custom Queries**:
   `RULE_FIND_ALL_WITHOUT_PAGINATION` only checks for `.findAll()`. It misses other repository find queries (e.g. `findByStatus()`) that lack Pageable parameters.
