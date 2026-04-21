import { describe, it, expect } from 'vitest';
import { getAllArticles } from './lib/knowledge';

describe('Knowledge Module Integrity', () => {
  it('should be able to parse all markdown files in content/knowledge without errors', () => {
    const articles = getAllArticles();
    
    // We saw 35 files in the find command
    expect(articles.length).toBeGreaterThan(0);
    
    articles.forEach(article => {
      try {
        expect(article.title).toBeDefined();
        expect(article.slug).toBeDefined();
        expect(article.contentHtml).toBeDefined();
        expect(article.contentHtml.length).toBeGreaterThan(0);
      } catch (e) {
        throw new Error(`Failed to parse article "${article.slug}" in folder "${article.folder}": ${e.message}`);
      }
    });
    
    console.log(`Successfully validated ${articles.length} articles.`);
  });
});
