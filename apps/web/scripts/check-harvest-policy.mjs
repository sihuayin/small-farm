import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve('components/planner/plants.ts'), 'utf8');
const categoryByPlant = new Map();
const agronomyByPlant = new Map();

for (const match of source.matchAll(/\{\n\s+id: '([^']+)',\n\s+category: '([^']+)'/g)) {
  categoryByPlant.set(match[1], match[2]);
}

const agronomyBlock = source.match(/const agronomyByPlantId[\s\S]+?;\n\nexport function getPlantAgronomy/)?.[0] || '';
for (const match of agronomyBlock.matchAll(/(\w+): \{([^}]+)\}/g)) {
  const plantId = match[1];
  const body = match[2];
  const rotationGroup = body.match(/rotationGroup: '([^']+)'/)?.[1] || 'other';
  agronomyByPlant.set(plantId, { rotationGroup });
}

function shouldRemoveAfterHarvest(plantId) {
  const category = categoryByPlant.get(plantId);
  const rotationGroup = agronomyByPlant.get(plantId)?.rotationGroup || 'other';
  if (category === 'herb' || rotationGroup === 'perennial') return false;
  return rotationGroup === 'root' || rotationGroup === 'leafy';
}

const expectations = {
  basil: false,
  tomato: false,
  carrot: true,
  lettuce: true,
  strawberry: false
};

const failures = Object.entries(expectations).filter(([plantId, expected]) => shouldRemoveAfterHarvest(plantId) !== expected);

if (failures.length > 0) {
  console.error('Harvest policy failures:');
  for (const [plantId, expected] of failures) {
    console.error(`- ${plantId}: expected ${expected}, got ${shouldRemoveAfterHarvest(plantId)}`);
  }
  process.exit(1);
}

console.log('Harvest policy OK:', Object.keys(expectations).join(', '));
