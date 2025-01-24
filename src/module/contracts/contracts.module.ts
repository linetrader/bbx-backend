// contracts.module.ts

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ContractsResolver } from './contracts.resolver';
import { ContractsService } from './contracts.service';
import {
  DefaultContract,
  DefaultContractSchema,
} from './contracts.default.schema';
import { Contract, ContractSchema } from './contracts.schema';
import { UsersModule } from '../users/users.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DefaultContract.name, schema: DefaultContractSchema },
      { name: Contract.name, schema: ContractSchema },
    ]),
    UsersModule,
    MailerModule.forRoot({
      transport: {
        host: 'smtp.example.com',
        port: 587,
        auth: {
          user: 'user@example.com',
          pass: 'password',
        },
      },
      defaults: {
        from: '"No Reply" <noreply@example.com>',
      },
      template: {
        dir: __dirname + '/templates',
        adapter: new HandlebarsAdapter(),
        options: {
          strict: true,
        },
      },
    }), // Add MailerModule with configuration
  ],
  providers: [ContractsResolver, ContractsService],
  exports: [ContractsService], // ContractsService export 추가
})
export class ContractsModule {}
