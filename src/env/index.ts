import * as dotenv from 'dotenv';
dotenv.config(); // This loads the .env file into process.env

export const JWT_SECRET = process.env.JWT_SECRET || '';

export const DB_HOST = process.env.DB_HOST || '';
export const DB_PORT = process.env.DB_PORT || 3000;
export const DB_USER = process.env.DB_USER || '';
export const DB_PASS = process.env.DB_PASS || '';
export const DB_NAME = process.env.DB_NAME || '';

export const CLIENT_BASEURL = process.env.CLIENT_BASEURL || '';
export const SERVER_BASEURL = process.env.SERVER_BASEURL || '';

export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';

export const RESEND_API_KEY = process.env.RESEND_API_KEY || '';

export const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || '';
export const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || '';
export const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || '';

export const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || '';

export const STRIPE_PUBLIC_KEY = process.env.STRIPE_PUBLIC_KEY || '';
export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

export const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN || '';
export const MAILGUN_ENDPOINT = process.env.MAILGUN_ENDPOINT || '';
export const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY || '';

export const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
export const PAYPAL_SECRET_KEY = process.env.PAYPAL_SECRET_KEY || '';
export const PAYPAL_API = process.env.PAYPAL_API || '';

export const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';
export const BREVO_SENDER_EMAIL = 'partners@theinnercitymission.net';
export const BREVO_SENDER_NAME = 'Way Navigation';
export const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
