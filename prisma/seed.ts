/**
 * 数据库种子脚本
 * 
 * 作用：初始化数据库，创建管理员账号和演示商品
 * 
 * 执行命令：pnpm prisma:seed
 * 执行时机：数据库迁移完成后执行
 * 
 * @file prisma/seed.ts
 */

// 加载环境变量配置
// 作用：让脚本可以读取 .env 文件中的配置（如 ADMIN_EMAIL, ADMIN_PASSWORD）
import 'dotenv/config';

// 从 Prisma 客户端导入类型和枚举
// PrismaClient: 数据库客户端
// ProductStatus: 商品状态枚举
// UserRole: 用户角色枚举
import { PrismaClient, ProductStatus, UserRole } from '@prisma/client';

// 导入 bcrypt 用于密码加密
// 为什么需要加密：数据库中不能存储明文密码
import * as bcrypt from 'bcrypt';

// 创建 Prisma 客户端实例
// 用于执行数据库操作
const prisma = new PrismaClient();

/**
 * 主函数 - 异步执行种子数据初始化
 * 
 * 使用 async/await 的原因：
 * - 数据库操作都是异步的
 * - 需要按顺序执行：先创建管理员，再创建商品
 */
async function main() {
  // ============ 创建管理员账号 ============
  
  /**
   * 从环境变量读取管理员配置
   * 
   * 使用 ?? 空值合并运算符：
   * - 如果环境变量存在，使用环境变量值
   * - 如果不存在，使用默认值
   * 
   * 默认值（见 .env.example）：
   * - ADMIN_EMAIL=admin@example.com
   * - ADMIN_PASSWORD=Admin123456
   */
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'Admin123456';

  /**
   * 密码加密
   * 
   * bcrypt.hash 参数说明：
   * - 第一个参数：明文密码
   * - 第二个参数：salt rounds（盐值轮数），10 表示 2^10 次哈希运算
   * 
   * 为什么需要盐值：
   * - 防止彩虹表攻击
   * - 相同密码每次生成的哈希值都不同
   * 
   * 安全建议：
   * - 生产环境至少使用 10 轮
   * - 轮数越多越安全，但计算时间也越长
   */
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  /**
   * 使用 upsert 创建或更新管理员账号
   * 
   * upsert = update + insert
   * 工作原理：
   * 1. 先尝试查找 where 条件的记录
   * 2. 如果找到，执行 update 操作
   * 3. 如果没找到，执行 create 操作
   * 
   * 为什么用 upsert 而不是 create：
   * - 种子脚本可能多次执行
   * - 用 upsert 可以避免重复创建管理员
   * - 每次执行都会更新密码（确保密码是最新的）
   */
  await prisma.user.upsert({
    // 查找条件：按邮箱查找
    where: { email: adminEmail },
    
    // 如果找到，更新这些字段
    update: {
      passwordHash,  // 更新密码
      role: UserRole.ADMIN,  // 确保角色是管理员
    },
    
    // 如果没找到，创建新记录
    create: {
      email: adminEmail,
      passwordHash,
      role: UserRole.ADMIN,
    },
  });

  // ============ 创建演示商品 ============
  
  /**
   * 检查是否已有商品
   * 
   * 目的：避免重复创建商品
   * 如果数据库中已有商品，跳过创建
   */
  const count = await prisma.product.count();
  
  // 只有当数据库中没有商品时才创建
  if (count === 0) {
    /**
     * 批量创建商品
     * 
     * createMany 参数说明：
     * - data: 商品数据数组
     * 
     * 创建的商品：
     * 1. Mechanical Keyboard - 机械键盘
     * 2. Wireless Mouse - 无线鼠标
     * 
     * 这些商品用于演示和测试
     */
    await prisma.product.createMany({
      data: [
        {
          title: 'Mechanical Keyboard',     // 商品名称
          description: 'Hot-swappable mechanical keyboard.',  // 描述
          price: 399,                        // 价格（元）
          stock: 20,                         // 库存
          status: ProductStatus.ACTIVE,      // 状态：上架
          coverUrl: 'https://example.com/keyboard.jpg',  // 封面图
        },
        {
          title: 'Wireless Mouse',
          description: 'Ergonomic wireless mouse.',
          price: 199,
          stock: 50,
          status: ProductStatus.ACTIVE,
          coverUrl: 'https://example.com/mouse.jpg',
        },
      ],
    });
  }
}

/**
 * 执行主函数并处理错误
 * 
 * 工作流程：
 * 1. 执行 main() 函数
 * 2. 成功后断开数据库连接
 * 3. 失败时输出错误并断开连接，退出码设为 1
 * 
 * 为什么需要 finally 块：
 * - 确保数据库连接一定会关闭
 * - 防止连接泄漏
 */
main()
  .then(async () => {
    // 成功：断开数据库连接
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    // 失败：输出错误信息
    console.error(error);
    // 断开数据库连接
    await prisma.$disconnect();
    // 以错误码退出进程（1 表示错误）
    process.exit(1);
  });
