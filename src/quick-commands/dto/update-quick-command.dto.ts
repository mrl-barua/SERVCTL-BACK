import { PartialType } from '@nestjs/swagger';
import { CreateQuickCommandDto } from './create-quick-command.dto';

export class UpdateQuickCommandDto extends PartialType(CreateQuickCommandDto) {}
