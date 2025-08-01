import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: '*',

    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    // allowedHeaders:
    //   'Content-Type, Accept, Authorization,ngrok-skip-browser-warning,x-api-key',
    // credentials: true,
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
