# Clean Architecture Implementation Plan

## Current State Analysis

### Project Overview
A CLI tool for monitoring slot availability on a government website using Playwright automation with Telegram notifications.

### Existing Infrastructure (✅ Already in Place)

**Core Infrastructure (`src/core/`)**:
- **IoC Container**: Type-safe dependency injection using InversifyJS
  - `ioc/container.ts` - Typed container with `BindingMap`
  - `ioc/inject.ts` - Type-safe `$inject` and `$multiInject` decorators
  - `ioc/injection-key.enum.ts` - Enum for injection keys
  - `ioc/binding-map.ts` - Type-safe binding mappings
- **Error Handling**: Domain error abstractions
  - `base/domain-error.ts` - Abstract base class for domain errors
  - `errors/business-rule-error.ts` - Business rule violations
  - `errors/validation-error.ts` - Validation failures
- **Validation**: Generic validator interface
  - `base/validator.ts` - `Validator<T>` interface with `ValidationResult<T>`
- **Core Services**: 
  - `services/id-generator.ts` - IdGenerator interface

**Status**: Foundation infrastructure is ready! ✅

### Current Structure Issues

1. **Mixed Concerns**: Business logic intertwined with infrastructure (Playwright, Telegram)
2. **No Abstraction**: Direct dependencies on concrete implementations (`PlaywrightBrowserManager`, `Api` from grammy)
3. **Violated SRP**: `slot-checker.ts` handles both browser interaction and domain logic
4. **Tight Coupling**: CLI commands directly instantiate infrastructure classes
5. **No Domain Layer**: Business entities and rules scattered across lib files
6. **Missing Use Cases**: Application logic embedded in command handlers

### Current Dependencies Flow
```
CLI Commands → Lib Functions → Infrastructure (Playwright, Telegram)
```
All layers depend on infrastructure details, violating dependency rule.

---

## Target Architecture

### Layer Structure

```
src/
├── core/                # Shared infrastructure (cross-cutting concerns)
│   ├── base/           # Base classes & interfaces (DomainError, Validator)
│   ├── errors/         # Domain error types (BusinessRuleError, ValidationError)
│   ├── ioc/            # Dependency injection container & utilities
│   └── services/       # Core service interfaces (IdGenerator)
│
├── domain/              # Core business logic (innermost, no dependencies)
│   ├── entities/       # Domain entities (SlotAvailability, Operation)
│   ├── value-objects/  # Value objects (DateRange, OperationDay)
│   ├── ports/          # Interface definitions (abstractions)
│   └── errors/         # Domain-specific errors (extends core errors)
│
├── application/         # Use cases (depends on domain only)
│   ├── use-cases/      # Business workflows
│   └── services/       # Application services
│
├── infrastructure/      # External implementations (depends on domain/application)
│   ├── browser/        # Playwright implementation
│   ├── notification/   # Telegram implementation
│   ├── config/         # Environment/config management
│   └── ioc/            # Container bindings & module registration
│
└── presentation/        # CLI/API (depends on application)
    └── cli/            # Commander.js commands
```

---

## Implementation Plan

### Phase 1: Domain Layer Foundation

**1.1 Create Domain Entities**
- `domain/entities/slot-availability.ts` - Core slot availability entity
- `domain/entities/operation.ts` - Operation entity
- `domain/value-objects/date-range.ts` - Value object for date ranges
- `domain/value-objects/operation-day.ts` - Value object for operation day data

**1.2 Define Port Interfaces**
- `domain/ports/browser.port.ts` - Browser abstraction interface
- `domain/ports/notification.port.ts` - Notification abstraction interface
- `domain/ports/slot-repository.port.ts` - Data access abstraction

**1.3 Domain-Specific Errors**
- `domain/errors/slot-error.ts` - Domain-specific errors extending `core/errors`
- Use `BusinessRuleError` and `ValidationError` from `core/errors`

**1.4 Domain Validators (Optional)**
- `domain/validators/operation-validator.ts` - Validates operation data
- Implement `Validator<T>` interface from `core/base/validator.ts`

**Deliverable**: Pure domain logic with no external dependencies (except `core/` for errors & validators)

---

### Phase 2: Application Layer (Use Cases)

**2.1 Extract Use Cases**
- `application/use-cases/check-slots.use-case.ts` - Check slot availability workflow
- `application/use-cases/monitor-slots.use-case.ts` - Continuous monitoring workflow
- Inject domain ports via `@$inject()` decorator from `core/ioc`
- Mark use cases with `@injectable()` decorator from `inversify`
- Throw `BusinessRuleError` or `ValidationError` from `core/errors` when appropriate

