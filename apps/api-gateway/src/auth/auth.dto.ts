import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deviceInfo?: string;
}

export class LoginDto extends RegisterDto {}

export class RefreshTokenDto {
  @ApiPropertyOptional({
    description: 'Optional when refreshToken is already stored in httpOnly cookie.',
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deviceInfo?: string;
}

export class LogoutDto {
  @ApiPropertyOptional({
    description: 'Optional when refreshToken is already stored in httpOnly cookie.',
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

export class CreateProductDto {
  @ApiProperty()
  @IsString()
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @Type(() => Number)
  @Min(0)
  price!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock!: number;

  @ApiPropertyOptional({ enum: ['DRAFT', 'ACTIVE', 'INACTIVE'] })
  @IsOptional()
  @IsString()
  status?: 'DRAFT' | 'ACTIVE' | 'INACTIVE';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coverUrl?: string;
}

export class UpdateProductDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({ enum: ['DRAFT', 'ACTIVE', 'INACTIVE'] })
  @IsOptional()
  @IsString()
  status?: 'DRAFT' | 'ACTIVE' | 'INACTIVE';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coverUrl?: string;
}

export class OrderItemDto {
  @ApiProperty()
  @IsString()
  productId!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateOrderDto {
  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];
}
