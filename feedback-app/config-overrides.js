const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = function override(config, env) {
    // Add babel-loader
    config.module.rules.push({
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: {
            loader: 'babel-loader',
            options: {
                presets: [
                    '@babel/preset-env',
                    '@babel/preset-react',
                    '@babel/preset-typescript'
                ]
            }
        }
    });

    // Replace the existing HtmlWebpackPlugin with a new instance
    config.plugins = config.plugins.map(plugin => {
        if (plugin.constructor.name === 'HtmlWebpackPlugin') {
            return new HtmlWebpackPlugin({
                template: path.resolve(__dirname, 'public/index.html'),
                inject: true,
                ...plugin.options
            });
        }
        return plugin;
    });

    return config;
}; 