**2.2 Create Application Services**
- `application/services/slot-service.ts` - Coordinates slot checking operations
- `application/services/notification-service.ts` - Handles notification logic
- Use dependency injection for port dependencies

**Deliverable**: Business workflows that depend only on domain ports (injected via DI)

---

### Phase 3: Infrastructure Layer

**3.1 Implement Browser Port**
- `infrastructure/browser/playwright-browser-adapter.ts` - Implements `BrowserPort`
- Move `PlaywrightBrowserManager` logic here, adapt to interface
- Mark with `@injectable()` decorator from `inversify`
- Use `@$inject()` for any dependencies

**3.2 Implement Notification Port**
- `infrastructure/notification/telegram-notifier-adapter.ts` - Implements `NotificationPort`
- Move Telegram logic here, adapt to interface
- Mark with `@injectable()` decorator
- Use `@$inject()` for any dependencies

**3.3 Configuration Management**
- `infrastructure/config/env-config.ts` - Centralized environment variable handling
- Use `Validator<T>` pattern for config validation if needed

**3.4 Container Bindings**
- `infrastructure/ioc/bindings.ts` - Register all implementations
  - Bind `BrowserPort` → `PlaywrightBrowserAdapter`
  - Bind `NotificationPort` → `TelegramNotifierAdapter`
  - Bind use cases to their implementations
- Import and execute bindings in `infrastructure/ioc/index.ts`

**Deliverable**: Concrete implementations of domain ports registered in DI container

---

### Phase 4: Presentation Layer

**4.1 Refactor CLI Commands**
- `presentation/cli/commands/run.command.ts` - Uses use cases instead of lib functions
- `presentation/cli/commands/watch.command.ts` - Uses use cases instead of lib functions
- `presentation/cli/index.ts` - Command registration
- Inject use cases via `$inject` decorator from `core/ioc`

**4.2 Dependency Injection Setup**
- Use existing `core/ioc/container.ts` - Already configured with type-safe bindings
- Register all bindings in `infrastructure/ioc/bindings.ts` module
- Update `core/ioc/injection-key.enum.ts` with new keys:
  - `BrowserPort`, `NotificationPort`, `CheckSlotsUseCase`, `MonitorSlotsUseCase`
- Update `core/ioc/binding-map.ts` with port/use-case bindings
- Initialize container in `presentation/cli/index.ts` before command registration

**Deliverable**: Thin CLI layer that delegates to application layer via DI container

---

### Phase 5: Migration & Cleanup

**5.1 Gradual Migration**
- Keep old code temporarily, migrate command by command
- Ensure tests pass after each migration step

**5.2 Remove Legacy Code**
- Delete old `lib/` files after migration
- Update imports across codebase

**5.3 Update Tests**
- Refactor tests to use new architecture
- Add unit tests for use cases
- Add integration tests for infrastructure adapters

---

## Key Principles Applied

### Dependency Rule
- **Domain**: No dependencies (innermost layer)
  - Exception: Can depend on `core/` for errors, validators, base classes
- **Application**: Depends on domain only (and `core/` for errors/DI)
- **Infrastructure**: Depends on domain/application ports (and `core/` for DI)
- **Presentation**: Depends on application use cases (and `core/` for DI)
- **Core**: Shared infrastructure - no business logic dependencies

### SOLID Principles
- **S**ingle Responsibility: Each layer/class has one reason to change
- **O**pen/Closed: Extend via interfaces, not modify existing code
- **L**iskov Substitution: Port implementations are interchangeable
- **I**nterface Segregation: Small, focused port interfaces
- **D**ependency Inversion: Depend on abstractions (ports), not concretions

### Best Practices
- **Pure Functions**: Domain logic has no side effects
- **Immutability**: Value objects are immutable
- **Error Handling**: 
  - Use `DomainError` base class from `core/base/domain-error.ts`
  - Use `BusinessRuleError` for business rule violations
  - Use `ValidationError` for validation failures
  - Never throw infrastructure exceptions in domain/application layers
- **Dependency Injection**: 
  - Use existing `core/ioc` container with type-safe bindings
  - Use `@injectable()` decorator for all injectable classes
  - Use `@$inject(InjectionKey.X)` for constructor injection
  - Register all bindings in `infrastructure/ioc/bindings.ts`
