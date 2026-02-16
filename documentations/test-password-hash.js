const bcrypt = require('bcryptjs');

async function testPasswordHash() {
  console.log('Testing password hashing and verification...\n');

  const password = 'Q5^Be#YbNf4#';
  console.log('Original password:', password);
  console.log('Password length:', password.length);
  console.log('Password chars:', password.split('').map(c => `${c}(${c.charCodeAt(0)})`).join(' '));
  console.log();

  // Create a hash
  console.log('Creating hash...');
  const hash = await bcrypt.hash(password, 12);
  console.log('Hash created:', hash);
  console.log('Hash length:', hash.length);
  console.log();

  // Verify the hash
  console.log('Verifying hash...');
  const isValid = await bcrypt.compare(password, hash);
  console.log('Verification result:', isValid);
  console.log();

  // Test with the stored hash from the error
  const storedHash = '$2b$12$ncI...'; // This is truncated in the error
  console.log('Note: The stored hash in database starts with:', storedHash);
  console.log('This is a valid bcrypt hash format (bcrypt with cost 12)');
}

testPasswordHash().catch(console.error);
