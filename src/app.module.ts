import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProjectModule } from './project/project.module';
import { WorkflowGraphModule } from './workflow-graph/workflow-graph.module';
import { TaskNodeModule } from './task-node/task-node.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, 'public'),
      exclude: ['/api*', '/project*', '/workflow-graph*', '/task-node*'],
      serveRoot: '/public',
    }),
    ProjectModule,
    WorkflowGraphModule,
    TaskNodeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
