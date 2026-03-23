/**
 * 数据传输对象（DTO）和验证规则
 * 
 * 作用：定义请求体的数据结构和验证规则
 * 
 * 使用 class-validator 和 class-transformer 库：
 * - class-validator: 装饰器定义验证规则
 * - class-transformer: 类型转换（如字符串转数字）
 * 
 * 验证管道（ValidationPipe）会自动验证：
 * - 如果验证失败，返回 400 Bad Request
 * - 如果验证通过，数据会被转换和清理
 * 
 * @module apps/api-gateway/src/auth/auth.dto
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

// ============ 认证相关 DTO ============

/**
 * 用户注册 DTO
 * 
 * 用于注册接口：POST /api/auth/register
 * 
 * 验证规则：
 * - email: 必须是有效邮箱格式
 * - password: 必须是字符串，最少 8 个字符
 * - deviceInfo: 可选，字符串
 */
export class RegisterDto {
  /**
   * @ApiProperty() - Swagger 文档标记
   * 
   * 作用：在 Swagger 文档中显示这个属性
   * 
   * 效果：
   * - Swagger 请求/响应模型中包含这个字段
   * - 显示必填标记（没有 optional）
   */
  @ApiProperty()
  
  /**
   * @IsEmail() - 邮箱格式验证
   * 
   * 验证规则：
   * - 必须符合邮箱格式（xxx@xxx.xxx）
   * - 无效邮箱返回 400 错误
   * 
   * 示例：
   * - 有效：user@example.com
   * - 无效：user@example, @example.com, user@
   */
  @IsEmail()
  email!: string;

  /**
   * @ApiProperty({ minLength: 8 }) - Swagger 文档标记
   * 
   * 作用：在 Swagger 文档中显示最小长度
   */
  @ApiProperty({ minLength: 8 })
  
  /**
   * @IsString() - 类型验证
   * 
   * 验证规则：
   * - 必须是字符串类型
   */
  @IsString()
  
  /**
   * @MinLength(8) - 最小长度验证
   * 
   * 验证规则：
   * - 密码至少 8 个字符
   * - 少于 8 个字符返回 400 错误
   * 
   * 安全建议：
   * - 生产环境应该要求更复杂的密码
   * - 包含大小写字母、数字、特殊字符
   */
  @MinLength(8)
  password!: string;

  /**
   * @ApiPropertyOptional() - Swagger 文档标记（可选属性）
   * 
   * 作用：在 Swagger 文档中标记为可选
   */
  @ApiPropertyOptional()
  
  /**
   * @IsOptional() - 可选验证
   * 
   * 作用：
   * - 这个字段可以不传
   * - 如果传了，需要满足其他验证规则
   */
  @IsOptional()
  
  /**
   * @IsString() - 类型验证
   * 
   * 如果提供了 deviceInfo，必须是字符串
   */
  @IsString()
  deviceInfo?: string;
}

/**
 * 用户登录 DTO
 * 
 * 用于登录接口：POST /api/auth/login
 * 
 * 继承 RegisterDto:
 * - 复用 email 和 password 的验证规则
 * - 不需要 deviceInfo（可选，所以继承也没问题）
 */
export class LoginDto extends RegisterDto {}

/**
 * 刷新令牌 DTO
 * 
 * 用于刷新接口：POST /api/auth/refresh
 * 
 * 说明：
 * - refreshToken 可以从 Cookie 自动获取
 * - 所以这个字段是可选的
 */
export class RefreshTokenDto {
  /**
   * @ApiPropertyOptional - Swagger 文档标记（可选）
   * 
   * description:
   * - 在 Swagger 文档中显示说明文字
   * - 告诉开发者什么时候可以不传这个字段
   */
  @ApiPropertyOptional({
    description: 'Optional when refreshToken is already stored in httpOnly cookie.',
  })
  
  /**
   * @IsOptional() - 可选验证
   * 
   * refreshToken 可以不传：
   * - 如果 Cookie 中有 refreshToken，会自动使用
   * - 方便 API 测试工具（如 Postman）直接传 body
   */
  @IsOptional()
  
  /**
   * @IsString() - 类型验证
   * 
   * 如果提供了 refreshToken，必须是字符串
   */
  @IsString()
  refreshToken?: string;

  /**
   * 设备信息（可选）
   * 
   * 用于标识登录设备
   * 传递给用户服务，保存到刷新令牌会话
   */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deviceInfo?: string;
}

/**
 * 登出 DTO
 * 
 * 用于登出接口：POST /api/auth/logout
 * 
 * 说明：
 * - refreshToken 可以从 Cookie 自动获取
 * - 所以这个字段是可选的
 */
