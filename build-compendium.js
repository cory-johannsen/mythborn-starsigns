#!/usr/bin/env node

/**
 * Build script for Foundry VTT compendium packs
 * Converts individual JSON files in packs/json/ into a single .db file
 */

const fs = require('fs');
const path = require('path');

const SOURCE_DIR = path.join(__dirname, 'packs', 'json');
const OUTPUT_FILE = path.join(__dirname, 'packs', 'starsign-conditions.db');

console.log('🔨 Building Starsign Conditions Compendium...\n');

try {
  // Ensure source directory exists
  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`❌ Error: Source directory not found: ${SOURCE_DIR}`);
    process.exit(1);
  }

  // Get all JSON files
  const jsonFiles = fs.readdirSync(SOURCE_DIR)
    .filter(file => file.endsWith('.json'))
    .sort(); // Sort for consistent order

  if (jsonFiles.length === 0) {
    console.error(`❌ Error: No JSON files found in ${SOURCE_DIR}`);
    process.exit(1);
  }

  console.log(`📂 Found ${jsonFiles.length} condition file(s):`);
  jsonFiles.forEach(file => console.log(`   - ${file}`));
  console.log();

  // Delete existing .db file if it exists
  if (fs.existsSync(OUTPUT_FILE)) {
    fs.unlinkSync(OUTPUT_FILE);
    console.log('🗑️  Removed existing .db file\n');
  }

  // Process each JSON file
  const lines = [];
  for (const file of jsonFiles) {
    const filePath = path.join(SOURCE_DIR, file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    try {
      // Parse and validate JSON
      const json = JSON.parse(content);
      
      // Validate required fields
      if (!json._id) {
        console.error(`❌ Error: Missing _id in ${file}`);
        process.exit(1);
      }
      if (!json.name) {
        console.error(`❌ Error: Missing name in ${file}`);
        process.exit(1);
      }
      if (json.type !== 'condition') {
        console.error(`❌ Error: Invalid type "${json.type}" in ${file} (expected "condition")`);
        process.exit(1);
      }
      
      // Convert to compact single-line JSON
      const compactLine = JSON.stringify(json);
      lines.push(compactLine);
      
      console.log(`✅ Processed: ${json.name} (${json._id})`);
    } catch (error) {
      console.error(`❌ Error parsing ${file}:`, error.message);
      process.exit(1);
    }
  }

  // Write all lines to .db file
  fs.writeFileSync(OUTPUT_FILE, lines.join('\n') + '\n', 'utf8');

  console.log(`\n✨ Successfully built compendium!`);
  console.log(`📄 Output: ${OUTPUT_FILE}`);
  console.log(`📊 Total conditions: ${lines.length}\n`);

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

