import { IsString, IsInt, Min, Max, IsOptional } from 'class-validator';

export class CreateTripDto {
  @IsString()
  destination: string;

  @IsInt()
  @Min(1)
  @Max(30)
  duration: number;

  @IsString()
  budget: string;

  @IsString()
  vibe: string;

  @IsOptional()
  @IsString()
  title?: string;
}
