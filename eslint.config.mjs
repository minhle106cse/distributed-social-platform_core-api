// @ts-check
import eslint from '@eslint/js'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      'eslint.config.mjs',
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'src/generated/**',
      'generated/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      // Project uses noImplicitAny:false → any flows through bus handler maps and
      // catch blocks. Align by downgrading rather than suppressing at call sites.
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Architectural boundary enforcement (Hexagonal / Clean Architecture).
  // See directives/folder_structure_sop.md + cqrs_pattern.md.
  // Uses @typescript-eslint/no-restricted-imports so `import type` is also caught
  // (a type-only dependency across layers is still a dependency).
  // ───────────────────────────────────────────────────────────────────────────

  // Domain — pure TypeScript. shared-kernel + same-domain relative imports only.
  {
    files: ['src/modules/*/domain/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@nestjs/*',
                'fastify',
                'prisma',
                '@prisma/*',
                '@/generated',
                '@/generated/**',
                '@/infrastructure/**',
                '@/common/**',
                '@/modules/*/application/**',
                '@/modules/*/infrastructure/**',
                '@/modules/*/presentation/**',
              ],
              message:
                'Domain phải pure TypeScript: chỉ shared-kernel + relative cùng domain. Cấm framework (NestJS/Fastify), ORM (Prisma/generated), và mọi tầng ngoài.',
            },
          ],
        },
      ],
    },
  },

  // Application — orchestrates via interfaces. No ORM/HTTP/DB; no HTTP exceptions.
  // The only allowed infrastructure import is @/infrastructure/cqrs (decorators).
  {
    files: ['src/modules/*/application/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@nestjs/common',
              importNames: [
                'NotFoundException',
                'BadRequestException',
                'ForbiddenException',
                'UnauthorizedException',
                'ConflictException',
                'GoneException',
                'HttpException',
                'InternalServerErrorException',
                'UnprocessableEntityException',
                'NotAcceptableException',
              ],
              message:
                'Application không được throw HTTP exception. Dùng ApplicationError subclass (common/errors) — GlobalExceptionFilter sẽ map statusCode.',
            },
          ],
          patterns: [
            {
              group: [
                'prisma',
                '@prisma/*',
                '@/generated',
                '@/generated/**',
                'fastify',
                // 2026-08-24: was the two-entry allowlist `@/infrastructure/database/**`
                // + `@/infrastructure/http/**`, which left grpc/outbox/messaging/kafka
                // wide open — that hole is how AskAiHandler and ProvisionOrgHandler came
                // to inject the concrete RagQueryClient/AuthProvisioningClient with no
                // port at all. Inverted to "everything in infrastructure/ is banned
                // except cqrs" so a NEW infra folder is closed by default.
                '@/infrastructure/**',
                '!@/infrastructure/cqrs',
                '!@/infrastructure/cqrs/**',
              ],
              message:
                'Application không được phụ thuộc infrastructure. Dùng port (domain/repositories, domain/services, common/) — infra hợp lệ duy nhất là @/infrastructure/cqrs (decorators).',
            },
          ],
        },
      ],
    },
  },

  // Presentation — translate HTTP <-> Command/Query. Never touch the ORM/DB.
  {
    files: ['src/modules/*/presentation/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'prisma',
                '@prisma/*',
                '@/generated',
                '@/generated/**',
                '@/infrastructure/database/**',
              ],
              message:
                'Presentation không được chạm ORM/DB trực tiếp. Đẩy qua CommandBus/QueryBus.',
            },
          ],
        },
      ],
    },
  },

  // common — cross-cutting abstractions only. shared-kernel + relative.
  {
    files: ['src/common/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@/modules/**',
                '@/infrastructure/**',
                '@nestjs/*',
                'fastify',
                'prisma',
                '@prisma/*',
                '@/generated',
                '@/generated/**',
              ],
              message:
                'common/ chỉ chứa abstraction cross-cutting: chỉ shared-kernel + relative. Cấm modules/, infrastructure/, framework, ORM.',
            },
          ],
        },
      ],
    },
  },

  // Narrow, deliberate exception to the common/ rule above — ONE file, and only for the
  // `@/modules/*/domain/repositories/**` imports it is made of. `CoreApiRepos` is the
  // service-wide Unit-of-Work SHAPE (ADR-0001): a bag of domain repository interfaces
  // with no Prisma or framework type anywhere, i.e. exactly the "cross-cutting
  // abstraction" common/ is for. It cannot be assembled without naming those interfaces,
  // and it cannot live in any one module's domain/ because it spans six of them.
  //
  // It used to sit inside infrastructure/database/prisma/core-api-repos.factory.ts, which
  // forced all 23 ITransactionalCommandHandler implementations to import a type from
  // @/infrastructure — a real application-layer boundary violation that eslint had been
  // reporting 23 times and nobody had read (2026-08-21 audit). Moving the declaration here
  // removes all 23 and leaves the FACTORY (which does construct Prisma repos) in
  // infrastructure where it belongs.
  //
  // 2026-08-24: this exception was ALSO covering a `@/infrastructure/outbox/...` import
  // (IOutboxAppender), which is not what it says it is for. The port moved to
  // `common/outbox/outbox-appender.ts`, so the import is now a plain relative one and
  // the exception is back to covering only what its wording claims.
  //
  // Scoped to this exact path on purpose: widening the common/ rule itself would reopen
  // the door this boundary exists to close.
  {
    files: ['src/common/database/core-api-repos.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': 'off',
    },
  },

  // Relax strict type rules inside test files (Jest mocks are inherently loosely typed).
  // Mirrors the block auth-service has had all along — its absence here is why
  // `unbound-method` alone accounted for 81 of the 261 pre-existing lint errors
  // (2026-08-21 audit): `expect(mock.method).toHaveBeenCalled()` trips it by design,
  // and that is the standard Jest assertion, not a defect worth 81 rewrites.
  {
    files: ['**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/require-await': 'off',
      'no-empty': 'off',
    },
  },

)
