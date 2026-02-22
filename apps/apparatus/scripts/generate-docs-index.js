#!/usr/bin/env node
/**
 * Generate docs-index.json from markdown files in docs/ folder
 * Run: node scripts/generate-docs-index.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const docsDir = path.join(__dirname, '../../../docs');
const outputPath = path.join(__dirname, '../src/dashboard/public/docs-index.json');

// Category mapping based on filename.
// Files without a matching key are intentionally excluded from the public docs index.
const categoryMap = {
  'architecture': 'Architecture',
  'features': 'Features',
  'integration-guide': 'Integration',
  'quick-reference': 'Getting Started',
  'tutorial': 'Tutorials',
};

function getCategoryFromFile(filename) {
  for (const [key, category] of Object.entries(categoryMap)) {
    if (filename.includes(key)) return category;
  }
  return null;
}

function extractTitle(content) {
  const match = content.match(/^#\s+(.+?)$/m);
  return match ? match[1].trim() : 'Untitled';
}

function extractExcerpt(content, maxLength = 200) {
  const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
  let excerpt = '';
  for (const line of lines) {
    excerpt += line + '\n';
    if (excerpt.length >= maxLength) break;
  }
  return excerpt.substring(0, maxLength).trim() + (excerpt.length > maxLength ? '...' : '');
}

function extractHeadings(content) {
  const headings = [];
  const lines = content.split('\n');
  for (const line of lines) {
    const match = line.match(/^(#{1,4})\s+(.+?)$/);
    if (match) {
      headings.push(match[2].trim());
    }
  }
  return headings;
}

function generateId(filename, title) {
  const name = path.basename(filename, '.md').replace(/^tutorial-/, '');
  const titleSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return `${name}-${titleSlug}`.substring(0, 50).replace(/-+$/, '');
}

function embedSvgDiagrams(content) {
  const diagramsDir = path.join(__dirname, '../../../docs/assets/diagrams');
  const cache = new Map();

  const getDataUri = (filename) => {
    if (cache.has(filename)) return cache.get(filename);

    const svgPath = path.join(diagramsDir, filename);
    try {
      if (!fs.existsSync(svgPath)) {
        console.warn(`⚠️  SVG not found: ${filename}`);
        return null;
      }

      const svgContent = fs.readFileSync(svgPath, 'utf-8');
      const dataUri = `data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}`;
      cache.set(filename, dataUri);
      return dataUri;
    } catch (error) {
      console.warn(`⚠️  Error embedding ${filename}: ${error.message}`);
      return null;
    }
  };

  const markdownSvgRegex = /!\[([^\]]*)\]\((?:\/dashboard\/assets\/diagrams\/|(?:\.\/)?assets\/diagrams\/)(diagram-[\w-]+\.svg)\)/g;
  const htmlSvgRegex = /<img([^>]*?)src=["'](?:\/dashboard\/assets\/diagrams\/|(?:\.\/)?assets\/diagrams\/)(diagram-[\w-]+\.svg)["']([^>]*)>/g;

  let output = content.replace(markdownSvgRegex, (match, alt, filename) => {
    const dataUri = getDataUri(filename);
    return dataUri ? `![${alt}](${dataUri})` : match;
  });

  output = output.replace(htmlSvgRegex, (match, beforeSrc, filename, afterSrc) => {
    const dataUri = getDataUri(filename);
    return dataUri ? `<img${beforeSrc}src="${dataUri}"${afterSrc}>` : match;
  });

  return output;
}

function main() {
  const docs = [];

  // Read all markdown files
  const files = fs.readdirSync(docsDir).filter(f => f.endsWith('.md'));

  for (const filename of files.sort()) {
    const category = getCategoryFromFile(filename);
    if (!category) {
      console.log(`⊘ Skipped (internal/non-public): ${filename}`);
      continue;
    }

    const filepath = path.join(docsDir, filename);
    let content = fs.readFileSync(filepath, 'utf-8');

    // Embed SVG diagrams as base64 data URIs
    content = embedSvgDiagrams(content);

    const title = extractTitle(content);
    const id = generateId(filename, title);

    const doc = {
      id,
      title,
      category,
      excerpt: extractExcerpt(content),
      content,
      file: filename,
      headings: extractHeadings(content),
    };

    docs.push(doc);
  }

  // Sort by category, then title
  docs.sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }
    return a.title.localeCompare(b.title);
  });

  // Write output
  fs.writeFileSync(outputPath, JSON.stringify(docs, null, 2), 'utf-8');
  console.log(`✅ Generated docs-index.json with ${docs.length} documents`);
  console.log(`📄 Output: ${outputPath}`);

  // Show sample
  console.log('\nSample entries:');
  docs.slice(0, 2).forEach(doc => {
    console.log(`  - [${doc.category}] ${doc.title} (${doc.id})`);
  });
}

main();
