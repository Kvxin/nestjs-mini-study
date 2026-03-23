/**
 * 全局常量定义
 * 
 * 这个文件定义了应用中使用的各种常量
 * 集中管理常量可以避免硬编码，便于维护和修改
 * 
 * @module libs/common/tokens
 */

/**
 * Refresh Token Cookie 名称
 * 
 * 作用：定义存储 refresh token 的 Cookie 名称
 * 
 * 使用位置：
 * 1. 设置 Cookie（见 apps/api-gateway/src/auth/auth.controller.ts:92）
 *    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {...})
 * 
 * 2. 读取 Cookie（见 apps/api-gateway/src/auth/auth.controller.ts:72）
 *    const refreshToken = dto.refreshToken ?? req.cookies?.[REFRESH_TOKEN_COOKIE];
 * 
 * 3. Swagger 文档配置（见 apps/api-gateway/src/main.ts:23）
 *    .addCookieAuth(REFRESH_TOKEN_COOKIE)
 * 
 * 为什么使用常量：
 * - 避免在多处硬编码字符串 'refreshToken'
 * - 如果需要修改 Cookie 名称，只需改这一处
 * - 提供类型提示和自动补全
 */
export const REFRESH_TOKEN_COOKIE = 'refreshToken';
