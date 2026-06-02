import { SetMetadata } from '@nestjs/common';
import { EVENT_HANDLER_METADATA } from '../../../common/cqrs/constants';

export const EventHandler = (event: any): ClassDecorator => {
  return SetMetadata(EVENT_HANDLER_METADATA, event);
};
