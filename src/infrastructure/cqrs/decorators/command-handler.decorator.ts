import { SetMetadata } from '@nestjs/common';
import { COMMAND_HANDLER_METADATA } from '../../../common/cqrs/constants';

export const CommandHandler = (command: any): ClassDecorator => {
  return SetMetadata(COMMAND_HANDLER_METADATA, command);
};
