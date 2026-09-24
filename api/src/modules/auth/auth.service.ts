import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';
import { signToken } from '../../lib/jwt';
import { RegisterInput, LoginInput } from './schemas';

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: 'PASSENGER' | 'DRIVER';
    walletBalancePaisa: number;
    createdAt: Date;
  };
}

export async function register(input: RegisterInput): Promise<AuthResponse> {
  const normalizedEmail = input.email.trim().toLowerCase();

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    throw new AppError('EMAIL_EXISTS', 409, 'An account with this email already exists');
  }

  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(input.password, saltRounds);

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      name: input.name.trim(),
      role: input.role,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      walletBalancePaisa: true,
      createdAt: true,
    },
  });

  const token = signToken({ sub: user.id, role: user.role });

  return { token, user };
}

export async function login(input: LoginInput): Promise<AuthResponse> {
  const normalizedEmail = input.email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    throw new AppError('INVALID_CREDENTIALS', 401, 'Invalid email or password');
  }

  const isValidPassword = await bcrypt.compare(input.password, user.passwordHash);

  if (!isValidPassword) {
    throw new AppError('INVALID_CREDENTIALS', 401, 'Invalid email or password');
  }

  const token = signToken({ sub: user.id, role: user.role });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      walletBalancePaisa: user.walletBalancePaisa,
      createdAt: user.createdAt,
    },
  };
}
