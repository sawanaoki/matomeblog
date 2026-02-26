const Parser = require('rss-parser');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();
const { OpenAI } = require('openai');

const parser = new Parser();

// OpenAIの初期化 (APIキーが設定されている場合のみ有効になる)
let openai = null;
if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// サンプルのRSSフィードURLリスト (エンタメ・バズまとめ系)
const FEED_URLS = [
    'https://news.yahoo.co.jp/rss/topics/top-picks.xml', // Yahoo 主要ニュース
    'https://news.yahoo.co.jp/rss/topics/entertainment.xml', // Yahoo エンタメ
];

const OUTPUT_DIR = path.join(__dirname, '../frontend/src/data');

// OpenAIによる3行まとめとキャッチーなタイトルの生成
async function generateAISummary(text, originalTitle) {
    if (!openai || text.length < 50) return null;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'system',
                    content: 'あなたは「はちま起稿」のようなまとめサイトの優秀なAI編集者です。ユーザーが入力したニュース記事の本文やスニペットから、以下の2点をJSON形式で出力してください。\n1. title: 元のタイトルよりも少し煽る、思わずクリックしたくなるキャッチーなタイトル（やりすぎない程度）。\n2. summary: 記事の内容を箇条書きで分かりやすくまとめた「3行まとめ」（配列で3要素）。\n出力は必ずJSONのみとしてください。'
                },
                {
                    role: 'user',
                    content: `元のタイトル: ${originalTitle}\n本文/スニペット: ${text}`
                }
            ],
            response_format: { type: "json_object" },
            max_tokens: 300,
        });

        const result = JSON.parse(response.choices[0].message.content);
        return {
            aiTitle: result.title,
            aiSummary: result.summary, // array of strings
        };
    } catch (err) {
        console.error('AI Summary Gen Error:', err.message);
        return null;
    }
}

const { saveArticle, exportToJSON } = require('./db');

async function fetchFeeds() {
    console.log('Fetching RSS feeds...');

    for (const url of FEED_URLS) {
        try {
            const feed = await parser.parseURL(url);
            console.log(`Fetched: ${feed.title}`);

            for (const item of feed.items) {
                const id = crypto.createHash('md5').update(item.link).digest('hex');
                const imageUrl = `https://picsum.photos/seed/${id}/800/400`;
                const contentText = item.contentSnippet || item.content || '';

                const article = {
                    id,
                    title: item.title,
                    originalTitle: item.title,
                    link: item.link,
                    pubDate: item.pubDate,
                    contentSnippet: contentText,
                    source: feed.title,
                    imageUrl,
                    // AIを使わない場合の固定文言（フロントエンド側で要約に見せるテキスト）
                    aiSummary: [
                        'この記事は元サイトから自動取得しています',
                        '詳細なニュースの続きは「元記事を読む」からご確認ください',
                        '['.concat(contentText.substring(0, 30)).concat('...]')
                    ]
                };

                // SQLite DBに保存
                await saveArticle(article);
            }
        } catch (error) {
            console.error(`Error fetching ${url}:`, error.message);
        }
    }

    // SQLiteから最新記事JSONを書き出す
    await exportToJSON();
}

fetchFeeds();
