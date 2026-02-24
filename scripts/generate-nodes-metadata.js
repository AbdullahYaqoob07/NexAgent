#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const workflowsDir = path.join(__dirname, '..', 'src', 'workflows');
const outputFile = path.join(__dirname, '..', 'shared', 'nodes-metadata.json');

function extractMetadata(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    const metadataMatch = content.match(/export\s+const\s+metadata\s*=\s*({[\s\S]*?});/);
    if (!metadataMatch) {
      console.warn(`No metadata export found in ${filePath}`);
      return null;
    }
    
    const metadataStr = metadataMatch[1];
    
    const typeMatch = metadataStr.match(/type:\s*['"`]([^'"`]+)['"`]/);
    const executorMatch = metadataStr.match(/executor:\s*['"`]([^'"`]+)['"`]/);
    const categoryMatch = metadataStr.match(/category:\s*['"`]([^'"`]+)['"`]/);
    const descriptionMatch = metadataStr.match(/description:\s*['"`]([^'"`]+)['"`]/);
    const colorMatch = metadataStr.match(/color:\s*['"`]([^'"`]+)['"`]/);
    
    let aliases = [];
    const aliasesMatch = metadataStr.match(/aliases:\s*\[\s*([\s\S]*?)\s*\]/);
    if (aliasesMatch) {
      const aliasStr = aliasesMatch[1];
      const aliasItems = aliasStr.match(/['"`]([^'"`]+)['"`]/g);
      if (aliasItems) {
        aliases = aliasItems.map(s => s.replace(/['"`]/g, ''));
      }
    }
    
    const type = typeMatch ? typeMatch[1] : null;
    const executor = executorMatch ? executorMatch[1] : null;
    const category = categoryMatch ? categoryMatch[1] : null;
    const description = descriptionMatch ? descriptionMatch[1] : null;
    const color = colorMatch ? colorMatch[1] : null;
    
    if (!type || !executor) {
      console.warn(`Incomplete metadata in ${filePath}: missing type or executor`);
      return null;
    }
    
    return {
      type,
      executor,
      category: category || 'uncategorized',
      description: description || '',
      aliases: aliases || [],
      color: color || '#8B5CF6',
      filePath: path.relative(workflowsDir, filePath),
    };
  } catch (err) {
    console.error(`Error processing ${filePath}: ${err.message}`);
    return null;
  }
}

function findMetadataFiles(dir, files = []) {
  if (!fs.existsSync(dir)) {
    return files;
  }
  
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory() && !item.startsWith('.')) {
      if (item !== 'node_modules') {
        findMetadataFiles(fullPath, files);
      }
    } else if (item === 'metadata.ts' || item === 'metadata.tsx') {
      files.push(fullPath);
    }
  }
  
  return files;
}

function main() {
  console.log('Generating node metadata...');
  console.log(`Scanning: ${workflowsDir}`);
  
  const metadataFiles = findMetadataFiles(workflowsDir);
  console.log(`Found ${metadataFiles.length} metadata files`);
  
  const nodes = [];
  const nodesByType = new Set();
  
  for (const filePath of metadataFiles) {
    console.log(`  Processing: ${path.basename(path.dirname(filePath))}/metadata.ts`);
    
    const meta = extractMetadata(filePath);
    if (meta) {
      if (nodesByType.has(meta.type)) {
        console.warn(`    Duplicate node type: ${meta.type}`);
      }
      nodesByType.add(meta.type);
      nodes.push(meta);
    }
  }
  
  nodes.sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }
    return a.type.localeCompare(b.type);
  });
  
  const metadata = {
    version: '1.0.0',
    generated: new Date().toISOString(),
    nodeCount: nodes.length,
    categories: [...new Set(nodes.map(n => n.category))],
    nodes: nodes,
  };
  
  const sharedDir = path.dirname(outputFile);
  if (!fs.existsSync(sharedDir)) {
    fs.mkdirSync(sharedDir, { recursive: true });
  }
  
  fs.writeFileSync(
    outputFile,
    JSON.stringify(metadata, null, 2),
    'utf-8'
  );
  
  console.log(`Generated: ${outputFile}`);
  console.log(`Summary:`);
  console.log(`   Total nodes: ${nodes.length}`);
  console.log(`   Categories: ${metadata.categories.join(', ')}`);
  console.log(`   Generated: ${metadata.generated}`);
}

main();
