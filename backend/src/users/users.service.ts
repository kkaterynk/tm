import { Injectable, ConflictException } from "@nestjs/common"
import type { Model } from "mongoose"
import {User, UserDocument} from "./schemas/user.schema"
import { CreateUserDto } from "./dto/create-user.dto"
import {InjectModel} from "@nestjs/mongoose";

@Injectable()
export class UsersService {
  constructor(
      @InjectModel(User.name) private userModel: Model<UserDocument>
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    const existingUser = await this.findByEmail(createUserDto.email)
    if (existingUser) {
      throw new ConflictException("User with this email already exists")
    }

    const createdUser = new this.userModel(createUserDto)
    return createdUser.save()
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec()
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec()
  }
}
