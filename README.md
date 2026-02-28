# FlowInOne

使用项目

## 技术栈

- **框架**: NestJS + TypeScript
- **HTTP引擎**: Fastify
- **数据库**: SQLite + MikroORM (可选)
- **API文档**: Scalar API Reference
- **数据验证**: zod
- **包管理**: pnpm

## 快速开始

### 安装依赖

```bash
$ pnpm install
```

### 开发模式

```bash
# 开发模式
$ pnpm run start:dev

# Fastify开发模式
$ pnpm run start:fastify:dev
```

### 生产模式

```bash
# 生产模式
$ pnpm run start:prod

# Fastify生产模式
$ pnpm run start:fastify
```

## 功能特性

- ✅ 基于Fastify的高性能引擎
- ✅ 集成Scalar API文档生成
- ✅ TypeORM数据库操作
- ✅ zod数据验证
- ✅ 完整的TypeScript支持
- ✅ 代码格式化和检查
- ✅ 单元测试和端到端测试

## API文档

启动应用后，访问 [http://localhost:3000/api-reference](http://localhost:3000/api-reference) 查看交互式API文档。

## 开发工具

```bash
# 代码格式化
$ pnpm run format

# 代码检查
$ pnpm run lint

# 类型检查
$ pnpm run type-check

# 运行测试
$ pnpm test

# 监听模式运行测试
$ pnpm run test:watch

# 生成测试覆盖率报告
$ pnpm run test:cov

# 调试模式运行测试
$ pnpm run test:debug

# 运行端到端测试
$ pnpm run test:e2e
```

## 项目结构

```
src/
├── project/               # 项目管理模块
│  └── entities/         # 项目相关实体
│       ├── project.entity.ts      # 项目实体
│      └── project-asset.entity.ts # 项目资产实体
├── workflow-graph/        #工流图模块
│   └── entities/         #工作流图相关实体
│       └── workflow-graph.entity.ts #工作流图实体
├── task-node/             # 任务节点模块
│   └── entities/         # 任务节点相关实体
│       ├── task-node.entity.ts    # 任务节点实体
│       └── task-output.entity.ts   # 任务产出实体
├── entities/              #基础数据库实体
│  └── user.entity.ts
├── services/              # 业务服务
│   └── user.service.ts
├── adapter-factory.ts     # HTTP适配器工厂
├── app.controller.spec.ts # 控制器测试
├── app.controller.ts      # 主控制器
├── app.module.ts          #根模块
├── app.service.ts         # 主服务
├── mikro-orm.config.ts    # MikroORM配置
├── mikro-orm.module.ts    # MikroORM模块
└── main.ts               #应用入口

doc/
├── 项目元数据.md          # 项目文档
└── 项目结构.md            # 详细项目结构文档
```

## 文档

- [详细项目文档](./doc/项目元数据.md) -包含完整的技术说明和配置指南
- [项目结构详细说明](./doc/项目结构说明.md) -包含各模块详细功能说明
- [数据库配置示例](./doc/数据库配置示例.md) - 如需启用数据库功能，请参考此指南

## 许可证

MIT License
