import { z } from "zod";

export const contactFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Please enter your name.")
    .max(100, "Name must be 100 characters or fewer."),
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address.")
    .max(255, "Email address is too long."),
  subject: z
    .string()
    .trim()
    .max(150, "Subject must be 150 characters or fewer.")
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null)),
  message: z
    .string()
    .trim()
    .min(10, "Message must be at least 10 characters.")
    .max(3000, "Message must be 3000 characters or fewer."),
  // Hidden honeypot field (bots fill this in, humans do not)
  honeypot: z.string().optional(),
  // Minimum fill time protection (in epoch ms)
  _timestamp: z.number().optional(),
});

export type ContactFormInput = z.infer<typeof contactFormSchema>;
