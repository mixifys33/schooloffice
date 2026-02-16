const fs = require('fs');
const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

// Find all model definitions
const modelRegex = /^model (\w+) \{([\s\S]*?)^}/gm;
let match;
const modelsWithoutSchoolId = [];

while ((match = modelRegex.exec(schema)) !== null) {
  const modelName = match[1];
  const modelBody = match[2];
  
  // Check if model has schoolId field
  if (!modelBody.includes('schoolId')) {
    modelsWithoutSchoolId.push(modelName);
  }
}

console.log(`\nModels WITHOUT schoolId (${modelsWithoutSchoolId.length}):\n`);
modelsWithoutSchoolId.forEach((name, i) => {
  console.log(`${i + 1}. ${name}`);
});
