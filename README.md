# README Backend

## NestJS Backend API

### โครงสร้าง

```
backend/
├── src/
│   ├── main.ts           # Entry point
│   ├── app.module.ts     # Root module
│   ├── app.controller.ts # Main controller
│   └── app.service.ts    # Main service
├── Dockerfile
├── package.json
└── tsconfig.json
```

### การพัฒนา

#### Local Development (ไม่ใช้ Docker)

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Run in development mode
npm run start:dev

# Build
npm run build

# Run in production mode
npm run start:prod
```

#### Docker Development

```bash
# From root directory
docker-compose up backend
```

### API Endpoints

- `GET /` - Welcome message
- `GET /health` - Health check

### เพิ่ม Module ใหม่

```bash
# เข้าไปใน container
docker-compose exec backend sh

# Generate module
npx nest generate module users
npx nest generate controller users
npx nest generate service users
```

### Database Integration

TypeORM ถูกติดตั้งและตั้งค่าไว้แล้วสำหรับ PostgreSQL

#### สร้าง Entity

```typescript
// src/users/user.entity.ts
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  email: string;
}
```

#### ใช้งาน Repository

```typescript
// src/users/users.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }
}
```

### Environment Variables

```env
NODE_ENV=development
PORT=7001
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=lotto_db
JWT_SECRET=replace-with-a-long-random-value
JWT_REFRESH_SECRET=replace-with-a-different-long-random-value
JWT_EXPIRES_IN=1d
JWT_REFRESH_EXPIRES_IN=7d
JWT_SESSION_MAX_AGE_SECONDS=86400
```

### Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```
