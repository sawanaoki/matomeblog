const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'data.db');
const OUTPUT_DIR = path.join(__dirname, '../frontend/src/data');

// DB接続インスタンスの取得
async function getDb() {
    const db = await open({
        filename: DB_PATH,
        driver: sqlite3.Database
    });

    // 初期化: テーブルが存在しなければ作成
    await db.exec(`
        CREATE TABLE IF NOT EXISTS articles (
            id TEXT PRIMARY KEY,
            title TEXT,
            originalTitle TEXT,
            link TEXT,
            pubDate TEXT,
            contentSnippet TEXT,
            source TEXT,
            imageUrl TEXT,
            aiSummary TEXT,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            articleId TEXT,
            commentId INTEGER,
            text TEXT,
            name TEXT,
            isVIP BOOLEAN,
            time TEXT,
            FOREIGN KEY (articleId) REFERENCES articles(id)
        );
    `);

    return db;
}

/**
 * 記事とコメントをDBに保存（重複があれば無視）
 */
async function saveArticle(article, comments = []) {
    const db = await getDb();

    // 記事の保存（すでに存在する場合は無視）
    await db.run(`
        INSERT OR IGNORE INTO articles 
        (id, title, originalTitle, link, pubDate, contentSnippet, source, imageUrl, aiSummary) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        article.id,
        article.title,
        article.originalTitle,
        article.link,
        article.pubDate,
        article.contentSnippet,
        article.source,
        article.imageUrl,
        JSON.stringify(article.aiSummary)
    ]);

    // コメントの保存
    for (const comment of comments) {
        await db.run(`
            INSERT OR IGNORE INTO comments (articleId, commentId, text, name, isVIP, time)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            article.id,
            comment.id,
            comment.text,
            comment.name,
            comment.isVIP ? 1 : 0,
            comment.time
        ]);
    }
}

/**
 * DB内の記事とコメントを束ねて、Astro用にJSON出力する
 */
async function exportToJSON() {
    const db = await getDb();

    // 日付順で最新100件を取得
    const rows = await db.all(`
        SELECT * FROM articles ORDER BY pubDate DESC LIMIT 100
    `);

    const articles = [];
    for (const row of rows) {
        const articleComments = await db.all(`
            SELECT commentId as id, text, name, isVIP, time 
            FROM comments WHERE articleId = ? ORDER BY commentId ASC
        `, [row.id]);

        articles.push({
            id: row.id,
            title: row.title,
            originalTitle: row.originalTitle,
            link: row.link,
            pubDate: row.pubDate,
            contentSnippet: row.contentSnippet,
            source: row.source,
            imageUrl: row.imageUrl,
            aiSummary: JSON.parse(row.aiSummary),
            scrapedComments: articleComments.map(c => ({
                ...c,
                isVIP: c.isVIP === 1
            }))
        });
    }

    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const outputPath = path.join(OUTPUT_DIR, 'articles.json');
    fs.writeFileSync(outputPath, JSON.stringify(articles, null, 2), 'utf-8');
    console.log(`Exported ${articles.length} latest articles to JSON layout.`);
}

module.exports = {
    saveArticle,
    exportToJSON
};
