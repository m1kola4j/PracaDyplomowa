const fs = require('fs');
const path = require('path');
const db = require('../src/config/db');

const PORTION_WEIGHTS = {
  '1 large': 50, '2 large': 100, '1 egg': 50, '2 eggs': 100,
  '1 cup': 240, '1/2 cup': 120, '1/4 cup': 60, '3/4 cup': 180, '3 cups': 90,
  '1 oz': 28, '2 oz': 56, '3 oz': 85, '4 oz': 113, '5 oz': 142, '6 oz': 170,
  '1 tbsp': 15, '2 tbsp': 30, '1 tsp': 5,
  '1 slice': 30, '2 slices': 60, '1 piece': 100,
  '1 can': 400, '1 medium': 150, '1 large': 200, '1 small': 100,
  '1 patty': 90, '1 link': 45, '1 whole': 60,
};

const CATEGORY_DEFAULTS = {
  'Fruit': 150, 'Vegetable': 150, 'Protein': 100, 'Protein/Meat': 113,
  'Protein/Fish': 113, 'Protein/Dairy': 100, 'Dairy': 240, 'Grain': 50,
  'Grain/Processed': 30, 'Nut': 28, 'Legume': 100, 'Beverage': 240,
  'Meal': 300, 'Meal/Protein': 300, 'Meal/Pasta': 300, 'Meal/Processed': 250,
  'Snack': 30, 'Snack/Processed': 28, 'Dessert': 100, 'Condiment': 15,
  'Supplement': 100,
};

function extractPortionWeight(foodName, category) {
  const parenMatch = foodName.match(/\(([^)]+)\)/);
  if (parenMatch) {
    const portion = parenMatch[1].toLowerCase();
    for (const [key, weight] of Object.entries(PORTION_WEIGHTS)) {
      if (portion.includes(key)) return weight;
    }
    const ozMatch = portion.match(/(\d+)\s*oz/);
    if (ozMatch) return parseInt(ozMatch[1]) * 28;
    const cupMatch = portion.match(/(\d+(?:\/\d+)?)\s*cup/);
    if (cupMatch) {
      const val = cupMatch[1];
      if (val === '1/2') return 120;
      if (val === '1/4') return 60;
      if (val === '3/4') return 180;
      return parseInt(val) * 240;
    }
    const sliceMatch = portion.match(/(\d+)\s*slice/);
    if (sliceMatch) return parseInt(sliceMatch[1]) * 30;
    const tbspMatch = portion.match(/(\d+)\s*tbsp/);
    if (tbspMatch) return parseInt(tbspMatch[1]) * 15;
  }
  return CATEGORY_DEFAULTS[category] || 100;
}

function convertTo100g(value, portionWeight) {
  if (portionWeight === 0 || !portionWeight) return value;
  return Math.round((value * 100 / portionWeight) * 10) / 10;
}

function cleanProductName(name) {
  return name.replace(/\s*\([^)]*\)\s*/g, ' ').trim().replace(/\s+/g, ' ');
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inParens = 0;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '(') {
      inParens++;
      current += char;
    } else if (char === ')') {
      inParens--;
      current += char;
    } else if (char === ',' && inParens === 0) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

async function importCSV() {
  console.log('Importuje produkty z CSV (wszystko na 100g)...\n');
  
  const csvPath = path.join(__dirname, 'daily_food_nutrition_dataset.csv');
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  console.log('Znaleziono ' + (lines.length - 1) + ' produktow w CSV\n');
  
  const products = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < 6) continue;
    
    const foodName = values[0];
    const category = values[1];
    const calories = parseFloat(values[2]) || 0;
    const protein = parseFloat(values[3]) || 0;
    const carbs = parseFloat(values[4]) || 0;
    const fat = parseFloat(values[5]) || 0;
    
    const portionWeight = extractPortionWeight(foodName, category);
    
    let kcal_100 = convertTo100g(calories, portionWeight);
    let protein_100 = convertTo100g(protein, portionWeight);
    let carbs_100 = convertTo100g(carbs, portionWeight);
    let fat_100 = convertTo100g(fat, portionWeight);
    
    const macroSum = protein_100 + carbs_100 + fat_100;
    if (macroSum > 100) {
      const scale = 95 / macroSum;
      protein_100 = Math.round(protein_100 * scale * 10) / 10;
      carbs_100 = Math.round(carbs_100 * scale * 10) / 10;
      fat_100 = Math.round(fat_100 * scale * 10) / 10;
      kcal_100 = Math.round(protein_100 * 4 + carbs_100 * 4 + fat_100 * 9);
    }
    
    products.push({
      name: cleanProductName(foodName),
      category: category,
      kcal_100: Math.round(kcal_100),
      protein_100: Math.round(protein_100 * 10) / 10,
      carbs_100: Math.round(carbs_100 * 10) / 10,
      fat_100: Math.round(fat_100 * 10) / 10,
    });
  }
  
  console.log('Przygotowano ' + products.length + ' produktow\n');
  console.log('Przyklady (na 100g):');
  products.slice(0, 5).forEach(p => {
    console.log('   ' + p.name + ': ' + p.kcal_100 + ' kcal | B:' + p.protein_100 + 'g | W:' + p.carbs_100 + 'g | T:' + p.fat_100 + 'g');
  });
  
  console.log('\nImportowanie do bazy...\n');
  
  let imported = 0, skipped = 0, errors = 0;
  
  for (const product of products) {
    try {
      const existing = await db.query(
        'SELECT id FROM products WHERE LOWER(name) = LOWER($1)', [product.name]
      );
      
      if (existing.rows.length > 0) { skipped++; continue; }
      
      await db.query(
        `INSERT INTO products (name, category, kcal_100, protein_100, carbs_100, fat_100, added_by_user_id, is_verified, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NULL, true, NOW())`,
        [product.name, product.category, product.kcal_100, product.protein_100, product.carbs_100, product.fat_100]
      );
      
      imported++;
      if (imported % 100 === 0) process.stdout.write('\r   Zaimportowano: ' + imported);
    } catch (err) {
      console.error('\nBlad: ' + product.name + ':', err.message);
      errors++;
    }
  }
  
  console.log('\n\nPODSUMOWANIE:');
  console.log('   Zaimportowano: ' + imported);
  console.log('   Duplikaty: ' + skipped);
  console.log('   Bledy: ' + errors);
  console.log('\nGotowe!\n');
  
  process.exit(0);
}

importCSV().catch(err => { console.error(err); process.exit(1); });
