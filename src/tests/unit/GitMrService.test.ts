import * as assert from 'assert';
import { GitMrService } from '../../git/GitMrService';

describe('GitMrService', () => {
  let gitMrService: GitMrService;

  beforeEach(() => {
    gitMrService = new GitMrService();
  });

  it('should parse unified diff hunks correctly into line ranges', () => {
    const sampleDiff = `diff --git a/app/actors/BulkUploadActor.java b/app/actors/BulkUploadActor.java
index 1234567..89abcdef 100644
--- a/app/actors/BulkUploadActor.java
+++ b/app/actors/BulkUploadActor.java
@@ -5,6 +5,10 @@ public class BulkUploadActor {
+  private String newField;
+  public void process() {
+    System.out.println("Processing");
+  }
@@ -25,4 +29,6 @@ public class BulkUploadActor {
+  public void extraMethod() {
+  }
`;

    const files = gitMrService.parseUnifiedDiff(sampleDiff);
    assert.strictEqual(files.length, 1);
    assert.strictEqual(files[0].filePath, 'app/actors/BulkUploadActor.java');
    assert.strictEqual(files[0].status, 'MODIFIED');
    assert.deepStrictEqual(files[0].lineRanges, ['5-14', '29-34']);
  });

  it('should identify NEW files in unified diffs', () => {
    const sampleDiff = `diff --git a/src/main/java/com/example/NewService.java b/src/main/java/com/example/NewService.java
new file mode 100644
--- /dev/null
+++ b/src/main/java/com/example/NewService.java
@@ -0,0 +1,15 @@
+package com.example;
+public class NewService {}
`;

    const files = gitMrService.parseUnifiedDiff(sampleDiff);
    assert.strictEqual(files.length, 1);
    assert.strictEqual(files[0].filePath, 'src/main/java/com/example/NewService.java');
    assert.deepStrictEqual(files[0].lineRanges, ['1-15']);
  });

  it('should resolve public GitHub PR diff for https://github.com/asiffmahmad/visionboard/pull/2', async () => {
    const prDiff = `diff --git a/backend/src/main/java/com/todo/controller/AdminController.java b/backend/src/main/java/com/todo/controller/AdminController.java
index 87551ba9..7dabb25f 100644
--- a/backend/src/main/java/com/todo/controller/AdminController.java
+++ b/backend/src/main/java/com/todo/controller/AdminController.java
@@ -30,6 +30,7 @@ public class AdminController {
     @GetMapping("/users")
     public ResponseEntity<List<com.todo.dto.UserActivityDto>> getAllUsers() {
+        System.out.println("test ai reviewer");
         return ResponseEntity.ok(userService.getAllUsersWithActivities());
     }`;

    const details = await gitMrService.resolveMrDetails(`diff:${prDiff}`, '/tmp');
    assert.ok(details);
    assert.ok(details.impactedFiles.length > 0);
    assert.ok(details.impactedFiles.some(f => f.filePath.includes('AdminController.java')));
    assert.ok(details.rawDiff.includes('AdminController.java'));
  });
});
