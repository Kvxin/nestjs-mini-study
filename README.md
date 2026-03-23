# NestJS Mini E-Commerce

NestJS 电商后端示例，包含：

- `api-gateway`: 对外 REST API、Swagger、认证、限流、中间件
- `user-service`: 注册、登录、双 token、刷新、登出
- `product-service`: 商品管理、库存检查与预扣
- `order-service`: 下单、订单查询、支付状态联动
- `payment-service`: 模拟支付、真实二维码、扫码支付确认页

## Tech Stack

- NestJS
- PostgreSQL
- Prisma
- TCP microservices
- Swagger
- JWT access token + refresh token

## Quick Start

1. 启动数据库

```bash
docker compose up -d
```

2. 生成 Prisma Client

```bash
pnpm prisma generate
```

3. 生成并执行迁移

```bash
pnpm prisma migrate dev --name init
```

4. 初始化管理员和演示商品

```bash
pnpm prisma:seed
```

5. 启动全部服务

```bash
pnpm dev
```

## Service Ports

- API Gateway: `http://localhost:3000`
- Swagger: `http://localhost:3000/swagger`
- Payment Page: `http://localhost:3004/payments/page/:paymentNo`

## Demo Flow

1. 在 Swagger 注册普通用户，或使用种子管理员账号：
   - `admin@example.com`
   - `Admin123456`
2. 管理员创建商品
3. 普通用户登录后调用 `POST /api/orders`
4. 返回结果中会带 `payment.qrCodeData` 和 `payment.payUrl`
5. 扫描二维码后进入支付确认页
6. 点击 `Confirm Payment` 按钮后，支付状态变为成功，订单自动更新为 `PAID`

## Notes

- 若需要手机真实扫码访问，必须把 `PUBLIC_PAYMENT_BASE_URL` 改成手机可访问的局域网地址或公网地址，而不是 `localhost`
- `refreshToken` 会写入 `httpOnly cookie`，Swagger 调试时也可直接通过 body 传递
