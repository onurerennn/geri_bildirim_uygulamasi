const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

// Silinecek klasörler
const foldersToRemove = [
    'node_modules',
    '.expo',
    '.expo-shared',
    '.cache'
];

// Temizleme işlemi
console.log('Geçici dosyaları temizliyorum...');
foldersToRemove.forEach(folder => {
    const folderPath = path.join(__dirname, folder);
    if (fs.existsSync(folderPath)) {
        console.log(`${folder} siliniyor...`);
        try {
            if (process.platform === 'win32') {
                execSync(`rmdir /s /q "${folderPath}"`);
            } else {
                execSync(`rm -rf "${folderPath}"`);
            }
            console.log(`${folder} başarıyla silindi.`);
        } catch (err) {
            console.error(`${folder} silinirken hata oluştu:`, err);
        }
    } else {
        console.log(`${folder} zaten mevcut değil.`);
    }
});

// Bağımlılıkları yeniden kurma
console.log('\nBağımlılıkları yeniden kuruyorum...');
try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('Bağımlılıklar başarıyla kuruldu.');
} catch (err) {
    console.error('Bağımlılıklar kurulurken hata oluştu:', err);
    process.exit(1);
}

console.log('\nProje başarıyla temizlendi ve yeniden kuruldu.');
console.log('Şimdi "npm start -- --reset-cache" komutu ile projeyi başlatabilirsiniz.'); 