/**
 * 产品控制器
 * 
 * 作用：处理商品相关的 HTTP 请求
 * 
 * 路由前缀：/api/products
 * 
 * 接口分类：
 * - 公开接口：列表、详情（无需认证）
 * - 管理接口：创建、更新、删除（需要 ADMIN 角色）
 * 
 * @module apps/api-gateway/src/products/products.controller
 */

import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ClientProxy } from '@nestjs/microservices';
import { requestFromClient } from '../../../../libs/common/rpc';
import {
  CLIENT_TOKENS,
  PRODUCT_PATTERNS,
} from '../../../../libs/contracts/messages';
import { AccessAuthGuard } from '../auth/access-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateProductDto, UpdateProductDto } from '../auth/auth.dto';

/**
 * ApiTags - Swagger 标签
 * 
 * 作用：在 Swagger 文档中将接口归类到 "Products" 标签下
 */
@ApiTags('Products')

/**
 * Controller - 控制器装饰器
 * 
 * 参数 'products':
 * - 路由前缀
 * - 所有端点都以 /products 开头
 * 
 * 完整路由：
 * - GET /api/products - 列表
 * - GET /api/products/:id - 详情
 * - POST /api/products - 创建（管理员）
 * - PATCH /api/products/:id - 更新（管理员）
 * - DELETE /api/products/:id - 删除（管理员）
 */
@Controller('products')
export class ProductsController {
  /**
   * 构造函数注入依赖
   * 
   * @Inject(CLIENT_TOKENS.PRODUCT_SERVICE):
   * - 注入产品服务客户端
   * - 通过 TCP 与产品服务通信
   */
  constructor(
    @Inject(CLIENT_TOKENS.PRODUCT_SERVICE)
    private readonly productClient: ClientProxy,
  ) {}

  // ============ 公开接口 ============

  /**
   * 查询商品列表接口
   * 
   * HTTP: GET /api/products
   * 
   * 认证要求：无（公开接口）
   * 
   * 查询参数：无（当前返回所有商品）
   * 
   * 响应示例：
   * ```json
   * {
   *   "success": true,
   *   "data": [
   *     {
   *       "id": "clx123",
   *       "title": "Mechanical Keyboard",
   *       "description": "Hot-swappable mechanical keyboard.",
   *       "price": 399,
   *       "stock": 20,
   *       "status": "ACTIVE",
   *       "coverUrl": "https://example.com/keyboard.jpg",
   *       "createdAt": "...",
   *       "updatedAt": "..."
   *     }
   *   ],
   *   "timestamp": "..."
   * }
   * ```
   */
  @Get()
  @ApiOperation({ summary: 'List products' })
  list() {
    /**
     * 发送请求到产品服务
     * 
     * PRODUCT_PATTERNS.LIST = 'product.list'
     * 空对象表示不需要额外参数
     */
    return requestFromClient(this.productClient.send(PRODUCT_PATTERNS.LIST, {}));
  }

  /**
   * 查询商品详情接口
   * 
   * HTTP: GET /api/products/:id
   * 
   * 认证要求：无（公开接口）
   * 
   * 路由参数：
   * - id: 商品 ID
   * 
   * 响应示例：
   * ```json
   * {
   *   "success": true,
   *   "data": {
   *     "id": "clx123",
   *     "title": "Mechanical Keyboard",
   *     "price": 399,
   *     "stock": 18,
   *     ...
   *   },
   *   "timestamp": "..."
   * }
   * ```
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get product detail' })
  findOne(@Param('id') id: string) {
    /**
     * @Param('id') - 路由参数装饰器
     * 
     * 作用：从 URL 路径中提取参数
     * 
     * 示例：
     * - URL: /api/products/clx123
     * - @Param('id') = 'clx123'
     * 
     * 发送请求到产品服务查询详情
     */
    return requestFromClient(
      this.productClient.send(PRODUCT_PATTERNS.FIND_ONE, { id }),
    );
  }

  // ============ 管理接口（需要 ADMIN 角色）============

  /**
   * 创建商品接口
   * 
   * HTTP: POST /api/products
   * 
   * 认证要求：
   * - 需要有效的 JWT Access Token
   * - 需要 ADMIN 角色
   * 
   * 请求体：
   * ```json
   * {
   *   "title": "New Product",
   *   "description": "Product description",
   *   "price": 199,
   *   "stock": 100,
   *   "status": "ACTIVE",  // 可选，默认 ACTIVE
   *   "coverUrl": "https://example.com/image.jpg"  // 可选
   * }
   * ```
   * 
   * 验证规则（见 CreateProductDto）：
   * - title: 必填，字符串
   * - price: 必填，数字，>= 0
   * - stock: 必填，整数，>= 0
   * - description, status, coverUrl: 可选
   */
  @Post()
  @ApiBearerAuth()
  @UseGuards(AccessAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create product (admin)' })
  create(@Body() dto: CreateProductDto) {
    /**
     * @Body() - 请求体装饰器
     * 
     * 作用：获取 HTTP 请求体
     * 
     * 自动验证：
     * - ValidationPipe 根据 DTO 的装饰器验证请求体
     * - 如果验证失败，返回 400 Bad Request
     * 
     * 发送请求到产品服务创建商品
     */
    return requestFromClient(
      this.productClient.send(PRODUCT_PATTERNS.CREATE, dto),
    );
  }

  /**
   * 更新商品接口
   * 
   * HTTP: PATCH /api/products/:id
   * 
   * 认证要求：
   * - 需要有效的 JWT Access Token
   * - 需要 ADMIN 角色
   * 
   * 路由参数：
   * - id: 商品 ID
   * 
   * 请求体（所有字段可选，部分更新）：
   * ```json
   * {
   *   "title": "Updated Title",
   *   "price": 299
   * }
   * ```
   * 
   * PATCH vs PUT:
   * - PATCH: 部分更新，只更新提供的字段
   * - PUT: 完整更新，需要提供所有字段
   */
  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(AccessAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update product (admin)' })
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    /**
     * 参数组合：
     * - @Param('id'): 从 URL 获取商品 ID
     * - @Body() dto: 从请求体获取更新数据
     * 
     * 发送请求到产品服务更新商品
     * 
     * { id, ...dto }:
     * - 展开运算符复制 dto 的所有属性
     * - 合并 id 字段
     * - 结果：{ id: 'clx123', title: '...', price: 299 }
     */
    return requestFromClient(
      this.productClient.send(PRODUCT_PATTERNS.UPDATE, { id, ...dto }),
    );
  }

  /**
   * 删除商品接口
   * 
   * HTTP: DELETE /api/products/:id
   * 
   * 认证要求：
   * - 需要有效的 JWT Access Token
   * - 需要 ADMIN 角色
   * 
   * 路由参数：
   * - id: 商品 ID
   * 
   * 注意事项：
   * - 如果有订单引用了这个商品，删除会失败
   * - OrderItem 与 Product 是 Restrict 关系
   */
  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(AccessAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete product (admin)' })
  delete(@Param('id') id: string) {
    /**
     * 发送请求到产品服务删除商品
     * 
     * 产品服务会：
     * 1. 检查商品是否存在
     * 2. 删除商品记录
     * 3. 返回成功消息
     */
    return requestFromClient(
      this.productClient.send(PRODUCT_PATTERNS.DELETE, { id }),
    );
  }
}
