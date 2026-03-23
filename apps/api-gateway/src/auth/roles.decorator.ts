/**
 * 角色装饰器
 * 
 * 作用：定义一个装饰器，用于标记路由需要的角色权限
 * 
 * 与 RolesGuard 配合使用：
 * - Roles 装饰器：设置元数据（需要的角色）
 * - RolesGuard：读取元数据并检查用户角色
 * 
 * @module apps/api-gateway/src/auth/roles.decorator
 */

import { SetMetadata } from '@nestjs/common';
import { JwtUserRole } from '../../../../libs/contracts/messages';

/**
 * ROLES_KEY - 元数据键
 * 
 * 作用：存储和读取角色信息的键名
 * 
 * 为什么需要常量：
 * - 装饰器和守卫需要共享同一个键
 * - 避免硬编码字符串
 * - 修改时只需改一处
 */
export const ROLES_KEY = 'roles';

/**
 * Roles - 角色装饰器工厂函数
 * 
 * 作用：创建一个装饰器，标记路由需要的角色
 * 
 * 参数 roles:
 * - 可变参数，可以传入多个角色
 * - 例如：@Roles('ADMIN') 或 @Roles('USER', 'ADMIN')
 * 
 * 返回值：
 * - SetMetadata 装饰器
 * - 将角色信息存储到元数据中
 * 
 * 使用示例（见 apps/api-gateway/src/products/products.controller.ts）：
 * 
 * ```typescript
 * @Post()
 * @UseGuards(AccessAuthGuard, RolesGuard)  // 使用守卫
 * @Roles('ADMIN')  // 只有管理员可以访问
 * @ApiOperation({ summary: 'Create product (admin)' })
 * create(@Body() dto: CreateProductDto) {
 *   // ...
 * }
 * ```
 * 
 * 工作原理：
 * 1. @Roles('ADMIN') 装饰器将 ['ADMIN'] 存储到元数据
 * 2. 请求到达时，RolesGuard 被触发
 * 3. RolesGuard 读取元数据中的角色要求
 * 4. 检查 request.user.role 是否在允许的角色列表中
 * 5. 通过则允许访问，否则返回 403 Forbidden
 * 
 * 多角色示例：
 * 
 * ```typescript
 * @Roles('USER', 'ADMIN')  // 用户或管理员都可以
 * @Get()
 * findAll() { ... }
 * ```
 */
export const Roles = (...roles: JwtUserRole[]) => SetMetadata(ROLES_KEY, roles);