export class LogoutDto {
  @ApiPropertyOptional({
    description: 'Optional when refreshToken is already stored in httpOnly cookie.',
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

// ============ 商品相关 DTO ============

/**
 * 创建商品 DTO
 * 
 * 用于创建商品接口：POST /api/products
 * 
 * 验证规则：
 * - title: 必填，字符串
 * - price: 必填，数字，>= 0
 * - stock: 必填，整数，>= 0
 * - description, status, coverUrl: 可选
 */
export class CreateProductDto {
  @ApiProperty()
  @IsString()
  title!: string;

  /**
   * 商品描述（可选）
   * 
   * @IsOptional():
   * - 可以不传
   * - 如果传 null 或 undefined，会被 ValidationPipe 剥离（whitelist: true）
   */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  /**
   * @ApiProperty() - Swagger 文档标记
   * 
   * @Type(() => Number) - 类型转换
   * 
   * 作用：
   * - HTTP 请求体中的数字是字符串（JSON 解析后）
   * - 转换为 Number 类型
   * 
   * 示例：
   * - 请求体：{ "price": "199" }
   * - 转换后：{ "price": 199 } (number)
   */
  @ApiProperty()
  @Type(() => Number)
  
  /**
   * @Min(0) - 最小值验证
   * 
   * 验证规则：
   * - 价格不能是负数
   * - price < 0 返回 400 错误
   */
  @Min(0)
  price!: number;

  /**
   * @IsInt() - 整数验证
   * 
   * 验证规则：
   * - 必须是整数，不能是小数
   * - 库存不能是 1.5 个
   * 
   * 示例：
   * - 有效：10, 100
   * - 无效：10.5, 3.14
   */
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  
  /**
   * @Min(0) - 最小值验证
   * 
   * 库存不能是负数
   */
  @Min(0)
  stock!: number;

  /**
   * 商品状态（可选）
   * 
   * @ApiPropertyOptional({ enum: [...] }):
   * - Swagger 文档中显示枚举值
   * - 用户可以看到可选的状态值
   * 
   * 枚举值：
   * - DRAFT: 草稿
   * - ACTIVE: 上架
   * - INACTIVE: 下架
   */
  @ApiPropertyOptional({ enum: ['DRAFT', 'ACTIVE', 'INACTIVE'] })
  @IsOptional()
  @IsString()
  status?: 'DRAFT' | 'ACTIVE' | 'INACTIVE';

  /**
   * 封面图片 URL（可选）
   */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coverUrl?: string;
}

/**
 * 更新商品 DTO
 * 
 * 用于更新商品接口：PATCH /api/products/:id
 * 
 * 与 CreateProductDto 的区别：
 * - 所有字段都是可选的（部分更新）
 * - 没有必填字段
 */
export class UpdateProductDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({ enum: ['DRAFT', 'ACTIVE', 'INACTIVE'] })
  @IsOptional()
  @IsString()
  status?: 'DRAFT' | 'ACTIVE' | 'INACTIVE';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coverUrl?: string;
}

// ============ 订单相关 DTO ============

/**
 * 订单项 DTO
 * 
 * 用于创建订单时的商品列表
 * 
 * 验证规则：
 * - productId: 必填，字符串
 * - quantity: 必填，整数，>= 1
 */
export class OrderItemDto {
  @ApiProperty()
  @IsString()
  productId!: string;

  /**
   * @ApiProperty() - Swagger 文档标记
   * 
   * @Type(() => Number) - 类型转换
   * 
   * @IsInt() - 整数验证
   * 
   * @Min(1) - 最小值验证
   * 
   * 验证规则：
   * - 购买数量必须是正整数
   * - 不能买 0 个或负数个
   * - 不能买 1.5 个
   */
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}

/**
 * 创建订单 DTO
 * 
 * 用于创建订单接口：POST /api/orders
 * 
 * 验证规则：
 * - items: 必填，数组
 * - 数组中每个元素必须是有效的 OrderItemDto
   */
export class CreateOrderDto {
  /**
   * @ApiProperty({ type: [OrderItemDto] }) - Swagger 文档标记
   * 
   * type: [OrderItemDto]:
   * - 告诉 Swagger 这是 OrderItemDto 数组
   * - Swagger 会显示数组结构
   */
  @ApiProperty({ type: [OrderItemDto] })
  
  /**
   * @IsArray() - 数组验证
   * 
   * 验证规则：
   * - items 必须是数组
   */
  @IsArray()
  
  /**
   * @ValidateNested({ each: true }) - 嵌套验证
   * 
   * 作用：
   * - 数组中每个元素都要验证
   * - 每个元素必须符合 OrderItemDto 的规则
   * 
   * 如果没有这个装饰器：
   * - 只验证 items 是数组
   * - 不验证数组元素的内容
   */
  @ValidateNested({ each: true })
  
  /**
   * @Type(() => OrderItemDto) - 类型转换
   * 
   * 作用：
   * - 将普通对象转换为 OrderItemDto 实例
   * - 这样 OrderItemDto 的验证规则才会生效
   */
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];
}
