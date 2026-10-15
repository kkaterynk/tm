import { Injectable, UnauthorizedException } from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"
import * as bcrypt from "bcryptjs"
import { UsersService } from "../users/users.service"
import { CreateUserDto } from "../users/dto/create-user.dto"
import { LoginDto } from "./dto/login.dto"

@Injectable()
export class AuthService {
  constructor(
      private usersService: UsersService,
      private jwtService: JwtService,
  ) {}

  async login(user: any) {
    const payload = { email: user.email, sub: user._id.toString() }
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
      },
    }
  }

  async register(createUserDto: CreateUserDto) {
    const hashedPassword = await bcrypt.hash(createUserDto.password, 12)
    const user = await this.usersService.create({
      ...createUserDto,
      password: hashedPassword,
    })

    const payload = { email: user.email, sub: user._id.toString() }
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
      },
    }
  }
}
