import { Injectable } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { FastifyRequest } from 'fastify'

// ThrottlerGuard mặc định track theo IP — mọi org đứng sau cùng 1 NAT/proxy công ty
// dùng chung 1 bucket, và ngược lại không cách nào set limit khác nhau theo org.
// Track theo X-Org-Id (đọc thô, CHƯA qua OrgGuard xác thực membership) vì
// ThrottlerGuard là APP_GUARD — chạy TRƯỚC mọi guard cấp controller (JwtAuthGuard,
// OrgGuard), request.org/request.user chưa tồn tại ở thời điểm này. Điều đó chấp
// nhận được: mục đích là rate-limit công bằng/chống lạm dụng, không phải authorization
// — OrgGuard vẫn là nơi duy nhất quyết định request có được phép chạm data của org
// hay không. Route chưa có org (login/register) rơi về IP như cũ.
//
// ⚠️ Ghép thêm IP vào key org (không chỉ dùng orgId đơn thuần): vì ThrottlerGuard
// chạy TRƯỚC JwtAuthGuard, request KHÔNG CẦN token hợp lệ vẫn tiêu tốn quota — 1 kẻ
// tấn công ẩn danh gửi hàng loạt request với X-Org-Id: <org-nạn-nhân> (orgId không bí
// mật — lộ qua URL/response) có thể cố ý burn hết quota của org đó, gây user thật của
// org bị 429 oan (griefing/DoS có chủ đích theo tenant). Ghép IP không chặn tuyệt đối
// (kẻ tấn công vẫn xoay IP được) nhưng nâng chi phí tấn công đáng kể — mỗi IP giờ chỉ
// burn được phần bucket riêng của chính nó, không cộng dồn phá 1 bucket chung cho cả org.
@Injectable()
export class OrgAwareThrottlerGuard extends ThrottlerGuard {
  // Overrides ThrottlerGuard.getTracker, whose signature is Promise<string>. The body is
  // genuinely synchronous (a header read), so there is nothing to await — and dropping
  // `async` would break the override contract.
  // eslint-disable-next-line @typescript-eslint/require-await
  protected async getTracker(req: FastifyRequest): Promise<string> {
    const orgId = req.headers['x-org-id']
    if (typeof orgId === 'string' && orgId.length > 0) return `org:${orgId}:ip:${req.ip}`
    return `ip:${req.ip}`
  }
}
