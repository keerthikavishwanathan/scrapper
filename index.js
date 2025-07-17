const express = require("express");
const puppeteer = require("puppeteer");

const app = express();
app.use(express.json());

app.post("/scrape", async (req, res) => {
  const { url } = req.body;

  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "Provide a valid 'url'" });
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();

  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    // Try to find a redirected article
    const links = await page.$$eval("a", as =>
      as
        .map(a => a.href)
        .filter(href => href.startsWith("http") && !href.includes("google.com"))
    );

    if (links.length > 0) {
      await page.goto(links[0], { waitUntil: "domcontentloaded", timeout: 30000 });
    }

    const title = await page.title();
    const content = await page.evaluate(() => {
      const article = document.querySelector("article") || document.body;
      return article.innerText || '';
    });

    res.json({
      title,
      content: content.slice(0, 3000) // limit output
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    await browser.close();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
