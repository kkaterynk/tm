import { NestFactory } from "@nestjs/core"
import { ValidationPipe } from "@nestjs/common"
import { AppModule } from "./app.module"
import * as bodyParser from "body-parser";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import {NestExpressApplication} from "@nestjs/platform-express";


async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true })

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  // CORS configuration
  app.enableCors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  })

    app.use(bodyParser.json({ limit: "50mb" }))
    app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }))

  // Global prefix
  app.setGlobalPrefix("api")

  const swaggerConfig = new DocumentBuilder()
      .setTitle("audio-sanctum-poc-Backend API")
      .setVersion("1.0.0")
      .addBearerAuth({ type: "http", scheme: "bearer", bearerFormat: "JWT", in: "Header" }, "Auth")
      .build();

  // @ts-ignore
  const document = SwaggerModule.createDocument(app, swaggerConfig);

  // @ts-ignore
  SwaggerModule.setup("docs", app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT || 3001
  await app.listen(port)

  console.log(`🚀 Server running on http://localhost:${port}/api`)
}
bootstrap()
