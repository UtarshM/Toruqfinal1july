const { execSync } = require('child_process');

try {
  console.log('Staging files...');
  execSync('git add -A', { stdio: 'inherit' });

  console.log('Committing changes...');
  execSync('git commit -m "fix: bypass dashboard zero cache on refresh and update auth guard fallback"', { stdio: 'inherit' });

  console.log('Pushing to origin main...');
  execSync('git push origin main', { stdio: 'inherit' });

  console.log('✅ Push complete!');
} catch (err) {
  console.error('Push status:', err.message);
}
