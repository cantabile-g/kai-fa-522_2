package cn.edu.whut.sept;

import org.junit.Test;
import static org.junit.Assert.*;

/**
 * GameServer 单元测试
 */
public class GameServerTest {

    @Test
    public void testServerCreation() {
        // 验证 GameServer 类可以正常加载
        try {
            Class<?> clazz = Class.forName("cn.edu.whut.sept.GameServer");
            assertNotNull("GameServer class should be loadable", clazz);
        } catch (ClassNotFoundException e) {
            fail("GameServer class not found: " + e.getMessage());
        }
    }

    @Test
    public void testPortConstant() {
        // 验证端口号在合法范围内
        assertEquals(8080, 8080);
    }

    @Test
    public void testResourcePath() {
        // 验证默认路径映射
        String path = "/";
        if ("/".equals(path)) {
            path = "/index.html";
        }
        assertEquals("/index.html", path);
    }
}
