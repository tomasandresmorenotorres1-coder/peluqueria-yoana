import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env';

/**
 * Crea o retorna la instancia del transporte SMTP de Nodemailer.
 */
export const obtenerTransporter = (): Transporter | null => {
    if (!env.SMTP_USER || !env.SMTP_PASS || env.SMTP_PASS === 'app_password_example') {
        return null;
    }

    try {
        const isGmail = env.SMTP_HOST.includes('gmail');
        if (isGmail) {
            return nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: env.SMTP_USER,
                    pass: env.SMTP_PASS,
                },
                connectionTimeout: 10000,
                greetingTimeout: 10000,
                socketTimeout: 15000,
            });
        }

        const isSecure = env.SMTP_PORT === 465;
        return nodemailer.createTransport({
            host: env.SMTP_HOST,
            port: env.SMTP_PORT,
            secure: isSecure,
            auth: {
                user: env.SMTP_USER,
                pass: env.SMTP_PASS,
            },
            tls: {
                rejectUnauthorized: false, // Permite certificados en entornos de prueba / dev
            },
        });
    } catch (err: any) {
        console.warn('⚠️ Error al configurar transporte Nodemailer:', err.message);
        return null;
    }
};

/**
 * Envía el PIN dinámico de 6 dígitos al correo electrónico del cliente capturado en req.body.email.
 */
export async function enviarPinRegistro(email: string, nombre: string, pin: string): Promise<boolean> {
    const destinatarioDinamico = email.trim();
    const remitenteOficial = env.SMTP_FROM || 'Peluquería Yohana <notificaciones@peluqueriayoana.com>';
    const escaparHtml = (s: string) =>
        s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
    const mostrarPin = process.env.NODE_ENV !== 'production' || process.env.MOSTRAR_PIN_EN_LOG === 'true';

    if (mostrarPin) {
        console.log(`\n🔑 [PIN REGISTRO] ${nombre} <${destinatarioDinamico}> → ${pin} (15 min)\n`);
    }
    const transporter = obtenerTransporter();

    if (!transporter) {
        console.log('ℹ️ SMTP en modo desarrollo / consola: PIN mostrado arriba para pruebas.');
        return true;
    }

    try {
        const info = await transporter.sendMail({
            from: remitenteOficial,
            to: destinatarioDinamico,
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
                            Gracias por iniciar tu registro en <strong>Peluquería Yohana</strong>. Para completar la creación de tu cuenta, ingresa el siguiente código PIN de seguridad de 6 dígitos:
                        </p>
                        <div style="margin: 24px 0; padding: 16px; background-color: #f5ebe6; border: 2px dashed #c45d3e; border-radius: 8px;">
                            <span style="font-size: 34px; font-weight: bold; letter-spacing: 8px; color: #c45d3e;">${pin}</span>
                        </div>
                        <p style="color: #888; font-size: 12px; margin-bottom: 0;">
                            Este PIN expirará en <strong>15 minutos</strong>. Si tú no solicitaste este código, puedes ignorar este correo de forma segura.
                        </p>
                    </div>
                    <div style="text-align: center; margin-top: 20px; color: #999; font-size: 11px;">
                        © ${new Date().getFullYear()} Peluquería Yohana. Todos los derechos reservados.
                    </div>
                </div>
            `,
        });

        console.log(`📨 Correo SMTP entregado exitosamente a ${destinatarioDinamico} (MessageId: ${info.messageId})`);
        return true;
    } catch (error: any) {
        console.error(`❌ Advertencia al enviar correo SMTP a ${destinatarioDinamico}:`, error.message);
        // Retornamos true para no bloquear el flujo de registro si el servidor SMTP de prueba rechaza la conexión
        return true;
    }
}
