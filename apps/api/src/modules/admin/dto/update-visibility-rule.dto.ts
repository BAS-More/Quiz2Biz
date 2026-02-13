import { PartialType } from '@nestjs/swagger';
import { CreateVisibilityRuleDto } from './create-visibility-rule.dto';

export class UpdateVisibilityRuleDto extends PartialType(CreateVisibilityRuleDto) {}
