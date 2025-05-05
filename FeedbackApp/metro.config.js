// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

// Özel konfigürasyonu al
const defaultConfig = getDefaultConfig(__dirname);

// Modülleri resolver için ekle
defaultConfig.resolver.extraNodeModules = require('node-libs-react-native');
defaultConfig.resolver.assetExts = [...defaultConfig.resolver.assetExts, 'db'];

// Native modüllerin doğru şekilde çözümlenmesi için ayarlar
defaultConfig.resolver.sourceExts = [...defaultConfig.resolver.sourceExts, 'jsx', 'js', 'ts', 'tsx', 'json', 'cjs', 'mjs'];
defaultConfig.transformer.minifierConfig = {
    keep_classnames: true,  // Class isimlerini koru
    keep_fnames: true,      // Fonksiyon isimlerini koru
    mangle: {
        keep_classnames: true,
        keep_fnames: true
    }
};

module.exports = defaultConfig; 