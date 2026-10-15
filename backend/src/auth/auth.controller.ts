import { Controller, Post, Body, UseGuards, Request } from "@nestjs/common"
import { AuthService } from "./auth.service"
import { CreateUserDto } from "../users/dto/create-user.dto"
import { LoginDto } from "./dto/login.dto"
import { LocalAuthGuard } from "./guards/local-auth.guard"
import {ApiTags} from "@nestjs/swagger";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  async register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto)
  }

  @UseGuards(LocalAuthGuard)
  @Post("login")
  async login(@Body() loginDto: LoginDto, @Request() req: any) {
    return this.authService.login(req.user)
  }
}
