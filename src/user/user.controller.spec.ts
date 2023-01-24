import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dtos/create-user.dto';
import { UserController } from './user.controller';
import { User, UserDocument } from './user.schema';
import { UserService } from './user.service';
import { JwtModule, JwtService } from '@nestjs/jwt';

describe('UserController', () => {
  let controller: UserController;
  let service: UserService;
  let userModel: Model<UserDocument>;
  let bcryptCompare: jest.Mock;

  beforeEach(async () => {
    bcryptCompare = jest.fn().mockReturnValue(true);
    (bcrypt.compare as jest.Mock) = bcryptCompare;
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secretOrPrivateKey: process.env.SECRETKEY || 'secretKey',
          signOptions: {
            expiresIn: 3600,
          },
        }),
      ],
      controllers: [UserController],
      providers: [
        UserService,
        {
          provide: JwtService,
          useValue: {
            signAsync: () => Promise.resolve('token'),
          },
        },
        {
          provide: getModelToken(User.name),
          useValue: {
            create: () => Promise.resolve(),
            findOne: () => Promise.resolve(),
          },
        },
      ],
    }).compile();
    service = module.get<UserService>(UserService);
    controller = module.get<UserController>(UserController);
    userModel = module.get(getModelToken(User.name));
  });

  describe('signup', () => {
    it('should create a new user', async () => {
      const createUserDto: CreateUserDto = {
        name: 'John Doe',
        email: 'john.doe@example.com',
        password: 'password123',
        role: 'user',
      };

      jest.spyOn(service, 'create').mockResolvedValue(createUserDto);

      const result = await controller.signup(
        createUserDto.name,
        createUserDto.email,
        createUserDto.password,
      );

      expect(result.name).toEqual(createUserDto.name);
    });
    it('should throw exception', async () => {
      const createUserDto: CreateUserDto = {
        name: 'John Doe',
        email: 'john.doe@example.com',
        password: 'password123',
        role: 'user',
      };
      jest.spyOn(userModel, 'create').mockImplementation(async () => {
        throw new Error('error');
      });
      expect(service.create(createUserDto)).rejects.toThrow('insertion error');
    });
  });

  describe('Signin', () => {
    it('should successfully sigin in', async () => {
      const createUserDto: CreateUserDto = {
        name: 'John Doe',
        email: 'john.doe@example.com',
        password: 'password123',
        role: 'user',
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(createUserDto);

      const result = await controller.signIn(
        createUserDto.email,
        createUserDto.password,
      );

      expect(result.access_token).not.toBe('');
    });
    it('should throw exception', async () => {
      const createUserDto: CreateUserDto = {
        name: 'John Doe',
        email: 'john.doe@example.com',
        password: 'password123',
        role: 'user',
      };
      jest.spyOn(service, 'findOne').mockImplementation(async () => {
        throw new Error('unexpected error');
      });
      await expect(
        controller.signIn(createUserDto.email, createUserDto.password),
      ).rejects.toThrow('unexpected error');
    });
  });
});
