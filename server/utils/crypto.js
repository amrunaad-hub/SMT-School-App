const crypto = require('crypto');

const KEY_BYTES = 32;

const deriveKey = () => {
    const secret = process.env.APP_DATA_ENCRYPTION_KEY;
    if (!secret) {
        return null;
    }

    return crypto.createHash('sha256').update(secret).digest();
};

const encryptText = (plainText) => {
    const key = deriveKey();
    if (!key || !plainText) {
        return plainText || '';
    }

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;
};

const decryptText = (cipherText) => {
    const key = deriveKey();
    if (!key || !cipherText) {
        return cipherText || '';
    }

    const parts = String(cipherText).split('.');
    if (parts.length !== 3) {
        return cipherText;
    }

    const iv = Buffer.from(parts[0], 'base64');
    const tag = Buffer.from(parts[1], 'base64');
    const content = Buffer.from(parts[2], 'base64');

    try {
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(tag);
        const decrypted = Buffer.concat([decipher.update(content), decipher.final()]);
        return decrypted.toString('utf8');
    } catch (error) {
        return '';
    }
};

module.exports = {
    encryptText,
    decryptText,
};
