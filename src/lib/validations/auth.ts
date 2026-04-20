import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email('Adresse email invalide'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
});

export const signupSchema = z.object({
  email: z.string().trim().email('Adresse email invalide'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
  username: z.string().trim().min(2, 'Le pseudo doit contenir au moins 2 caractères').max(30, 'Le pseudo ne peut pas dépasser 30 caractères'),
  age: z.coerce.number().int().min(18, 'Vous devez avoir au moins 18 ans').max(99, 'Âge invalide'),
  region: z.string().min(1, 'Veuillez choisir une région'),
  accountType: z.enum(['solo', 'couple']),
  username2: z.string().trim().optional(),
  age2: z.coerce.number().int().optional(),
  referralCode: z.string().optional(),
  acceptTerms: z.literal<boolean>(true, {
    errorMap: () => ({ message: 'Vous devez accepter les conditions pour continuer' }),
  }),
}).refine((data) => {
  if (data.accountType === 'couple') {
    return !!data.username2 && data.username2.length >= 2;
  }
  return true;
}, { message: 'Le pseudo du partenaire est requis', path: ['username2'] })
.refine((data) => {
  if (data.accountType === 'couple') {
    return data.age2 !== undefined && data.age2 >= 18 && data.age2 <= 99;
  }
  return true;
}, { message: 'Le partenaire doit avoir au moins 18 ans', path: ['age2'] });

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Adresse email invalide'),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type SignupFormData = z.infer<typeof signupSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
