module.exports = function (api) {
    api.cache(true);
    return {
        presets: ['babel-preset-expo'],
        plugins: [
            // Native modülleri doğru şekilde işlemek için
            ['module-resolver', {
                alias: {
                    '@': './src',
                },
                extensions: [
                    '.ios.js',
                    '.android.js',
                    '.js',
                    '.ts',
                    '.tsx',
                    '.json',
                ]
            }]
        ]
    };
}; 