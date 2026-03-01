import express from "express";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.post("/api/fetch-drive", async (req, res) => {
    const { url } = req.body;
    try {
      const match = url.match(/[-\w]{25,}/);
      if (!match) {
        return res.status(400).json({ error: "無效的 Google Drive 連結，請確認連結中包含檔案 ID。" });
      }
      const id = match[0];
      const driveUrl = `https://drive.google.com/uc?export=download&id=${id}`;
      
      const response = await fetch(driveUrl);
      if (!response.ok) {
        throw new Error(`無法下載檔案 (狀態碼: ${response.status})。請確認連結權限已設為「知道連結的人均可讀取」。`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/html') && buffer.length < 500000) {
         if (buffer.toString('utf8').includes('virus-scan') || buffer.toString('utf8').includes('Google Drive')) {
            throw new Error("檔案過大，Google Drive 要求手動確認病毒掃描，目前無法透過程式自動下載。請改用本地上傳。");
         }
      }

      res.setHeader('Content-Type', contentType || 'application/octet-stream');
      res.send(buffer);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
