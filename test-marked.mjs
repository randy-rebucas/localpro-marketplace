import { marked } from 'marked';

const markdown = '# Hello World';

try {
  console.log('Testing marked.parse():');
  const resultParse = marked.parse(markdown);
  console.log(resultParse);
} catch (e) {
  console.error('marked.parse() failed:', e.message);
}

try {
  console.log('\nTesting marked() as a function:');
  const resultFn = marked(markdown);
  console.log(resultFn);
} catch (e) {
  console.error('marked() as a function failed:', e.message);
}
