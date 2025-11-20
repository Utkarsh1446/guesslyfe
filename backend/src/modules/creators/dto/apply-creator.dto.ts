import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ApplyCreatorDto {
  @ApiPropertyOptional({ description: 'Application message or bio' })
  @IsOptional()
  @IsString()
  message?: string;
}
