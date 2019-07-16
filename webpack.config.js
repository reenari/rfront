const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');


module.exports = {
//    mode: 'production',
    devtool: "inline-source-maps",
    entry: {
        app: './src/index.js',
        app2: './src/index2.js',
        appNG: './src/indexNG.js'
    },
    devServer: {
        contentBase: 'dist',
        port: 9080,
//        https: true
    },
    plugins: [
        new CleanWebpackPlugin(),
        new HtmlWebpackPlugin({
            filename: 'index.html',
            chunks: ['app'],
            hash: true,
            template: "./src/index.html"
        }),
        new HtmlWebpackPlugin({
            filename: 'index2.html',
            chunks: ['app2'],
            hash: true,
            template: "./src/index2.html"
        }),
        new HtmlWebpackPlugin({
            filename: 'sensormap.html',
            chunks: ['appNG'],
            hash: true,
            template: "./src/sensormap.html"
        })],
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].bundle[hash].js'
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: "babel-loader",
                        options: {
                            presets: ['@babel/preset-env']
                        }
                    }
                ]
            },
            {
                test: /\.(css|scss)$/,
                use: [
                    'style-loader',
                    'css-loader',
                    'sass-loader'
                ]
            },
            {
                test: /\.(png|svg|jpg|gif)$/,
                use: [
                    'file-loader'
                ]
            }
        ]
    }
};