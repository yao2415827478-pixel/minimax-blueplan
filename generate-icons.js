const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputPath = 'H:\\布鲁计划\\图片\\布鲁计划logo.jpg';
const outputDir = 'android\\app\\src\\main\\res';

// Define mipmap sizes
const sizes = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192
};

async function processIcons() {
  const inputBuffer = fs.readFileSync(inputPath);
  
  for (const [dir, size] of Object.entries(sizes)) {
    const outputPath = path.join(outputDir, dir, 'ic_launcher.png');
    await sharp(inputBuffer)
      .resize(size, size, { fit: 'cover', position: 'center' })
      .png()
      .toFile(outputPath);
    console.log('Created:', outputPath);
    
    // Also create rounded version  
    const radius = Math.floor(size / 2);
    const roundSvg = `<svg><rect width="${size}" height="${size}" rx="${radius}" fill="black"/></svg>`;
    const roundPath = path.join(outputDir, dir, 'ic_launcher_round.png');
    await sharp(inputBuffer)
      .resize(size, size, { fit: 'cover', position: 'center' })
      .composite([{
        input: Buffer.from(roundSvg),
        blend: 'dest-in'
      }])
      .png()
      .toFile(roundPath);
    console.log('Created:', roundPath);
  }
  
  // Create foreground icon (adaptive icon) - 108x108
  const fgPath = path.join(outputDir, 'mipmap-anydpi-v26', 'ic_launcher_foreground.png');
  await sharp(inputBuffer)
    .resize(108, 108, { fit: 'cover', position: 'center' })
    .png()
    .toFile(fgPath);
  console.log('Created:', fgPath);
  
  console.log('All icons created successfully!');
}

processIcons().catch(console.error);