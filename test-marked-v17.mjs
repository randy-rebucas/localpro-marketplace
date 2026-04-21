import { marked } from 'marked';

const markdownContent = `
| Property | Value |
| --- | --- |
| Name | PESO |
| Version | 1.0 |

This is some **bold** text.
`;

console.log("--- Testing marked v17 ---");

try {
  const result = marked(markdownContent, { async: false });
  console.log("marked(src, { async: false }) type:", typeof result);
  console.log("Result content includes table tag:", result.includes('<table'));
  console.log("Full Output:");
  console.log(result);
} catch (error) {
  console.error("Error during marked execution:", error);
}

console.log("\n--- API Check ---");
console.log("marked version (if available):", marked.defaults?.version || "unknown");