- **Validation**: 
  - Use `Validator<T>` interface from `core/base/validator.ts`
  - Return `ValidationResult<T>` instead of throwing
- **Testing**: 
  - Mock ports in use case tests
  - Test infrastructure adapters separately
  - Use container bindings for test doubles

---

## Migration Strategy

### Incremental Approach
1. Start with domain layer (no breaking changes)
2. Create application layer alongside existing code
3. Implement infrastructure adapters
4. Migrate one command at a time
5. Remove legacy code after verification

### Testing Strategy
- Unit tests: Domain entities, use cases
- Integration tests: Infrastructure adapters
- E2E tests: Full CLI workflows

---

## File Structure Example

```
src/
├── core/                    # ✅ Already exists
│   ├── base/
│   │   ├── domain-error.ts
│   │   ├── validator.ts
│   │   └── index.ts
│   ├── errors/
│   │   ├── business-rule-error.ts
│   │   ├── validation-error.ts
│   │   └── index.ts
│   ├── ioc/
│   │   ├── binding-map.ts        # ✅ Extend with new bindings
│   │   ├── container.ts          # ✅ Use existing
│   │   ├── inject.ts              # ✅ Use existing $inject
│   │   ├── injection-key.enum.ts # ✅ Extend with new keys
│   │   └── index.ts
│   └── services/
│       └── id-generator.ts
│
├── domain/
│   ├── entities/
│   │   ├── slot-availability.entity.ts
│   │   └── operation.entity.ts
│   ├── value-objects/
│   │   ├── date-range.vo.ts
│   │   └── operation-day.vo.ts
│   ├── ports/
│   │   ├── browser.port.ts
│   │   ├── notification.port.ts
│   │   └── slot-repository.port.ts
│   ├── errors/
│   │   └── slot-error.ts          # Domain-specific errors
│   └── validators/                # Optional
│       └── operation-validator.ts
│
├── application/
│   ├── use-cases/
│   │   ├── check-slots.use-case.ts
│   │   └── monitor-slots.use-case.ts
│   └── services/
│       └── slot.service.ts
│
├── infrastructure/
│   ├── browser/
│   │   └── playwright-browser-adapter.ts
│   ├── notification/
│   │   └── telegram-notifier-adapter.ts
│   ├── config/
│   │   └── env-config.ts
│   └── ioc/
│       ├── bindings.ts            # Container bindings
│       └── index.ts               # Initialize bindings
│
└── presentation/
    └── cli/
        ├── commands/
        │   ├── run.command.ts
        │   └── watch.command.ts
        └── index.ts               # Initialize container, register commands
```

---

## Success Criteria

- [ ] Domain layer has zero external dependencies
- [ ] Use cases depend only on domain ports
- [ ] Infrastructure adapters implement domain ports
- [ ] CLI commands use use cases, not direct infrastructure
- [ ] All tests pass
- [ ] Code follows import ordering rules
- [ ] Linter passes (`bun run lint:fix`)

---

## Estimated Effort

- **Phase 1**: 2-3 hours (Domain foundation)
  - ✅ Infrastructure already in place (DI, errors, validators) - saves ~1 hour
- **Phase 2**: 2-3 hours (Use cases)
  - ✅ DI container ready - easier integration
- **Phase 3**: 2-3 hours (Infrastructure adapters)
  - ✅ DI setup simplifies adapter registration
- **Phase 4**: 1-2 hours (CLI refactoring)
  - ✅ No need to create DI container - use existing
- **Phase 5**: 1-2 hours (Testing & cleanup)

**Total**: ~7-12 hours (reduced due to existing infrastructure)

---

## Notes

- **Existing Infrastructure**: 
  - ✅ DI container already set up in `core/ioc/` - use it!
  - ✅ Domain error classes ready - extend `DomainError` for domain errors
  - ✅ Validator pattern available - use `Validator<T>` interface
- **Dependency Injection**: 
  - Use existing `core/ioc/container.ts` - no need to create new container
  - Extend `InjectionKey` enum with new keys for ports/use cases
  - Update `BindingMap` interface with new bindings
  - Use `@$inject()` decorator for type-safe injection
- **Architecture**: 
  - Use TypeScript interfaces for ports (not classes)
  - Keep existing functionality intact during migration
  - Maintain backward compatibility until migration complete
  - Document architectural decisions in code comments
- **Error Handling**: 
  - Domain/application layers should throw domain errors only
  - Infrastructure adapters can catch and convert exceptions to domain errors

