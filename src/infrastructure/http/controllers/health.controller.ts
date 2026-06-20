import { Controller, Get, Res } from '@nestjs/common'
import type { FastifyReply } from 'fastify'
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service'

@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  async health(@Res() reply: FastifyReply) {
    const dbOk = await this.checkDb()
    reply.code(dbOk ? 200 : 503).send({
      status: dbOk ? 'ok' : 'degraded',
      service: 'core-api',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      checks: {
        database: dbOk ? 'ok' : 'error',
      },
    })
  }

  @Get('metrics')
  metrics(@Res() reply: FastifyReply) {
    const mem = process.memoryUsage()
    const cpu = process.cpuUsage()

    const lines = [
      '# HELP process_uptime_seconds Process uptime in seconds',
      '# TYPE process_uptime_seconds gauge',
      `process_uptime_seconds ${process.uptime().toFixed(3)}`,
      '',
      '# HELP nodejs_heap_used_bytes V8 heap used',
      '# TYPE nodejs_heap_used_bytes gauge',
      `nodejs_heap_used_bytes ${mem.heapUsed}`,
      '',
      '# HELP nodejs_heap_total_bytes V8 heap total',
      '# TYPE nodejs_heap_total_bytes gauge',
      `nodejs_heap_total_bytes ${mem.heapTotal}`,
      '',
      '# HELP nodejs_external_memory_bytes External memory used by V8',
      '# TYPE nodejs_external_memory_bytes gauge',
      `nodejs_external_memory_bytes ${mem.external}`,
      '',
      '# HELP nodejs_rss_bytes Process RSS memory',
      '# TYPE nodejs_rss_bytes gauge',
      `nodejs_rss_bytes ${mem.rss}`,
      '',
      '# HELP process_cpu_user_seconds_total Total user CPU time',
      '# TYPE process_cpu_user_seconds_total counter',
      `process_cpu_user_seconds_total ${(cpu.user / 1e6).toFixed(6)}`,
      '',
      '# HELP process_cpu_system_seconds_total Total system CPU time',
      '# TYPE process_cpu_system_seconds_total counter',
      `process_cpu_system_seconds_total ${(cpu.system / 1e6).toFixed(6)}`,
    ]

    reply
      .type('text/plain; version=0.0.4; charset=utf-8')
      .send(lines.join('\n'))
  }

  private async checkDb(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`
      return true
    } catch {
      return false
    }
  }
}
