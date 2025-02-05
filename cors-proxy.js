// cors-proxy.js
import cors_proxy from "cors-anywhere";

const host = "localhost";
const port = 8080;

cors_proxy.createServer({
  originWhitelist: [], // Разрешаем все источники
  requireHeader: ["origin", "x-requested-with"],
  removeHeaders: ["cookie", "cookie2"]
}).listen(port, host, () => {
  console.log(`🚀 CORS Proxy запущен на http://${host}:${port}`);
});
