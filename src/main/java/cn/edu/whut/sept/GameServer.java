package cn.edu.whut.sept;

import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpExchange;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;

/**
 * Snake3D Game HTTP Server
 * 使用 JDK 内置 HttpServer，零外部依赖
 * 负责提供游戏静态资源（HTML/CSS/JS）
 *
 * @author 成员C - Server & UI
 */
public class GameServer {

    private static final int PORT = 8080;

    public static void main(String[] args) throws IOException {
        HttpServer server = HttpServer.create(new InetSocketAddress(PORT), 0);
        server.createContext("/", new GameHandler());
        server.setExecutor(null);
        server.start();
        System.out.println("Snake3D Server started at http://localhost:" + PORT);
    }

    /**
     * 静态文件处理器
     * 从 classpath 的 /web/ 目录加载资源文件
     */
    static class GameHandler implements HttpHandler {

        @Override
        public void handle(HttpExchange exchange) throws IOException {
            try {
                String path = exchange.getRequestURI().getPath();
                if ("/".equals(path)) {
                    path = "/index.html";
                }

                String resourcePath = "/web" + path;
                InputStream is = getClass().getResourceAsStream(resourcePath);

                if (is == null) {
                    // 资源不存在，返回 404
                    String body = "404 Not Found: " + path;
                    exchange.sendResponseHeaders(404, body.getBytes("UTF-8").length);
                    OutputStream os = exchange.getResponseBody();
                    os.write(body.getBytes("UTF-8"));
                    os.close();
                    return;
                }

                // 读取资源内容
                byte[] bytes = readAllBytes(is);
                is.close();

                // 设置 Content-Type
                String contentType = getContentType(path);
                exchange.getResponseHeaders().set("Content-Type", contentType);
                exchange.sendResponseHeaders(200, bytes.length);

                OutputStream os = exchange.getResponseBody();
                os.write(bytes);
                os.close();

            } catch (Exception e) {
                e.printStackTrace();
                String body = "500 Internal Server Error";
                exchange.sendResponseHeaders(500, body.getBytes("UTF-8").length);
                OutputStream os = exchange.getResponseBody();
                os.write(body.getBytes("UTF-8"));
                os.close();
            }
        }

        /**
         * 根据文件扩展名返回 MIME 类型
         */
        private String getContentType(String path) {
            if (path.endsWith(".html")) {
                return "text/html; charset=UTF-8";
            }
            if (path.endsWith(".css")) {
                return "text/css; charset=UTF-8";
            }
            if (path.endsWith(".js")) {
                return "application/javascript; charset=UTF-8";
            }
            if (path.endsWith(".png")) {
                return "image/png";
            }
            if (path.endsWith(".jpg") || path.endsWith(".jpeg")) {
                return "image/jpeg";
            }
            if (path.endsWith(".svg")) {
                return "image/svg+xml";
            }
            return "application/octet-stream";
        }

        /**
         * Java 8 兼容的 readAllBytes 实现
         */
        private byte[] readAllBytes(InputStream is) throws IOException {
            ByteArrayOutputStream buffer = new ByteArrayOutputStream();
            byte[] data = new byte[8192];
            int n;
            while ((n = is.read(data, 0, data.length)) != -1) {
                buffer.write(data, 0, n);
            }
            return buffer.toByteArray();
        }
    }
}
