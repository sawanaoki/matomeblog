const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 保存先のディレクトリ（既存のRSSのデータと合わせる形）
const OUTPUT_DIR = path.join(__dirname, '../frontend/src/data');

/**
 * 指定したURLからHTMLを取得し、特定のセレクタに一致するテキスト（例: 掲示板のレスや記事のパラグラフ）を抽出する例
 */
async function scrapeComments(url, selector) {
    try {
        console.log(`Scraping: ${url}`);
        // ユーザーエージェントを偽装してブロックを防ぐ（基本的な対策）
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
            },
            timeout: 10000 // 10秒でタイムアウト
        });

        const $ = cheerio.load(data);
        const comments = [];

        // セレクタ（例: ".comment-body", ".post-text" など）を使って要素をループ
        $(selector).each((index, element) => {
            // 余分な空白を削除してテキストを取得
            const text = $(element).text().replace(/\s+/g, ' ').trim();
            if (text && text.length > 5) { // 極端に短いものは除外
                comments.push({
                    id: index + 1,
                    text: text,
                    // ランダムな名前や時間を付与するモック処理（実際はHTMLから取得）
                    name: index === 0 ? 'スレ主' : '名無しさん',
                    isVIP: Math.random() > 0.8,
                    time: new Date(Date.now() - Math.floor(Math.random() * 10000000)).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
                });
            }
        });

        console.log(`Extracted ${comments.length} comments.`);
        return comments;

    } catch (error) {
        console.error(`Scraping error for ${url}:`, error.message);
        return [];
    }
}

// 実行テスト用のモック処理
async function runScraper() {
    // 例: Yahooニュースのコメント欄や、特定まとめブログの記事本文など
    // ※ 実際の運用ではターゲットサイトの利用規約（robots.txtなど）を確認してください
    const testUrl = 'https://news.yahoo.co.jp/'; // （テスト用URL）
    // Yahooのトップニューストピックスのタイトルをスクレイピングするテスト
    const selector = '.sc-1yofey-0'; // ※Yahooのクラス名は頻繁に変わるため、あくまでテスト用

    const extractedComments = await scrapeComments(testUrl, selector);

    // テスト用に、既存のarticles.jsonの最初の記事にスクレイピングしたコメントを結合するデモ
    const articlesPath = path.join(OUTPUT_DIR, 'articles.json');
    if (fs.existsSync(articlesPath)) {
        let articles = JSON.parse(fs.readFileSync(articlesPath, 'utf-8'));

        if (articles.length > 0 && extractedComments.length > 0) {
            // 最初の記事の実コメントとしてモックを上書き（フロントエンドで利用可能に）
            articles[0].scrapedComments = extractedComments.slice(0, 5); // 上位5件
            fs.writeFileSync(articlesPath, JSON.stringify(articles, null, 2), 'utf-8');
            console.log(`Updated article "${articles[0].title}" with scraped comments.`);
        }
    } else {
        console.log('articles.json not found. Run rssFetcher.js first.');
    }
}

// スクリプトが直接実行された場合
if (require.main === module) {
    runScraper();
}

module.exports = { scrapeComments };
