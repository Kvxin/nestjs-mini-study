/**
 * API Gateway - 应用入口
 * 
 * 作用：启动 API Gateway 服务，配置 HTTP 服务器、Swagger 文档、中间件等
 * 
 * API Gateway 是整个微服务系统的统一入口：
 * - 对外提供 REST API
 * - 处理用户认证和授权
 * - 调用后端微服务（用户、产品、订单、支付）
 * - 返回统一的响应格式
 * 
 * 端口：3000（可配置）
 * 
 * @module apps/api-gateway/src/main
 */

// 加载环境变量配置
// 作用：让应用可以读取 .env 文件中的配置
// 必须在最前面导入，确保后续代码可以访问 process.env
import 'dotenv/config';

// 导入 reflect-metadata 用于反射元数据
// 作用：NestJS 的装饰器需要这个库来存储元数据
// 例如：@Injectable()、@Controller() 等装饰器依赖反射
import 'reflect-metadata';

import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { applyHttpAppDefaults } from '../../../libs/common/http';
import { REFRESH_TOKEN_COOKIE } from '../../../libs/common/tokens';
import { ApiGatewayAppModule } from './app.module';

/**
 * 启动函数
 * 
 * 使用 async/await 因为 NestFactory.create 是异步的
 * 
 * 工作流程：
 * 1. 创建 NestJS 应用实例
 * 2. 获取配置服务
 * 3. 应用默认配置（中间件、管道、过滤器）
 * 4. 配置 Swagger 文档
 * 5. 启动 HTTP 服务器
 */
async function bootstrap() {
  /**
   * 创建 NestJS 应用实例
   * 
   * NestFactory.create:
   * - 创建 NestJS 应用实例
   * - 初始化依赖注入容器
   * - 注册模块、控制器、提供者
   * 
   * 泛型<NestExpressApplication>:
   * - 指定使用 Express 作为底层 HTTP 服务器
   * - 可以使用 Express 特有的方法（如 use、set 等）
   */
  const app = await NestFactory.create<NestExpressApplication>(ApiGatewayAppModule);
  
  /**
   * 获取配置服务实例
   * 
   * app.get(ConfigService):
   * - 从依赖注入容器获取 ConfigService
   * - ConfigService 用于读取环境变量
   * 
   * 类似：app.get(PrismaService)、app.get(JwtService)
   */
  const configService = app.get(ConfigService);

  /**
   * 应用 HTTP 默认配置
   * 
   * applyHttpAppDefaults 函数（见 libs/common/http.ts）：
   * - 注册安全中间件（Helmet）
   * - 注册压缩中间件（Compression）
   * - 注册 Cookie 解析中间件
   * - 配置 CORS
   * - 注册全局验证管道
   * - 注册全局异常过滤器
   * - 注册全局拦截器
   */
  applyHttpAppDefaults(app, configService);
  
  /**
   * 设置全局路由前缀
   * 
   * app.setGlobalPrefix('api'):
   * - 所有路由都会加上 /api 前缀
   * 
   * 效果：
   * - 原 /auth/login -> 现 /api/auth/login
   * - 原 /products -> 现 /api/products
   * 
   * 为什么要前缀：
   * - API 版本管理预留空间（/api/v1/...）
   * - 区分 API 路由和静态资源路由
   * - 统一风格
   */
  app.setGlobalPrefix('api');

  // ============ Swagger 文档配置 ============

  /**
   * 创建 Swagger 配置
   * 
   * DocumentBuilder:
   * - Swagger 配置构建器
   * - 链式调用设置各种选项
   * 
   * 配置说明：
   * - setTitle: 文档标题
   * - setDescription: 文档描述
   * - setVersion: API 版本
   * - addBearerAuth: 添加 Bearer Token 认证（JWT）
   * - addCookieAuth: 添加 Cookie 认证（Refresh Token）
   */
  const swaggerConfig = new DocumentBuilder()
    .setTitle('NestJS Mini E-Commerce')
    .setDescription('API Gateway for user, product, order and payment services')
    .setVersion('1.0.0')
    .addBearerAuth()
    .addCookieAuth(REFRESH_TOKEN_COOKIE)
    .build();

  /**
   * 创建 Swagger 文档
   * 
   * SwaggerModule.createDocument:
   * - 根据配置和控制器装饰器生成 OpenAPI 文档
   * - 自动扫描所有控制器的路由、参数、响应
   */
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  
  /**
   * 设置 Swagger UI
   * 
   * SwaggerModule.setup('swagger', app, document):
   * - 在 /swagger 路径提供 Swagger UI 界面
   * - 可以通过浏览器访问 http://localhost:3000/swagger
   * 
   * Swagger UI 功能：
   * - 查看 API 文档
   * - 在线测试 API
   * - 自动填写认证信息
   */
  SwaggerModule.setup('swagger', app, document);

  // ============ 启动服务器 ============

  /**
   * 获取端口配置
   * 
   * 从环境变量读取 API_GATEWAY_PORT
   * 默认值：3000
   */
  const port = Number(configService.get<string>('API_GATEWAY_PORT', '3000'));
  
  /**
   * 启动 HTTP 服务器监听
   * 
   * app.listen(port):
   * - 启动 Express 服务器
   * - 监听指定端口
   * - 开始处理 HTTP 请求
   */
  await app.listen(port);
  
  /**
   * 输出启动日志
   * 
   * Logger.log:
   * - 输出 INFO 级别日志
   * - 格式：[Nest] PID - 时间 LOG [Context] 消息
   */
  Logger.log(`API Gateway is listening on ${port}`);
}

// 执行启动函数
bootstrap();
