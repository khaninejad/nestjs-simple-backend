import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
  UseGuards,
  UnauthorizedException,
  UseInterceptors,
  UploadedFile,
  Query,
} from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { JwtAuthGuard } from '..//user/auth/jwt-auth.guard';
import { UserService } from '../user/user.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { TrackHistoryService } from '../track_history/track_history.service';

@Controller('api/employee')
export class EmployeeController {
  constructor(
    private readonly employeeService: EmployeeService,
    private readonly userService: UserService,
    private readonly trackHistoryService: TrackHistoryService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() createEmployeeDto: CreateEmployeeDto, @Request() req) {
    await this.checkPermission(req);
    const employee = await this.employeeService.create(createEmployeeDto);
    await this.trackHistoryService.create({
      action: 'assign',
      employee: employee._id,
      user: req.user.userId,
      created_at: new Date().toISOString(),
    });
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Query('department') department?: string) {
    if (department) {
      return this.employeeService.findByDepartment(department);
    }
    return this.employeeService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string) {
    return this.employeeService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() updateEmployeeDto: UpdateEmployeeDto,
    @Request() req,
  ) {
    await this.checkPermission(req);
    await this.employeeService.update(id, updateEmployeeDto);
    await this.trackHistoryService.create({
      action: 'move',
      employee: id,
      user: req.user.userId,
      created_at: new Date().toISOString(),
    });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string, @Request() req) {
    await this.checkPermission(req);
    return this.employeeService.remove(id);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    await this.employeeService.parse(file.path);
  }

  private async checkPermission(req: any) {
    const user = await this.userService.findById(req.user.userId);
    if (user.role != 'admin') {
      throw new UnauthorizedException("You don't have enough permission");
    }
  }
}
