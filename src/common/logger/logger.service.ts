import { Logger, LoggerService } from '@nestjs/common'

export class CustomLogger extends Logger implements LoggerService {}
