import { z } from 'zod';

export const credentialsSchema = z.object({
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,20}$/, 'Kullanıcı adı 3-20 karakter olmalı (harf, rakam, _)'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalı').max(100),
});

export const registerSchema = credentialsSchema.extend({
  company: z.string().trim().max(32).optional().default('Yeni Şirket'),
});
