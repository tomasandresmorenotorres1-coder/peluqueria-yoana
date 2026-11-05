import nodemailer, { Transporter } from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || 'Peluquería Yohana <no-reply@peluqueriayoana.com>';

let transporter: Transporter | null = null;

if (SMTP_HOST && SMTP_USER && SMTP_PASS && !SMTP_PASS.includes('example')) {
    try {
        transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: SMTP_PORT,
            secure: SMTP_PORT === 465,
            auth: {
                user: SMTP_USER,
                pass: SMTP_PASS,
            },
        });
        console.log('✅ Servicio SMTP de correo configurado');
    } catch (err: any) {
        console.warn('⚠️ No se pudo inicializar el transporte SMTP:', err.message);
    }
} else {
    console.log('ℹ️ SMTP en modo desarrollo: Los códigos PIN se registrarán en la consola del servidor.');
}

export async function enviarPinRegistro(email: string, nombre: string, pin: string): Promise<boolean> {
    console.log(`\n======================================================`);
    console.log(`🔑 [PIN DE VERIFICACIÓN REGISTRO - PELUQUERÍA YOHANA]`);
    console.log(`📧 Destinatario: ${nombre} <${email}>`);
    console.log(`🔢 PIN: ${pin}`);
    console.log(`⏳ Validez: 15 minutos`);
    console.log(`======================================================\n`);

    if (!transporter) {
        return true;
    }

    try {
        await transporter.sendMail({
            from: SMTP_FROM,
            to: email,
            subject: `Tu PIN de verificación: ${pin} - Peluquería Yohana`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; background-color: #faf7f2; padding: 24px; border-radius: 12px; border: 1px solid #e2d9cd;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <span style="font-size: 32px;">💈</span>
                        <h2 style="color: #2b2623; margin: 8px 0 4px 0; font-size: 22px;">Peluquería Yohana</h2>
                        <p style="color: #c45d3e; font-size: 13px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; margin: 0;">Estilismo & Barbería</p>
                    </div>
                    <div style="background: #ffffff; padding: 24px; border-radius: 8px; border: 1px solid #eee; text-align: center;">
                        <h3 style="color: #2b2623; margin-top: 0;">Hola, ${nombre}</h3>
                        <p style="color: #555; font-size: 14px; line-height: 1.5;">
                            Gracias por registrarte en Peluquería Yohana. Para completar la creación de tu cuenta, ingresa el siguiente código PIN de seguridad de 6 dígitos:
                        </p>
                        <div style="margin: 24px 0; padding: 16px; background-color: #f5ebe6; border: 2px dashed #c45d3e; border-radius: 8px;">
                            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #c45d3e;">${pin}</span>
                        </div>
                        <p style="color: #888; font-size: 12px; margin-bottom: 0;">
                            Este PIN expirará en <strong>15 minutos</strong>. Si tú no solicitaste este registro, puedes ignorar este mensaje con total seguridad.
                        </p>
                    </div>
                    <div style="text-align: center; margin-top: 20px; color: #999; font-size: 11px;">
                        © ${new Date().getFullYear()} Peluquería Yohana. Todos los derechos reservados.
                    </div>
                </div>
            `,
        });
        console.log(`📨 Correo con PIN enviado exitosamente a ${email}`);
        return true;
    } catch (error: any) {
        console.error(`❌ Error al enviar correo SMTP a ${email}:`, error.message);
        return false;
    }
}
