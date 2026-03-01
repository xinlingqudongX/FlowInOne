import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): { message: string; status: string } {
    return {
      message: 'Welcome to FlowInOne API',
      status: 'API is running successfully',
    };
  }
}