import { Controller, Get, UseGuards, Request } from "@nestjs/common"
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard"
import { UsersService } from "./users.service"
import {ApiTags} from "@nestjs/swagger";

interface AuthenticatedRequest extends Request {
  user: {
    userId: string
    email: string
    user: {
      name: string
      email: string
    }
  }
}

@ApiTags("User")
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get("profile")
  getProfile(@Request() req: AuthenticatedRequest) {
    return {
      id: req.user.userId,
      email: req.user.email,
      name: req.user.user.name,
    }
  }
}
